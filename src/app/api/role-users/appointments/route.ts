import { NextRequest, NextResponse } from 'next/server';

import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

export async function GET(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const url = new URL(req.url);
		const month = url.searchParams.get('month'); // Formato: YYYY-MM
		const year = url.searchParams.get('year'); // Formato: YYYY

		// Construir query base
		let query = supabaseAdmin
			.from('appointment')
			.select(
				`id, 
				scheduled_at, 
				status, 
				reason, 
				location, 
				referral_source,
				created_at,
				patient:patient_id(firstName, lastName, identifier),
				unregistered_patient:unregistered_patient_id(first_name, last_name, identification),
				doctor:doctor_id(name)`
			)
            // Mostrar todas las citas de la organización, no solo las creadas por este usuario.
            // Si se requiere filtrar solo por "Mis Citas", descomentar la siguiente línea:
			// .eq('created_by_role_user_id', session.roleUserId) 
			.eq('organization_id', session.organizationId)
			.order('scheduled_at', { ascending: false });

		// Filtrar por mes y año si se proporcionan
		if (month && year) {
			const startDate = `${year}-${month}-01`;
			// Calcular el último día del mes real para evitar "February 31"
			const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
			const endDate = `${year}-${month}-${lastDay}`;
			// Incluimos hasta el final del día
			query = query.gte('scheduled_at', startDate).lte('scheduled_at', endDate + ' 23:59:59');
		} else if (year) {
			const startDate = `${year}-01-01`;
			const endDate = `${year}-12-31`;
			query = query.gte('scheduled_at', startDate).lte('scheduled_at', endDate);
		}

		const { data: appointments, error } = await query;

		if (error) {
			console.error('[Role User Appointments API] Error:', error);
			// Retornar detalles del error para depuración
			return NextResponse.json({ error: 'Error al obtener citas', details: error }, { status: 500 });
		}

		// Normalizar las citas para incluir información del paciente
		const normalizedAppointments = (appointments || []).map((apt: any) => {
			const patient = apt.patient || apt.unregistered_patient;
			// Manejar tanto camelCase (patient) como snake_case (unregistered_patient)
			const firstName = patient?.firstName || patient?.first_name;
			const lastName = patient?.lastName || patient?.last_name;
			const identifier = patient?.identifier || patient?.identification;
			const patientName = patient && firstName && lastName ? `${firstName} ${lastName}` : 'N/A';
			return {
				id: apt.id,
				scheduledAt: apt.scheduled_at,
				status: apt.status,
				reason: apt.reason,
				location: apt.location,
				referralSource: apt.referral_source,
				createdAt: apt.created_at,
				patientName,
				patientIdentifier: identifier || null,
				isUnregistered: !!apt.unregistered_patient,
				doctorName: apt.doctor?.name || null,
			};
		});

		return NextResponse.json({ appointments: normalizedAppointments }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Appointments API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}
