// src/app/api/invite/send/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import createSupabaseServerClient from '@/app/adapters/server';
import { cookies } from 'next/headers';
import sgMail from '@sendgrid/mail';

// Helper: busca usuario autenticado (intenta cookies o bearer) y su dbUser
async function findDbUserFromSupabase() {
	const { supabase } = createSupabaseServerClient();
	try {
		// try default
		const userResp = await supabase.auth.getUser();
		if (userResp?.data?.user) {
			const dbUser = await prisma.user.findFirst({ where: { authId: userResp.data.user.id } });
			return { supabaseUser: userResp.data.user, dbUser };
		}

		// fallback: token from cookies
		const cookieStore = await cookies();
		const accessToken = cookieStore.get('sb-access-token')?.value ?? null;
		if (accessToken) {
			const userResp2 = await supabase.auth.getUser(accessToken);
			if (userResp2?.data?.user) {
				const dbUser = await prisma.user.findFirst({ where: { authId: userResp2.data.user.id } });
				return { supabaseUser: userResp2.data.user, dbUser };
			}
		}
	} catch (e) {
		console.warn('findDbUserFromSupabase error', e);
	}
	return { supabaseUser: null, dbUser: null };
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendInviteEmail(opts: { to: string; token: string; organizationId: string; inviteBaseUrl?: string }) {
	if (!process.env.SENDGRID_API_KEY) {
		console.error('SendGrid API key missing');
		return false;
	}

	const base = opts.inviteBaseUrl ?? process.env.NEXT_PUBLIC_INVITE_BASE_URL ?? '';
	const origin = base ? base.replace(/\/$/, '') : process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '';
	const url = `${origin}/invite/${opts.token}`;

	const from = process.env.EMAIL_FROM ?? 'no-reply@yourdomain.com';
	const subject = 'Invitación a unirse a la organización';
	const html = `
    <p>Hola,</p>
    <p>Has sido invitado a unirte a la organización. Haz clic en el siguiente enlace para completar tu registro:</p>
    <p><a href="${url}">${url}</a></p>
    <p>Si no esperabas este correo, ignóralo.</p>
  `;

	try {
		const msg = {
			to: opts.to,
			from,
			subject,
			html,
		};
		const res = await sgMail.send(msg);
		// res es un array; puedes devolver info adicional si lo deseas
		console.log('[sendInviteEmail] SendGrid response', res[0]?.statusCode);
		return true;
	} catch (err: any) {
		console.error('[sendInviteEmail] SendGrid error', err?.response?.body ?? err.message ?? err);
		return false;
	}
}

export async function POST(req: Request) {
	try {
		const auth = await findDbUserFromSupabase();
		if (!auth?.dbUser) {
			return NextResponse.json({ ok: false, message: 'No autorizado — sesión ausente' }, { status: 401 });
		}

		const body = await req.json().catch(() => ({}));
		const { id, email } = body ?? {};

		if (!id) return NextResponse.json({ ok: false, message: 'Missing invite id' }, { status: 400 });
		if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)) return NextResponse.json({ ok: false, message: 'Email inválido' }, { status: 400 });

		// buscar invitación
		const invite = await prisma.invite.findUnique({ where: { id } });
		if (!invite) return NextResponse.json({ ok: false, message: 'Invitación no encontrada' }, { status: 404 });

		// verificar que el usuario pertenece a la organización (propietario de la invitación)
		const orgIdUser = auth.dbUser.organizationId;
		if (!orgIdUser || invite.organizationId !== orgIdUser) {
			return NextResponse.json({ ok: false, message: 'No autorizado para enviar esta invitación' }, { status: 403 });
		}

		// VALIDACIÓN: comprobar que email NO esté asignado a otra invitación
		const normalizedEmail = email.trim().toLowerCase();

		// Buscar otra invitación con ese email (que no sea la actual)
		const existing = await prisma.invite.findFirst({
			where: { email: normalizedEmail },
			select: { id: true, email: true },
		});

		if (existing && existing.id !== id) {
			return NextResponse.json({ ok: false, message: 'El correo ya está asignado a otra invitación.', conflict: { email: existing.email, inviteId: existing.id } }, { status: 409 });
		}

		// obtener organization para inviteBaseUrl (opcional)
		const org = await prisma.organization.findUnique({ where: { id: invite.organizationId } });
		const inviteBaseUrl = org?.inviteBaseUrl ?? process.env.NEXT_PUBLIC_INVITE_BASE_URL;

		// actualizar email de la invitación (si quieres conservar email enviado)
		const updatedInvite = await prisma.invite.update({ where: { id }, data: { email: normalizedEmail } });

		// enviar correo (usar token actual del invite)
		const sent = await sendInviteEmail({ to: normalizedEmail, token: updatedInvite.token, organizationId: updatedInvite.organizationId, inviteBaseUrl });
		if (!sent) throw new Error('No se pudo enviar el correo');

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error('POST /api/invite/send error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'Server error' }, { status: 500 });
	}
}
