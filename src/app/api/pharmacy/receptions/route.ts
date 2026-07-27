// app/api/pharmacy/receptions/route.ts
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
			.from('pharmacy_receptions')
			.select('*, pharmacy_products(name)')
			.eq('org_id', user.organizationId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('[API Receptions GET] Error:', error);
			return NextResponse.json({ message: 'Error al consultar las recepciones' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Receptions GET] Unexpected error:', e);
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
			product_id,
			invoiced_qty,
			received_qty,
			rejected_qty,
			rejection_reason
		} = body;

		if (!product_id) {
			return NextResponse.json({ message: 'El producto es obligatorio' }, { status: 400 });
		}

		const invQty = Number(invoiced_qty);
		const recQty = Number(received_qty);

		if (isNaN(invQty) || invQty <= 0 || isNaN(recQty) || recQty <= 0) {
			return NextResponse.json({ message: 'Las cantidades deben ser números positivos mayores que cero' }, { status: 400 });
		}

		if (recQty > invQty) {
			return NextResponse.json({ message: 'La cantidad recibida no puede ser mayor que la facturada' }, { status: 400 });
		}

		const expectedRejected = invQty - recQty;
		if (recQty < invQty) {
			const rejQty = Number(rejected_qty || 0);
			if (rejQty !== expectedRejected) {
				return NextResponse.json({ message: `La cantidad rechazada (${rejQty}) debe coincidir con la diferencia (${expectedRejected})` }, { status: 400 });
			}
			if (!rejection_reason || rejection_reason.trim() === '') {
				return NextResponse.json({ message: 'El motivo de rechazo es obligatorio cuando hay faltantes' }, { status: 400 });
			}
		}

		// 1. Fetch product to verify organization and get current stock count & units_per_bulto
		const { data: product, error: prodErr } = await supabase
			.from('pharmacy_products')
			.select('stock_units, units_per_bulto, name')
			.eq('id', product_id)
			.eq('org_id', user.organizationId)
			.maybeSingle();

		if (prodErr || !product) {
			console.error('[API Receptions POST] Find product error:', prodErr);
			return NextResponse.json({ message: 'Producto no encontrado en tu inventario' }, { status: 404 });
		}

		const currentStock = Number(product.stock_units || 0);
		const unitsPerBulto = product.units_per_bulto ? Number(product.units_per_bulto) : 0;

		const newStockUnits = currentStock + recQty;
		const newBultos = unitsPerBulto > 0 ? Math.floor(newStockUnits / unitsPerBulto) : null;

		// 2. Perform updates in database
		// a. Update product stock and bultos
		const { error: updateErr } = await supabase
			.from('pharmacy_products')
			.update({
				stock_units: newStockUnits,
				bultos: newBultos
			})
			.eq('id', product_id)
			.eq('org_id', user.organizationId);

		if (updateErr) {
			console.error('[API Receptions POST] Update product error:', updateErr);
			return NextResponse.json({ message: 'Error al actualizar el inventario del producto' }, { status: 500 });
		}

		// b. Write audit log
		const auditMsg = `Recepción de mercancía: +${recQty} unidades (Facturado: ${invQty}${expectedRejected > 0 ? `, Rechazado: ${expectedRejected} por "${rejection_reason}"` : ''})`;
		const { error: logErr } = await supabase
			.from('pharmacy_product_logs')
			.insert({
				org_id: user.organizationId,
				product_id: product_id,
				note: auditMsg,
				user_id: user.userId
			});

		if (logErr) {
			console.error('[API Receptions POST] Log error:', logErr);
		}

		// c. Save reception entry
		const { data: reception, error: receptionErr } = await supabase
			.from('pharmacy_receptions')
			.insert({
				org_id: user.organizationId,
				product_id: product_id,
				invoiced_qty: invQty,
				received_qty: recQty,
				rejected_qty: expectedRejected,
				rejection_reason: expectedRejected > 0 ? rejection_reason.trim() : null,
				user_id: user.userId
			})
			.select()
			.single();

		if (receptionErr) {
			console.error('[API Receptions POST] Reception insert error:', receptionErr);
			return NextResponse.json({ message: 'Error al registrar la recepción de mercancía' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data: reception });
	} catch (e: any) {
		console.error('[API Receptions POST] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
