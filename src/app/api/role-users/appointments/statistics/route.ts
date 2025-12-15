import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer, roleNameEquals } from '@/lib/role-user-auth';

export async function GET(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Solo el rol "Asistente De Citas" puede acceder a estas estadísticas
		if (!roleNameEquals(session.roleName, 'Asistente De Citas')) {
			return NextResponse.json({ error: 'Acceso denegado. Solo Asistentes de Citas pueden ver estadísticas.' }, { status: 403 });
		}

		const supabase = await createSupabaseServerClient();
		const url = new URL(req.url);
		const month = url.searchParams.get('month');
		const year = url.searchParams.get('year');

		if (!year) {
			return NextResponse.json({ error: 'Debe especificarse un año para las estadísticas.' }, { status: 400 });
		}

		// Construir rango de fechas
		let startDate: string;
		let endDate: string;

		if (month) {
			startDate = `${year}-${month}-01`;
			// Calcular último día del mes
			const lastDay = new Date(Number(year), Number(month), 0).getDate();
			endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
		} else {
			startDate = `${year}-01-01`;
			endDate = `${year}-12-31`;
		}

		// Obtener todas las citas creadas por este role-user en el período
		const { data: appointments, error } = await supabase.from('appointment').select('id, scheduled_at, status, patient:patient_id(firstName, lastName), unregistered_patient:unregistered_patient_id(first_name, last_name)').eq('created_by_role_user_id', session.roleUserId).eq('organization_id', session.organizationId).gte('scheduled_at', `${startDate}T00:00:00`).lte('scheduled_at', `${endDate}T23:59:59`);

		if (error) {
			console.error('[Role User Statistics API] Error en query:', error);
			return NextResponse.json({ error: 'Error al obtener datos para las estadísticas' }, { status: 500 });
		}

		const allAppointments = appointments || [];
		const totalCreated = allAppointments.length;

		// Citas efectivas: COMPLETADA o EN_CURSO
		const effectiveAppointments = allAppointments.filter((apt) => apt.status === 'COMPLETADA' || apt.status === 'EN_CURSO' || apt.status === 'EN CURSO');
		const effectiveCount = effectiveAppointments.length;

		// Citas reagendadas: REAGENDADA
		const rescheduledAppointments = allAppointments.filter((apt) => apt.status === 'REAGENDADA');
		const rescheduledCount = rescheduledAppointments.length;

		// No asistieron: NO ASISTIÓ o NO_ASISTIO
		const noShowAppointments = allAppointments.filter((apt) => apt.status === 'NO ASISTIÓ' || apt.status === 'NO_ASISTIO');
		const noShowCount = noShowAppointments.length;

		// Normalizar datos de pacientes para las listas
		const normalizeAppointment = (apt: any) => {
			const patient = apt.patient || apt.unregistered_patient;
			const firstName = patient?.firstName || patient?.first_name;
			const lastName = patient?.lastName || patient?.last_name;
			const patientName = patient && firstName && lastName ? `${firstName} ${lastName}` : 'N/A';

			return {
				id: apt.id,
				patient: patientName,
				scheduled_at: apt.scheduled_at,
				status: apt.status,
			};
		};

		const effectiveAppointmentsList = effectiveAppointments.map(normalizeAppointment);
		const rescheduledAppointmentsList = rescheduledAppointments.map(normalizeAppointment);

		return NextResponse.json(
			{
				stats: {
					effectiveCount,
					rescheduledCount,
					noShowCount,
					totalCreated,
				},
				effectiveAppointments: effectiveAppointmentsList,
				rescheduledAppointments: rescheduledAppointmentsList,
			},
			{ status: 200 }
		);
	} catch (err: any) {
		console.error('[Role User Statistics API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}
