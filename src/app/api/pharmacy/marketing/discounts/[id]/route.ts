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
		const { title, discount_pct, category_id, image_url, sort_order, is_active } = body;

		if (!title || title.trim() === '') {
			return NextResponse.json({ message: 'El título es obligatorio' }, { status: 400 });
		}
		if (typeof discount_pct !== 'number' || discount_pct <= 0 || discount_pct > 100) {
			return NextResponse.json({ message: 'El porcentaje de descuento debe ser un número entre 0 y 100' }, { status: 400 });
		}

		const { data, error } = await supabase
			.from('pharmacy_discounts')
			.update({
				title: title.trim(),
				discount_pct,
				category_id: category_id || null,
				image_url: image_url?.trim() || null,
				sort_order: typeof sort_order === 'number' ? sort_order : 0,
				is_active: !!is_active
			})
			.eq('id', id)
			.eq('org_id', user.organizationId)
			.select()
			.maybeSingle();

		if (error) {
			console.error('[API Discount PUT]', error);
			return NextResponse.json({ message: 'Error al actualizar el descuento' }, { status: 500 });
		}

		if (!data) {
			return NextResponse.json({ message: 'Descuento no encontrado' }, { status: 404 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Discount PUT] Unexpected error:', e);
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
			.from('pharmacy_discounts')
			.delete()
			.eq('id', id)
			.eq('org_id', user.organizationId);

		if (error) {
			console.error('[API Discount DELETE]', error);
			return NextResponse.json({ message: 'Error al eliminar el descuento' }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Descuento eliminado' });
	} catch (e: any) {
		console.error('[API Discount DELETE] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
