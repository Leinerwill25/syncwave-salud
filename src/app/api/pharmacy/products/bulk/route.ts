// app/api/pharmacy/products/bulk/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function POST(req: Request) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const user = authResult.user!;
		const body = await req.json().catch(() => ({}));
		const { products } = body;

		if (!products || !Array.isArray(products) || products.length === 0) {
			return NextResponse.json({ message: 'No hay productos para insertar' }, { status: 400 });
		}

		// Prepare batch rows
		const rows = products.map((p) => ({
			org_id: user.organizationId,
			name: p.name?.trim(),
			medication_id: p.medication_id || null,
			category_id: p.category_id || null,
			description: p.description || null,
			image_url: p.image_url || null,
			availability: p.availability || 'in_stock',
			is_featured: !!p.is_featured,
			currency: p.currency || 'USD',
			price: p.price !== undefined && p.price !== null ? Number(p.price) : null,
			bultos: p.bultos !== undefined && p.bultos !== null ? Number(p.bultos) : null,
			units_per_bulto: p.units_per_bulto !== undefined && p.units_per_bulto !== null ? Number(p.units_per_bulto) : null,
			stock_units: p.stock_units !== undefined && p.stock_units !== null ? Number(p.stock_units) : null,
			discount_pct: p.discount_pct !== undefined && p.discount_pct !== null ? Number(p.discount_pct) : null,
			expiry_date: p.expiry_date || null
		}));

		// Validate all rows have a name
		const hasInvalidName = rows.some((r) => !r.name);
		if (hasInvalidName) {
			return NextResponse.json({ message: 'Todos los productos importados deben tener un nombre comercial válido' }, { status: 400 });
		}

		const supabase = await createSupabaseServerClient();

		const { data, error } = await supabase
			.from('pharmacy_products')
			.insert(rows)
			.select();

		if (error) {
			console.error('[API Products Bulk POST]', error);
			return NextResponse.json({ message: 'Error al realizar el guardado en lote de los productos' }, { status: 500 });
		}

		return NextResponse.json({ success: true, count: data?.length || 0 });
	} catch (e: any) {
		console.error('[API Products Bulk POST] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
