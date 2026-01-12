// lib/notifications.ts
// Helper para crear notificaciones y enviar emails automáticamente

import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { sendNotificationEmail } from './email';

export interface CreateNotificationOptions {
	userId?: string | null;
	organizationId?: string | null;
	type: string;
	title: string;
	message: string;
	payload?: Record<string, unknown>;
	sendEmail?: boolean; // Por defecto true
}

/**
 * Crea una notificación en la base de datos y opcionalmente envía un email
 */
export async function createNotification(options: CreateNotificationOptions): Promise<{ 
	success: boolean; 
	notificationId?: string; 
	emailSent?: boolean;
	error?: string;
}> {
	try {
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Crear notificación en la base de datos
		const { data: notification, error: notifError } = await supabase
			.from('notification')
			.insert({
				userId: options.userId || null,
				organizationId: options.organizationId || null,
				type: options.type,
				title: options.title,
				message: options.message,
				payload: options.payload || null,
				read: false,
			})
			.select('id')
			.single();

		if (notifError || !notification) {
			console.error('[createNotification] Error creando notificación:', notifError);
			return { success: false, error: notifError?.message || 'Error creando notificación' };
		}

		// Enviar email si está habilitado y hay userId
		let emailSent = false;
		if (options.sendEmail !== false && options.userId) {
			try {
				// Obtener email del usuario - intentar diferentes variantes del nombre de tabla
				let user: { email: string; role?: string } | null = null;
				const userTableVariants = ['user', '"user"'];
				for (const tableName of userTableVariants) {
					try {
						const { data, error: userError } = await supabase
							.from(tableName)
							.select('email, role')
							.eq('id', options.userId)
							.maybeSingle();
						
						if (!userError && data) {
							user = data;
							break;
						}
						if (userError && !userError.message?.includes('does not exist') && !String(userError.code).includes('PGRST205')) {
							// Si es otro tipo de error, detener el loop
							break;
						}
					} catch (err) {
						// Continuar con siguiente variante
						continue;
					}
				}

				if (user?.email) {
					// Verificar preferencias de notificaciones del usuario
					// Por ahora, enviamos el email si existe
					const emailResult = await sendNotificationEmail(
						options.type,
						user.email,
						{
							...options.payload,
							title: options.title,
							message: options.message,
						}
					);

					emailSent = emailResult.success;
					if (emailSent) {
						console.log(`[createNotification] Email enviado a ${user.email} para notificación ${notification.id}`);
					} else {
						console.warn(`[createNotification] Error enviando email:`, emailResult.error);
					}
				}
			} catch (emailErr) {
				console.error('[createNotification] Error enviando email:', emailErr);
				// No fallar la creación de la notificación si el email falla
			}
		}

		return {
			success: true,
			notificationId: notification.id,
			emailSent,
		};
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		console.error('[createNotification] Exception:', errorMessage);
		return { success: false, error: errorMessage };
	}
}

/**
 * Crea múltiples notificaciones y envía emails
 */
export async function createNotifications(
	notifications: CreateNotificationOptions[]
): Promise<Array<{ success: boolean; notificationId?: string; emailSent?: boolean; error?: string }>> {
	return Promise.all(notifications.map(createNotification));
}

/**
 * Helper para obtener URL de detalles según el tipo de notificación
 */
export function getNotificationUrl(type: string, payload: Record<string, unknown>): string | undefined {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL 
		? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
		: 'http://localhost:3000';
	
	switch (type) {
		case 'APPOINTMENT_REQUEST':
		case 'APPOINTMENT_CONFIRMED':
		case 'APPOINTMENT_STATUS':
			if (payload.appointmentId) {
				return `${appUrl}/dashboard/medic/consultas/${payload.appointmentId}`;
			}
			break;
		case 'PRESCRIPTION':
			if (payload.prescriptionId) {
				return `${appUrl}/dashboard/patient/recetas`;
			}
			break;
		case 'LAB_RESULT':
			if (payload.labResultId) {
				return `${appUrl}/dashboard/patient/resultados`;
			}
			break;
		case 'INVOICE':
			if (payload.invoiceId) {
				return `${appUrl}/dashboard/patient/pagos`;
			}
			break;
	}
	return undefined;
}

