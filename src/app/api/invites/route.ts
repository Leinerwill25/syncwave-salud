// src/app/api/invites/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import createSupabaseServerClient from '@/app/adapters/server';
import { UserRole } from '@prisma/client';

type CreateInviteBody = {
	email: string;
	role?: string;
	expiresAt?: string;
};

function parseRoleOrDefault(roleCandidate?: string): UserRole {
	if (!roleCandidate) return UserRole.MEDICO;
	const allowed = Object.values(UserRole) as string[];
	return allowed.includes(roleCandidate) ? (roleCandidate as UserRole) : UserRole.MEDICO;
}

export async function POST(req: Request) {
	try {
		// createSupabaseServerClient es async y hace await(nextCookies()) internamente
		const { supabase } = await createSupabaseServerClient();

		const {
			data: { user },
			error: userErr,
		} = await supabase.auth.getUser();

		if (userErr || !user?.id) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		const appUser = await prisma.user.findFirst({
			where: { authId: user.id },
			select: { organizationId: true, id: true },
		});
		if (!appUser?.organizationId) {
			return NextResponse.json({ error: 'Organization not found for user' }, { status: 403 });
		}

		const body = (await req.json()) as CreateInviteBody;
		if (!body?.email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

		const email = body.email.trim().toLowerCase();
		if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'invalid email' }, { status: 400 });

		const role = parseRoleOrDefault(body.role);
		const expiresAt = body.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

		// generate token with fallback
		const token =
			(globalThis as any).crypto?.randomUUID?.() ??
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			(typeof require !== 'undefined' ? require('crypto').randomUUID() : Math.random().toString(36).slice(2, 12));

		const invite = await prisma.invite.create({
			data: {
				organizationId: appUser.organizationId,
				email,
				token,
				role,
				invitedById: appUser.id,
				used: false,
				expiresAt,
			},
		});

		return NextResponse.json(
			{
				id: invite.id,
				email: invite.email,
				token: invite.token,
				role: invite.role,
				used: invite.used,
				expiresAt: invite.expiresAt.toISOString(),
				createdAt: invite.createdAt.toISOString(),
			},
			{ status: 201 }
		);
	} catch (err) {
		console.error('API POST /api/invites error:', err);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE(req: Request) {
	try {
		const { supabase } = await createSupabaseServerClient();

		const {
			data: { user },
			error: userErr,
		} = await supabase.auth.getUser();

		if (userErr || !user?.id) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		const appUser = await prisma.user.findFirst({ where: { authId: user.id }, select: { organizationId: true } });
		if (!appUser?.organizationId) {
			return NextResponse.json({ error: 'Organization not found for user' }, { status: 403 });
		}

		const { id } = (await req.json()) as { id?: string };
		if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

		const existing = await prisma.invite.findUnique({ where: { id }, select: { organizationId: true } });
		if (!existing) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
		if (existing.organizationId !== appUser.organizationId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

		await prisma.invite.delete({ where: { id } });
		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error('API DELETE /api/invites error:', err);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
