import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// GET: Obtener un rol específico con sus usuarios y permisos
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
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

		// Obtener el rol y verificar que pertenece a la organización del médico
		const { data: role, error: roleError } = await supabase
			.from('consultorio_roles')
			.select('*')
			.eq('id', id)
			.eq('organization_id', user.organizationId)
			.single();

		if (roleError || !role) {
			return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
		}

		// Obtener usuarios del rol
		const { data: roleUsers } = await supabase
			.from('consultorio_role_users')
			.select('*')
			.eq('role_id', id)
			.order('created_at', { ascending: false });

		// Obtener permisos del rol
		const { data: permissions } = await supabase
			.from('consultorio_role_permissions')
			.select('*')
			.eq('role_id', id)
			.order('module', { ascending: true });

		return NextResponse.json({
			success: true,
			role: {
				...role,
				users: roleUsers || [],
				permissions: permissions || [],
			},
		});
	} catch (err) {
		console.error('[Roles API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

// PATCH: Actualizar un rol
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
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
		const { data: existingRole } = await supabase
			.from('consultorio_roles')
			.select('*')
			.eq('id', id)
			.eq('organization_id', user.organizationId)
			.single();

		if (!existingRole) {
			return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
		}

		const body = await request.json();
		const updateData: Record<string, unknown> = {};

		if (body.roleName !== undefined) {
			if (!body.roleName || typeof body.roleName !== 'string' || body.roleName.trim().length === 0) {
				return NextResponse.json({ error: 'El nombre del rol no puede estar vacío' }, { status: 400 });
			}

			// Verificar que no exista otro rol con el mismo nombre
			const { data: duplicateRole } = await supabase
				.from('consultorio_roles')
				.select('id')
				.eq('organization_id', user.organizationId)
				.eq('role_name', body.roleName.trim())
				.neq('id', id)
				.maybeSingle();

			if (duplicateRole) {
				return NextResponse.json({ error: 'Ya existe un rol con ese nombre' }, { status: 409 });
			}

			updateData.role_name = body.roleName.trim();
		}

		if (body.roleDescription !== undefined) {
			updateData.role_description = body.roleDescription?.trim() || null;
		}

		if (body.isActive !== undefined) {
			updateData.is_active = Boolean(body.isActive);
		}

		// Actualizar el rol
		const { data: updatedRole, error: updateError } = await supabase
			.from('consultorio_roles')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (updateError) {
			console.error('[Roles API] Error actualizando rol:', updateError);
			return NextResponse.json({ error: 'Error al actualizar el rol' }, { status: 500 });
		}

		// Actualizar permisos si se proporcionaron
		if (body.permissions && Array.isArray(body.permissions)) {
			// Eliminar permisos existentes
			await supabase.from('consultorio_role_permissions').delete().eq('role_id', id);

			// Insertar nuevos permisos
			if (body.permissions.length > 0) {
				const permissionsToInsert = body.permissions.map((perm: { module: string; permissions: Record<string, boolean> }) => ({
					role_id: id,
					module: perm.module,
					permissions: perm.permissions || {},
				}));

				await supabase.from('consultorio_role_permissions').insert(permissionsToInsert);
			}
		}

		// Obtener nombre del usuario desde la tabla User
		const { data: userData } = await supabase
			.from('user')
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
			role_id: id,
			user_first_name: firstName,
			user_last_name: lastName,
			user_identifier: '',
			action_type: 'update',
			module: 'roles',
			entity_type: 'consultorio_role',
			entity_id: id,
			action_details: {
				description: `Rol "${updatedRole.role_name}" actualizado`,
				changes: updateData,
			},
		});

		return NextResponse.json({ success: true, role: updatedRole });
	} catch (err) {
		console.error('[Roles API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

// DELETE: Eliminar (desactivar) un rol
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
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
		const { data: existingRole } = await supabase
			.from('consultorio_roles')
			.select('*')
			.eq('id', id)
			.eq('organization_id', user.organizationId)
			.single();

		if (!existingRole) {
			return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
		}

		// Desactivar el rol (soft delete)
		const { data: updatedRole, error: updateError } = await supabase
			.from('consultorio_roles')
			.update({ is_active: false })
			.eq('id', id)
			.select()
			.single();

		if (updateError) {
			console.error('[Roles API] Error desactivando rol:', updateError);
			return NextResponse.json({ error: 'Error al desactivar el rol' }, { status: 500 });
		}

		// Desactivar también todos los usuarios del rol
		await supabase.from('consultorio_role_users').update({ is_active: false }).eq('role_id', id);

		// Obtener nombre del usuario desde la tabla User
		const { data: userData } = await supabase
			.from('user')
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
			role_id: id,
			user_first_name: firstName,
			user_last_name: lastName,
			user_identifier: '',
			action_type: 'delete',
			module: 'roles',
			entity_type: 'consultorio_role',
			entity_id: id,
			action_details: {
				description: `Rol "${existingRole.role_name}" desactivado`,
			},
		});

		return NextResponse.json({ success: true, role: updatedRole });
	} catch (err) {
		console.error('[Roles API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

