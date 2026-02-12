// app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireAuth } from '@/lib/auth-guards';

export async function GET(req: Request) {
	try {
		const authResult = await apiRequireAuth();
		if (authResult.response) return authResult.response;

		const authUser = authResult.user;
		if (!authUser) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		console.debug('[API/notifications] authUser present?', !!authUser);

		// Crea el cliente server-side
		const supabase = await createSupabaseServerClient();

		const authUserId = authUser.authId;
		const role = authUser.role;
		let orgId = authUser.organizationId;
		const appUserId = authUser.userId;

		console.debug('[API/notifications] authUserId, appUserId, role, orgId:', authUserId, appUserId, role, orgId);

		if (!orgId) return NextResponse.json({ notifications: [], appUserId: null });

		// 3) Filtrar NOTIFICACIONES por appUserId (userId de la tabla Notification)
		if (!appUserId) {
			return NextResponse.json({ notifications: [], appUserId: null });
		}

		const { data, error } = await supabase
			.from('notification')
			.select('*')
			.eq('organizationId', orgId)
			.eq('userId', appUserId)
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
