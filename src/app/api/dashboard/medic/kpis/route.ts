// src/app/api/dashboard/medic/kpis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { cookies } from 'next/headers';

type PeriodType = 'day' | 'week' | 'month';

// 🗓️ Calcular rango de día
function getDayRange(offset = 0) {
	const now = new Date();
	const day = new Date(now);
	day.setDate(now.getDate() + offset);
	day.setHours(0, 0, 0, 0);

	const end = new Date(day);
	end.setHours(23, 59, 59, 999);

	return { start: day, end };
}

// 🧠 Calcular inicio y fin de semana (lunes–domingo)
function getWeekRange(offset = 0) {
	const now = new Date();
	const day = now.getDay(); // 0 = domingo
	const diffToMonday = day === 0 ? -6 : 1 - day;
	const monday = new Date(now);
	monday.setDate(now.getDate() + diffToMonday + offset * 7);
	monday.setHours(0, 0, 0, 0);

	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);
	sunday.setHours(23, 59, 59, 999);

	return { start: monday, end: sunday };
}

// 📅 Calcular inicio y fin de mes
function getMonthRange(offset = 0) {
	const now = new Date();
	const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
	month.setHours(0, 0, 0, 0);

	const lastDay = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
	lastDay.setHours(23, 59, 59, 999);

	return { start: month, end: lastDay };
}

// 📊 Obtener rango de fecha según período
function getDateRange(period: PeriodType, offset = 0) {
	switch (period) {
		case 'day':
			return getDayRange(offset);
		case 'week':
			return getWeekRange(offset);
		case 'month':
			return getMonthRange(offset);
		default:
			return getWeekRange(offset);
	}
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

export async function GET(req: NextRequest) {
	try {
		// 1️⃣ Obtener parámetros de query
		const url = new URL(req.url);
		const period = (url.searchParams.get('period') || 'week') as PeriodType;
		const periodOffset = parseInt(url.searchParams.get('offset') || '0', 10);

		// Validar período
		if (!['day', 'week', 'month'].includes(period)) {
			return NextResponse.json({ error: 'Invalid period. Must be day, week, or month' }, { status: 400 });
		}

		// 2️⃣ Obtener cookie store request-scoped (await por compatibilidad con tu versión de Next)
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
		console.log(`[KPI] Doctor encontrado (${usedTable}): ${doctorId}, período: ${period}`);

		// 6️⃣ Calcular rangos de fecha según período
		const currentRange = getDateRange(period, periodOffset);
		const previousRange = getDateRange(period, periodOffset - 1);

		// ────────────────────────────────
		// 🩺 1️⃣ PACIENTES ATENDIDOS (consultation)
		// Usar started_at si existe, sino created_at
		// ────────────────────────────────
		// Consulta para consultas con started_at en el rango actual
		const { count: currentConsultsWithStarted } = await supabase
			.from('consultation')
			.select('*', { count: 'exact', head: true })
			.eq('doctor_id', doctorId)
			.not('started_at', 'is', null)
			.gte('started_at', currentRange.start.toISOString())
			.lte('started_at', currentRange.end.toISOString());

		// Consultas sin started_at pero con created_at en el rango
		const { count: currentConsultsWithCreated } = await supabase
			.from('consultation')
			.select('*', { count: 'exact', head: true })
			.eq('doctor_id', doctorId)
			.is('started_at', null)
			.gte('created_at', currentRange.start.toISOString())
			.lte('created_at', currentRange.end.toISOString());

		const currentConsultsFiltered = (currentConsultsWithStarted ?? 0) + (currentConsultsWithCreated ?? 0);

		// Período anterior
		const { count: prevConsultsWithStarted } = await supabase
			.from('consultation')
			.select('*', { count: 'exact', head: true })
			.eq('doctor_id', doctorId)
			.not('started_at', 'is', null)
			.gte('started_at', previousRange.start.toISOString())
			.lte('started_at', previousRange.end.toISOString());

		const { count: prevConsultsWithCreated } = await supabase
			.from('consultation')
			.select('*', { count: 'exact', head: true })
			.eq('doctor_id', doctorId)
			.is('started_at', null)
			.gte('created_at', previousRange.start.toISOString())
			.lte('created_at', previousRange.end.toISOString());

		const prevConsultsFiltered = (prevConsultsWithStarted ?? 0) + (prevConsultsWithCreated ?? 0);

		const consultChange = calcChange(currentConsultsFiltered, prevConsultsFiltered);

		// ────────────────────────────────
		// 📅 2️⃣ CITAS PROGRAMADAS (appointment)
		// ────────────────────────────────
		const { count: currentAppt } = await supabase
			.from('appointment')
			.select('*', { count: 'exact', head: true })
			.eq('doctor_id', doctorId)
			.eq('status', 'SCHEDULED')
			.gte('scheduled_at', currentRange.start.toISOString())
			.lte('scheduled_at', currentRange.end.toISOString());

		const { count: prevAppt } = await supabase
			.from('appointment')
			.select('*', { count: 'exact', head: true })
			.eq('doctor_id', doctorId)
			.eq('status', 'SCHEDULED')
			.gte('scheduled_at', previousRange.start.toISOString())
			.lte('scheduled_at', previousRange.end.toISOString());

		const apptChange = calcChange(currentAppt ?? 0, prevAppt ?? 0);

		// ────────────────────────────────
		// 💰 3️⃣ INGRESOS (facturacion)
		// Usar fecha_pago si existe y está pagado, sino fecha_emision
		// ────────────────────────────────
		// Consulta para facturaciones con fecha_pago en el rango actual
		const { data: factNowWithFechaPago } = await supabase
			.from('facturacion')
			.select('total')
			.eq('doctor_id', doctorId)
			.eq('estado_pago', 'pagado')
			.not('fecha_pago', 'is', null)
			.gte('fecha_pago', currentRange.start.toISOString())
			.lte('fecha_pago', currentRange.end.toISOString());

		// Consulta para facturaciones sin fecha_pago pero con fecha_emision en el rango actual
		const { data: factNowWithFechaEmision } = await supabase
			.from('facturacion')
			.select('total')
			.eq('doctor_id', doctorId)
			.eq('estado_pago', 'pagado')
			.is('fecha_pago', null)
			.gte('fecha_emision', currentRange.start.toISOString())
			.lte('fecha_emision', currentRange.end.toISOString());

		const ingresosActual =
			(factNowWithFechaPago || []).reduce((sum, f) => sum + Number(f.total || 0), 0) + (factNowWithFechaEmision || []).reduce((sum, f) => sum + Number(f.total || 0), 0);

		// Período anterior
		const { data: factPrevWithFechaPago } = await supabase
			.from('facturacion')
			.select('total')
			.eq('doctor_id', doctorId)
			.eq('estado_pago', 'pagado')
			.not('fecha_pago', 'is', null)
			.gte('fecha_pago', previousRange.start.toISOString())
			.lte('fecha_pago', previousRange.end.toISOString());

		const { data: factPrevWithFechaEmision } = await supabase
			.from('facturacion')
			.select('total')
			.eq('doctor_id', doctorId)
			.eq('estado_pago', 'pagado')
			.is('fecha_pago', null)
			.gte('fecha_emision', previousRange.start.toISOString())
			.lte('fecha_emision', previousRange.end.toISOString());

		const ingresosPrev =
			(factPrevWithFechaPago || []).reduce((sum, f) => sum + Number(f.total || 0), 0) + (factPrevWithFechaEmision || []).reduce((sum, f) => sum + Number(f.total || 0), 0);

		const ingresosChange = calcChange(ingresosActual, ingresosPrev);

		// ────────────────────────────────
		// 📊 Respuesta final
		// ────────────────────────────────
		const data = [
			{
				title: 'Pacientes Atendidos',
				value: currentConsultsFiltered,
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
					maximumFractionDigits: 2,
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
