// app/api/invites/resend/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import createSupabaseServerClient from '@/app/adapters/server'; // AJUSTA si tu helper está en otra ruta

async function getAuthenticatedUser(request: Request) {
	const { supabase } = createSupabaseServerClient();

	// 1) Intento estándar: supabase.auth.getUser()
	try {
		const userResp = await supabase.auth.getUser();
		if (userResp?.data?.user) {
			const dbUser = await findDbUser(userResp.data.user);
			return { supabaseUser: userResp.data.user, dbUser };
		}
	} catch (e) {
		console.warn('[getAuthenticatedUser] auth.getUser() inicial falló', e);
	}

	// 2) Fallback: leer cookie sb-access-token del request (server-side)
	try {
		const cookieStore = await cookies();
		const accessToken = cookieStore.get('sb-access-token')?.value ?? null;
		if (accessToken) {
			try {
				const userResp2 = await supabase.auth.getUser(accessToken);
				if (userResp2?.data?.user) {
					const dbUser = await findDbUser(userResp2.data.user);
					return { supabaseUser: userResp2.data.user, dbUser };
				}
			} catch (e) {
				console.warn('[getAuthenticatedUser] getUser from cookie failed', e);
			}
		}
	} catch (e) {
		console.warn('[getAuthenticatedUser] reading cookie failed', e);
	}

	// 3) Fallback: Authorization Bearer header
	try {
		const authHeader = request.headers.get('authorization') ?? '';
		if (authHeader.startsWith('Bearer ')) {
			const jwt = authHeader.split(' ')[1];
			try {
				const userResp3 = await supabase.auth.getUser(jwt);
				if (userResp3?.data?.user) {
					const dbUser = await findDbUser(userResp3.data.user);
					return { supabaseUser: userResp3.data.user, dbUser };
				}
			} catch (e) {
				console.warn('[getAuthenticatedUser] getUser from bearer token failed', e);
			}
		}
	} catch (e) {
		// ignore
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

		// validar que invite tenga email y token (evita pasar null)
		if (!invite.email || !invite.token) {
			console.error('Invite no tiene email o token:', invite);
			return NextResponse.json({ ok: false, message: 'Invitación inválida (falta email o token)' }, { status: 400 });
		}

		const orgIdUser = auth.dbUser.organizationId;
		const effectiveOrgId = orgIdUser ?? orgIdFromBody;
		if (!effectiveOrgId || invite.organizationId !== effectiveOrgId) {
			return NextResponse.json({ ok: false, message: 'No autorizado para reenviar esta invitación' }, { status: 403 });
		}

		const org = await prisma.organization.findUnique({ where: { id: invite.organizationId } });

		// aseguramos que inviteBaseUrl es string | undefined (no null)
		const inviteBaseUrl: string | undefined = org?.inviteBaseUrl ?? process.env.NEXT_PUBLIC_INVITE_BASE_URL ?? undefined;

		const sent = await sendInviteEmail({
			to: invite.email,
			token: invite.token,
			organizationId: invite.organizationId,
			inviteBaseUrl,
		});
		if (!sent) throw new Error('No se pudo enviar el correo');

		await prisma.invite.update({ where: { id }, data: { createdAt: new Date() } });

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error('POST /api/invites/resend error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'Server error' }, { status: 500 });
	}
}
