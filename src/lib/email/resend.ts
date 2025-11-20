// lib/email/resend.ts
// Servicio centralizado para envío de emails usando Resend

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const APP_NAME = process.env.APP_NAME || 'SyncWave Salud';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL 
	? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
	: 'http://localhost:3000';

// Inicializar cliente Resend
let resendClient: Resend | null = null;

function getResendClient(): Resend {
	if (!resendClient) {
		if (!RESEND_API_KEY) {
			throw new Error('RESEND_API_KEY no está configurada en las variables de entorno');
		}
		resendClient = new Resend(RESEND_API_KEY);
	}
	return resendClient;
}

export interface EmailOptions {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
	from?: string;
	replyTo?: string;
	tags?: Array<{ name: string; value: string }>;
}

/**
 * Envía un email usando Resend
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
	try {
		if (!RESEND_API_KEY) {
			console.error('[Resend] RESEND_API_KEY no está configurada');
			return { success: false, error: 'Email service not configured' };
		}

		const client = getResendClient();
		
		const { data, error } = await client.emails.send({
			from: options.from || EMAIL_FROM,
			to: Array.isArray(options.to) ? options.to : [options.to],
			subject: options.subject,
			html: options.html,
			text: options.text,
			replyTo: options.replyTo,
			tags: options.tags,
		});

		if (error) {
			console.error('[Resend] Error enviando email:', error);
			return { success: false, error: error.message || 'Unknown error' };
		}

		console.log('[Resend] Email enviado exitosamente:', data?.id);
		return { success: true, id: data?.id };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		console.error('[Resend] Exception enviando email:', errorMessage);
		return { success: false, error: errorMessage };
	}
}

/**
 * Obtiene el email del remitente configurado
 */
export function getFromEmail(): string {
	return EMAIL_FROM;
}

/**
 * Obtiene la URL base de la aplicación
 */
export function getAppUrl(): string {
	return APP_URL;
}

/**
 * Obtiene el nombre de la aplicación
 */
export function getAppName(): string {
	return APP_NAME;
}

