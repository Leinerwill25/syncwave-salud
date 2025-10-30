// src/app/api/dashboard/medic/kpis/route.ts
import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { cookies } from 'next/headers';

// 🧠 Calcular inicio y fin de semana (lunes–sábado)
function getWeekRange(offset = 0) {
	const now = new Date();
	const day = now.getDay(); // 0 = domingo
	const diffToMonday = day === 0 ? -6 : 1 - day;
	const monday = new Date(now);
	monday.setDate(now.getDate() + diffToMonday + offset * 7);
	monday.setHours(0, 0, 0, 0);

	const saturday = new Date(monday);
	saturday.setDate(monday.getDate() + 5);
	saturday.setHours(23, 59, 59, 999);

	return { start: monday, end: saturday };
}

// 📈 Calcular cambio porcentual
function calcChange(current: number, previous: number) {
	if (previous === 0 && current === 0) return { percent: 0, trend: 'neutral' as const };
	if (previous === 0 && current > 0) return { percent: 100, trend: 'up' as const };
	const change = ((current - previous) / previous) * 100;
	return {
		percent: Math.round(change),
		trend: change > 0 ? 'up' : change < 0 ? 'down' : ('neutral' as const),
	};
}

// 🔍 Busca usuario en la tabla User según authId
async function queryUserByAuthId(supabase: any, authId: string) {
	const candidates = ['User', 'user', '"User"', 'public.User', 'public."User"'];
	let lastError: any = null;

	for (const name of candidates) {
		const { data, error } = await supabase.from(name).select('id, organizationId').eq('authId', authId).limit(1).single();

		if (data) return { data, usedTable: name };
		lastError = error;
		if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) continue;
	}

	console.warn('[KPI] Error buscando usuario por authId:', lastError?.message);
	return { data: null, usedTable: null };
}

/**
 * Helper: intenta reconstruir sesión a partir de cookies conocidas.
 * Retorna true si logró setear sesión en el cliente.
 */
async function tryRestoreSessionFromCookies(supabase: any, cookieStore: any): Promise<boolean> {
	if (!cookieStore) return false;

	const tried: string[] = [];
	// orden recomendado por tus logs
	const cookieCandidates = ['sb-session', 'sb:token', 'supabase-auth-token', 'sb-access-token', 'sb-refresh-token', 'sb:token'];

	for (const name of cookieCandidates) {
		tried.push(name);
		try {
			const c = typeof cookieStore.get === 'function' ? cookieStore.get(name) : undefined;
			const raw = c?.value ?? null;
			if (!raw) continue;

			// `sb-session` y `sb:token` en tus logs son JSON. `sb-access-token` es JWT string.
			// Intentamos parsear JSON; si no es JSON, lo tratamos según el nombre.
			let parsed: any = null;
			try {
				parsed = JSON.parse(raw);
			} catch {
				parsed = null;
			}

			// Casos:
			// - sb-session: { access_token, refresh_token, ... }
			// - sb:token or supabase-auth-token: object with currentSession or similar
			// - sb-access-token: just an access token string (sin refresh)
			let access_token: string | null = null;
			let refresh_token: string | null = null;

			if (parsed) {
				// buscar access/refresh en varias rutas
				access_token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.current_session?.access_token ?? null;
				refresh_token = parsed?.refresh_token ?? parsed?.currentSession?.refresh_token ?? parsed?.current_session?.refresh_token ?? (parsed?.persistSession && parsed?.currentSession?.refresh_token) ?? null;

				// algunos formatos guardan en currentSession: { access_token: '...', refresh_token: '...' }
				if (!access_token && parsed?.currentSession && typeof parsed.currentSession === 'object') {
					access_token = parsed.currentSession.access_token ?? null;
					refresh_token = parsed.currentSession.refresh_token ?? null;
				}
			} else {
				// no JSON: puede ser sólo el access token
				if (name === 'sb-access-token') {
					access_token = raw;
				} else if (name === 'sb-refresh-token') {
					refresh_token = raw;
				}
			}

			if (!access_token && !refresh_token) continue;

			// Llamamos a setSession para que supabase-js tenga la sesión en memoria
			const payload: any = {};
			if (access_token) payload.access_token = access_token;
			if (refresh_token) payload.refresh_token = refresh_token;

			// setSession devuelve data con session o error
			const { data, error } = await supabase.auth.setSession(payload);
			if (error) {
				console.warn(`[KPI] Intento de setSession desde cookie "${name}" fallo:`, error.message);
				continue;
			}

			if (data?.session) {
				console.log(`[KPI] Sesión restaurada desde cookie "${name}" (tried: ${tried.join(', ')})`);
				return true;
			}

			// si setSession no devolvió session, intentar getSession luego de setSession igualmente
			const { data: sessionAfter } = await supabase.auth.getSession();
			if (sessionAfter?.session) {
				console.log(`[KPI] Sesión disponible luego de setSession (cookie: "${name}")`);
				return true;
			}
		} catch (err: any) {
			console.debug(`[KPI] Error procesando cookie "${name}":`, err?.message ?? String(err));
			continue;
		}
	}

	console.debug('[KPI] No se pudo restaurar sesión desde cookies. Cookies intentadas:', cookieCandidates);
	return false;
}

export async function GET() {
	try {
		// 1️⃣ Obtener cookie store request-scoped (await por compatibilidad con tu versión de Next)
		const cookieStore = await cookies();

		// Logging básico de cookies (no explotamos si getAll no existe)
		let allCookiesLog: Array<{ name: string; value: string }> = [];
		try {
			if (cookieStore && typeof (cookieStore as any).getAll === 'function') {
				allCookiesLog = (cookieStore as any).getAll().map((c: any) => ({ name: c.name, value: c.value }));
			} else if (cookieStore && typeof (cookieStore as any).get === 'function') {
				const known = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token', 'sb-session'];
				allCookiesLog = known
					.map((n) => cookieStore.get(n))
					.filter(Boolean)
					.map((c: any) => ({ name: c.name ?? 'unknown', value: c.value ?? String(c) }));
			}
		} catch {
			// no rompemos por logging
		}
		console.log('[DEBUG COOKIES]', allCookiesLog);

		// 2️⃣ Crear cliente Supabase pasando el cookieStore (tu adapter recibe customCookieStore)
		const { supabase } = createSupabaseServerClient(cookieStore);

		// 3️⃣ Intentar obtener la sesión normalmente
		let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
		console.log('[KPI] sessionData:', sessionData, 'sessionError:', sessionError);

		// 4️⃣ Si session es null — intentamos reconstruir desde las cookies como fallback
		if (!sessionData?.session) {
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			if (restored) {
				// reconsultar sesión
				const after = await supabase.auth.getSession();
				sessionData = after.data ?? after; // compatibilidad con diferentes retornos
				sessionError = after.error ?? sessionError;
				console.log('[KPI] sessionData after restore:', sessionData, 'sessionError:', sessionError);
			}
		}

		if (sessionError || !sessionData?.session?.user) {
			console.warn('[KPI] ❌ No hay sesión activa.');
			return NextResponse.json({ error: 'No active session' }, { status: 401 });
		}

		const authId = sessionData.session.user.id;
		console.log('[KPI] Usuario autenticado:', authId);

		// 5️⃣ Buscar el usuario (doctor) en la tabla User
		const { data: userData, usedTable } = await queryUserByAuthId(supabase, authId);
		if (!userData) {
			console.warn(`[KPI] No se encontró usuario en la tabla User con authId=${authId}`);
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const doctorId = userData.id;
		console.log(`[KPI] Doctor encontrado (${usedTable}): ${doctorId}`);

		// 6️⃣ Calcular semanas
		const currentWeek = getWeekRange(0);
		const previousWeek = getWeekRange(-1);

		// ────────────────────────────────
		// 🩺 1️⃣ PACIENTES ATENDIDOS (consultation)
		// ────────────────────────────────
		const { count: currentConsults } = await supabase.from('consultation').select('*', { count: 'exact', head: true }).eq('doctor_id', doctorId).gte('started_at', currentWeek.start.toISOString()).lte('started_at', currentWeek.end.toISOString());

		const { count: prevConsults } = await supabase.from('consultation').select('*', { count: 'exact', head: true }).eq('doctor_id', doctorId).gte('started_at', previousWeek.start.toISOString()).lte('started_at', previousWeek.end.toISOString());

		const consultChange = calcChange(currentConsults ?? 0, prevConsults ?? 0);

		// ────────────────────────────────
		// 📅 2️⃣ CITAS PROGRAMADAS (appointment)
		// ────────────────────────────────
		const { count: currentAppt } = await supabase.from('appointment').select('*', { count: 'exact', head: true }).eq('doctor_id', doctorId).eq('status', 'SCHEDULED').gte('scheduled_at', currentWeek.start.toISOString()).lte('scheduled_at', currentWeek.end.toISOString());

		const { count: prevAppt } = await supabase.from('appointment').select('*', { count: 'exact', head: true }).eq('doctor_id', doctorId).eq('status', 'SCHEDULED').gte('scheduled_at', previousWeek.start.toISOString()).lte('scheduled_at', previousWeek.end.toISOString());

		const apptChange = calcChange(currentAppt ?? 0, prevAppt ?? 0);

		// ────────────────────────────────
		// 💰 3️⃣ INGRESOS (facturacion)
		// ────────────────────────────────
		const { data: factNow } = await supabase.from('facturacion').select('total').eq('doctor_id', doctorId).eq('estado_pago', 'pagado').gte('fecha_emision', currentWeek.start.toISOString()).lte('fecha_emision', currentWeek.end.toISOString());

		const { data: factPrev } = await supabase.from('facturacion').select('total').eq('doctor_id', doctorId).eq('estado_pago', 'pagado').gte('fecha_emision', previousWeek.start.toISOString()).lte('fecha_emision', previousWeek.end.toISOString());

		const ingresosActual = factNow?.reduce((sum, f) => sum + Number(f.total || 0), 0) || 0;
		const ingresosPrev = factPrev?.reduce((sum, f) => sum + Number(f.total || 0), 0) || 0;
		const ingresosChange = calcChange(ingresosActual, ingresosPrev);

		// ────────────────────────────────
		// 📊 Respuesta final
		// ────────────────────────────────
		const data = [
			{
				title: 'Pacientes Atendidos',
				value: currentConsults ?? 0,
				change: consultChange.trend === 'neutral' ? '0%' : `${consultChange.percent > 0 ? '+' : ''}${consultChange.percent}%`,
				trend: consultChange.trend,
			},
			{
				title: 'Citas Programadas',
				value: currentAppt ?? 0,
				change: apptChange.trend === 'neutral' ? '0%' : `${apptChange.percent > 0 ? '+' : ''}${apptChange.percent}%`,
				trend: apptChange.trend,
			},
			{
				title: 'Ingresos Generados',
				value: `$${ingresosActual.toLocaleString('es-ES', {
					minimumFractionDigits: 2,
				})}`,
				change: ingresosChange.trend === 'neutral' ? '0%' : `${ingresosChange.percent > 0 ? '+' : ''}${ingresosChange.percent}%`,
				trend: ingresosChange.trend,
			},
		];

		return NextResponse.json(data, { status: 200 });
	} catch (error: any) {
		console.error('❌ Error en /api/dashboard/medic/kpis:', error);
		return NextResponse.json({ error: 'Error obteniendo indicadores del panel médico.', details: error?.message ?? String(error) }, { status: 500 });
	}
}
