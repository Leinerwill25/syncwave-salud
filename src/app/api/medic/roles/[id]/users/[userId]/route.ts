import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// PATCH: Actualizar un usuario del rol
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
	try {
		const { id: roleId, userId } = await params;
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();
		if (user.role !== 'MEDICO') {
			return NextResponse.json({ error: 'Acceso denegado: solo médicos' }, { status: 403 });
		}

		if (!user.organizationId) {
			return NextResponse.json({ error: 'Usuario no asociado a una organización' }, { status: 400 });
		}

		// Verificar que el rol pertenece a la organización
		const { data: role } = await supabase
			.from('consultorio_roles')
			.select('*')
			.eq('id', roleId)
			.eq('organization_id', user.organizationId)
			.single();

		if (!role) {
			return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
		}

		// Verificar que el usuario del rol existe
		const { data: existingUser } = await supabase
			.from('consultorio_role_users')
			.select('*')
			.eq('id', userId)
			.eq('role_id', roleId)
			.single();

		if (!existingUser) {
			return NextResponse.json({ error: 'Usuario del rol no encontrado' }, { status: 404 });
		}

		const body = await request.json();
		const updateData: Record<string, unknown> = {};

		if (body.firstName !== undefined) updateData.first_name = body.firstName.trim();
		if (body.lastName !== undefined) updateData.last_name = body.lastName.trim();
		if (body.identifier !== undefined) {
			// Verificar que no exista otro usuario con esa cédula en este rol
			const { data: duplicateUser } = await supabase
				.from('consultorio_role_users')
				.select('id')
				.eq('role_id', roleId)
				.eq('identifier', body.identifier.trim())
				.neq('id', userId)
				.maybeSingle();

			if (duplicateUser) {
				return NextResponse.json({ error: 'Ya existe otro usuario con esa cédula en este rol' }, { status: 409 });
			}

			updateData.identifier = body.identifier.trim();
		}
		if (body.email !== undefined) updateData.email = body.email?.trim() || null;
		if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;
		if (body.isActive !== undefined) updateData.is_active = Boolean(body.isActive);

		// Actualizar el usuario
		const { data: updatedUser, error: updateError } = await supabase
			.from('consultorio_role_users')
			.update(updateData)
			.eq('id', userId)
			.select()
			.single();

		if (updateError) {
			console.error('[Roles API] Error actualizando usuario:', updateError);
			return NextResponse.json({ error: 'Error al actualizar el usuario' }, { status: 500 });
		}

		// Obtener nombre del usuario desde la tabla User
		const { data: userData } = await supabase
			.from('User')
			.select('name')
			.eq('id', user.userId)
			.maybeSingle();

		const userName = userData?.name || 'Usuario';
		const nameParts = userName.split(' ');
		const firstName = nameParts[0] || 'Usuario';
		const lastName = nameParts.slice(1).join(' ') || '';

		// Registrar en auditoría
		await supabase.from('consultorio_role_audit_log').insert({
			organization_id: user.organizationId,
			role_id: roleId,
			role_user_id: userId,
			user_first_name: firstName,
			user_last_name: lastName,
			user_identifier: '',
			action_type: 'update',
			module: 'roles',
			entity_type: 'consultorio_role_user',
			entity_id: userId,
			action_details: {
				description: `Usuario del rol "${role.role_name}" actualizado`,
				changes: updateData,
			},
		});

		return NextResponse.json({ success: true, user: updatedUser });
	} catch (err) {
		console.error('[Roles API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

// DELETE: Eliminar (desactivar) un usuario del rol
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
	try {
		const { id: roleId, userId } = await params;
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();
		if (user.role !== 'MEDICO') {
			return NextResponse.json({ error: 'Acceso denegado: solo médicos' }, { status: 403 });
		}

		if (!user.organizationId) {
			return NextResponse.json({ error: 'Usuario no asociado a una organización' }, { status: 400 });
		}

		// Verificar que el rol pertenece a la organización
		const { data: role } = await supabase
			.from('consultorio_roles')
			.select('*')
			.eq('id', roleId)
			.eq('organization_id', user.organizationId)
			.single();

		if (!role) {
			return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
		}

		// Verificar que el usuario del rol existe
		const { data: existingUser } = await supabase
			.from('consultorio_role_users')
			.select('*')
			.eq('id', userId)
			.eq('role_id', roleId)
			.single();

		if (!existingUser) {
			return NextResponse.json({ error: 'Usuario del rol no encontrado' }, { status: 404 });
		}

		// Desactivar el usuario (soft delete)
		const { data: updatedUser, error: updateError } = await supabase
			.from('consultorio_role_users')
			.update({ is_active: false })
			.eq('id', userId)
			.select()
			.single();

		if (updateError) {
			console.error('[Roles API] Error desactivando usuario:', updateError);
			return NextResponse.json({ error: 'Error al desactivar el usuario' }, { status: 500 });
		}

		// Obtener nombre del usuario desde la tabla User
		const { data: userData } = await supabase
			.from('User')
			.select('name')
			.eq('id', user.userId)
			.maybeSingle();

		const userName = userData?.name || 'Usuario';
		const nameParts = userName.split(' ');
		const firstName = nameParts[0] || 'Usuario';
		const lastName = nameParts.slice(1).join(' ') || '';

		// Registrar en auditoría
		await supabase.from('consultorio_role_audit_log').insert({
			organization_id: user.organizationId,
			role_id: roleId,
			role_user_id: userId,
			user_first_name: firstName,
			user_last_name: lastName,
			user_identifier: '',
			action_type: 'delete',
			module: 'roles',
			entity_type: 'consultorio_role_user',
			entity_id: userId,
			action_details: {
				description: `Usuario ${existingUser.first_name} ${existingUser.last_name} (${existingUser.identifier}) removido del rol "${role.role_name}"`,
			},
		});

		return NextResponse.json({ success: true, user: updatedUser });
	} catch (err) {
		console.error('[Roles API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

