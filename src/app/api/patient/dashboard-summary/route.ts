// app/api/patient/dashboard-summary/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';

export async function GET() {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();

		// Ejecutar todas las consultas pesadas en paralelo en el servidor
		const [
			nextAppointmentRes,
			appointmentsCountRes,
			prescriptionsRes,
			resultsRes,
			messagesRes,
			rewardsRes
		] = await Promise.all([
			// Próxima cita
			supabase
				.from('appointment')
				.select(`
					id, scheduled_at, status, reason,
					doctor:doctor_id ( name ),
					organization:organization_id ( name )
				`)
				.eq('patient_id', patient.patientId)
				.gte('scheduled_at', new Date().toISOString())
				.eq('status', 'SCHEDULED')
				.order('scheduled_at', { ascending: true })
				.limit(1)
				.maybeSingle(),

			// Conteo de citas próximas
			supabase
				.from('appointment')
				.select('id', { count: 'exact', head: true })
				.eq('patient_id', patient.patientId)
				.gte('scheduled_at', new Date().toISOString())
				.eq('status', 'SCHEDULED'),

			// Recetas activas
			supabase
				.from('prescription')
				.select('id', { count: 'exact', head: true })
				.eq('patient_id', patient.patientId)
				.eq('status', 'ACTIVE'),

			// Resultados pendientes (no vistos por el paciente)
			supabase
				.from('lab_result_upload')
				.select('id', { count: 'exact', head: true })
				.eq('patient_id', patient.patientId)
				.eq('viewed_by_patient', false),

			// Mensajes no leídos
			supabase
				.from('message')
				.select('id', { count: 'exact', head: true })
				.eq('receiver_id', patient.authId)
				.eq('read', false),

			// Rewards activos
			supabase
				.from('patient_reward_redemptions')
				.select('reward_id')
				.eq('patient_id', patient.patientId)
				.eq('status', 'active')
		]);

		return NextResponse.json({
			profile: {
				id: patient.authId,
				name: patient.patient?.firstName + ' ' + (patient.patient?.lastName || ''),
				hasVerifiedBadge: patient.patient?.hasVerifiedBadge || false,
			},
			nextAppointment: nextAppointmentRes.data,
			stats: {
				upcomingAppointments: appointmentsCountRes.count || 0,
				activePrescriptions: prescriptionsRes.count || 0,
				pendingResults: resultsRes.count || 0,
				unreadMessages: messagesRes.count || 0,
			},
			hasVerifiedBadge: rewardsRes.data?.some(r => r.reward_id === 'verified_badge') || false
		}, {
			headers: {
				'Cache-Control': 'private, max-age=30', // Cache corta para dashboard
			}
		});

	} catch (err: any) {
		console.error('[Dashboard Summary API] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}
