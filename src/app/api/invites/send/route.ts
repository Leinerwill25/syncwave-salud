// app/api/invite/send/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import nodemailer from 'nodemailer';

const APP_URL = process.env.APP_URL?.replace(/\/$/, '') ?? ''; // e.g. https://app.syncwave.com.ve

// SMTP envs (configura en .env)
const SMTP_HOST = process.env.SMTP_HOST ?? '';
const SMTP_PORT = Number(process.env.SMTP_PORT ?? '587');
const SMTP_USER = process.env.SMTP_USER ?? '';
const SMTP_PASS = process.env.SMTP_PASS ?? '';
const EMAIL_FROM = process.env.EMAIL_FROM ?? `no-reply@${process.env.APP_DOMAIN ?? 'syncwave.local'}`;

/**
 * POST body: { inviteId?, token?, email, organizationId? }
 * - busca invite por id o token (validar organizationId si llega)
 * - actualiza invite.email
 * - construye url de invitación y envía correo
 */
export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		const { inviteId, token, email, organizationId } = body as { inviteId?: string; token?: string; email?: string; organizationId?: string };

		if (!email || (!inviteId && !token)) {
			return NextResponse.json({ ok: false, message: 'Falta inviteId/token o email' }, { status: 400 });
		}

		// find invite
		const invite = await prisma.invite.findFirst({
			where: {
				AND: [inviteId ? { id: inviteId } : {}, token ? { token } : {}, organizationId ? { organizationId } : {}],
			},
		});

		if (!invite) {
			return NextResponse.json({ ok: false, message: 'Invitación no encontrada' }, { status: 404 });
		}

		// update email on invite
		const updated = await prisma.invite.update({
			where: { id: invite.id },
			data: { email: email.trim() },
		});

		// build invite url
		const inviteUrl = APP_URL ? `${APP_URL}/register/accept?token=${encodeURIComponent(updated.token)}` : `/?token=${encodeURIComponent(updated.token)}`;

		// prepare transporter
		if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
			// If no SMTP configured, return success but don't attempt send (so admin can copy link manually)
			return NextResponse.json({
				ok: true,
				message: 'Invitación actualizada, pero SMTP no configurado — copia/usa la URL manualmente',
				inviteUrl,
			});
		}

		const transporter = nodemailer.createTransport({
			host: SMTP_HOST,
			port: SMTP_PORT,
			secure: SMTP_PORT === 465, // true for 465, false for other ports
			auth: {
				user: SMTP_USER,
				pass: SMTP_PASS,
			},
		});

		// Compose email (simple, editable)
		const mailOptions = {
			from: EMAIL_FROM,
			to: email,
			subject: 'Invitación — Registrarse en Syncwave',
			text: `Has sido invitado a registrarte en Syncwave por ${invite.organizationId ?? 'una organización'}.\n\n` + `Accede aquí para completar el registro:\n\n${inviteUrl}\n\n` + `Si no esperabas este correo, ignóralo.\n`,
			html: `<div style="font-family: sans-serif; color: #111">` + `<h2>Invitación a Syncwave</h2>` + `<p>Has sido invitado a registrarte como especialista. Pulsa el botón para completar tu registro:</p>` + `<p><a href="${inviteUrl}" style="display:inline-block;padding:10px 16px;background:#0ea5e9;color:white;border-radius:6px;text-decoration:none;">Completar registro</a></p>` + `<p style="font-size:13px;color:#666">Si no esperabas este correo, ignóralo.</p>` + `</div>`,
		};

		// send email
		await transporter.sendMail(mailOptions);

		return NextResponse.json({ ok: true, message: 'Invitación enviada', inviteUrl });
	} catch (err: any) {
		console.error('POST /api/invite/send error:', err);
		return NextResponse.json({ ok: false, message: err?.message || 'Error interno' }, { status: 500 });
	}
}
