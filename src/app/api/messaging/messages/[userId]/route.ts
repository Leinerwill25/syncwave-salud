import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

// GET: Obtener mensajes de una conversación específica
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
	try {
		const { userId: otherUserId } = await params;
		const searchParams = req.nextUrl.searchParams;
		const otherUserType = searchParams.get('userType') || 'user';

		const supabase = await createSupabaseServerClient();
		
		// Intentar obtener sesión de role-user primero
		let currentUserId: string | null = null;
		let currentUserType: 'user' | 'role_user' = 'user';
		let organizationId: string | null = null;

		try {
			const roleUserSession = await getRoleUserSessionFromServer();
			if (roleUserSession) {
				currentUserId = roleUserSession.roleUserId;
				currentUserType = 'role_user';
				organizationId = roleUserSession.organizationId;
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
				.from('User')
				.select('id, organizationId')
				.eq('authId', user.id)
				.maybeSingle();

			if (!appUser) {
				return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
			}

			currentUserId = appUser.id;
			currentUserType = 'user';
			organizationId = appUser.organizationId;
		}

		if (!currentUserId || !organizationId) {
			return NextResponse.json({ error: 'No se pudo determinar el usuario' }, { status: 400 });
		}

		// Obtener mensajes entre el usuario actual y el otro usuario
		// Usar filtros más específicos para evitar problemas con OR
		const { data: messages1, error: error1 } = await supabase
			.from('private_messages')
			.select('*')
			.eq('organization_id', organizationId)
			.eq('sender_id', currentUserId)
			.eq('sender_type', currentUserType)
			.eq('receiver_id', otherUserId)
			.eq('receiver_type', otherUserType);

		const { data: messages2, error: error2 } = await supabase
			.from('private_messages')
			.select('*')
			.eq('organization_id', organizationId)
			.eq('sender_id', otherUserId)
			.eq('sender_type', otherUserType)
			.eq('receiver_id', currentUserId)
			.eq('receiver_type', currentUserType);

		const error = error1 || error2;
		const messages = [...(messages1 || []), ...(messages2 || [])].sort((a, b) => 
			new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
		);

		if (error) {
			console.error('[Messaging API] Error obteniendo mensajes:', error);
			return NextResponse.json({ error: 'Error al obtener mensajes' }, { status: 500 });
		}

		// Marcar mensajes como leídos
		await supabase
			.from('private_messages')
			.update({ is_read: true, read_at: new Date().toISOString() })
			.eq('receiver_id', currentUserId)
			.eq('receiver_type', currentUserType)
			.eq('sender_id', otherUserId)
			.eq('sender_type', otherUserType)
			.eq('is_read', false);

		return NextResponse.json({ success: true, messages: messages || [] }, { status: 200 });
	} catch (err: any) {
		console.error('[Messaging API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

