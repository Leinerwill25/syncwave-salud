import { NextRequest, NextResponse } from 'next/server';

import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const { id } = await params;
        const supabase = supabaseAdmin;

		// Obtener la cita con todas sus relaciones
		// Nota: unregisteredpatients usa snake_case (first_name, last_name, identification)
		const { data: appointment, error } = await supabase
			.from('appointment')
			.select(
				`id,
				scheduled_at,
				status,
				reason,
				location,
				referral_source,
				selected_service,
				patient:patient_id(firstName, lastName, identifier),
				unregistered_patient:unregistered_patient_id(first_name, last_name, identification),
				doctor:doctor_id(id, name)`
			)
			.eq('id', id)
			.eq('organization_id', session.organizationId)
			.single();

		if (error || !appointment) {
			return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
		}

		// Normalizar la cita
		// Manejar que Supabase puede devolver las relaciones como objetos o arrays
		const patientData = Array.isArray(appointment.patient) ? appointment.patient[0] : appointment.patient;
		const unregisteredPatientData = Array.isArray(appointment.unregistered_patient) ? appointment.unregistered_patient[0] : appointment.unregistered_patient;
		
		// Manejar tanto camelCase (patient) como snake_case (unregistered_patient)
		let firstName: string | null = null;
		let lastName: string | null = null;
		
		if (patientData) {
			firstName = (patientData as any).firstName || null;
			lastName = (patientData as any).lastName || null;
		} else if (unregisteredPatientData) {
			firstName = (unregisteredPatientData as any).first_name || null;
			lastName = (unregisteredPatientData as any).last_name || null;
		}
		
		const patientName = firstName && lastName ? `${firstName} ${lastName}` : 'N/A';

		const normalizedAppointment = {
			id: appointment.id,
			patient: patientName,
			reason: appointment.reason || '',
			time: new Date(appointment.scheduled_at).toLocaleTimeString('es-ES', {
				hour: '2-digit',
				minute: '2-digit',
			}),
			status: appointment.status,
			location: appointment.location || '',
			isUnregistered: !!appointment.unregistered_patient,
			bookedBy: (() => {
				const doctorData = Array.isArray(appointment.doctor) ? appointment.doctor[0] : appointment.doctor;
				return doctorData
					? {
							id: (doctorData as any).id,
							name: (doctorData as any).name,
						}
					: null;
			})(),
			selected_service: appointment.selected_service,
			referral_source: appointment.referral_source || null,
			scheduled_at: appointment.scheduled_at,
		};

		return NextResponse.json(normalizedAppointment, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Appointment API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
        console.log('[Role User Appointment PATCH] Starting...');
        
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[Role User Appointment PATCH] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing');
            return NextResponse.json({ error: 'Configuration error: Missing Service Role Key' }, { status: 500 });
        }

		const session = await getRoleUserSessionFromServer();
		if (!session) {
            console.warn('[Role User Appointment PATCH] No session found');
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const { id } = await params;
		const body = await req.json();
        const supabase = supabaseAdmin;

        console.log(`[Role User Appointment PATCH] Updating appointment ${id} for org ${session.organizationId}`);

		// Verificar que la cita pertenece a la organización del role-user
		const { data: existingAppointment, error: checkError } = await supabase.from('appointment').select('id, organization_id').eq('id', id).eq('organization_id', session.organizationId).single();

		if (checkError || !existingAppointment) {
            console.error('[Role User Appointment PATCH] Check error:', checkError);
			return NextResponse.json({ error: 'Cita no encontrada o no autorizada', details: checkError }, { status: 404 });
		}

		// Obtener la cita actual para verificar el estado previo
		const { data: currentAppointment, error: fetchError } = await supabase.from('appointment').select('status, scheduled_at').eq('id', id).single();

		if (fetchError || !currentAppointment) {
             console.error('[Role User Appointment PATCH] Fetch error:', fetchError);
			return NextResponse.json({ error: 'Cita no encontrada (fetch)', details: fetchError }, { status: 404 });
		}

		// Preparar actualización
		const updates: any = {};
		if (body.status !== undefined) updates.status = body.status;
		if (body.scheduled_at !== undefined) {
			updates.scheduled_at = body.scheduled_at;
			updates.updated_at = new Date().toISOString();
		}

        console.log('[Role User Appointment PATCH] Updates to apply:', updates);

		// Actualizar la cita
		const { data: updatedAppointment, error: updateError } = await supabase.from('appointment').update(updates).eq('id', id).select().single();

		if (updateError) {
			console.error('[Role User Appointment API] Error actualizando:', updateError);
			return NextResponse.json({ error: 'Error al actualizar la cita', details: updateError }, { status: 500 });
		}

		// Si la cita estaba CONFIRMADA y se reagenda (cambió scheduled_at), actualizar consultation.started_at si existe
		if (currentAppointment.status === 'CONFIRMADA' && body.scheduled_at && body.scheduled_at !== currentAppointment.scheduled_at) {
			// Buscar consultation asociada a esta cita
			const { data: consultation, error: consultationError } = await supabase.from('consultation').select('id, started_at').eq('appointment_id', id).maybeSingle();

			if (!consultationError && consultation && consultation.started_at) {
				// Actualizar started_at con la nueva fecha/hora
				const { error: consultationUpdateError } = await supabase.from('consultation').update({ started_at: body.scheduled_at, updated_at: new Date().toISOString() }).eq('id', consultation.id);

				if (consultationUpdateError) {
					console.warn('[Role User Appointment API] Error actualizando consultation.started_at:', consultationUpdateError);
					// No fallar la operación principal, solo loguear el warning
				}
			}
		}

		return NextResponse.json({ success: true, appointment: updatedAppointment }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Appointment API] Global Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno', stack: err.stack }, { status: 500 });
	}
}
