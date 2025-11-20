// lib/email/templates.ts
// Templates de email para diferentes tipos de notificaciones

import { getAppName } from './resend';

function getAppUrl(): string {
	return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL 
		? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
		: 'http://localhost:3000';
}

interface BaseEmailData {
	appName?: string;
	appUrl?: string;
}

/**
 * Template base para emails
 */
function getBaseTemplate(content: string, data?: BaseEmailData): string {
	const appName = data?.appName || getAppName();
	const appUrl = data?.appUrl || getAppUrl();
	
	return `
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${appName}</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
			background-color: #f5f5f5;
		}
		.container {
			background-color: #ffffff;
			border-radius: 8px;
			padding: 30px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		}
		.header {
			text-align: center;
			margin-bottom: 30px;
			padding-bottom: 20px;
			border-bottom: 2px solid #4A90E2;
		}
		.logo {
			font-size: 24px;
			font-weight: bold;
			color: #4A90E2;
			margin-bottom: 10px;
		}
		.content {
			margin: 20px 0;
		}
		.button {
			display: inline-block;
			padding: 12px 24px;
			background-color: #4A90E2;
			color: #ffffff;
			text-decoration: none;
			border-radius: 6px;
			margin: 20px 0;
		}
		.footer {
			margin-top: 30px;
			padding-top: 20px;
			border-top: 1px solid #e0e0e0;
			font-size: 12px;
			color: #666;
			text-align: center;
		}
		.info-box {
			background-color: #f0f7ff;
			border-left: 4px solid #4A90E2;
			padding: 15px;
			margin: 20px 0;
			border-radius: 4px;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<div class="logo">${appName}</div>
		</div>
		<div class="content">
			${content}
		</div>
		<div class="footer">
			<p>Este es un correo automático de ${appName}. Por favor no responda a este mensaje.</p>
			<p>&copy; ${new Date().getFullYear()} ${appName}. Todos los derechos reservados.</p>
		</div>
	</div>
</body>
</html>
	`;
}

/**
 * Template para invitaciones a unirse a una organización
 */
export function getInviteEmailTemplate(data: {
	inviteUrl: string;
	organizationName?: string;
	role?: string;
}): string {
	const content = `
		<h2>Invitación a unirse a ${data.organizationName || 'la organización'}</h2>
		<p>Hola,</p>
		<p>Has sido invitado a unirte a <strong>${data.organizationName || 'una organización'}</strong> en ${getAppName()} como <strong>${data.role || 'usuario'}</strong>.</p>
		<div class="info-box">
			<p><strong>¿Qué sigue?</strong></p>
			<p>Haz clic en el botón siguiente para completar tu registro y aceptar la invitación:</p>
		</div>
		<div style="text-align: center;">
			<a href="${data.inviteUrl}" class="button">Aceptar Invitación</a>
		</div>
		<p>O copia y pega este enlace en tu navegador:</p>
		<p style="word-break: break-all; color: #4A90E2;">${data.inviteUrl}</p>
		<p><strong>Importante:</strong> Este enlace expirará en 7 días. Si no esperabas este correo, puedes ignorarlo de forma segura.</p>
	`;
	return getBaseTemplate(content);
}

/**
 * Template para notificación de nueva cita
 */
export function getAppointmentNotificationTemplate(data: {
	patientName: string;
	doctorName?: string;
	scheduledAt: string;
	reason?: string;
	location?: string;
	appointmentUrl?: string;
	isForDoctor?: boolean;
}): string {
	const recipient = data.isForDoctor ? 'Doctor' : 'Paciente';
	const otherPerson = data.isForDoctor ? data.patientName : (data.doctorName || 'el médico');
	
	const content = `
		<h2>Nueva Cita ${data.isForDoctor ? 'Solicitada' : 'Confirmada'}</h2>
		<p>Hola ${recipient},</p>
		<p>${data.isForDoctor ? 'Un paciente ha solicitado' : 'Se ha confirmado'} una cita médica:</p>
		<div class="info-box">
			<p><strong>${data.isForDoctor ? 'Paciente:' : 'Médico:'}</strong> ${otherPerson}</p>
			<p><strong>Fecha y Hora:</strong> ${data.scheduledAt}</p>
			${data.reason ? `<p><strong>Motivo:</strong> ${data.reason}</p>` : ''}
			${data.location ? `<p><strong>Ubicación:</strong> ${data.location}</p>` : ''}
		</div>
		${data.appointmentUrl ? `
		<div style="text-align: center;">
			<a href="${data.appointmentUrl}" class="button">Ver Detalles de la Cita</a>
		</div>
		` : ''}
		<p>Por favor, asegúrate de estar disponible en el horario indicado.</p>
	`;
	return getBaseTemplate(content);
}

/**
 * Template para notificación de receta médica
 */
export function getPrescriptionNotificationTemplate(data: {
	patientName: string;
	doctorName: string;
	prescriptionDate: string;
	prescriptionUrl?: string;
}): string {
	const content = `
		<h2>Nueva Receta Médica</h2>
		<p>Hola ${data.patientName},</p>
		<p>El Dr./Dra. <strong>${data.doctorName}</strong> ha emitido una nueva receta médica para ti.</p>
		<div class="info-box">
			<p><strong>Fecha de Emisión:</strong> ${data.prescriptionDate}</p>
			<p><strong>Médico:</strong> ${data.doctorName}</p>
		</div>
		${data.prescriptionUrl ? `
		<div style="text-align: center;">
			<a href="${data.prescriptionUrl}" class="button">Ver Receta Completa</a>
		</div>
		` : ''}
		<p><strong>Importante:</strong> Esta receta contiene información médica importante. Por favor, consérvala y preséntala en la farmacia cuando vayas a adquirir los medicamentos.</p>
	`;
	return getBaseTemplate(content);
}

/**
 * Template para notificación de resultados de laboratorio
 */
export function getLabResultNotificationTemplate(data: {
	patientName: string;
	resultType: string;
	isCritical: boolean;
	resultDate: string;
	resultUrl?: string;
}): string {
	const criticalWarning = data.isCritical ? `
		<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
			<p style="color: #856404; font-weight: bold; margin: 0;">⚠️ RESULTADO CRÍTICO</p>
			<p style="color: #856404; margin: 5px 0 0 0;">Este resultado requiere atención inmediata. Por favor, contacta a tu médico.</p>
		</div>
	` : '';
	
	const content = `
		<h2>Nuevos Resultados de Laboratorio</h2>
		<p>Hola ${data.patientName},</p>
		<p>Tienes nuevos resultados de laboratorio disponibles:</p>
		${criticalWarning}
		<div class="info-box">
			<p><strong>Tipo de Análisis:</strong> ${data.resultType}</p>
			<p><strong>Fecha del Resultado:</strong> ${data.resultDate}</p>
			${data.isCritical ? '<p style="color: #dc3545; font-weight: bold;">⚠️ Resultado Crítico</p>' : ''}
		</div>
		${data.resultUrl ? `
		<div style="text-align: center;">
			<a href="${data.resultUrl}" class="button">Ver Resultados Completos</a>
		</div>
		` : ''}
		<p>Por favor, revisa tus resultados y consulta con tu médico si tienes alguna pregunta.</p>
	`;
	return getBaseTemplate(content);
}

/**
 * Template para notificación de factura/pago
 */
export function getInvoiceNotificationTemplate(data: {
	patientName: string;
	invoiceNumber: string;
	amount: string;
	currency: string;
	dueDate?: string;
	invoiceUrl?: string;
}): string {
	const content = `
		<h2>Nueva Factura Disponible</h2>
		<p>Hola ${data.patientName},</p>
		<p>Se ha generado una nueva factura para tus servicios médicos:</p>
		<div class="info-box">
			<p><strong>Número de Factura:</strong> ${data.invoiceNumber}</p>
			<p><strong>Monto:</strong> ${data.amount} ${data.currency}</p>
			${data.dueDate ? `<p><strong>Fecha de Vencimiento:</strong> ${data.dueDate}</p>` : ''}
		</div>
		${data.invoiceUrl ? `
		<div style="text-align: center;">
			<a href="${data.invoiceUrl}" class="button">Ver y Pagar Factura</a>
		</div>
		` : ''}
		<p>Puedes descargar la factura completa desde tu panel de paciente.</p>
	`;
	return getBaseTemplate(content);
}

/**
 * Template para notificación genérica
 */
export function getGenericNotificationTemplate(data: {
	title: string;
	message: string;
	actionUrl?: string;
	actionText?: string;
}): string {
	const content = `
		<h2>${data.title}</h2>
		<div class="content">
			${data.message.split('\n').map(p => `<p>${p}</p>`).join('')}
		</div>
		${data.actionUrl && data.actionText ? `
		<div style="text-align: center;">
			<a href="${data.actionUrl}" class="button">${data.actionText}</a>
		</div>
		` : ''}
	`;
	return getBaseTemplate(content);
}

/**
 * Template para recuperación de contraseña
 */
export function getPasswordResetTemplate(data: {
	resetUrl: string;
	userName?: string;
}): string {
	const content = `
		<h2>Recuperación de Contraseña</h2>
		<p>Hola${data.userName ? ` ${data.userName}` : ''},</p>
		<p>Recibimos una solicitud para restablecer tu contraseña en ${getAppName()}.</p>
		<div class="info-box">
			<p>Si solicitaste este cambio, haz clic en el botón siguiente para crear una nueva contraseña:</p>
		</div>
		<div style="text-align: center;">
			<a href="${data.resetUrl}" class="button">Restablecer Contraseña</a>
		</div>
		<p>O copia y pega este enlace en tu navegador:</p>
		<p style="word-break: break-all; color: #4A90E2;">${data.resetUrl}</p>
		<p><strong>Importante:</strong> Este enlace expirará en 1 hora. Si no solicitaste este cambio, ignora este correo y tu contraseña permanecerá sin cambios.</p>
	`;
	return getBaseTemplate(content);
}

/**
 * Template para bienvenida
 */
export function getWelcomeEmailTemplate(data: {
	userName: string;
	userEmail: string;
	loginUrl?: string;
}): string {
	const content = `
		<h2>¡Bienvenido a ${getAppName()}!</h2>
		<p>Hola ${data.userName},</p>
		<p>Nos complace darte la bienvenida a ${getAppName()}. Tu cuenta ha sido creada exitosamente.</p>
		<div class="info-box">
			<p><strong>Tu cuenta:</strong> ${data.userEmail}</p>
		</div>
		${data.loginUrl ? `
		<div style="text-align: center;">
			<a href="${data.loginUrl}" class="button">Iniciar Sesión</a>
		</div>
		` : ''}
		<p>Estamos aquí para ayudarte. Si tienes alguna pregunta, no dudes en contactarnos.</p>
	`;
	return getBaseTemplate(content);
}

