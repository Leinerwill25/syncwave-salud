// app/api/pharmacy/clicks/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';

export async function POST(req: Request) {
	try {
		const body = await req.json().catch(() => ({}));
		const { product_id } = body;

		if (!product_id) {
			return NextResponse.json({ message: 'product_id es obligatorio' }, { status: 400 });
		}

		const supabase = await createSupabaseServerClient();

		// Fetch product to resolve its org_id
		const { data: product, error: fetchError } = await supabase
			.from('pharmacy_products')
			.select('org_id')
			.eq('id', product_id)
			.maybeSingle();

		if (fetchError || !product) {
			return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
		}

		// Insert the click record into the database
		const { error: insertError } = await supabase
			.from('pharmacy_product_clicks')
			.insert({
				org_id: product.org_id,
				product_id: product_id
			});

		if (insertError) {
			console.error('[API Clicks POST]', insertError);
			return NextResponse.json({ message: 'Error registrando analítica' }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Click registrado correctamente' });
	} catch (e: any) {
		console.error('[API Clicks POST] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
