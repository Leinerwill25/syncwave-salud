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
			.update({
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
				is_active: !!is_active
			})
			.eq('id', id)
			.eq('org_id', user.organizationId)
			.select()
			.maybeSingle();

		if (error) {
			console.error('[API Banner PUT]', error);
			return NextResponse.json({ message: 'Error al actualizar el banner' }, { status: 500 });
		}

		if (!data) {
			return NextResponse.json({ message: 'Banner no encontrado' }, { status: 404 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Banner PUT] Unexpected error:', e);
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
			.from('pharmacy_banners')
			.delete()
			.eq('id', id)
			.eq('org_id', user.organizationId);

		if (error) {
			console.error('[API Banner DELETE]', error);
			return NextResponse.json({ message: 'Error al eliminar el banner' }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Banner eliminado' });
	} catch (e: any) {
		console.error('[API Banner DELETE] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
