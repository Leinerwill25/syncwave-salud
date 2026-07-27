// app/api/pharmacy/products/[id]/route.ts
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
			expiry_date,
			audit_note
		} = body;

		if (!name || name.trim() === '') {
			return NextResponse.json({ message: 'El nombre es obligatorio' }, { status: 400 });
		}

		if (!audit_note || audit_note.trim() === '') {
			return NextResponse.json({ message: 'La nota de auditoría es obligatoria' }, { status: 400 });
		}

		const { data, error } = await supabase
			.from('pharmacy_products')
			.update({
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
			.eq('id', id)
			.eq('org_id', user.organizationId)
			.select('*, medication_catalog(*), pharmacy_categories(*)')
			.maybeSingle();

		if (error) {
			console.error('[API Product PUT]', error);
			return NextResponse.json({ message: 'Error al actualizar el producto' }, { status: 500 });
		}

		if (!data) {
			return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
		}

		// Insert into audit logs
		const { error: logErr } = await supabase
			.from('pharmacy_product_logs')
			.insert({
				org_id: user.organizationId,
				product_id: id,
				note: audit_note.trim(),
				user_id: user.userId
			});

		if (logErr) {
			console.error('[API Product PUT] Log error:', logErr);
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Product PUT] Unexpected error:', e);
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
			.from('pharmacy_products')
			.delete()
			.eq('id', id)
			.eq('org_id', user.organizationId);

		if (error) {
			console.error('[API Product DELETE]', error);
			return NextResponse.json({ message: 'Error al eliminar el producto' }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Producto eliminado' });
	} catch (e: any) {
		console.error('[API Product DELETE] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
