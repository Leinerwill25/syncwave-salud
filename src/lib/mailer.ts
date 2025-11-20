// lib/mailer.ts
// Servicio de email usando Resend (reemplaza SendGrid)
import { sendNotificationEmail } from './email';

export async function sendInviteEmail(to: string, inviteUrl: string, orgName: string) {
	const result = await sendNotificationEmail('INVITE', to, {
		inviteUrl,
		organizationName: orgName,
		role: 'ESPECIALISTA',
	});

	if (!result.success) {
		throw new Error(result.error || 'Error al enviar email de invitación');
	}
}
