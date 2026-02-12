import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

// POST: Marcar mensaje como leído
export async function POST(req: NextRequest) {
	try {
		const { messageId } = await req.json();
		
		if (!messageId) {
			return NextResponse.json({ error: 'messageId es requerido' }, { status: 400 });
		}

		const supabase = await createSupabaseServerClient();
		
		// Intentar obtener sesión de role-user primero
		let currentUserId: string | null = null;
		let currentUserType: 'user' | 'role_user' = 'user';

		try {
			const roleUserSession = await getRoleUserSessionFromServer();
			if (roleUserSession) {
				currentUserId = roleUserSession.roleUserId;
				currentUserType = 'role_user';
			}
		} catch {
			// No es role-user
		}

		// Si no es role-user, obtener usuario regular
		if (!currentUserId) {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) {
				return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
			}

			const { data: appUser } = await supabase
				.from('users')
				.select('id')
				.eq('authId', user.id)
				.maybeSingle();

			if (!appUser) {
				return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
			}

			currentUserId = appUser.id;
			currentUserType = 'user';
		}

		if (!currentUserId) {
			return NextResponse.json({ error: 'No se pudo determinar el usuario' }, { status: 400 });
		}

		// Actualizar mensaje como leído solo si el usuario actual es el receptor
		const { error } = await supabase
			.from('private_messages')
			.update({ is_read: true, read_at: new Date().toISOString() })
			.eq('id', messageId)
			.eq('receiver_id', currentUserId)
			.eq('receiver_type', currentUserType)
			.eq('is_read', false);

		if (error) {
			console.error('[Messaging API] Error marcando como leído:', error);
			return NextResponse.json({ error: 'Error al marcar como leído' }, { status: 500 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err: any) {
		console.error('[Messaging API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

