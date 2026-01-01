// src/app/api/dashboard/medic/kpis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';
import { optimizeSupabaseQuery } from '@/lib/lite-mode-utils';

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


export async function GET(req: NextRequest) {
	try {
		// 1️⃣ Autenticación usando apiRequireRole (maneja correctamente la restauración de sesión)
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		// 2️⃣ Obtener parámetros de query
		const url = new URL(req.url);
		const period = (url.searchParams.get('period') || 'week') as PeriodType;
		const periodOffset = parseInt(url.searchParams.get('offset') || '0', 10);
		const isLiteMode = url.searchParams.get('liteMode') === 'true';

		// Validar período
		if (!['day', 'week', 'month'].includes(period)) {
			return NextResponse.json({ error: 'Invalid period. Must be day, week, or month' }, { status: 400 });
		}

		// 3️⃣ Obtener cliente Supabase
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const doctorId = user.userId;
		console.log(`[KPI] Doctor encontrado: ${doctorId}, período: ${period}`);

		// 6️⃣ Calcular rangos de fecha según período
		const currentRange = getDateRange(period, periodOffset);
		const previousRange = getDateRange(period, periodOffset - 1);

		// ────────────────────────────────
		// 🩺 1️⃣ PACIENTES ATENDIDOS (consultation)
		// Usar started_at si existe, sino created_at
		// ────────────────────────────────
		// Consulta para consultas con started_at en el rango actual
		let query1 = supabase
			.from('consultation')
			.select(isLiteMode ? 'id' : '*', { count: 'exact', head: true })
			.eq('doctor_id', doctorId)
			.not('started_at', 'is', null)
			.gte('started_at', currentRange.start.toISOString())
			.lte('started_at', currentRange.end.toISOString());
		
		query1 = optimizeSupabaseQuery(query1, isLiteMode, 'consultation', { limit: undefined });
		const { count: currentConsultsWithStarted } = await query1;

		// Consultas sin started_at pero con created_at en el rango
		let query2 = supabase
			.from('consultation')
			.select(isLiteMode ? 'id' : '*', { count: 'exact', head: true })
			.eq('doctor_id', doctorId)
			.is('started_at', null)
			.gte('created_at', currentRange.start.toISOString())
			.lte('created_at', currentRange.end.toISOString());
		
		query2 = optimizeSupabaseQuery(query2, isLiteMode, 'consultation', { limit: undefined });
		const { count: currentConsultsWithCreated } = await query2;

		const currentConsultsFiltered = (currentConsultsWithStarted ?? 0) + (currentConsultsWithCreated ?? 0);

		// Período anterior
		let query3 = supabase
			.from('consultation')
			.select(isLiteMode ? 'id' : '*', { count: 'exact', head: true })
			.eq('doctor_id', doctorId)
			.not('started_at', 'is', null)
			.gte('started_at', previousRange.start.toISOString())
			.lte('started_at', previousRange.end.toISOString());
		
		query3 = optimizeSupabaseQuery(query3, isLiteMode, 'consultation', { limit: undefined });
		const { count: prevConsultsWithStarted } = await query3;

		let query4 = supabase
			.from('consultation')
			.select(isLiteMode ? 'id' : '*', { count: 'exact', head: true })
			.eq('doctor_id', doctorId)
			.is('started_at', null)
			.gte('created_at', previousRange.start.toISOString())
			.lte('created_at', previousRange.end.toISOString());
		
		query4 = optimizeSupabaseQuery(query4, isLiteMode, 'consultation', { limit: undefined });
		const { count: prevConsultsWithCreated } = await query4;

		const prevConsultsFiltered = (prevConsultsWithStarted ?? 0) + (prevConsultsWithCreated ?? 0);

		const consultChange = calcChange(currentConsultsFiltered, prevConsultsFiltered);

		// ────────────────────────────────
		// 📅 2️⃣ CITAS PROGRAMADAS (appointment)
		// Incluir citas con estados: SCHEDULED, CONFIRMADA, EN ESPERA, EN_CURSO
		// ────────────────────────────────
		const validStatuses = ['SCHEDULED', 'CONFIRMADA', 'EN ESPERA', 'EN_CURSO', 'CONFIRMED'];
		
		console.log('[KPI] Buscando citas programadas:', {
			doctorId,
			period,
			validStatuses,
			currentRange: {
				start: currentRange.start.toISOString(),
				end: currentRange.end.toISOString(),
			},
		});

		let query5 = supabase
			.from('appointment')
			.select(isLiteMode ? 'id' : '*', { count: 'exact', head: true })
			.eq('doctor_id', doctorId)
			.in('status', validStatuses)
			.gte('scheduled_at', currentRange.start.toISOString())
			.lte('scheduled_at', currentRange.end.toISOString());
		
		query5 = optimizeSupabaseQuery(query5, isLiteMode, 'appointment', { limit: undefined });
		const { count: currentAppt, error: currentApptError } = await query5;

		if (currentApptError) {
			console.error('[KPI] Error obteniendo citas programadas actuales:', currentApptError);
		} else {
			console.log('[KPI] Citas programadas encontradas (período actual):', currentAppt);
		}

		let query6 = supabase
			.from('appointment')
			.select(isLiteMode ? 'id' : '*', { count: 'exact', head: true })
			.eq('doctor_id', doctorId)
			.in('status', validStatuses)
			.gte('scheduled_at', previousRange.start.toISOString())
			.lte('scheduled_at', previousRange.end.toISOString());
		
		query6 = optimizeSupabaseQuery(query6, isLiteMode, 'appointment', { limit: undefined });
		const { count: prevAppt, error: prevApptError } = await query6;

		if (prevApptError) {
			console.error('[KPI] Error obteniendo citas programadas anteriores:', prevApptError);
		} else {
			console.log('[KPI] Citas programadas encontradas (período anterior):', prevAppt);
		}

		// Debug: Obtener todas las citas del doctor para verificar
		const { data: allAppointments, error: allApptError } = await supabase
			.from('appointment')
			.select('id, status, scheduled_at, doctor_id')
			.eq('doctor_id', doctorId)
			.limit(10);

		if (!allApptError && allAppointments) {
			console.log('[KPI] Primeras 10 citas del doctor (para debug):', allAppointments.map((apt: any) => ({
				id: apt.id,
				status: apt.status,
				scheduled_at: apt.scheduled_at,
				doctor_id: apt.doctor_id,
			})));
		}

		const currentApptCount = currentAppt ?? 0;
		const prevApptCount = prevAppt ?? 0;
		const apptChange = calcChange(currentApptCount, prevApptCount);

		// ────────────────────────────────
		// 💰 3️⃣ INGRESOS (facturacion)
		// Solo facturas con estado_pago = 'pagada'
		// Usar fecha_pago si existe, sino fecha_emision
		// ────────────────────────────────
		// Consulta para facturaciones con fecha_pago en el rango actual
		let query7 = supabase
			.from('facturacion')
			.select('total, currency')
			.eq('doctor_id', doctorId)
			.eq('estado_pago', 'pagada')
			.not('fecha_pago', 'is', null)
			.gte('fecha_pago', currentRange.start.toISOString())
			.lte('fecha_pago', currentRange.end.toISOString());
		
		query7 = optimizeSupabaseQuery(query7, isLiteMode, 'facturacion', { limit: 100 });
		const { data: factNowWithFechaPago } = await query7;

		// Consulta para facturaciones sin fecha_pago pero con fecha_emision en el rango actual
		let query8 = supabase
			.from('facturacion')
			.select('total, currency')
			.eq('doctor_id', doctorId)
			.eq('estado_pago', 'pagada')
			.is('fecha_pago', null)
			.gte('fecha_emision', currentRange.start.toISOString())
			.lte('fecha_emision', currentRange.end.toISOString());
		
		query8 = optimizeSupabaseQuery(query8, isLiteMode, 'facturacion', { limit: 100 });
		const { data: factNowWithFechaEmision } = await query8;

		// Sumar todos los totales (convertir a USD si es necesario)
		const ingresosActual =
			(factNowWithFechaPago || []).reduce((sum, f) => {
				const total = Number(f.total || 0);
				// Si la moneda no es USD, convertir usando tipo_cambio si está disponible
				// Por ahora asumimos que total ya está en USD o usamos el valor directo
				return sum + total;
			}, 0) +
			(factNowWithFechaEmision || []).reduce((sum, f) => {
				const total = Number(f.total || 0);
				return sum + total;
			}, 0);

		// Período anterior
		let query9 = supabase
			.from('facturacion')
			.select('total, currency')
			.eq('doctor_id', doctorId)
			.eq('estado_pago', 'pagada')
			.not('fecha_pago', 'is', null)
			.gte('fecha_pago', previousRange.start.toISOString())
			.lte('fecha_pago', previousRange.end.toISOString());
		
		query9 = optimizeSupabaseQuery(query9, isLiteMode, 'facturacion', { limit: 100 });
		const { data: factPrevWithFechaPago } = await query9;

		let query10 = supabase
			.from('facturacion')
			.select('total, currency')
			.eq('doctor_id', doctorId)
			.eq('estado_pago', 'pagada')
			.is('fecha_pago', null)
			.gte('fecha_emision', previousRange.start.toISOString())
			.lte('fecha_emision', previousRange.end.toISOString());
		
		query10 = optimizeSupabaseQuery(query10, isLiteMode, 'facturacion', { limit: 100 });
		const { data: factPrevWithFechaEmision } = await query10;

		const ingresosPrev =
			(factPrevWithFechaPago || []).reduce((sum, f) => {
				const total = Number(f.total || 0);
				return sum + total;
			}, 0) +
			(factPrevWithFechaEmision || []).reduce((sum, f) => {
				const total = Number(f.total || 0);
				return sum + total;
			}, 0);

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
				value: currentApptCount, // Asegurar que siempre sea un número
				change: apptChange.trend === 'neutral' ? '0%' : `${apptChange.percent > 0 ? '+' : ''}${apptChange.percent}%`,
				trend: apptChange.trend,
			},
			{
				title: 'Ingresos Generados',
				value: ingresosActual, // Retornar como número para que CurrencyDisplay funcione
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
