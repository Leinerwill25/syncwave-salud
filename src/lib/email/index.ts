// lib/email/index.ts
// Exportaciones centralizadas del servicio de email

export { sendEmail, getFromEmail, getAppUrl, getAppName, type EmailOptions } from './resend';
export {
	getInviteEmailTemplate,
	getAppointmentNotificationTemplate,
	getPrescriptionNotificationTemplate,
	getLabResultNotificationTemplate,
	getInvoiceNotificationTemplate,
	getGenericNotificationTemplate,
	getPasswordResetTemplate,
	getWelcomeEmailTemplate,
	getEmailConfirmationTemplate,
} from './templates';

/**
 * Helper para enviar email de notificación basado en el tipo
 */
export async function sendNotificationEmail(
	type: string,
	to: string,
	data: Record<string, unknown>
): Promise<{ success: boolean; id?: string; error?: string }> {
	const { sendEmail } = await import('./resend');
	const templates = await import('./templates');
	
	let subject = '';
	let html = '';

	switch (type) {
		case 'INVITE':
			subject = `Invitación a ${data.organizationName || 'la organización'}`;
			html = templates.getInviteEmailTemplate({
				inviteUrl: data.inviteUrl as string,
				organizationName: data.organizationName as string,
				role: data.role as string,
			});
			break;

		case 'APPOINTMENT_REQUEST':
		case 'APPOINTMENT_CONFIRMED':
		case 'APPOINTMENT_STATUS':
			subject = data.isForDoctor 
				? 'Nueva Cita Solicitada' 
				: (data.newStatus ? `Cita ${String(data.newStatus).replace('_', ' ')}` : 'Cita Confirmada');
			html = templates.getAppointmentNotificationTemplate({
				patientName: data.patientName as string,
				doctorName: data.doctorName as string,
				scheduledAt: data.scheduledAt as string,
				reason: data.reason as string,
				location: data.location as string,
				appointmentUrl: data.appointmentUrl as string,
				isForDoctor: data.isForDoctor as boolean,
			});
			break;

		case 'PRESCRIPTION':
			subject = 'Nueva Receta Médica';
			html = templates.getPrescriptionNotificationTemplate({
				patientName: data.patientName as string,
				doctorName: data.doctorName as string,
				prescriptionDate: data.prescriptionDate as string,
				prescriptionUrl: data.prescriptionUrl as string,
			});
			break;

		case 'LAB_RESULT':
			subject = data.isCritical ? '⚠️ Resultado de Laboratorio Crítico' : 'Nuevos Resultados de Laboratorio';
			html = templates.getLabResultNotificationTemplate({
				patientName: data.patientName as string,
				resultType: data.resultType as string,
				isCritical: data.isCritical as boolean,
				resultDate: data.resultDate as string,
				resultUrl: data.resultUrl as string,
			});
			break;

		case 'INVOICE':
			subject = 'Nueva Factura Disponible';
			html = templates.getInvoiceNotificationTemplate({
				patientName: data.patientName as string,
				invoiceNumber: data.invoiceNumber as string,
				amount: data.amount as string,
				currency: data.currency as string,
				dueDate: data.dueDate as string,
				invoiceUrl: data.invoiceUrl as string,
			});
			break;

		case 'PASSWORD_RESET':
			subject = 'Recuperación de Contraseña';
			html = templates.getPasswordResetTemplate({
				resetUrl: data.resetUrl as string,
				userName: data.userName as string,
			});
			break;

		case 'WELCOME':
			const { getAppName } = await import('./resend');
			subject = `¡Bienvenido a ${getAppName()}!`;
			html = templates.getWelcomeEmailTemplate({
				userName: data.userName as string,
				userEmail: data.userEmail as string,
				loginUrl: data.loginUrl as string,
			});
			break;

		default:
			subject = data.title as string || 'Notificación';
			html = templates.getGenericNotificationTemplate({
				title: data.title as string || 'Notificación',
				message: data.message as string,
				actionUrl: data.actionUrl as string,
				actionText: data.actionText as string,
			});
	}

	return sendEmail({
		to,
		subject,
		html,
		tags: [
			{ name: 'type', value: type },
			{ name: 'app', value: 'syncwave-salud' },
		],
	});
}

