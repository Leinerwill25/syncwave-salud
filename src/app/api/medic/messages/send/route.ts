// app/api/medic/messages/send/route.ts
// API para enviar un mensaje

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// POST - Enviar mensaje
export async function POST(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await req.json();
		const { conversation_id, recipient_user_id, patient_id, body: messageBody, attachments } = body;

		if (!messageBody) {
			return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
		}

		// Si no hay conversation_id, crear una nueva conversación
		let finalConversationId = conversation_id;
		if (!finalConversationId) {
			if (!recipient_user_id) {
				return NextResponse.json(
					{ error: 'Se requiere conversation_id o recipient_user_id' },
					{ status: 400 }
				);
			}

			const { data: newConversation, error: convError } = await supabase
				.from('conversation')
				.insert({
					title: null,
					organization_id: user.organizationId || null,
				})
				.select('id')
				.single();

			if (convError || !newConversation) {
				console.error('[Medic Messages API] Error creando conversación:', convError);
				return NextResponse.json({ error: 'Error al crear conversación' }, { status: 500 });
			}

			finalConversationId = newConversation.id;
		}

		// Crear mensaje
		const { data: message, error } = await supabase
			.from('message')
			.insert({
				conversation_id: finalConversationId,
				sender_id: user.userId,
				recipient_user_id: recipient_user_id || null,
				patient_id: patient_id || null,
				body: messageBody,
				attachments: attachments || [],
				read: false,
			})
			.select(`
				id,
				conversation_id,
				sender_id,
				recipient_user_id,
				body,
				attachments,
				read,
				created_at,
				User!fk_message_sender (
					id,
					name,
					email
				)
			`)
			.single();

		if (error) {
			console.error('[Medic Messages API] Error enviando mensaje:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ message }, { status: 201 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Messages API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

