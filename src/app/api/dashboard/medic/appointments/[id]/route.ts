import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { createClient } from '@supabase/supabase-js';
import { createNotifications } from '@/lib/notifications';

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

		// 3️⃣ Si cambió el status → crear notificaciones y enviar emails
		if (body.status && body.status !== current.status) {
			const { patient_id, doctor_id, organization_id, scheduled_at, reason, location } = current;
			const statusText = body.status.replace('_', ' ').toLowerCase();

			// Obtener información del paciente y doctor para los emails
			let patientName: string | undefined;
			let doctorName: string | undefined;
			try {
				const [patientRes, doctorRes] = await Promise.all([
					supabaseAdmin.from('Patient').select('firstName, lastName').eq('id', patient_id).maybeSingle(),
					doctor_id ? supabaseAdmin.from('User').select('name').eq('id', doctor_id).maybeSingle() : Promise.resolve({ data: null }),
				]);
				if (patientRes.data) {
					patientName = `${patientRes.data.firstName} ${patientRes.data.lastName}`;
				}
				if (doctorRes.data) {
					doctorName = doctorRes.data.name || undefined;
				}
			} catch {
				// Ignorar errores
			}

			const appointmentDate = scheduled_at ? new Date(scheduled_at).toLocaleDateString('es-ES', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			}) : '';

			const appointmentUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'}/dashboard/medic/consultas/${id}`;

			await createNotifications([
				{
					userId: patient_id,
					organizationId: organization_id || null,
					type: 'APPOINTMENT_STATUS',
					title: `Tu cita ha sido ${statusText}`,
					message: `El estado de tu cita programada ha cambiado a "${body.status}".`,
					payload: {
						appointmentId: id,
						appointment_id: id,
						newStatus: body.status,
						role: 'PATIENT',
						patientName,
						doctorName,
						scheduledAt: appointmentDate,
						reason: reason || null,
						location: location || null,
						appointmentUrl,
						isForDoctor: false,
					},
					sendEmail: true,
				},
				{
					userId: doctor_id || null,
					organizationId: organization_id || null,
					type: 'APPOINTMENT_STATUS',
					title: `Cita ${statusText}`,
					message: `El estado de una cita que atiendes ahora es "${body.status}".`,
					payload: {
						appointmentId: id,
						appointment_id: id,
						newStatus: body.status,
						role: 'MEDIC',
						patientName,
						doctorName,
						scheduledAt: appointmentDate,
						reason: reason || null,
						location: location || null,
						appointmentUrl,
						isForDoctor: true,
					},
					sendEmail: true,
				},
			]);
		}

		return NextResponse.json({ success: true, appointment: data });
	} catch (error) {
		console.error('❌ Error general al actualizar cita:', error);
		const errorMessage = error instanceof Error ? error.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno al actualizar cita.', detail: errorMessage }, { status: 500 });
	}
}
