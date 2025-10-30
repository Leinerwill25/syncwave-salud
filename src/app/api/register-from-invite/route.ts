// src/app/api/register-from-invite/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
	throw new Error('Faltan env vars SUPABASE (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function POST(request: Request) {
	try {
		const body = await request.json().catch(() => ({}));
		const { token, email, firstName, lastName, password, phone } = body ?? {};

		if (!token || !email || !password || !firstName || !lastName) {
			return NextResponse.json({ ok: false, message: 'Faltan campos' }, { status: 400 });
		}

		// 1) buscar invitación por token
		const invite = await prisma.invite.findUnique({ where: { token } });
		if (!invite) return NextResponse.json({ ok: false, message: 'Invitación inválida' }, { status: 404 });
		if (invite.used) return NextResponse.json({ ok: false, message: 'Invitación ya usada' }, { status: 400 });
		if (invite.expiresAt < new Date()) return NextResponse.json({ ok: false, message: 'Invitación expirada' }, { status: 400 });
		if (invite.email.toLowerCase() !== String(email).toLowerCase()) {
			return NextResponse.json({ ok: false, message: 'El email no coincide con la invitación' }, { status: 400 });
		}

		// 2) crear usuario en Supabase (admin) — requiere SERVICE ROLE KEY
		// supabase-js v2: admin.createUser
		const { data: createdUser, error: supaErr } = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: { firstName, lastName, phone },
		});

		if (supaErr) {
			console.error('supabase admin createUser error', supaErr);
			// Si el usuario ya existe en supabase, supaErr.message lo dirá. Ajusta según caso.
			return NextResponse.json({ ok: false, message: supaErr.message ?? 'Error creando usuario en Supabase' }, { status: 500 });
		}

		const authId = (createdUser.user as any).id;

		// 3) Crear user en Prisma y marcar invite usado dentro de transacción
		await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			await tx.user.create({
				data: {
					email,
					name: `${firstName} ${lastName}`,
					// casteo a any para evitar dependencia por enums generados; si tienes el enum disponible, remuévelo
					role: invite.role as any,
					organizationId: invite.organizationId,
					authId,
				},
			});

			await tx.invite.update({
				where: { id: invite.id },
				data: { used: true },
			});
		});

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error('POST /api/register-from-invite error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'Server error' }, { status: 500 });
	}
}
