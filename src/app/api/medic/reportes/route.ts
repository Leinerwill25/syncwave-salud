// app/api/medic/reportes/route.ts
// API para generar reportes del médico

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Obtener reportes del médico
export async function GET(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const url = new URL(req.url);
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');

		const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
		const end = endDate ? new Date(endDate) : new Date();

		// Citas por mes
		const { data: appointments, error: appointmentsError } = await supabase
			.from('appointment')
			.select('id, scheduled_at, status')
			.eq('doctor_id', user.userId)
			.gte('scheduled_at', start.toISOString())
			.lte('scheduled_at', end.toISOString());

		// Consultas por mes
		const { data: consultations, error: consultationsError } = await supabase
			.from('consultation')
			.select('id, started_at, diagnosis')
			.eq('doctor_id', user.userId)
			.gte('started_at', start.toISOString())
			.lte('started_at', end.toISOString());

		// Ingresos (facturacion)
		const { data: invoices, error: invoicesError } = await supabase
			.from('facturacion')
			.select('total, currency, fecha_emision, estado_pago')
			.eq('doctor_id', user.userId)
			.gte('fecha_emision', start.toISOString())
			.lte('fecha_emision', end.toISOString());

		// Diagnósticos más comunes
		const { data: diagnosisData, error: diagnosisError } = await supabase
			.from('consultation')
			.select('diagnosis')
			.eq('doctor_id', user.userId)
			.not('diagnosis', 'is', null)
			.gte('started_at', start.toISOString())
			.lte('started_at', end.toISOString());

		// Órdenes emitidas
		const { data: orders, error: ordersError } = await supabase
			.from('lab_result')
			.select('id, created_at, status')
			.eq('ordering_provider_id', user.userId)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString());

		// Resultados críticos
		const { data: criticalResults, error: criticalError } = await supabase
			.from('lab_result')
			.select('id, reported_at')
			.eq('is_critical', true)
			.gte('reported_at', start.toISOString())
			.lte('reported_at', end.toISOString());

		// Procesar diagnósticos
		const diagnosisCounts: Record<string, number> = {};
		(diagnosisData || []).forEach((c: any) => {
			if (c.diagnosis) {
				diagnosisCounts[c.diagnosis] = (diagnosisCounts[c.diagnosis] || 0) + 1;
			}
		});

		const topDiagnoses = Object.entries(diagnosisCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([diagnosis, count]) => ({ diagnosis, count }));

		// Calcular ingresos
		const totalIncome = (invoices || []).reduce((sum: number, inv: any) => {
			if (inv.estado_pago === 'pagado') {
				return sum + Number(inv.total || 0);
			}
			return sum;
		}, 0);

		// Agrupar por mes
		const appointmentsByMonth: Record<string, number> = {};
		(appointments || []).forEach((apt: any) => {
			const month = new Date(apt.scheduled_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
			appointmentsByMonth[month] = (appointmentsByMonth[month] || 0) + 1;
		});

		const consultationsByMonth: Record<string, number> = {};
		(consultations || []).forEach((cons: any) => {
			const month = new Date(cons.started_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
			consultationsByMonth[month] = (consultationsByMonth[month] || 0) + 1;
		});

		return NextResponse.json(
			{
				appointmentsByMonth: Object.entries(appointmentsByMonth).map(([month, count]) => ({
					month,
					count,
				})),
				consultationsByMonth: Object.entries(consultationsByMonth).map(([month, count]) => ({
					month,
					count,
				})),
				totalIncome,
				topDiagnoses,
				totalOrders: (orders || []).length,
				totalCriticalResults: (criticalResults || []).length,
				stats: {
					totalAppointments: (appointments || []).length,
					totalConsultations: (consultations || []).length,
					totalInvoices: (invoices || []).length,
					paidInvoices: (invoices || []).filter((inv: any) => inv.estado_pago === 'pagado').length,
				},
			},
			{ status: 200 }
		);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Reportes API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

