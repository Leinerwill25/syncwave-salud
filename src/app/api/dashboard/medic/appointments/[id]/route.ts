import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await context.params;
		const { supabase } = createSupabaseServerClient();
		const body = await req.json();

		if (!id) {
			return NextResponse.json({ error: 'ID de cita no proporcionado.' }, { status: 400 });
		}

		// 1️⃣ Obtener cita actual antes del cambio
		const { data: current, error: fetchErr } = await supabaseAdmin.from('appointment').select('*').eq('id', id).single();

		if (fetchErr || !current) return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });

		const updateFields: Record<string, any> = {};
		if (body.status) updateFields.status = body.status;
		if (body.scheduled_at) updateFields.scheduled_at = body.scheduled_at;
		if (body.reason) updateFields.reason = body.reason;
		if (body.location) updateFields.location = body.location;
		updateFields.updated_at = new Date().toISOString();

		// 2️⃣ Actualizar cita
		const { data, error } = await supabaseAdmin.from('appointment').update(updateFields).eq('id', id).select('id, patient_id, doctor_id, organization_id, status, reason, scheduled_at').single();

		if (error) {
			console.error('❌ Error al actualizar cita:', error.message);
			return NextResponse.json({ error: 'No se pudo actualizar la cita.' }, { status: 500 });
		}

		// 3️⃣ Si cambió el status → crear notificaciones
		if (body.status && body.status !== current.status) {
			const { patient_id, doctor_id, organization_id } = current;
			const statusText = body.status.replace('_', ' ').toLowerCase();

			const notifications = [
				{
					userId: patient_id,
					organizationId: organization_id,
					type: 'APPOINTMENT_STATUS',
					title: `Tu cita ha sido ${statusText}`,
					message: `El estado de tu cita programada ha cambiado a "${body.status}".`,
					payload: { appointmentId: id, newStatus: body.status, role: 'PATIENT' },
				},
				{
					userId: doctor_id,
					organizationId: organization_id,
					type: 'APPOINTMENT_STATUS',
					title: `Cita ${statusText}`,
					message: `El estado de una cita que atiendes ahora es "${body.status}".`,
					payload: { appointmentId: id, newStatus: body.status, role: 'MEDIC' },
				},
			];

			const { error: notifError } = await supabaseAdmin.from('Notification').insert(notifications);

			if (notifError) console.error('⚠️ Error creando notificaciones:', notifError.message);
		}

		return NextResponse.json({ success: true, appointment: data });
	} catch (error: any) {
		console.error('❌ Error general al actualizar cita:', error);
		return NextResponse.json({ error: 'Error interno al actualizar cita.' }, { status: 500 });
	}
}
