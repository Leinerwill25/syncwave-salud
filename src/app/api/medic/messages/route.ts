// app/api/medic/messages/route.ts
// API para que el médico gestione mensajes

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Lista conversaciones del médico
export async function GET(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Obtener conversaciones donde el médico es sender o recipient
		const { data: conversations, error } = await supabase
			.from('conversation')
			.select(`
				id,
				title,
				organization_id,
				created_at,
				message!fk_message_conv (
					id,
					sender_id,
					recipient_user_id,
					body,
					read,
					created_at
				)
			`)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('[Medic Messages API] Error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Filtrar conversaciones donde el médico participa
		const medicConversations = (conversations || []).filter((conv: any) => {
			const messages = conv.message || [];
			return messages.some(
				(msg: any) => msg.sender_id === user.userId || msg.recipient_user_id === user.userId
			);
		});

		// Obtener última mensaje y detalles para cada conversación
		const enrichedConversations = await Promise.all(
			medicConversations.map(async (conv: any) => {
				const { data: lastMessage } = await supabase
					.from('message')
					.select(`
						*,
						sender:User!fk_message_sender(id, name, email),
						recipient:User!fk_message_recipient(id, name, email),
						Patient:patient_id(id, firstName, lastName)
					`)
					.eq('conversation_id', conv.id)
					.order('created_at', { ascending: false })
					.limit(1)
					.single();

				const { count: unreadCount } = await supabase
					.from('message')
					.select('id', { count: 'exact', head: true })
					.eq('conversation_id', conv.id)
					.eq('recipient_user_id', user.userId)
					.eq('read', false);

				// Obtener información del paciente de la conversación
				const patientId = lastMessage?.patient_id;
				let patientInfo = null;
				if (patientId) {
					const { data: patient } = await supabase
						.from('Patient')
						.select('id, firstName, lastName')
						.eq('id', patientId)
						.maybeSingle();
					patientInfo = patient;
				}

				return {
					...conv,
					lastMessage: lastMessage || null,
					unreadCount: unreadCount || 0,
					patient: patientInfo,
				};
			})
		);

		return NextResponse.json({ conversations: enrichedConversations }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Messages API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

