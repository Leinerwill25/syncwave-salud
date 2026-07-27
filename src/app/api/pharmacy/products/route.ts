// app/api/pharmacy/products/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(req: Request) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const user = authResult.user!;
		const supabase = await createSupabaseServerClient();

		const { searchParams } = new URL(req.url);
		const search = searchParams.get('search') || '';
		const category = searchParams.get('category') || '';
		const availability = searchParams.get('availability') || '';

		let query = supabase
			.from('pharmacy_products')
			.select('*, medication_catalog(*), pharmacy_categories(*)')
			.eq('org_id', user.organizationId);

		if (category) {
			query = query.eq('category_id', category);
		}
		if (availability) {
			query = query.eq('availability', availability);
		}
		if (search) {
			query = query.ilike('name', `%${search}%`);
		}

		const { data, error } = await query.order('created_at', { ascending: false });

		if (error) {
			console.error('[API Products GET]', error);
			return NextResponse.json({ message: 'Error consultando productos' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Products GET] Unexpected error:', e);
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
		const {
			name,
			medication_id,
			category_id,
			description,
			image_url,
			availability,
			is_featured,
			currency,
			price,
			bultos,
			units_per_bulto,
			stock_units,
			discount_pct,
			expiry_date
		} = body;

		if (!name || name.trim() === '') {
			return NextResponse.json({ message: 'El nombre es obligatorio' }, { status: 400 });
		}

		const { data, error } = await supabase
			.from('pharmacy_products')
			.insert({
				org_id: user.organizationId,
				name: name.trim(),
				medication_id: medication_id || null,
				category_id: category_id || null,
				description: description || null,
				image_url: image_url || null,
				availability: availability || 'in_stock',
				is_featured: !!is_featured,
				currency: currency || null,
				price: price !== undefined && price !== null ? Number(price) : null,
				bultos: bultos !== undefined && bultos !== null ? Number(bultos) : null,
				units_per_bulto: units_per_bulto !== undefined && units_per_bulto !== null ? Number(units_per_bulto) : null,
				stock_units: stock_units !== undefined && stock_units !== null ? Number(stock_units) : null,
				discount_pct: discount_pct !== undefined && discount_pct !== null ? Number(discount_pct) : null,
				expiry_date: expiry_date || null
			})
			.select('*, medication_catalog(*), pharmacy_categories(*)')
			.single();

		if (error) {
			console.error('[API Products POST]', error);
			return NextResponse.json({ message: 'Error al crear el producto' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Products POST] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
