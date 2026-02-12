// src/app/api/specialists/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireAuth } from '@/lib/auth-guards';

/* ----------------------------- helpers ----------------------------- */

async function safeParseJson(req: Request) {
	try {
		const raw = await req.text();
		if (!raw) return {};
		return JSON.parse(raw);
	} catch (e) {
		console.warn('[api/specialists] safeParseJson failed to parse body:', (e as any)?.message ?? e);
		return {};
	}
}

/* ---------------------------- route code ---------------------------- */

export async function OPTIONS() {
	return new NextResponse(null, { status: 204, headers: { Allow: 'GET,POST,OPTIONS' } });
}

/* ---------- GET: traer invitaciones ---------- */
export async function GET(req: Request) {
	try {
		const authResult = await apiRequireAuth();
		if (authResult.response) return authResult.response;

		const appUser = authResult.user;
		if (!appUser) {
			return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();
		const organizationId = appUser.organizationId;

		if (!organizationId) return NextResponse.json({ message: 'Usuario sin organización' }, { status: 400 });

		const { data: invites, error: invitesErr } = await supabase
			.from('invite')
			.select('id, email, token, role, invitedById, used, expiresAt, createdAt')
			.eq('organizationId', organizationId)
			.eq('used', false)
			.not('email', 'is', null)
			.neq('email', '')
			.order('createdAt', { ascending: false });

		if (invitesErr) {
			console.error('[api/specialists][GET] invites error', invitesErr);
			return NextResponse.json({ message: 'Error consultando invitaciones' }, { status: 500 });
		}

		const filtered = (invites ?? []).filter((i: any) => i && i.email && i.used === false);

		return NextResponse.json({
			data: filtered,
			count: filtered.length,
		});
	} catch (e) {
		console.error('[api/specialists][GET] unexpected', e);
		return NextResponse.json({ message: 'Error inesperado' }, { status: 500 });
	}
}

/* ---------- POST: acciones (cancelar invitacion, suspender medico) ---------- */
export async function POST(req: Request) {
	try {
		const authResult = await apiRequireAuth();
		if (authResult.response) return authResult.response;

		const appUser = authResult.user;
		if (!appUser) {
			return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();
		const myOrgId = appUser.organizationId;

		const body = await safeParseJson(req);
		const { action, inviteId, email } = body;

		if (!action) return NextResponse.json({ message: 'Accion requerida' }, { status: 400 });

		// 1) Cancelar Invitacion
		if (action === 'cancel-invite') {
			if (!inviteId) return NextResponse.json({ message: 'inviteId requerido' }, { status: 400 });

			const { data: invite, error: fetchErr } = await supabase.from('invite').select('id, organizationId').eq('id', inviteId).maybeSingle();

			if (fetchErr || !invite) {
				return NextResponse.json({ message: 'Invitacion no encontrada' }, { status: 404 });
			}
			if (invite.organizationId !== myOrgId) {
				return NextResponse.json({ message: 'No autorizado para esta organizacion' }, { status: 403 });
			}

			const { error: delErr } = await supabase.from('invite').delete().eq('id', inviteId);
			if (delErr) {
				console.error('[api/specialists][POST] delete error', delErr);
				return NextResponse.json({ message: 'Error eliminando invitacion' }, { status: 500 });
			}

			return NextResponse.json({ message: 'Invitacion cancelada' });
		}

		// 2) Suspender Médico (marcar used=false en users)
		if (action === 'suspend-medic') {
			if (!email) return NextResponse.json({ message: 'Email requerido' }, { status: 400 });

			const { data: userRow, error: userErr } = await supabase
				.from('users')
				.select('id, email, role, organizationId, used')
				.eq('email', email)
				.eq('organizationId', myOrgId)
				.maybeSingle();

			if (userErr) {
				console.error('[api/specialists][POST] Error fetching user to suspend', userErr);
				return NextResponse.json({ message: 'Error consultando usuario' }, { status: 500 });
			}
			if (!userRow) {
				return NextResponse.json({ message: 'Usuario no encontrado para suspender' }, { status: 404 });
			}

			if (userRow.role !== 'MEDICO') {
				return NextResponse.json({ message: 'Solo se pueden suspender usuarios con rol MEDICO' }, { status: 400 });
			}

			const { error: suspendErr } = await supabase
				.from('users')
				.update({
					used: false,
					authId: null,
					passwordHash: null,
				})
				.eq('id', userRow.id);

			if (suspendErr) {
				console.error('[api/specialists][POST] Error suspending user', suspendErr);
				return NextResponse.json({ message: 'Error al suspender usuario' }, { status: 500 });
			}

			return NextResponse.json({ message: 'Usuario suspendido correctamente' });
		}

		return NextResponse.json({ message: 'Accion no soportada' }, { status: 400 });
	} catch (e) {
		console.error('[api/specialists][POST] unexpected', e);
		return NextResponse.json({ message: 'Error inesperado' }, { status: 500 });
	}
}
