// app/api/pharmacy/catalog/bulk-match/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function POST(req: Request) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const body = await req.json().catch(() => ({}));
		const { names } = body;

		if (!names || !Array.isArray(names) || names.length === 0) {
			return NextResponse.json({ success: true, matches: {} });
		}

		const supabase = await createSupabaseServerClient();

		// Batch query: lookup top 50 items concurrently to match fast
		const matchPromises = names.slice(0, 100).map(async (name) => {
			const cleanName = name?.trim();
			if (!cleanName || cleanName.length < 2) {
				return { name, match: null };
			}

			// Clean name from generic terms to improve match chance
			const term = cleanName.split(' ')[0]; // Take first word for broader match if no direct match found
			const cleanQuery = `%${cleanName}%`;
			const fallbackQuery = `%${term}%`;

			const { data, error } = await supabase
				.from('medication_catalog')
				.select('id, inn, concentration, pharmaceutical_form, therapeutic_class, is_controlled')
				.or(`inn.ilike.${cleanQuery},inn.ilike.${fallbackQuery}`)
				.order('is_controlled', { ascending: true }) // prioritize non-controlled in matches if conflict
				.limit(1);

			return {
				name,
				match: !error && data && data.length > 0 ? data[0] : null
			};
		});

		const results = await Promise.all(matchPromises);

		const matches: Record<string, any> = {};
		results.forEach((r) => {
			matches[r.name] = r.match;
		});

		return NextResponse.json({ success: true, matches });
	} catch (e: any) {
		console.error('[API Catalog Bulk Match]', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
