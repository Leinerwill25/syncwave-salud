// app/api/pharmacy/locations/route.ts
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
			.from('pharmacy_locations')
			.select('*')
			.eq('org_id', user.organizationId)
			.order('created_at', { ascending: true });

		if (error) {
			console.error('[API Locations GET]', error);
			return NextResponse.json({ message: 'Error consultando sucursales' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Locations GET] Unexpected error:', e);
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
		const { name, address, schedule, lat, lng, maps_url, is_active } = body;

		if (!name || name.trim() === '') {
			return NextResponse.json({ message: 'El nombre de la sucursal es obligatorio' }, { status: 400 });
		}

		// Insert location
		const { data: locationData, error: insertError } = await supabase
			.from('pharmacy_locations')
			.insert({
				org_id: user.organizationId,
				name: name.trim(),
				address: address?.trim() || null,
				schedule: schedule?.trim() || null,
				lat: lat !== undefined && lat !== null ? Number(lat) : null,
				lng: lng !== undefined && lng !== null ? Number(lng) : null,
				maps_url: maps_url?.trim() || null,
				is_active: is_active !== undefined ? !!is_active : true
			})
			.select()
			.single();

		if (insertError) {
			console.error('[API Locations POST]', insertError);
			return NextResponse.json({ message: 'Error al crear la sucursal' }, { status: 500 });
		}

		// Reconcile / Synchronize back to clinic_profile if it is the first or primary location
		const { count } = await supabase
			.from('pharmacy_locations')
			.select('*', { count: 'exact', head: true })
			.eq('org_id', user.organizationId);

		// If this is the only branch, or is named 'Sede Principal', synchronize its details to clinic_profile
		if (count === 1 || name.toLowerCase().includes('principal')) {
			const { error: profileError } = await supabase
				.from('clinic_profile')
				.update({
					address_operational: address?.trim() || null,
				})
				.eq('organization_id', user.organizationId);

			if (profileError) {
				console.error('[API Locations POST] clinic_profile sync failed:', profileError);
			}
		}

		return NextResponse.json({ success: true, data: locationData });
	} catch (e: any) {
		console.error('[API Locations POST] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
