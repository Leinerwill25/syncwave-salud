// src/app/api/specialists/route.ts
import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

console.log('[api/specialists] route module loaded — NODE_ENV=', process.env.NODE_ENV);

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

function parseCookieHeader(header?: string) {
	const map: Record<string, string> = {};
	if (!header) return map;
	header.split(';').forEach((part) => {
		const idx = part.indexOf('=');
		if (idx > -1) {
			const name = part.slice(0, idx).trim();
			const val = part.slice(idx + 1).trim();
			map[name] = val;
		}
	});
	return map;
}

function deepFindToken(obj: any, keyName = 'access_token'): string | null {
	if (!obj) return null;
	if (typeof obj === 'string') {
		try {
			const parsed = JSON.parse(obj);
			return deepFindToken(parsed, keyName);
		} catch {
			return null;
		}
	}
	if (typeof obj === 'object') {
		if (obj[keyName] && typeof obj[keyName] === 'string') return obj[keyName];
		for (const k of Object.keys(obj)) {
			const res = deepFindToken(obj[k], keyName);
			if (res) return res;
		}
	}
	return null;
}

function extractTokensFromCookies(cookieHeader?: string) {
	const cookies = parseCookieHeader(cookieHeader);
	// sb-access-token + sb-refresh-token
	if (cookies['sb-access-token']) {
		return {
			access_token: decodeURIComponent(cookies['sb-access-token']),
			refresh_token: cookies['sb-refresh-token'] ? decodeURIComponent(cookies['sb-refresh-token']) : undefined,
		};
	}
	// JSON cookies (sb:token, supabase-auth-token)
	const jsonKeys = ['sb:token', 'supabase-auth-token', 'sb:token'];
	for (const k of jsonKeys) {
		if (cookies[k]) {
			try {
				const decoded = decodeURIComponent(cookies[k]);
				const parsed = JSON.parse(decoded);
				const access = deepFindToken(parsed, 'access_token');
				const refresh = deepFindToken(parsed, 'refresh_token');
				if (access) return { access_token: access, refresh_token: refresh ?? undefined };
			} catch {
				// ignore
			}
		}
	}
	// try any cookie value that might contain JSON with tokens
	for (const [, rawVal] of Object.entries(cookies)) {
		try {
			const decoded = decodeURIComponent(rawVal);
			const parsed = JSON.parse(decoded);
			const access = deepFindToken(parsed, 'access_token');
			const refresh = deepFindToken(parsed, 'refresh_token');
			if (access) return { access_token: access, refresh_token: refresh ?? undefined };
		} catch {
			// ignore
		}
	}
	return { access_token: undefined, refresh_token: undefined };
}

/** Decodifica payload JWT (sin dependencias). Devuelve objeto del payload o null. */
function decodeJwtPayload(token?: string) {
	try {
		if (!token) return null;
		const parts = token.split('.');
		if (parts.length < 2) return null;
		const payload = parts[1];
		const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
		// Buffer disponible en Node; en edge runtimes podría requerir otro enfoque
		const json = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
		return JSON.parse(json);
	} catch (e) {
		console.warn('[api/specialists] decodeJwtPayload failed:', (e as any)?.message ?? e);
		return null;
	}
}

/** Intenta encontrar organizationId en el payload token en varias ubicaciones comunes */
function extractOrgIdFromPayload(payload: any): string | null {
	if (!payload) return null;
	// chequeos directos
	if (payload.organizationId && typeof payload.organizationId === 'string') return payload.organizationId;
	if (payload.org_id && typeof payload.org_id === 'string') return payload.org_id;
	if (payload.organization_id && typeof payload.organization_id === 'string') return payload.organization_id;
	// app_metadata / user_metadata (Supabase / Auth helpers)
	if (payload.app_metadata && payload.app_metadata.organizationId) return payload.app_metadata.organizationId;
	if (payload.app_metadata && payload.app_metadata.org && payload.app_metadata.org.id) return payload.app_metadata.org.id;
	if (payload.user_metadata && payload.user_metadata.organizationId) return payload.user_metadata.organizationId;
	if (payload.user_metadata && payload.user_metadata.org_id) return payload.user_metadata.org_id;
	// claims custom
	if (payload['https://myapp.example/organization'] && typeof payload['https://myapp.example/organization'] === 'string') {
		return payload['https://myapp.example/organization'];
	}
	// nada encontrado
	return null;
}

/* ------------------- session safe helpers ------------------- */

/**
 * Intenta obtener session usando supabase.auth.getSession() y, si falla,
 * intenta reconstruir mediante tokens extraídos de cookies (setSession).
 * Devuelve { session } donde session puede ser null si no hay sesión.
 */
async function getSessionSafe(supabase: any, cookieHeader?: string) {
	try {
		const res = await supabase.auth.getSession();
		if (res?.data?.session) return { session: res.data.session as any };
	} catch (err) {
		// supabase-js puede tirar AuthSessionMissingError en server contexts — lo silenciamos
		console.warn('[getSessionSafe] supabase.auth.getSession threw, will try fallback:', (err as any)?.message ?? err);
	}

	// fallback: intentar reconstruir desde cookies
	if (cookieHeader) {
		const { access_token, refresh_token } = extractTokensFromCookies(cookieHeader);
		if (access_token) {
			try {
				await supabase.auth.setSession({ access_token, refresh_token } as any);
				const after = await supabase.auth.getSession();
				if (after?.data?.session) return { session: after.data.session as any };
			} catch (err) {
				console.warn('[getSessionSafe] setSession fallback failed:', (err as any)?.message ?? err);
			}
		}
	}

	return { session: null };
}

/**
 * Decodifica el token desde cookies y devuelve { userId?, orgId? } como fallback.
 */
function getActorFromToken(cookieHeader?: string) {
	const { access_token } = extractTokensFromCookies(cookieHeader);
	if (!access_token) return { userId: null, orgId: null };
	const payload = decodeJwtPayload(access_token);
	if (!payload) return { userId: null, orgId: null };

	const userId = payload.sub ?? payload.user_id ?? null;
	let orgId: string | null = null;

	// common locations
	if (payload.organizationId) orgId = payload.organizationId;
	if (!orgId && payload.organization_id) orgId = payload.organization_id;
	if (!orgId && payload.org_id) orgId = payload.org_id;
	if (!orgId && payload.app_metadata?.organizationId) orgId = payload.app_metadata.organizationId;
	if (!orgId && payload.user_metadata?.organizationId) orgId = payload.user_metadata.organizationId;
	if (!orgId && payload['https://myapp.example/organization']) orgId = payload['https://myapp.example/organization'];

	return { userId, orgId };
}

/* ---------------------------- route code ---------------------------- */

export async function OPTIONS() {
	return new NextResponse(null, { status: 204, headers: { Allow: 'GET,POST,OPTIONS' } });
}

/* ---------- GET: traer invitaciones ---------- */
export async function GET(req: Request) {
	try {
		const client = createSupabaseServerClient();
		if (!client || typeof client !== 'object' || !('supabase' in client)) {
			console.error('[api/specialists][GET] createSupabaseServerClient returned invalid client', client);
			return NextResponse.json({ message: 'Error inicializando servicio' }, { status: 500 });
		}
		const { supabase } = client as any;

		const cookieHeader = req.headers.get('cookie') ?? '';

		// obtener session de forma segura (con fallback a cookies)
		const { session } = await getSessionSafe(supabase, cookieHeader);
		if (!session) {
			return NextResponse.json({ message: 'No authenticated' }, { status: 401 });
		}

		const userId = session.user.id;

		// Obtener organizationId del user (maybeSingle)
		const { data: me, error: meErr } = await supabase.from('User').select('organizationId').eq('id', userId).maybeSingle();
		if (meErr) {
			console.error('[api/specialists][GET] get user org error', meErr);
			return NextResponse.json({ message: 'No se pudo obtener la organización' }, { status: 500 });
		}
		if (!me) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 401 });

		const organizationId = (me as any).organizationId;
		if (!organizationId) return NextResponse.json({ message: 'Usuario sin organización' }, { status: 400 });

		const { data: invites, error: invitesErr } = await supabase.from('Invite').select('id, email, token, role, invitedById, used, expiresAt, createdAt').eq('organizationId', organizationId).eq('used', false).not('email', 'is', null).neq('email', '').order('createdAt', { ascending: false });

		if (invitesErr) {
			console.error('[api/specialists][GET] invites error', invitesErr);
			return NextResponse.json({ message: 'Error consultando invitaciones' }, { status: 500 });
		}

		const filtered = (invites ?? []).filter((i: any) => i && i.email && i.used === false);
		return NextResponse.json({ invites: filtered });
	} catch (e) {
		console.error('[api/specialists][GET] unexpected', e);
		return NextResponse.json({ message: 'Error inesperado' }, { status: 500 });
	}
}

/* ---------- POST: cancelar / suspender ---------- */

type PostBody = {
	action: 'cancel' | 'suspend';
	inviteId: string;
	organizationId?: string;
};

export async function POST(req: Request) {
	try {
		console.log('[api/specialists][POST] incoming request headers:', Object.fromEntries(req.headers.entries()));
		const cookieHeader = req.headers.get('cookie') ?? '';
		console.log('[api/specialists][POST] cookie header present?:', !!cookieHeader);

		const parsed = (await safeParseJson(req)) as Partial<PostBody>;
		console.log('[api/specialists][POST] parsed body:', parsed);

		const { action, inviteId } = parsed;
		if (!action || !inviteId) {
			console.warn('[api/specialists][POST] missing action or inviteId', { action, inviteId });
			return NextResponse.json({ message: 'Payload inválido' }, { status: 400 });
		}

		// Inicializar supabase
		const client = createSupabaseServerClient();
		if (!client || typeof client !== 'object' || !('supabase' in client)) {
			console.error('[api/specialists][POST] createSupabaseServerClient returned invalid client', client);
			return NextResponse.json({ message: 'Error inicializando servicio' }, { status: 500 });
		}
		const { supabase } = client as any;

		// 1) Buscar invitación en Invite
		const { data: invite, error: inviteErr } = await supabase.from('Invite').select('id, organizationId, email, used').eq('id', inviteId).maybeSingle();

		if (inviteErr) {
			console.error('[api/specialists][POST] fetch invite error', inviteErr);
			return NextResponse.json({ message: 'Error consultando la invitación' }, { status: 500 });
		}
		if (!invite) {
			console.warn('[api/specialists][POST] invite not found', inviteId);
			return NextResponse.json({ message: 'Invitación no encontrada' }, { status: 404 });
		}

		const inviteOrgId = (invite as any).organizationId;

		// 2) Determinar actor (userId opcional) y organization del actor que hace la petición
		let actorUserId: string | null = null;
		let actorOrgId: string | null = null;

		// intento seguro de obtener session + fallback a token
		const { session } = await getSessionSafe(supabase, cookieHeader);
		if (session) {
			actorUserId = session.user?.id ?? null;
			actorOrgId = session.user?.user_metadata?.organizationId ?? session.user?.app_metadata?.organizationId ?? actorOrgId ?? null;
		}

		// si falta info, usar token-decoded fallback
		if (!actorUserId || !actorOrgId) {
			const fallback = getActorFromToken(cookieHeader);
			actorUserId = actorUserId ?? fallback.userId;
			actorOrgId = actorOrgId ?? fallback.orgId;
		}

		console.log('[api/specialists][POST] actorUserId:', actorUserId, 'actorOrgId:', actorOrgId);

		// Si no conseguimos actorOrgId por ninguno de los métodos, intentamos buscar user row (maybeSingle) por actorUserId para obtener org
		if (!actorOrgId && actorUserId) {
			// 1) intentar buscar por id (existing behavior)
			try {
				const { data: meById, error: meByIdErr } = await supabase.from('User').select('organizationId').eq('id', actorUserId).maybeSingle();
				if (!meByIdErr && meById) {
					actorOrgId = (meById as any).organizationId;
					console.log('[api/specialists][POST] actorOrgId resolved via User.id ->', actorOrgId);
				}
			} catch (err) {
				console.warn('[api/specialists][POST] user by id lookup threw:', (err as any)?.message ?? err);
			}

			// 2) intentar buscar por authId (campo que usas en suspensión)
			if (!actorOrgId) {
				try {
					const { data: meByAuth, error: meByAuthErr } = await supabase.from('User').select('organizationId').eq('authId', actorUserId).maybeSingle();
					if (!meByAuthErr && meByAuth) {
						actorOrgId = (meByAuth as any).organizationId;
						console.log('[api/specialists][POST] actorOrgId resolved via User.authId ->', actorOrgId);
					}
				} catch (err) {
					console.warn('[api/specialists][POST] user by authId lookup threw:', (err as any)?.message ?? err);
				}
			}

			// 3) intentar buscar en Organization por columnas comunes que puedan referenciar al actor
			if (!actorOrgId) {
				const orgCandidateCols = ['authId', 'ownerAuthId', 'ownerId', 'createdBy', 'adminAuthId'];
				for (const col of orgCandidateCols) {
					try {
						const q = await supabase.from('Organization').select('id').eq(col, actorUserId).maybeSingle();
						if (q && (q as any).data) {
							actorOrgId = (q as any).data.id;
							console.log(`[api/specialists][POST] actorOrgId resolved via Organization.${col} ->`, actorOrgId);
							break;
						}
					} catch (err) {
						// ignore per-column errors
						console.warn(`[api/specialists][POST] Organization lookup by ${col} threw:`, (err as any)?.message ?? err);
					}
				}
			}
		}

		// Si aún no hay actorOrgId, no podemos autorizar
		if (!actorOrgId) {
			console.warn('[api/specialists][POST] could not determine actor organization id; denying request');
			return NextResponse.json({ message: 'No authenticated / no organization found' }, { status: 401 });
		}

		// Autorización: la invitación debe pertenecer a la misma organización que el actor
		if (actorOrgId !== inviteOrgId) {
			console.warn('[api/specialists][POST] organization mismatch - actorOrgId != inviteOrgId', { actorOrgId, inviteOrgId });
			return NextResponse.json({ message: 'No autorizado para modificar esta invitación' }, { status: 403 });
		}

		// 3) Ejecutar acción: cancelar -> actualizar Invite.email = null + auditoría
		if (action === 'cancel') {
			const now = new Date().toISOString();
			const updatePayload: any = { email: null, cancelledat: now };
			// si tenemos actorUserId lo registramos como cancelledbyid, si no, dejamos null
			if (actorUserId) updatePayload.cancelledbyid = actorUserId;

			const { error: updErr } = await supabase.from('Invite').update(updatePayload).eq('id', inviteId).eq('organizationId', inviteOrgId);

			if (updErr) {
				console.error('[api/specialists][POST] Error cancel invite', updErr);
				return NextResponse.json({ message: 'Error cancelando invitación', detail: updErr.message }, { status: 500 });
			}

			console.log(`[api/specialists][POST] Invite ${inviteId} cancelled by actor ${actorUserId ?? 'unknown'}`);
			return NextResponse.json({ message: 'Invitación cancelada' });
		}

		// 4) Acción: suspender -> buscar user por email (dentro de la misma org) y actualizar role
		// 4) Acción: suspender -> desactivar usuario médico
		if (action === 'suspend') {
			const email = (invite as any)?.email;
			if (!email) {
				return NextResponse.json({ message: 'Invitación no tiene email' }, { status: 400 });
			}

			// Buscar usuario por email dentro de la misma organización
			const { data: userRow, error: userErr } = await supabase.from('User').select('id, email, role, organizationId, used').eq('email', email).eq('organizationId', inviteOrgId).maybeSingle();

			if (userErr) {
				console.error('[api/specialists][POST] Error fetching user to suspend', userErr);
				return NextResponse.json({ message: 'Error consultando usuario' }, { status: 500 });
			}
			if (!userRow) {
				return NextResponse.json({ message: 'Usuario no encontrado para suspender' }, { status: 404 });
			}

			// Validar que sea médico y esté asociado a una organización
			if (userRow.role !== 'MEDICO') {
				return NextResponse.json({ message: 'Solo se pueden suspender usuarios con rol MEDICO' }, { status: 400 });
			}
			if (!userRow.organizationId) {
				return NextResponse.json({ message: 'El usuario no pertenece a ninguna organización' }, { status: 400 });
			}

			// Actualizar el estado de actividad
			const { error: suspendErr } = await supabase
				.from('User')
				.update({
					used: false, // nuevo campo de estado
					authId: null, // opcional: desasocia sesión
					passwordHash: null, // opcional: limpia hash de login
				})
				.eq('id', userRow.id)
				.eq('role', 'MEDICO');

			if (suspendErr) {
				console.error('[api/specialists][POST] Error suspending user', suspendErr);
				return NextResponse.json({ message: 'Error al suspender usuario' }, { status: 500 });
			}

			console.log(`[api/specialists][POST] Usuario ${userRow.email} suspendido (used=false)`);

			return NextResponse.json({ message: 'Usuario suspendido correctamente' });
		}

		return NextResponse.json({ message: 'Acción no soportada' }, { status: 400 });
	} catch (e) {
		console.error('[api/specialists][POST] unexpected', e);
		return NextResponse.json({ message: 'Error inesperado' }, { status: 500 });
	}
}
