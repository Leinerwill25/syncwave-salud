// app/api/medic/messages/[id]/route.ts
// API para obtener mensajes de una conversación específica

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Obtener mensajes de una conversación
export async function GET(
	req: Request,
	context: { params: Promise<{ id: string }> }
) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { id } = await context.params;
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Verificar que el médico participa en la conversación
		const { data: conversation, error: convError } = await supabase
			.from('conversation')
			.select('id, title, organization_id')
			.eq('id', id)
			.single();

		if (convError || !conversation) {
			return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
		}

		// Obtener mensajes con información del sender y recipient
		// Usamos alias para evitar el error de "table name specified more than once"
		const { data: messages, error } = await supabase
			.from('message')
			.select(`
				id,
				sender_id,
				recipient_user_id,
				patient_id,
				body,
				attachments,
				read,
				created_at,
				sender:User!fk_message_sender (
					id,
					name,
					email
				),
				recipient:User!fk_message_recipient (
					id,
					name,
					email
				),
				Patient:patient_id (
					id,
					firstName,
					lastName
				)
			`)
			.eq('conversation_id', id)
			.order('created_at', { ascending: true });

		// Obtener información del paciente de la conversación
		const patientId = messages?.[0]?.patient_id;
		let patientInfo = null;
		if (patientId) {
			const { data: patient } = await supabase
				.from('Patient')
				.select('id, firstName, lastName')
				.eq('id', patientId)
				.maybeSingle();
			patientInfo = patient;
		}

		if (error) {
			console.error('[Medic Messages API] Error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Verificar que el médico participa
		const hasAccess = (messages || []).some(
			(msg: any) => msg.sender_id === user.userId || msg.recipient_user_id === user.userId
		);

		if (!hasAccess && messages && messages.length > 0) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		// Marcar mensajes como leídos si el médico es el destinatario
		await supabase
			.from('message')
			.update({ read: true })
			.eq('conversation_id', id)
			.eq('recipient_user_id', user.userId)
			.eq('read', false);

		return NextResponse.json(
			{
				conversation,
				messages: messages || [],
				patient: patientInfo,
			},
			{ status: 200 }
		);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Messages API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

