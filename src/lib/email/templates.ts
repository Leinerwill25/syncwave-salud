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
/**
 * Template base para emails con diseño Premium
 */
function getBaseTemplate(content: string, data?: BaseEmailData): string {
	const appName = data?.appName || getAppName();
	
	return `
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${appName}</title>
	<!--[if mso]>
	<noscript>
	<xml>
	<o:OfficeDocumentSettings>
	<o:PixelsPerInch>96</o:PixelsPerInch>
	</o:OfficeDocumentSettings>
	</xml>
	</noscript>
	<![endif]-->
	<style>
		@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
		body {
			font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
			line-height: 1.6;
			color: #1e293b;
			margin: 0;
			padding: 0;
			background-color: #f1f5f9;
			-webkit-font-smoothing: antialiased;
		}
		.wrapper {
			width: 100%;
			background-color: #f1f5f9;
			padding: 40px 0;
		}
		.container {
			background-color: #ffffff;
			border-radius: 16px;
			max-width: 600px;
			margin: 0 auto;
			box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
			overflow: hidden;
		}
		.header {
			background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
			padding: 32px 40px;
			text-align: center;
		}
		.logo {
			font-size: 24px;
			font-weight: 700;
			color: #ffffff;
			letter-spacing: -0.5px;
			text-decoration: none;
		}
		.content {
			padding: 40px;
		}
		h1, h2, h3 {
			color: #0f172a;
			margin-top: 0;
		}
		p {
			color: #475569;
			font-size: 16px;
			margin-bottom: 24px;
		}
		.button {
			display: inline-block;
			padding: 14px 32px;
			background-color: #059669; /* Emerald 600 */
			color: #ffffff !important;
			text-decoration: none;
			border-radius: 12px;
			font-weight: 600;
			font-size: 16px;
			text-align: center;
			transition: background-color 0.2s;
			box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);
		}
		.button:hover {
			background-color: #047857;
		}
		.info-box {
			background-color: #f8fafc;
			border: 1px solid #e2e8f0;
			border-radius: 12px;
			padding: 24px;
			margin: 24px 0;
		}
		.info-item {
			margin-bottom: 12px;
		}
		.info-item:last-child {
			margin-bottom: 0;
		}
		.info-label {
			font-size: 12px;
			text-transform: uppercase;
			color: #64748b;
			font-weight: 600;
			letter-spacing: 0.5px;
			display: block;
			margin-bottom: 4px;
		}
		.info-value {
			font-size: 16px;
			color: #0f172a;
			font-weight: 500;
		}
		.footer {
			background-color: #f8fafc;
			padding: 32px 40px;
			text-align: center;
			border-top: 1px solid #e2e8f0;
		}
		.footer p {
			font-size: 13px;
			color: #94a3b8;
			margin-bottom: 8px;
		}
		.divider {
			height: 1px;
			background-color: #e2e8f0;
			margin: 32px 0;
		}
		.highlight {
			color: #059669;
			font-weight: 600;
		}
	</style>
</head>
<body>
	<div class="wrapper">
		<div class="container">
			<div class="header">
				<div class="logo">${appName}</div>
			</div>
			<div class="content">
				${content}
			</div>
			<div class="footer">
				<p>Este es un mensaje automático de ${appName}.</p>
				<p>&copy; ${new Date().getFullYear()} ${appName}. Todos los derechos reservados.</p>
			</div>
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
	const orgName = data.organizationName || 'nuestra organización';
	
	const content = `
		<h2 style="font-size: 24px; font-weight: 700; margin-bottom: 24px; text-align: center;">Invitación Profesional</h2>
		
		<p>Hola,</p>
		
		<p>La clínica <strong>${orgName}</strong> te ha invitado a formar parte de su equipo médico en la plataforma <strong>${getAppName()}</strong>.</p>
		
		<p>Esta invitación te permitirá acceder al panel de especialistas, gestionar tus citas, pacientes y expedientes de manera integral.</p>

		<div class="info-box">
			<div class="info-item">
				<span class="info-label">Organización</span>
				<span class="info-value">${orgName}</span>
			</div>
			<div class="info-item">
				<span class="info-label">Rol Asignado</span>
				<span class="info-value">${data.role || 'Especialista'}</span>
			</div>
		</div>

		<div style="text-align: center; margin: 32px 0;">
			<a href="${data.inviteUrl}" class="button">Aceptar Invitación</a>
		</div>

		<p style="font-size: 14px; color: #64748b; text-align: center;">
			Este enlace es personal e intransferible. Caduca en 7 días.
		</p>
		
		<div class="divider"></div>
		
		<p style="font-size: 13px; color: #94a3b8; margin-bottom: 0;">
			Si tienes problemas con el botón, copia este enlace:<br>
			<a href="${data.inviteUrl}" style="color: #059669; text-decoration: none; word-break: break-all;">${data.inviteUrl}</a>
		</p>
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
			<a href="${data.loginUrl}" class="button">Confirmar Email e Iniciar Sesión</a>
		</div>
		` : ''}
		<p>Estamos aquí para ayudarte. Si tienes alguna pregunta, no dudes en contactarnos.</p>
	`;
	return getBaseTemplate(content);
}

/**
 * Template para confirmación de email
 */
export function getEmailConfirmationTemplate(data: {
	userName: string;
	userEmail: string;
	confirmationUrl: string;
}): string {
	const content = `
		<h2>¡Bienvenido a ${getAppName()}!</h2>
		<p>Hola ${data.userName},</p>
		<p>Nos complace darte la bienvenida a ${getAppName()}. Tu cuenta ha sido creada exitosamente.</p>
		<div class="info-box">
			<p><strong>Tu cuenta:</strong> ${data.userEmail}</p>
		</div>
		<p>Para activar tu cuenta, por favor confirma tu dirección de correo electrónico haciendo clic en el botón a continuación:</p>
		<div style="text-align: center;">
			<a href="${data.confirmationUrl}" class="button">Confirmar Email</a>
		</div>
		<p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
		<p style="word-break: break-all; color: #64748b; font-size: 14px;">${data.confirmationUrl}</p>
		<p>Estamos aquí para ayudarte. Si tienes alguna pregunta, no dudes en contactarnos.</p>
	`;
	return getBaseTemplate(content);
}

