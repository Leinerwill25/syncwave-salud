// app/api/pharmacy/categories/route.ts
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
			.from('pharmacy_categories')
			.select('*')
			.eq('org_id', user.organizationId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('[API Categories GET]', error);
			return NextResponse.json({ message: 'Error consultando categorías' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Categories GET] Unexpected error:', e);
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
		const { name, description, emoji, is_featured } = body;

		if (!name || name.trim() === '') {
			return NextResponse.json({ message: 'El nombre es obligatorio' }, { status: 400 });
		}

		const { data, error } = await supabase
			.from('pharmacy_categories')
			.insert({
				org_id: user.organizationId,
				name: name.trim(),
				description: description?.trim() || null,
				emoji: emoji?.trim() || null,
				is_featured: !!is_featured
			})
			.select()
			.single();

		if (error) {
			console.error('[API Categories POST]', error);
			return NextResponse.json({ message: 'Error al crear la categoría' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Categories POST] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
