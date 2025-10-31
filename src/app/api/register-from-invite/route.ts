// src/app/api/register-from-invite/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export async function POST(request: Request) {
	try {
		// Leer env vars DENTRO del handler (no top-level)
		const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
		const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? '';

		if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
			console.error('register-from-invite: missing supabase env vars');
			return NextResponse.json({ ok: false, message: 'Server misconfiguration: missing Supabase service role credentials' }, { status: 500 });
		}

		// Crear el cliente admin dentro del handler (evita side-effects al importar)
		const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

		// parsear body
		const body = await request.json().catch(() => ({}));
		const { token, email, firstName, lastName, password, phone } = body ?? {};

		if (!token || !email || !password || !firstName || !lastName) {
			return NextResponse.json({ ok: false, message: 'Faltan campos requeridos: token, email, password, firstName, lastName' }, { status: 400 });
		}

		// 1) buscar invitación por token
		const invite = await prisma.invite.findUnique({ where: { token } });
		if (!invite) {
			return NextResponse.json({ ok: false, message: 'Invitación inválida' }, { status: 404 });
		}

		if (invite.used) {
			return NextResponse.json({ ok: false, message: 'Invitación ya usada' }, { status: 400 });
		}

		// verificar expiresAt si existe (puede ser null)
		if (invite.expiresAt && invite.expiresAt instanceof Date && invite.expiresAt.getTime() < Date.now()) {
			return NextResponse.json({ ok: false, message: 'Invitación expirada' }, { status: 400 });
		}

		if (!invite.email) {
			return NextResponse.json({ ok: false, message: 'Invitación inválida (falta email)' }, { status: 400 });
		}

		// comprobar que el email enviado coincide con la invitación
		if (String(invite.email).toLowerCase() !== String(email).toLowerCase()) {
			return NextResponse.json({ ok: false, message: 'El email no coincide con la invitación' }, { status: 400 });
		}

		// 2) crear usuario en Supabase (admin)
		// supabase-js v2 -> auth.admin.createUser
		const { data: createdUser, error: supaErr }: any = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: { firstName, lastName, phone },
		});

		if (supaErr) {
			console.error('supabase admin createUser error', supaErr);
			// no throw; devolver error controlado
			return NextResponse.json({ ok: false, message: supaErr.message ?? 'Error creando usuario en Supabase' }, { status: 500 });
		}

		const authId = (createdUser?.user as any)?.id;
		if (!authId) {
			console.error('register-from-invite: created user without id', createdUser);
			return NextResponse.json({ ok: false, message: 'Error interno creando usuario' }, { status: 500 });
		}

		// 3) Crear user en Prisma y marcar invite usado dentro de transacción
		await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			await tx.user.create({
				data: {
					email,
					name: `${firstName} ${lastName}`,
					role: invite.role as any, // casteo a any para evitar dependencia con enums generados en build
					organizationId: invite.organizationId,
					authId,
				},
			});

			await tx.invite.update({
				where: { id: invite.id },
				data: { used: true },
			});
		});

		return NextResponse.json({ ok: true }, { status: 201 });
	} catch (err: any) {
		console.error('POST /api/register-from-invite error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'Server error' }, { status: 500 });
	}
}
