// app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';

export async function GET(req: Request) {
	try {
		const authHeader = req.headers.get('authorization') || '';
		const token = authHeader.replace('Bearer ', '').trim();
		console.debug('[API/notifications] token present?', !!token);

		// Crea el cliente server-side. Si tu helper acepta { req }, pásalo.
		const supabase = await createSupabaseServerClient();

		// 1) Obtener usuario auth (desde token o cookies)
		let userDataResp;
		if (token) {
			userDataResp = await supabase.auth.getUser(token);
		} else {
			userDataResp = await supabase.auth.getUser();
		}
		const { data: userData, error: userErr } = userDataResp ?? {};
		if (userErr || !userData?.user) {
			console.warn('[API/notifications] user invalid', userErr);
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
		}

		const authUser = userData.user; // este es el user del Auth (authUser.id = auth uid)
		const authUserId = authUser.id;
		const role = (authUser.user_metadata as any)?.role ?? 'PATIENT';
		let orgId = (authUser.user_metadata as any)?.organizationId ?? null;

		// 2) Obtener fila en tabla public.users para mapear authId -> app user id
		const { data: appUserRow, error: appUserErr } = await supabase.from('users').select('id, "organizationId"').eq('authId', authUserId).limit(1).maybeSingle();

		if (appUserErr) {
			console.error('[API/notifications] error fetching app user row:', appUserErr);
			// podemos continuar si no existe (pero entonces no hay appUserId para filtrar)
		}

		const appUserId = appUserRow?.id ?? null;
		// usar organizationId de la tabla User si no viene en metadata
		orgId = orgId ?? appUserRow?.organizationId ?? null;

		console.debug('[API/notifications] authUserId, appUserId, role, orgId:', authUserId, appUserId, role, orgId);

		if (!orgId) return NextResponse.json({ notifications: [], appUserId: null });

		// 3) Filtrar NOTIFICACIONES por appUserId (userId de la tabla Notification)
		// Si deseas únicamente notificaciones del usuario en específico:
		if (!appUserId) {
			// no hay usuario en la tabla User: devolver vacío (o manejar según tu lógica)
			return NextResponse.json({ notifications: [], appUserId: null });
		}

		const { data, error } = await supabase
			.from('notification')
			.select('*')
			.eq('organizationId', orgId)
			.eq('userId', appUserId) // <-- aquí comparamos con el id de la tabla User
			.order('createdAt', { ascending: false })
			.limit(200);

		if (error) {
			console.error('[API/notifications] DB error:', error);
			return NextResponse.json({ error: 'DB error' }, { status: 500 });
		}

		// 4) Devolvemos también appUserId para que el cliente pueda suscribirse correctamente
		return NextResponse.json({ notifications: data ?? [], appUserId });
	} catch (err) {
		console.error('[API/notifications] Internal error:', err);
		return NextResponse.json({ error: 'Internal error' }, { status: 500 });
	}
}
