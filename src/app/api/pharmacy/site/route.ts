// app/api/pharmacy/site/route.ts
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
			.from('pharmacy_site_config')
			.select('*')
			.eq('org_id', user.organizationId)
			.maybeSingle();

		if (error) {
			console.error('[API Site GET]', error);
			return NextResponse.json({ message: 'Error consultando configuración de sitio' }, { status: 500 });
		}

		if (!data) {
			// Generate a default slug based on organization name or return blank default
			return NextResponse.json({
				success: true,
				data: {
					org_id: user.organizationId,
					template_id: 'farmatuya',
					slug: '',
					logo_url: '',
					color_primary: '#9333ea', // purple-600
					color_secondary: '#db2777', // pink-600
					color_accent: '#ec4899', // pink-500
					whatsapp_number: '',
					content: {
						hero: { title: 'Tu Farmacia Digital', subtitle: 'Medicamentos a tu alcance' },
						mision: '',
						vision: '',
						contacto: { email: user.email, phone: '' }
					},
					is_published: false,
					inventory_tracking_enabled: false
				}
			});
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Site GET] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}

export async function PUT(req: Request) {
	try {
		const authResult = await apiRequireRole(['FARMACIA']);
		if (authResult.response) return authResult.response;

		const user = authResult.user!;
		const supabase = await createSupabaseServerClient();

		const body = await req.json().catch(() => ({}));
		const {
			template_id,
			slug,
			logo_url,
			color_primary,
			color_secondary,
			color_accent,
			whatsapp_number,
			content,
			is_published,
			inventory_tracking_enabled
		} = body;

		if (!slug || slug.trim() === '') {
			return NextResponse.json({ message: 'La URL personalizada (slug) es obligatoria' }, { status: 400 });
		}

		const cleanSlug = slug
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9-]+/g, '-')
			.replace(/(^-|-$)+/g, '');

		if (cleanSlug.length < 3) {
			return NextResponse.json({ message: 'La URL personalizada debe contener al menos 3 caracteres alfanuméricos' }, { status: 400 });
		}

		// Check slug uniqueness
		const { data: existingSlug } = await supabase
			.from('pharmacy_site_config')
			.select('org_id')
			.eq('slug', cleanSlug)
			.maybeSingle();

		if (existingSlug && existingSlug.org_id !== user.organizationId) {
			return NextResponse.json({ message: 'Esta URL personalizada ya está en uso por otra farmacia' }, { status: 400 });
		}

		// Upsert configuration row
		const { data, error } = await supabase
			.from('pharmacy_site_config')
			.upsert({
				org_id: user.organizationId,
				template_id: template_id || 'farmatuya',
				slug: cleanSlug,
				logo_url: logo_url || null,
				color_primary: color_primary || '#9333ea',
				color_secondary: color_secondary || '#db2777',
				color_accent: color_accent || '#ec4899',
				whatsapp_number: whatsapp_number || '',
				content: content || {},
				is_published: !!is_published,
				inventory_tracking_enabled: inventory_tracking_enabled !== undefined ? !!inventory_tracking_enabled : undefined
			})
			.select()
			.single();

		if (error) {
			console.error('[API Site PUT]', error);
			return NextResponse.json({ message: 'Error al guardar la configuración del sitio' }, { status: 500 });
		}

		return NextResponse.json({ success: true, data });
	} catch (e: any) {
		console.error('[API Site PUT] Unexpected error:', e);
		return NextResponse.json({ message: 'Error inesperado: ' + e.message }, { status: 500 });
	}
}
