// app/api/facturacion/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const supabase = await createSupabaseServerClient();

		// Intentamos obtener el user desde la sesión server-side
		const maybeUser = await supabase.auth.getUser();
		const sessionUser = maybeUser?.data?.user ?? null;

		// Body
		const body = await req.json().catch(() => ({}));
		const {
			appointment_id,
			patient_id,
			doctor_id,
			organization_id,
			subtotal,
			impuestos,
			total,
			currency,
			tipo_cambio,
			billing_series,
			numero_factura,
			estado_factura,
			estado_pago,
			metodo_pago,
			fecha_pago,
			notas,
		} = body || {};

		// Validar que existe la facturación
		const { data: existingFacturacion, error: fetchError } = await supabase.from('facturacion').select('id, appointment_id, numero_factura').eq('id', id).single();

		if (fetchError || !existingFacturacion) {
			return NextResponse.json({ error: 'Facturación no encontrada' }, { status: 404 });
		}

		// Validaciones básicas
		if (subtotal !== undefined && subtotal !== null && parseFloat(subtotal) < 0) {
			return NextResponse.json({ error: 'subtotal no puede ser negativo' }, { status: 400 });
		}
		if (total !== undefined && total !== null && parseFloat(total) < 0) {
			return NextResponse.json({ error: 'total no puede ser negativo' }, { status: 400 });
		}

		// Validar que numero_factura sea único si se proporciona y es diferente al actual
		if (numero_factura && numero_factura !== existingFacturacion.numero_factura) {
			const { data: existingFactura, error: checkErr } = await supabase.from('facturacion').select('id').eq('numero_factura', numero_factura).maybeSingle();

			if (checkErr) {
				console.error('Error verificando numero_factura:', checkErr);
				return NextResponse.json({ error: 'Error al verificar número de factura' }, { status: 500 });
			}

			if (existingFactura) {
				return NextResponse.json({ error: 'El número de factura ya existe' }, { status: 400 });
			}
		}

		// Preparar payload de actualización (solo incluir campos que se proporcionaron)
		const updatePayload: any = {
			updated_at: new Date().toISOString(),
		};

		if (subtotal !== undefined && subtotal !== null) updatePayload.subtotal = Number(subtotal);
		if (impuestos !== undefined && impuestos !== null) updatePayload.impuestos = Number(impuestos);
		if (total !== undefined && total !== null) updatePayload.total = Number(total);
		if (currency !== undefined) updatePayload.currency = currency;
		if (tipo_cambio !== undefined && tipo_cambio !== null) updatePayload.tipo_cambio = Number(tipo_cambio);
		if (billing_series !== undefined) updatePayload.billing_series = billing_series || null;
		if (numero_factura !== undefined) updatePayload.numero_factura = numero_factura || null;
		if (estado_factura !== undefined) updatePayload.estado_factura = estado_factura;
		if (estado_pago !== undefined) updatePayload.estado_pago = estado_pago;
		if (metodo_pago !== undefined) updatePayload.metodo_pago = metodo_pago || null;
		if (fecha_pago !== undefined) {
			updatePayload.fecha_pago = fecha_pago ? new Date(fecha_pago).toISOString() : null;
		}
		if (notas !== undefined) updatePayload.notas = notas || null;

		// Si hay sesión server-side, permitir actualizar doctor_id y organization_id
		if (sessionUser?.id) {
			const { data: appUser } = await supabase.from('User').select('id, organizationId').eq('authId', sessionUser.id).maybeSingle();
			if (appUser) {
				if (doctor_id !== undefined) updatePayload.doctor_id = doctor_id || null;
				if (organization_id !== undefined) updatePayload.organization_id = organization_id || (appUser as any).organizationId || null;
			}
		} else {
			if (doctor_id !== undefined) updatePayload.doctor_id = doctor_id || null;
			if (organization_id !== undefined) updatePayload.organization_id = organization_id || null;
		}

		// No permitir cambiar appointment_id ni patient_id (son inmutables)
		// Si se intenta cambiar, ignorar el cambio

		// Actualizar facturación
		const { data: updateData, error: updateErr } = await supabase.from('facturacion').update(updatePayload).eq('id', id).select('*').single();

		if (updateErr) {
			console.error('❌ Error update facturacion:', updateErr);
			return NextResponse.json({ error: updateErr.message || 'Error al actualizar facturación' }, { status: 500 });
		}

		return NextResponse.json({ data: updateData }, { status: 200 });
	} catch (error: any) {
		console.error('❌ Error PUT /facturacion/[id]:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const supabase = await createSupabaseServerClient();

		const { data, error } = await supabase
			.from('facturacion')
			.select(
				`id, appointment_id, patient_id, doctor_id, organization_id, subtotal, impuestos, total, currency, tipo_cambio, billing_series, numero_factura, estado_factura, estado_pago, metodo_pago, fecha_emision, fecha_pago, notas, created_at, updated_at,
         patient:patient_id(firstName, lastName, identifier),
         doctor:doctor_id(id, name),
         appointment:appointment_id(id, scheduled_at)`
			)
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return NextResponse.json({ error: 'Facturación no encontrada' }, { status: 404 });
			}
			throw error;
		}

		// Normalizar relaciones
		const item = {
			...data,
			patient: Array.isArray((data as any).patient) ? (data as any).patient[0] : (data as any).patient,
			doctor: Array.isArray((data as any).doctor) ? (data as any).doctor[0] : (data as any).doctor,
			appointment: Array.isArray((data as any).appointment) ? (data as any).appointment[0] : (data as any).appointment,
		};

		return NextResponse.json({ data: item }, { status: 200 });
	} catch (error: any) {
		console.error('❌ Error GET /facturacion/[id]:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}

