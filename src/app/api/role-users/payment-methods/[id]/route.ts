import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

// PUT: Actualizar método de pago
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const { id } = await params;
		const body = await req.json();
		const { name, description, is_active } = body;

		const supabase = await createSupabaseServerClient();

		// Verificar que el método de pago pertenece a la organización
		const { data: existing, error: fetchError } = await supabase
			.from('role_user_payment_methods')
			.select('id, organization_id, name')
			.eq('id', id)
			.eq('organization_id', session.organizationId)
			.single();

		if (fetchError || !existing) {
			return NextResponse.json({ error: 'Método de pago no encontrado' }, { status: 404 });
		}

		// Si se cambia el nombre, verificar que no exista otro con el mismo nombre
		if (name && name.trim() !== existing.name) {
			const { data: duplicate } = await supabase
				.from('role_user_payment_methods')
				.select('id')
				.eq('organization_id', session.organizationId)
				.eq('name', name.trim())
				.neq('id', id)
				.maybeSingle();

			if (duplicate) {
				return NextResponse.json({ error: 'Ya existe un método de pago con ese nombre' }, { status: 409 });
			}
		}

		// Actualizar
		const updateData: any = {};
		if (name !== undefined) updateData.name = name.trim();
		if (description !== undefined) updateData.description = description?.trim() || null;
		if (is_active !== undefined) updateData.is_active = is_active;
		updateData.updated_at = new Date().toISOString();

		const { data: updated, error } = await supabase
			.from('role_user_payment_methods')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('[Role User Payment Methods API] Error actualizando:', error);
			return NextResponse.json({ error: 'Error al actualizar método de pago' }, { status: 500 });
		}

		return NextResponse.json({ success: true, paymentMethod: updated }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Payment Methods API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

// DELETE: Eliminar (desactivar) método de pago
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const { id } = await params;
		const supabase = await createSupabaseServerClient();

		// Verificar que el método de pago pertenece a la organización
		const { data: existing } = await supabase
			.from('role_user_payment_methods')
			.select('id, organization_id')
			.eq('id', id)
			.eq('organization_id', session.organizationId)
			.single();

		if (!existing) {
			return NextResponse.json({ error: 'Método de pago no encontrado' }, { status: 404 });
		}

		// Desactivar en lugar de eliminar (soft delete)
		const { error } = await supabase
			.from('role_user_payment_methods')
			.update({ is_active: false, updated_at: new Date().toISOString() })
			.eq('id', id);

		if (error) {
			console.error('[Role User Payment Methods API] Error eliminando:', error);
			return NextResponse.json({ error: 'Error al eliminar método de pago' }, { status: 500 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Payment Methods API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

