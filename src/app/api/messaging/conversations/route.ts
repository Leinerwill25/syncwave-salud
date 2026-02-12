import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

// GET: Obtener lista de conversaciones (usuarios con los que hay mensajes)
export async function GET(req: NextRequest) {
	try {
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
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
			}

			const { data: appUser } = await supabase.from('users').select('id, organizationId').eq('authId', user.id).maybeSingle();

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

		// Obtener todas las conversaciones donde el usuario actual es remitente o receptor
		// Necesitamos hacer dos consultas separadas debido a las condiciones complejas
		const { data: messagesAsSender, error: error1 } = await supabase.from('private_messages').select('*').eq('organization_id', organizationId).eq('sender_id', currentUserId).eq('sender_type', currentUserType).order('created_at', { ascending: false });

		const { data: messagesAsReceiver, error: error2 } = await supabase.from('private_messages').select('*').eq('organization_id', organizationId).eq('receiver_id', currentUserId).eq('receiver_type', currentUserType).order('created_at', { ascending: false });

		if (error1 || error2) {
			console.error('[Messaging API] Error obteniendo mensajes:', error1 || error2);
			return NextResponse.json({ error: 'Error al obtener conversaciones' }, { status: 500 });
		}

		const messages = [...(messagesAsSender || []), ...(messagesAsReceiver || [])];

		// Agrupar por conversación (otro usuario)
		const conversationsMap = new Map<string, any>();

		(messages || []).forEach((msg: any) => {
			let otherUserId: string;
			let otherUserType: 'user' | 'role_user';
			let otherUserName: string = 'Usuario desconocido';

			if (msg.sender_id === currentUserId && msg.sender_type === currentUserType) {
				// El usuario actual es el remitente
				otherUserId = msg.receiver_id;
				otherUserType = msg.receiver_type as 'user' | 'role_user';
			} else {
				// El usuario actual es el receptor
				otherUserId = msg.sender_id;
				otherUserType = msg.sender_type as 'user' | 'role_user';
			}

			const conversationKey = `${otherUserType}_${otherUserId}`;

			if (!conversationsMap.has(conversationKey)) {
				conversationsMap.set(conversationKey, {
					userId: otherUserId,
					userType: otherUserType,
					userName: otherUserName,
					lastMessage: msg.message,
					lastMessageTime: msg.created_at,
					unreadCount: 0,
					lastMessageSenderId: msg.sender_id,
					lastMessageSenderType: msg.sender_type,
				});
			}

			// Actualizar último mensaje si es más reciente
			const conv = conversationsMap.get(conversationKey)!;
			if (new Date(msg.created_at) > new Date(conv.lastMessageTime)) {
				conv.lastMessage = msg.message;
				conv.lastMessageTime = msg.created_at;
				conv.lastMessageSenderId = msg.sender_id;
				conv.lastMessageSenderType = msg.sender_type;
			}

			// Contar mensajes no leídos donde el usuario actual es el receptor
			if (msg.receiver_id === currentUserId && msg.receiver_type === currentUserType && !msg.is_read) {
				conv.unreadCount++;
			}
		});

		// Obtener nombres de los usuarios
		const userIds: string[] = [];
		const roleUserIds: string[] = [];

		conversationsMap.forEach((conv) => {
			if (conv.userType === 'user') {
				userIds.push(conv.userId);
			} else {
				roleUserIds.push(conv.userId);
			}
		});

		// Obtener nombres de usuarios regulares
		if (userIds.length > 0) {
			const { data: users } = await supabase.from('users').select('id, name, role').in('id', userIds);

			users?.forEach((user: any) => {
				const conv = conversationsMap.get(`user_${user.id}`);
				if (conv) {
					conv.userName = user.name || `Usuario (${user.role})`;
				}
			});
		}

		// Obtener nombres de role-users
		if (roleUserIds.length > 0) {
			console.log('[Messaging API] Buscando role-users con IDs:', roleUserIds);
			const { data: roleUsers, error: roleUsersError } = await supabase.from('consultorio_role_users').select('id, first_name, last_name, consultorio_roles(role_name)').in('id', roleUserIds).eq('organization_id', organizationId);

			if (roleUsersError) {
				console.error('[Messaging API] Error obteniendo role-users:', roleUsersError);
			} else {
				console.log('[Messaging API] Role-users encontrados:', roleUsers?.length || 0, roleUsers);
			}

			roleUsers?.forEach((roleUser: any) => {
				const conv = conversationsMap.get(`role_user_${roleUser.id}`);
				if (conv) {
					// Construir nombre completo desde first_name y last_name
					const fullName = [roleUser.first_name, roleUser.last_name].filter(Boolean).join(' ').trim();
					// Obtener role_name de la relación
					const roleName = roleUser.consultorio_roles?.role_name || null;
					conv.userName = fullName || roleName || 'Usuario';
					console.log('[Messaging API] Actualizado nombre para role_user:', roleUser.id, '->', conv.userName);
				} else {
					console.warn('[Messaging API] No se encontró conversación para role_user:', roleUser.id);
				}
			});
		}

		// Obtener nombres faltantes (si algún usuario no tenía nombre) - intentar obtener de nuevo
		const missingRoleUserIds: string[] = [];
		conversationsMap.forEach((conv, key) => {
			if (conv.userName === 'Usuario desconocido' && conv.userType === 'role_user') {
				missingRoleUserIds.push(conv.userId);
				console.warn('[Messaging API] Conversación sin nombre encontrada:', key, conv);
			}
		});

		// Intentar obtener los nombres faltantes en una sola consulta
		if (missingRoleUserIds.length > 0) {
			console.log('[Messaging API] Intentando obtener nombres faltantes para role-users:', missingRoleUserIds);
			const { data: missingRoleUsers, error: missingError } = await supabase.from('consultorio_role_users').select('id, first_name, last_name, consultorio_roles(role_name)').in('id', missingRoleUserIds).eq('organization_id', organizationId);

			if (missingError) {
				console.error('[Messaging API] Error obteniendo nombres faltantes:', missingError);
			} else {
				console.log('[Messaging API] Role-users faltantes encontrados:', missingRoleUsers?.length || 0, missingRoleUsers);
				missingRoleUsers?.forEach((roleUser: any) => {
					const conv = conversationsMap.get(`role_user_${roleUser.id}`);
					if (conv) {
						const fullName = [roleUser.first_name, roleUser.last_name].filter(Boolean).join(' ').trim();
						const roleName = roleUser.consultorio_roles?.role_name || null;
						conv.userName = fullName || roleName || 'Usuario';
						console.log('[Messaging API] Nombre recuperado para role_user:', roleUser.id, '->', conv.userName);
					}
				});
			}
		}

		// Convertir a array y ordenar por último mensaje
		const conversations = Array.from(conversationsMap.values()).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

		return NextResponse.json({ success: true, conversations }, { status: 200 });
	} catch (err: any) {
		console.error('[Messaging API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}
