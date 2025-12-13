import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

// GET: Obtener métodos de pago personalizados de la organización
export async function GET(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();

		// Obtener métodos de pago activos de la organización
		const { data: paymentMethods, error } = await supabase
			.from('role_user_payment_methods')
			.select('*')
			.eq('organization_id', session.organizationId)
			.eq('is_active', true)
			.order('name', { ascending: true });

		if (error) {
			console.error('[Role User Payment Methods API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener métodos de pago' }, { status: 500 });
		}

		return NextResponse.json({ success: true, paymentMethods: paymentMethods || [] }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Payment Methods API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

// POST: Crear nuevo método de pago personalizado
export async function POST(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const body = await req.json();
		const { name, description } = body;

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return NextResponse.json({ error: 'El nombre del método de pago es requerido' }, { status: 400 });
		}

		const supabase = await createSupabaseServerClient();

		// Verificar que no exista un método con el mismo nombre en la organización
		const { data: existing } = await supabase
			.from('role_user_payment_methods')
			.select('id')
			.eq('organization_id', session.organizationId)
			.eq('name', name.trim())
			.maybeSingle();

		if (existing) {
			return NextResponse.json({ error: 'Ya existe un método de pago con ese nombre' }, { status: 409 });
		}

		// Crear nuevo método de pago
		const { data: newMethod, error } = await supabase
			.from('role_user_payment_methods')
			.insert({
				organization_id: session.organizationId,
				name: name.trim(),
				description: description?.trim() || null,
				is_active: true,
				created_by_role_user_id: session.roleUserId,
			})
			.select()
			.single();

		if (error) {
			console.error('[Role User Payment Methods API] Error creando:', error);
			return NextResponse.json({ error: 'Error al crear método de pago' }, { status: 500 });
		}

		return NextResponse.json({ success: true, paymentMethod: newMethod }, { status: 201 });
	} catch (err: any) {
		console.error('[Role User Payment Methods API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

