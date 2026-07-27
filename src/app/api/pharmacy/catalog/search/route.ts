// app/api/pharmacy/catalog/search/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(req: Request) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const { searchParams } = new URL(req.url);
		const query = searchParams.get('q') || '';

		if (!query || query.trim().length < 2) {
			return NextResponse.json({ success: true, data: [] });
		}

		const supabase = await createSupabaseServerClient();
		const cleanQuery = `%${query.trim()}%`;

		// Query master catalog by active ingredient (inn) or therapeutic class
		const { data, error } = await supabase
			.from('medication_catalog')
			.select('id, inn, concentration, pharmaceutical_form, therapeutic_class, is_controlled')
			.or(`inn.ilike.${cleanQuery},therapeutic_class.ilike.${cleanQuery}`)
			.limit(15);

		if (error) {
			console.error('[API Catalog Search GET]', error);
			return NextResponse.json({ message: 'Error consultando catálogo' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Catalog Search GET] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
