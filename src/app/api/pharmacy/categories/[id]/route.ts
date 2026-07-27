// app/api/pharmacy/categories/[id]/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function PUT(req: Request, { params }: RouteParams) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const user = authResult.user!;
		const { id } = await params;
		const supabase = await createSupabaseServerClient();

		const body = await req.json().catch(() => ({}));
		const { name, description, emoji, is_featured } = body;

		if (!name || name.trim() === '') {
			return NextResponse.json({ message: 'El nombre es obligatorio' }, { status: 400 });
		}

		const { data, error } = await supabase
			.from('pharmacy_categories')
			.update({
				name: name.trim(),
				description: description?.trim() || null,
				emoji: emoji?.trim() || null,
				is_featured: !!is_featured
			})
			.eq('id', id)
			.eq('org_id', user.organizationId)
			.select()
			.maybeSingle();

		if (error) {
			console.error('[API Category PUT]', error);
			return NextResponse.json({ message: 'Error al actualizar la categoría' }, { status: 500 });
		}

		if (!data) {
			return NextResponse.json({ message: 'Categoría no encontrada' }, { status: 404 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Category PUT] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}

export async function DELETE(req: Request, { params }: RouteParams) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const user = authResult.user!;
		const { id } = await params;
		const supabase = await createSupabaseServerClient();

		const { error } = await supabase
			.from('pharmacy_categories')
			.delete()
			.eq('id', id)
			.eq('org_id', user.organizationId);

		if (error) {
			console.error('[API Category DELETE]', error);
			return NextResponse.json({ message: 'Error al eliminar la categoría' }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Categoría eliminada' });
	} catch (e: any) {
		console.error('[API Category DELETE] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
