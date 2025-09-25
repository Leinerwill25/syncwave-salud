// app/api/invites/resend/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import createSupabaseServerClient from '@/app/adapters/server'; // AJUSTA si tu helper está en otra ruta

async function getAuthenticatedUser(request: Request) {
	const { supabase } = await createSupabaseServerClient();

	const { data: userData, error: userErr } = await supabase.auth.getUser();
	if (userData?.user) return { supabaseUser: userData.user, dbUser: await findDbUser(userData.user) };

	const authHeader = request.headers.get('authorization') ?? '';
	if (authHeader.startsWith('Bearer ')) {
		const jwt = authHeader.split(' ')[1];
		try {
			const { data: userData2 } = await supabase.auth.getUser(jwt);
			if (userData2?.user) return { supabaseUser: userData2.user, dbUser: await findDbUser(userData2.user) };
		} catch (e) {
			console.warn('[getAuthenticatedUser resend] fallback jwt error', e);
		}
	}

	return { supabaseUser: null, dbUser: null };
}

async function findDbUser(supabaseUser: any) {
	if (!supabaseUser) return null;
	const authId = supabaseUser.id ?? null;
	const email = supabaseUser.email ?? null;
	let dbUser = null;
	if (authId) dbUser = await prisma.user.findUnique({ where: { authId } });
	if (!dbUser && email) dbUser = await prisma.user.findUnique({ where: { email } });
	return dbUser;
}

async function sendInviteEmail(opts: { to: string; token: string; organizationId: string; inviteBaseUrl?: string }) {
	const base = opts.inviteBaseUrl ?? process.env.NEXT_PUBLIC_INVITE_BASE_URL ?? '';
	const origin = base ? base.replace(/\/$/, '') : process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '';
	const url = `${origin}/invite/${opts.token}`;
	console.log(`[sendInviteEmail] enviar a ${opts.to} link=${url}`);
	return true;
}

export async function POST(request: Request) {
	try {
		const auth = await getAuthenticatedUser(request);
		if (!auth?.dbUser) return NextResponse.json({ ok: false, message: 'No autorizado — sesión ausente' }, { status: 401 });

		const body = await request.json().catch(() => ({}));
		const { id, organizationId: orgIdFromBody } = body ?? {};

		if (!id) return NextResponse.json({ ok: false, message: 'Missing invite id' }, { status: 400 });

		const invite = await prisma.invite.findUnique({ where: { id } });
		if (!invite) return NextResponse.json({ ok: false, message: 'Invitación no encontrada' }, { status: 404 });

		const orgIdUser = auth.dbUser.organizationId;
		const effectiveOrgId = orgIdUser ?? orgIdFromBody;
		if (!effectiveOrgId || invite.organizationId !== effectiveOrgId) {
			return NextResponse.json({ ok: false, message: 'No autorizado para reenviar esta invitación' }, { status: 403 });
		}

		const org = await prisma.organization.findUnique({ where: { id: invite.organizationId } });
		const inviteBaseUrl = org?.inviteBaseUrl ?? process.env.NEXT_PUBLIC_INVITE_BASE_URL;
		const sent = await sendInviteEmail({ to: invite.email, token: invite.token, organizationId: invite.organizationId, inviteBaseUrl });
		if (!sent) throw new Error('No se pudo enviar el correo');

		await prisma.invite.update({ where: { id }, data: { createdAt: new Date() } });

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error('POST /api/invites/resend error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'Server error' }, { status: 500 });
	}
}
