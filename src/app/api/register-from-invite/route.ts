// src/app/api/register-from-invite/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

		// 1) buscar invitación por token usando Supabase
		const { data: invite, error: inviteError } = await supabaseAdmin
			.from('invite')
			.select('*')
			.eq('token', token)
			.maybeSingle();

		if (inviteError) {
			console.error('register-from-invite: error buscando invite', inviteError);
			return NextResponse.json({ ok: false, message: 'Error al buscar invitación' }, { status: 500 });
		}

		if (!invite) {
			return NextResponse.json({ ok: false, message: 'Invitación inválida' }, { status: 404 });
		}

		if (invite.used) {
			return NextResponse.json({ ok: false, message: 'Invitación ya usada' }, { status: 400 });
		}

		// verificar expiresAt si existe (puede ser null)
		if (invite.expiresAt) {
			const expiresAt = new Date(invite.expiresAt);
			if (expiresAt.getTime() < Date.now()) {
				return NextResponse.json({ ok: false, message: 'Invitación expirada' }, { status: 400 });
			}
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

		// 3) Crear user en Supabase y marcar invite usado
		// Usar transacción simulada con múltiples operaciones
		const { error: userError } = await supabaseAdmin.from('users').insert({
			email,
			name: `${firstName} ${lastName}`,
			role: invite.role,
			organizationId: invite.organizationId,
			authId,
		});

		if (userError) {
			console.error('register-from-invite: error creando user', userError);
			// Intentar eliminar el usuario de Supabase Auth si falla la creación del user
			try {
				await supabaseAdmin.auth.admin.deleteUser(authId);
			} catch (deleteErr) {
				console.error('register-from-invite: error eliminando usuario de auth', deleteErr);
			}
			return NextResponse.json({ ok: false, message: 'Error al crear usuario en la base de datos' }, { status: 500 });
		}

		// ─── NUEVO: Crear perfil de enfermería si el rol es enfermería ───
		const roleUpper = (invite.role || '').toUpperCase();
		if (roleUpper === 'ENFERMERA' || roleUpper === 'ENFERMERO') {
			const { error: nurseErr } = await supabaseAdmin.from('nurse_profiles').insert({
				user_id: authId,
				nurse_type: 'affiliated',
				license_number: `PENDING-${authId.substring(0, 8)}`, // Se actualizará después
				organization_id: invite.organizationId,
				status: 'active'
			});
			if (nurseErr) {
				console.error('register-from-invite: error creando nurse_profile', nurseErr);
			}
		}

		// Marcar invite como usado
		const { error: updateInviteError } = await supabaseAdmin
			.from('invite')
			.update({ used: true })
			.eq('id', invite.id);

		if (updateInviteError) {
			console.error('register-from-invite: error actualizando invite', updateInviteError);
			// No fallar el registro si solo falla el update del invite, pero loguear
		}

		return NextResponse.json({ ok: true }, { status: 201 });
	} catch (err: any) {
		console.error('POST /api/register-from-invite error', err);
		return NextResponse.json({ ok: false, message: err?.message ?? 'Server error' }, { status: 500 });
	}
}
