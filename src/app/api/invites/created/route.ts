// src/app/api/invites/created/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import createSupabaseServerClient from '@/app/adapters/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

type Body = {
	email?: string;
	role?: string;
	expiresAt?: string | null;
	organizationId?: string;
};

/**
 * Aseguramos localmente el tipo UserRole que usa la DB.
 * Mantén estas opciones sincronizadas con tu enum en la BD.
 */
type UserRole = 'ADMIN' | 'MEDICO' | 'ENFERMERA' | 'RECEPCION' | 'FARMACIA' | 'PACIENTE';

const VALID_ROLES: UserRole[] = ['ADMIN', 'MEDICO', 'ENFERMERA', 'RECEPCION', 'FARMACIA', 'PACIENTE'];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper: busca usuario autenticado (intenta cookies o bearer) y su dbUser
async function findDbUserFromSupabase() {
	const { supabase } = createSupabaseServerClient();
	try {
		const userResp = await supabase.auth.getUser();
		if (userResp?.data?.user) {
			const dbUser = await prisma.user.findFirst({ where: { authId: userResp.data.user.id } });
			return { supabaseUser: userResp.data.user, dbUser };
		}

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

// Genera token seguro (hex)
function generateToken(lenBytes = 20) {
	return crypto.randomBytes(lenBytes).toString('hex');
}

// Default expiration in days if client doesn't provide expiresAt
const DEFAULT_EXPIRES_DAYS = 30;

export async function POST(req: Request) {
	try {
		const auth = await findDbUserFromSupabase();
		if (!auth?.dbUser) {
			return NextResponse.json({ ok: false, message: 'No autorizado — sesión ausente' }, { status: 401 });
		}

		const body = (await req.json().catch(() => ({}))) as Body;

		const emailRaw = body?.email;
		const roleRaw = body?.role ?? 'PACIENTE';
		const expiresAtRaw = body?.expiresAt ?? null;
		// Allow passing organizationId explicitly, otherwise use user's org
		const organizationId = body?.organizationId ?? auth.dbUser.organizationId;

		if (!organizationId) {
			return NextResponse.json({ ok: false, message: 'OrganizationId no proporcionado y el usuario no tiene organization.' }, { status: 400 });
		}

		if (!emailRaw || typeof emailRaw !== 'string' || !emailRegex.test(emailRaw.trim())) {
			return NextResponse.json({ ok: false, message: 'Email inválido' }, { status: 400 });
		}
		const email = emailRaw.trim().toLowerCase();

		// Normalizamos el role y validamos contra la lista permitida
		const roleCandidate = String(roleRaw ?? '')
			.trim()
			.toUpperCase();
		if (!VALID_ROLES.includes(roleCandidate as UserRole)) {
			return NextResponse.json({ ok: false, message: `Role inválido. Valores permitidos: ${VALID_ROLES.join(', ')}` }, { status: 400 });
		}
		const role = roleCandidate as UserRole; // <-- aquí garantizamos el tipo correcto

		// Verificar que el usuario autenticado pertenece a la organización destino
		const orgIdUser = auth.dbUser.organizationId;
		if (!orgIdUser || orgIdUser !== organizationId) {
			return NextResponse.json({ ok: false, message: 'No autorizado para crear invitaciones en esta organización' }, { status: 403 });
		}

		// Validar que el email no esté ya asignado a otra invitación
		const existing = await prisma.invite.findFirst({
			where: { email },
			select: { id: true, email: true, organizationId: true },
		});

		if (existing) {
			return NextResponse.json({ ok: false, message: 'El correo ya está asignado a otra invitación.', conflict: { email: existing.email, inviteId: existing.id, organizationId: existing.organizationId } }, { status: 409 });
		}

		// Gestionar expiresAt: tu esquema muestra expiresAt NOT NULL, así que forzamos un valor si no viene.
		let expiresAt: Date;
		if (expiresAtRaw) {
			const d = new Date(expiresAtRaw);
			if (Number.isNaN(d.getTime())) {
				return NextResponse.json({ ok: false, message: 'expiresAt inválido. Usa un ISO datetime válido.' }, { status: 400 });
			}
			expiresAt = d;
		} else {
			// default: now + DEFAULT_EXPIRES_DAYS
			expiresAt = new Date(Date.now() + DEFAULT_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
		}

		// Generar token y crear la invitación
		const token = generateToken();

		// invitedById: usar auth.dbUser.id si existe (tu schema tiene invitedById)
		const invitedById = auth.dbUser?.id ?? null;

		const created = await prisma.invite.create({
			data: {
				organizationId,
				email,
				token,
				role, // aquí role ya es UserRole
				invitedById,
				used: false,
				expiresAt,
			},
		});

		return NextResponse.json(created, { status: 201 });
	} catch (err: any) {
		console.error('POST /api/invites/created error', err);
		const msg = err?.message ?? String(err);
		return NextResponse.json({ ok: false, message: msg }, { status: 500 });
	}
}
