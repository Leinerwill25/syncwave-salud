import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(req: Request) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const user = authResult.user!;
		const supabase = await createSupabaseServerClient();

		const { data, error } = await supabase
			.from('pharmacy_discounts')
			.select('*, category:pharmacy_categories(id, name, emoji)')
			.eq('org_id', user.organizationId)
			.order('sort_order', { ascending: true })
			.order('created_at', { ascending: false });

		if (error) {
			console.error('[API Discounts GET]', error);
			return NextResponse.json({ message: 'Error consultando descuentos' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Discounts GET] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}

export async function POST(req: Request) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const user = authResult.user!;
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
			.insert({
				org_id: user.organizationId,
				title: title.trim(),
				discount_pct,
				category_id: category_id || null,
				image_url: image_url?.trim() || null,
				sort_order: typeof sort_order === 'number' ? sort_order : 0,
				is_active: is_active !== false
			})
			.select()
			.single();

		if (error) {
			console.error('[API Discounts POST]', error);
			return NextResponse.json({ message: 'Error al crear el descuento' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Discounts POST] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
