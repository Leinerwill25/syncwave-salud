// app/api/pharmacy/locations/[id]/route.ts
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
		const { name, address, schedule, lat, lng, maps_url, is_active } = body;

		if (!name || name.trim() === '') {
			return NextResponse.json({ message: 'El nombre de la sucursal es obligatorio' }, { status: 400 });
		}

		// Update location
		const { data: locationData, error: updateError } = await supabase
			.from('pharmacy_locations')
			.update({
				name: name.trim(),
				address: address?.trim() || null,
				schedule: schedule?.trim() || null,
				lat: lat !== undefined && lat !== null ? Number(lat) : null,
				lng: lng !== undefined && lng !== null ? Number(lng) : null,
				maps_url: maps_url?.trim() || null,
				is_active: is_active !== undefined ? !!is_active : true
			})
			.eq('id', id)
			.eq('org_id', user.organizationId)
			.select()
			.maybeSingle();

		if (updateError) {
			console.error('[API Location PUT]', updateError);
			return NextResponse.json({ message: 'Error al actualizar la sucursal' }, { status: 500 });
		}

		if (!locationData) {
			return NextResponse.json({ message: 'Sucursal no encontrada' }, { status: 404 });
		}

		// Reconcile/Synchronize to clinic_profile if it is primary
		if (name.toLowerCase().includes('principal') || name.toLowerCase().includes('matriz')) {
			const { error: profileError } = await supabase
				.from('clinic_profile')
				.update({
					address_operational: address?.trim() || null,
				})
				.eq('organization_id', user.organizationId);

			if (profileError) {
				console.error('[API Location PUT] clinic_profile sync failed:', profileError);
			}
		}

		return NextResponse.json({ success: true, data: locationData });
	} catch (e: any) {
		console.error('[API Location PUT] Unexpected error:', e);
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
			.from('pharmacy_locations')
			.delete()
			.eq('id', id)
			.eq('org_id', user.organizationId);

		if (error) {
			console.error('[API Location DELETE]', error);
			return NextResponse.json({ message: 'Error al eliminar la sucursal' }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Sucursal eliminada' });
	} catch (e: any) {
		console.error('[API Location DELETE] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
