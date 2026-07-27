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
			.from('pharmacy_banners')
			.select('*')
			.eq('org_id', user.organizationId)
			.order('sort_order', { ascending: true })
			.order('created_at', { ascending: false });

		if (error) {
			console.error('[API Banners GET]', error);
			return NextResponse.json({ message: 'Error consultando banners' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Banners GET] Unexpected error:', e);
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
			header_tag,
			product_name,
			headline,
			subtitle,
			image_url,
			bg_color,
			text_color,
			button_color,
			button_text_color,
			button_text,
			whatsapp_message,
			sort_order,
			is_active
		} = body;

		if (!headline || headline.trim() === '') {
			return NextResponse.json({ message: 'El titular (headline) es obligatorio' }, { status: 400 });
		}

		const { data, error } = await supabase
			.from('pharmacy_banners')
			.insert({
				org_id: user.organizationId,
				header_tag: header_tag?.trim() || null,
				product_name: product_name?.trim() || null,
				headline: headline.trim(),
				subtitle: subtitle?.trim() || null,
				image_url: image_url?.trim() || null,
				bg_color: bg_color?.trim() || '#ffffff',
				text_color: text_color?.trim() || '#000000',
				button_color: button_color?.trim() || '#10b981',
				button_text_color: button_text_color?.trim() || '#ffffff',
				button_text: button_text?.trim() || 'Comprar',
				whatsapp_message: whatsapp_message?.trim() || null,
				sort_order: typeof sort_order === 'number' ? sort_order : 0,
				is_active: is_active !== false
			})
			.select()
			.single();

		if (error) {
			console.error('[API Banners POST]', error);
			return NextResponse.json({ message: 'Error al crear el banner' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Banners POST] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
