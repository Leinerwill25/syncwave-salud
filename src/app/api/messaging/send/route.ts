import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

// POST: Enviar un mensaje privado
export async function POST(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();
		
		// Intentar obtener sesión de role-user primero
		let senderId: string | null = null;
		let senderType: 'user' | 'role_user' = 'user';
		let organizationId: string | null = null;

		try {
			const roleUserSession = await getRoleUserSessionFromServer();
			if (roleUserSession) {
				senderId = roleUserSession.roleUserId;
				senderType = 'role_user';
				organizationId = roleUserSession.organizationId;
			}
		} catch {
			// No es role-user, intentar usuario regular
		}

		// Si no es role-user, obtener usuario regular
		if (!senderId) {
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

			senderId = appUser.id;
			senderType = 'user';
			organizationId = appUser.organizationId;
		}

		if (!senderId || !organizationId) {
			return NextResponse.json({ error: 'No se pudo determinar el remitente' }, { status: 400 });
		}

		const body = await req.json();
		const { receiver_id, receiver_type, message } = body;

		if (!receiver_id || !receiver_type || !message || !message.trim()) {
			return NextResponse.json({ error: 'receiver_id, receiver_type y message son requeridos' }, { status: 400 });
		}

		if (receiver_type !== 'user' && receiver_type !== 'role_user') {
			return NextResponse.json({ error: 'receiver_type debe ser "user" o "role_user"' }, { status: 400 });
		}

		// Verificar que el receptor existe y pertenece a la misma organización
		if (receiver_type === 'role_user') {
			const { data: roleUser } = await supabase
				.from('consultorio_role_users')
				.select('id, organization_id')
				.eq('id', receiver_id)
				.single();

			if (!roleUser || roleUser.organization_id !== organizationId) {
				return NextResponse.json({ error: 'Receptor no encontrado o no pertenece a tu organización' }, { status: 404 });
			}
		} else {
			const { data: receiver } = await supabase
				.from('User')
				.select('id, organizationId')
				.eq('id', receiver_id)
				.single();

			if (!receiver || receiver.organizationId !== organizationId) {
				return NextResponse.json({ error: 'Receptor no encontrado o no pertenece a tu organización' }, { status: 404 });
			}
		}

		// Insertar mensaje
		const { data: newMessage, error: insertError } = await supabase
			.from('private_messages')
			.insert({
				sender_id: senderId,
				sender_type: senderType,
				receiver_id: receiver_id,
				receiver_type: receiver_type,
				organization_id: organizationId,
				message: message.trim(),
				is_read: false,
			})
			.select()
			.single();

		if (insertError) {
			console.error('[Messaging API] Error insertando mensaje:', insertError);
			return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: newMessage }, { status: 201 });
	} catch (err: any) {
		console.error('[Messaging API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

