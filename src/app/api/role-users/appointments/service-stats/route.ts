import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer, roleNameEquals } from '@/lib/role-user-auth';

type ServiceAggDate = {
	date: string; // YYYY-MM-DD
	count: number;
};

type ServiceAgg = {
	name: string;
	totalCount: number;
	totalRevenue: number;
	currency: string | null;
	averagePrice: number;
	dates: ServiceAggDate[];
};

export async function GET(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Panel inteligente SOLO para Recepción (rol interno)
		if (!roleNameEquals(session.roleName, 'Recepción')) {
			return NextResponse.json(
				{ error: 'Acceso denegado. Solo el rol "Recepción" puede ver estas estadísticas.' },
				{ status: 403 },
			);
		}

		const supabase = await createSupabaseServerClient();
		const url = new URL(req.url);

		const periodType = (url.searchParams.get('periodType') || 'month').toLowerCase(); // 'month' | 'quarter'
		const month = url.searchParams.get('month'); // 01..12
		const quarter = url.searchParams.get('quarter'); // 1..4
		const year = url.searchParams.get('year');

		if (!year) {
			return NextResponse.json({ error: 'Debe especificarse un año para las estadísticas.' }, { status: 400 });
		}

		let startDate: string;
		let endDate: string;

		if (periodType === 'quarter') {
			const q = Number(quarter || '0');
			if (![1, 2, 3, 4].includes(q)) {
				return NextResponse.json({ error: 'Trimestre inválido. Debe ser 1, 2, 3 o 4.' }, { status: 400 });
			}
			const startMonth = (q - 1) * 3 + 1; // 1,4,7,10
			const endMonth = startMonth + 2; // 3,6,9,12

			const startMonthStr = String(startMonth).padStart(2, '0');

			// Calcular último día del mes final
			const lastDay = new Date(Number(year), endMonth, 0).getDate();
			const endMonthStr = String(endMonth).padStart(2, '0');

			startDate = `${year}-${startMonthStr}-01`;
			endDate = `${year}-${endMonthStr}-${String(lastDay).padStart(2, '0')}`;
		} else {
			// Mensual (por defecto)
			const m = month || '01';
			const mNum = Number(m);
			if (Number.isNaN(mNum) || mNum < 1 || mNum > 12) {
				return NextResponse.json({ error: 'Mes inválido. Debe estar entre 01 y 12.' }, { status: 400 });
			}

			const startMonthStr = String(mNum).padStart(2, '0');
			const lastDay = new Date(Number(year), mNum, 0).getDate();
			startDate = `${year}-${startMonthStr}-01`;
			endDate = `${year}-${startMonthStr}-${String(lastDay).padStart(2, '0')}`;
		}

		// Rango en timestamptz (UTC ISO)
		const startIso = `${startDate}T00:00:00+00:00`;
		const endIso = `${endDate}T23:59:59+00:00`;

		// Obtener citas del consultorio en el período
		const { data: appointments, error } = await supabase
			.from('appointment')
			.select('id, scheduled_at, status, selected_service')
			.eq('organization_id', session.organizationId)
			.gte('scheduled_at', startIso)
			.lte('scheduled_at', endIso);

		if (error) {
			console.error('[Role User Service Stats API] Error en query:', error);
			return NextResponse.json({ error: 'Error al obtener datos para las estadísticas' }, { status: 500 });
		}

		const allAppointments = appointments || [];

		const attendedStatuses = ['COMPLETADA', 'COMPLETED'];
		const noShowStatuses = ['NO ASISTIÓ', 'NO_ASISTIO'];

		const totalAppointments = allAppointments.length;
		const attendedAppointments = allAppointments.filter((apt) =>
			attendedStatuses.includes((apt.status || '').toString().toUpperCase()),
		);
		const noShowAppointments = allAppointments.filter((apt) =>
			noShowStatuses.includes((apt.status || '').toString().toUpperCase()),
		);

		const attendedCount = attendedAppointments.length;
		const noShowCount = noShowAppointments.length;
		const attendanceRate = totalAppointments > 0 ? attendedCount / totalAppointments : 0;

		// Agregar por servicio: solo citas asistidas con selected_service no nulo
		const serviceMap = new Map<string, ServiceAgg & { _dateMap: Map<string, number> }>();

		const normalizeSelectedService = (
			raw: any,
		): Array<{ name?: string; price?: number; currency?: string }> | null => {
			if (!raw) return null;
			let data = raw;
			try {
				if (typeof data === 'string') {
					data = JSON.parse(data);
				}
			} catch {
				// Si no es JSON válido, usar como nombre simple
				return [
					{
						name: String(raw),
						price: undefined,
						currency: undefined,
					},
				];
			}

			// Si viene array, tomamos cada item como servicio individual
			if (Array.isArray(data)) {
				return data
					.map((item) => (item && typeof item === 'object' ? item : null))
					.filter(Boolean) as Array<{ name?: string; price?: number; currency?: string }>;
			}

			if (typeof data === 'object' && data !== null) {
				return [data as { name?: string; price?: number; currency?: string }];
			}

			return null;
		};

		for (const apt of attendedAppointments) {
			if (!apt.selected_service) continue;

			const services = normalizeSelectedService(apt.selected_service);
			if (!services || services.length === 0) continue;

			const dateKey = new Date(apt.scheduled_at).toISOString().split('T')[0]; // YYYY-MM-DD

			for (const s of services) {
				const name = (s.name || 'Servicio').toString().trim();
				if (!name) continue;

				const price = s.price != null ? Number(s.price) : NaN;
				const hasValidPrice = !Number.isNaN(price) && price >= 0;
				const currency = (s.currency || 'USD').toString();

				const existing = serviceMap.get(name);
				if (!existing) {
					const dateMap = new Map<string, number>();
					dateMap.set(dateKey, 1);
					const totalRevenue = hasValidPrice ? price : 0;
					serviceMap.set(name, {
						name,
						totalCount: 1,
						totalRevenue,
						currency: hasValidPrice ? currency : null,
						averagePrice: 0, // se calcula luego
						dates: [], // se llena luego
						_dateMap: dateMap,
					});
				} else {
					existing.totalCount += 1;
					if (hasValidPrice) {
						existing.totalRevenue += price;
						// Si no tenía currency, asignar
						if (!existing.currency) existing.currency = currency;
					}
					const prev = existing._dateMap.get(dateKey) || 0;
					existing._dateMap.set(dateKey, prev + 1);
				}
			}
		}

		const services: ServiceAgg[] = [];
		for (const [, agg] of serviceMap) {
			const dates: ServiceAggDate[] = [];
			for (const [date, count] of agg._dateMap.entries()) {
				dates.push({ date, count });
			}
			// Ordenar fechas ascendente
			dates.sort((a, b) => a.date.localeCompare(b.date));

			const averagePrice =
				agg.totalCount > 0 && agg.totalRevenue > 0 ? Number((agg.totalRevenue / agg.totalCount).toFixed(2)) : 0;

			services.push({
				name: agg.name,
				totalCount: agg.totalCount,
				totalRevenue: Number(agg.totalRevenue.toFixed(2)),
				currency: agg.currency,
				averagePrice,
				dates,
			});
		}

		// Ordenar servicios por frecuencia descendente
		services.sort((a, b) => b.totalCount - a.totalCount);

		return NextResponse.json(
			{
				period: {
					type: periodType,
					year,
					month: periodType === 'month' ? month : null,
					quarter: periodType === 'quarter' ? quarter : null,
					startDate,
					endDate,
				},
				totals: {
					totalAppointments,
					attendedCount,
					noShowCount,
					attendanceRate,
				},
				services,
			},
			{ status: 200 },
		);
	} catch (err: any) {
		console.error('[Role User Service Stats API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}


