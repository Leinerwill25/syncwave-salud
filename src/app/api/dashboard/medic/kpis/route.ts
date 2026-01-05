// src/app/api/dashboard/medic/kpis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';
import { getApiResponseHeaders } from '@/lib/api-cache-utils';

type PeriodType = 'day' | 'week' | 'month';

// Configurar caché optimizado (dynamic: datos que cambian frecuentemente pero se calculan)
export const dynamic = 'force-dynamic';
export const revalidate = 60;

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
		const supabase = await createSupabaseServerClient();

		const doctorId = user.userId;

		// 4️⃣ Calcular rangos de fecha según período
		const currentRange = getDateRange(period, periodOffset);
		const previousRange = getDateRange(period, periodOffset - 1);

		const currentStart = currentRange.start.toISOString();
		const currentEnd = currentRange.end.toISOString();
		const prevStart = previousRange.start.toISOString();
		const prevEnd = previousRange.end.toISOString();

		// 5️⃣ EJECUTAR TODAS LAS QUERIES EN PARALELO para máximo rendimiento (de 10 queries a 8 queries paralelas)
		const validStatuses = ['SCHEDULED', 'CONFIRMADA', 'EN ESPERA', 'EN_CURSO', 'CONFIRMED'];

		// Ejecutar todas las queries en paralelo para consultas, citas y facturaciones
		const [
			// Consultas - período actual
			currentConsultsWithStarted,
			currentConsultsWithCreated,
			// Consultas - período anterior
			prevConsultsWithStarted,
			prevConsultsWithCreated,
			// Citas - período actual
			currentApptResult,
			// Citas - período anterior
			prevApptResult,
			// Facturaciones - período actual (obtenemos todas y filtramos en memoria)
			currentFactResult,
			// Facturaciones - período anterior
			prevFactResult,
		] = await Promise.all([
			// Consultas con started_at en período actual
			supabase
				.from('consultation')
				.select('id', { count: 'exact', head: true })
				.eq('doctor_id', doctorId)
				.not('started_at', 'is', null)
				.gte('started_at', currentStart)
				.lte('started_at', currentEnd),
			// Consultas sin started_at en período actual
			supabase
				.from('consultation')
				.select('id', { count: 'exact', head: true })
				.eq('doctor_id', doctorId)
				.is('started_at', null)
				.gte('created_at', currentStart)
				.lte('created_at', currentEnd),
			// Consultas con started_at en período anterior
			supabase
				.from('consultation')
				.select('id', { count: 'exact', head: true })
				.eq('doctor_id', doctorId)
				.not('started_at', 'is', null)
				.gte('started_at', prevStart)
				.lte('started_at', prevEnd),
			// Consultas sin started_at en período anterior
			supabase
				.from('consultation')
				.select('id', { count: 'exact', head: true })
				.eq('doctor_id', doctorId)
				.is('started_at', null)
				.gte('created_at', prevStart)
				.lte('created_at', prevEnd),
			// Citas período actual
			supabase
				.from('appointment')
				.select('id', { count: 'exact', head: true })
				.eq('doctor_id', doctorId)
				.in('status', validStatuses)
				.gte('scheduled_at', currentStart)
				.lte('scheduled_at', currentEnd),
			// Citas período anterior
			supabase
				.from('appointment')
				.select('id', { count: 'exact', head: true })
				.eq('doctor_id', doctorId)
				.in('status', validStatuses)
				.gte('scheduled_at', prevStart)
				.lte('scheduled_at', prevEnd),
			// Facturaciones período actual: obtenemos un rango amplio y filtramos en memoria (más rápido)
			supabase
				.from('facturacion')
				.select('total, currency, fecha_pago, fecha_emision')
				.eq('doctor_id', doctorId)
				.eq('estado_pago', 'pagada')
				.or(`fecha_pago.gte.${currentStart},fecha_emision.gte.${currentStart}`)
				.or(`fecha_pago.lte.${currentEnd},fecha_emision.lte.${currentEnd}`)
				.limit(200),
			// Facturaciones período anterior
			supabase
				.from('facturacion')
				.select('total, currency, fecha_pago, fecha_emision')
				.eq('doctor_id', doctorId)
				.eq('estado_pago', 'pagada')
				.or(`fecha_pago.gte.${prevStart},fecha_emision.gte.${prevStart}`)
				.or(`fecha_pago.lte.${prevEnd},fecha_emision.lte.${prevEnd}`)
				.limit(200),
		]);

		// 6️⃣ Procesar resultados de consultas
		const currentConsultsFiltered = (currentConsultsWithStarted.count ?? 0) + (currentConsultsWithCreated.count ?? 0);
		const prevConsultsFiltered = (prevConsultsWithStarted.count ?? 0) + (prevConsultsWithCreated.count ?? 0);
		const consultChange = calcChange(currentConsultsFiltered, prevConsultsFiltered);

		// 7️⃣ Procesar resultados de citas
		const currentApptCount = currentApptResult.count ?? 0;
		const prevApptCount = prevApptResult.count ?? 0;
		const apptChange = calcChange(currentApptCount, prevApptCount);

		// 8️⃣ Procesar resultados de facturaciones (filtrado en memoria para mayor velocidad)
		const calculateIngresos = (facturas: any[], rangeStart: string, rangeEnd: string) => {
			return facturas.reduce((sum, f) => {
				const fechaPago = f.fecha_pago;
				const fechaEmision = f.fecha_emision;
				const total = Number(f.total || 0);

				// Verificar si está en el rango usando fecha_pago o fecha_emision
				const inRange = 
					(fechaPago && fechaPago >= rangeStart && fechaPago <= rangeEnd) ||
					(!fechaPago && fechaEmision && fechaEmision >= rangeStart && fechaEmision <= rangeEnd);

				return inRange ? sum + total : sum;
			}, 0);
		};

		const ingresosActual = calculateIngresos(currentFactResult.data || [], currentStart, currentEnd);
		const ingresosPrev = calculateIngresos(prevFactResult.data || [], prevStart, prevEnd);
		const ingresosChange = calcChange(ingresosActual, ingresosPrev);

		// 9️⃣ Respuesta final
		const data = [
			{
				title: 'Pacientes Atendidos',
				value: currentConsultsFiltered,
				change: consultChange.trend === 'neutral' ? '0%' : `${consultChange.percent > 0 ? '+' : ''}${consultChange.percent}%`,
				trend: consultChange.trend,
			},
			{
				title: 'Citas Programadas',
				value: currentApptCount,
				change: apptChange.trend === 'neutral' ? '0%' : `${apptChange.percent > 0 ? '+' : ''}${apptChange.percent}%`,
				trend: apptChange.trend,
			},
			{
				title: 'Ingresos Generados',
				value: ingresosActual,
				change: ingresosChange.trend === 'neutral' ? '0%' : `${ingresosChange.percent > 0 ? '+' : ''}${ingresosChange.percent}%`,
				trend: ingresosChange.trend,
			},
		];

		return NextResponse.json(data, { 
			status: 200,
			headers: getApiResponseHeaders('dynamic'),
		});
	} catch (error: any) {
		console.error('❌ Error en /api/dashboard/medic/kpis:', error);
		return NextResponse.json({ error: 'Error obteniendo indicadores del panel médico.', details: error?.message ?? String(error) }, { status: 500 });
	}
}
