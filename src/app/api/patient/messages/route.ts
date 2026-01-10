// app/api/patient/messages/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const url = new URL(request.url);
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50); // Límite por defecto 20, máximo 50
		const limitMessages = Math.min(parseInt(url.searchParams.get('limitMessages') || '5', 10), 10); // Límite de mensajes por conversación

		// Optimizar: hacer queries en paralelo
		const [conversationsResult, directMessagesResult] = await Promise.all([
			// Obtener conversaciones con el último mensaje
			supabase
				.from('message')
				.select(`
					conversation_id,
					body,
					created_at,
					conversation:conversation_id (
						id,
						title,
						organization_id,
						created_at
					)
				`)
				.eq('patient_id', patient.patientId)
				.not('conversation_id', 'is', null)
				.order('created_at', { ascending: false })
				.limit(limit * 2), // Obtener más para deduplicar
			
			// Obtener mensajes directos al paciente
			supabase
				.from('message')
				.select(`
					id,
					conversation_id,
					sender_id,
					recipient_user_id,
					patient_id,
					body,
					attachments,
					read,
					created_at,
					sender:sender_id (
						id,
						name
					),
					recipient:recipient_user_id (
						id,
						name
					),
					conversation:conversation_id (
						id,
						title
					)
				`)
				.eq('patient_id', patient.patientId)
				.is('conversation_id', null)
				.order('created_at', { ascending: false })
				.limit(limit)
		]);

		// Procesar conversaciones
		const conversationMap = new Map<string, any>();
		if (conversationsResult.data) {
			for (const msg of conversationsResult.data) {
				if (msg.conversation_id && msg.conversation && !conversationMap.has(msg.conversation_id)) {
					const conv = Array.isArray(msg.conversation) ? msg.conversation[0] : msg.conversation;
					conversationMap.set(msg.conversation_id, {
						...conv,
						lastMessage: {
							body: msg.body,
							created_at: msg.created_at,
						},
					});
					if (conversationMap.size >= limit) break;
				}
			}
		}

		// Obtener últimos mensajes para cada conversación (query optimizada)
		const conversationIds = Array.from(conversationMap.keys());
		const conversations: any[] = [];
		
		if (conversationIds.length > 0) {
			// Obtener últimos mensajes de cada conversación en una sola query
			const { data: recentMessages } = await supabase
				.from('message')
				.select(`
					id,
					conversation_id,
					sender_id,
					recipient_user_id,
					body,
					read,
					created_at,
					sender:sender_id (
						id,
						name
					),
					recipient:recipient_user_id (
						id,
						name
					)
				`)
				.in('conversation_id', conversationIds)
				.order('created_at', { ascending: false })
				.limit(conversationIds.length * limitMessages);

			// Agrupar mensajes por conversación
			const messagesByConv = new Map<string, any[]>();
			(recentMessages || []).forEach((msg: any) => {
				if (!messagesByConv.has(msg.conversation_id)) {
					messagesByConv.set(msg.conversation_id, []);
				}
				const convMessages = messagesByConv.get(msg.conversation_id)!;
				if (convMessages.length < limitMessages) {
					convMessages.push(msg);
				}
			});

			// Construir respuesta final
			conversationIds.forEach((convId) => {
				const conv = conversationMap.get(convId);
				if (conv) {
					conversations.push({
						...conv,
						messages: messagesByConv.get(convId) || [],
					});
				}
			});
		}

		const directMessages = directMessagesResult.data || [];

		return NextResponse.json({
			conversations,
			messages: directMessages,
		}, {
			headers: {
				'Cache-Control': 'private, max-age=10', // Cache muy corto (mensajes cambian frecuentemente)
			},
		});
	} catch (err: any) {
		console.error('[Patient Messages API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const { conversation_id, recipient_user_id, body: messageBody, attachments } = body;

		if (!messageBody) {
			return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
		}

		// Crear mensaje
		// Nota: sender_id debe ser User.id, no patient.userId directamente
		// Verificar que patient.userId sea el User.id correcto
		const { data: message, error } = await supabase
			.from('message')
			.insert({
				conversation_id: conversation_id || null,
				sender_id: patient.userId, // Este es el User.id del paciente
				recipient_user_id: recipient_user_id || null,
				patient_id: patient.patientId,
				body: messageBody,
				attachments: attachments || [],
				read: false,
			})
			.select()
			.single();

		if (error) {
			console.error('[Patient Messages API] Error creando mensaje:', error);
			return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			data: message,
		});
	} catch (err: any) {
		console.error('[Patient Messages API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

