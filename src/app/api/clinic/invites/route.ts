// app/api/clinic/invites/route.ts  OR api/clinic/invites/route.ts (app router)
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

function genToken() {
	return randomUUID();
}

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { organizationId, count } = body as { organizationId: string; count: number };

		if (!organizationId || !count || count <= 0) {
			return NextResponse.json({ ok: false, message: 'organizationId y count requeridos' }, { status: 400 });
		}

		const invitesData = [];
		const now = new Date();
		const expiresAt = new Date(now);
		expiresAt.setDate(expiresAt.getDate() + 14);

		const tokens: { token: string; url?: string }[] = [];
		for (let i = 0; i < Math.min(500, count); i++) {
			const token = genToken();
			invitesData.push({
				organizationId,
				email: '',
				token,
				role: 'MEDICO',
				invitedById: null,
				used: false,
				expiresAt,
				createdAt: now,
			});
			tokens.push({ token, url: `${process.env.APP_URL || ''}/register/accept?token=${token}` });
		}

		await prisma.invite.createMany({
			data: invitesData,
			skipDuplicates: true,
		});

		return NextResponse.json({ ok: true, invites: tokens });
	} catch (err: any) {
		console.error('invites error', err);
		return NextResponse.json({ ok: false, message: err?.message || 'Error' }, { status: 500 });
	}
}
