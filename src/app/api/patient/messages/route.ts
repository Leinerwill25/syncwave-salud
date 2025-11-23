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
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Obtener conversaciones donde el paciente participa
		// Primero obtener IDs de conversaciones donde hay mensajes del paciente
		const { data: patientMessages } = await supabase
			.from('message')
			.select('conversation_id')
			.eq('patient_id', patient.patientId)
			.not('conversation_id', 'is', null);

		const conversationIds = [...new Set((patientMessages || []).map((m: any) => m.conversation_id).filter(Boolean))];

		let conversations: any[] = [];
		if (conversationIds.length > 0) {
			const { data: convs, error: convError } = await supabase
				.from('conversation')
				.select(`
					id,
					title,
					organization_id,
					created_at,
					messages:message!fk_message_conv (
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
							email,
							role
						),
						recipient:User!fk_message_recipient (
							id,
							name,
							email,
							role
						)
					)
				`)
				.in('id', conversationIds)
				.order('created_at', { ascending: false });

			if (convError) {
				console.error('[Patient Messages API] Error obteniendo conversaciones:', convError);
			} else {
				conversations = convs || [];
				
				// Enriquecer conversaciones con información del médico
				for (const conv of conversations) {
					const messages = conv.messages || [];
					const patientUserId = patient.userId;
					
					// Identificar el ID del doctor en la conversación
					let doctorUserId: string | null = null;
					for (const msg of messages) {
						// Si el sender no es el paciente, el sender es el doctor
						if (msg.sender_id && msg.sender_id !== patientUserId) {
							doctorUserId = msg.sender_id;
							break;
						}
						// Si el sender es el paciente, el recipient es el doctor
						if (msg.sender_id === patientUserId && msg.recipient_user_id) {
							doctorUserId = msg.recipient_user_id;
							break;
						}
					}
					
					// Obtener información del médico si existe
					if (doctorUserId) {
						const { data: doctorUser } = await supabase
							.from('User')
							.select(`
								id,
								name,
								email,
								medic_profile:medic_profile!fk_medic_profile_doctor (
									specialty,
									private_specialty,
									photo_url
								)
							`)
							.eq('id', doctorUserId)
							.eq('role', 'MEDICO')
							.maybeSingle();
						
						if (doctorUser) {
							// Agregar información del doctor a la conversación
							interface MedicProfile {
								specialty?: string | null;
								private_specialty?: string | null;
								photo_url?: string | null;
							}
							const medicProfile: MedicProfile | undefined = Array.isArray(doctorUser.medic_profile)
								? (doctorUser.medic_profile[0] as MedicProfile)
								: (doctorUser.medic_profile as MedicProfile | undefined);
							conv.doctorInfo = {
								id: doctorUser.id,
								name: doctorUser.name,
								email: doctorUser.email,
								specialty: medicProfile?.specialty || medicProfile?.private_specialty || null,
								photo: medicProfile?.photo_url || null,
							};
						}
					}
				}
			}
		}

		// También obtener mensajes directos al paciente
		const { data: directMessages, error: msgError } = await supabase
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
				conversation:conversation!fk_message_conv (
					id,
					title
				)
			`)
			.eq('patient_id', patient.patientId)
			.order('created_at', { ascending: false });

		if (msgError) {
			console.error('[Patient Messages API] Error obteniendo mensajes:', msgError);
		}

		return NextResponse.json({
			conversations: conversations || [],
			messages: directMessages || [],
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
		const { supabase } = createSupabaseServerClient(cookieStore);

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

