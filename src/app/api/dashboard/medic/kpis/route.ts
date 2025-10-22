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

export async function GET() {
	try {
		// 1️⃣ Crear cliente Supabase con cookies del request

		const cookieStore = await cookies(); // ⛔ sin await
		const allCookies = cookieStore.getAll().map((c) => ({
			name: c.name,
			value: c.value,
		}));
		console.log('[DEBUG COOKIES]', allCookies);

		// 2️⃣ Crear cliente Supabase pasando las cookies
		const { supabase } = createSupabaseServerClient(cookieStore);

		// 3️⃣ Obtener sesión autenticada
		const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

		if (sessionError || !sessionData?.session?.user) {
			console.warn('[KPI] ❌ No hay sesión activa.');
			return NextResponse.json({ error: 'No active session' }, { status: 401 });
		}

		const authId = sessionData.session.user.id;
		console.log('[KPI] Usuario autenticado:', authId);

		// 3️⃣ Buscar el usuario (doctor) en la tabla User
		const { data: userData, usedTable } = await queryUserByAuthId(supabase, authId);
		if (!userData) {
			console.warn(`[KPI] No se encontró usuario en la tabla User con authId=${authId}`);
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const doctorId = userData.id;
		console.log(`[KPI] Doctor encontrado (${usedTable}): ${doctorId}`);

		// 4️⃣ Calcular semanas
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
		return NextResponse.json({ error: 'Error obteniendo indicadores del panel médico.', details: error.message }, { status: 500 });
	}
}
