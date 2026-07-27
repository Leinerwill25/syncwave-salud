// app/farmacia/[slug]/page.tsx
import React from 'react';
import { createSupabaseServerClient } from '@/app/adapters/server';
import StorefrontTemplates from '@/components/pharmacy/templates';
import { Pill, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
	params: Promise<{ slug: string }>;
}

export default async function PublicStorefrontPage({ params }: PageProps) {
	const { slug } = await params;

	if (!slug) {
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
				<div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center max-w-md space-y-4">
					<AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
					<h2 className="text-xl font-bold text-slate-900">Enlace No Válido</h2>
					<p className="text-sm text-slate-500">
						El enlace ingresado es incorrecto. Por favor, verifícalo e inténtalo de nuevo.
					</p>
				</div>
			</div>
		);
	}

	const supabase = await createSupabaseServerClient();

	// 1. Fetch site configuration by slug
	const { data: config, error: configError } = await supabase
		.from('pharmacy_site_config')
		.select('*')
		.eq('slug', slug.toLowerCase().trim())
		.maybeSingle();

	if (configError || !config || !config.is_published) {
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
				<div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center max-w-md space-y-5">
					<div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto text-purple-600">
						<Pill className="w-8 h-8 text-purple-600 animate-pulse" />
					</div>
					<div className="space-y-2">
						<h2 className="text-xl font-bold text-slate-950">Farmacia Fuera de Línea</h2>
						<p className="text-xs text-slate-500 leading-relaxed">
							Este portal web se encuentra temporalmente inactivo, en borrador o la dirección URL es incorrecta.
						</p>
					</div>
					<div className="pt-2">
						<Link
							href="/"
							className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition shadow-md"
						>
							<ArrowLeft className="w-3.5 h-3.5" />
							Volver al Inicio
						</Link>
					</div>
				</div>
			</div>
		);
	}

	const orgId = config.org_id;

	// 2. Fetch categories, locations, products, banners, videos, and discounts concurrently
	const [categoriesRes, locationsRes, productsRes, bannersRes, videosRes, discountsRes] = await Promise.all([
		supabase
			.from('pharmacy_categories')
			.select('id, name, emoji')
			.eq('org_id', orgId),
		supabase
			.from('pharmacy_locations')
			.select('id, name, address, schedule, lat, lng')
			.eq('org_id', orgId)
			.eq('is_active', true),
		supabase
			.from('pharmacy_products')
			.select('id, name, description, image_url, availability, price, currency, category_id, medication_catalog(is_controlled)')
			.eq('org_id', orgId),
		supabase
			.from('pharmacy_banners')
			.select('*')
			.eq('org_id', orgId)
			.eq('is_active', true)
			.order('sort_order', { ascending: true })
			.order('created_at', { ascending: false }),
		supabase
			.from('pharmacy_videos')
			.select('*')
			.eq('org_id', orgId)
			.eq('is_active', true)
			.order('sort_order', { ascending: true })
			.order('created_at', { ascending: false }),
		supabase
			.from('pharmacy_discounts')
			.select('*, category:pharmacy_categories(id, name, emoji)')
			.eq('org_id', orgId)
			.eq('is_active', true)
			.order('sort_order', { ascending: true })
			.order('created_at', { ascending: false })
	]);

	const categories = categoriesRes.data || [];
	const locations = locationsRes.data || [];
	const rawProducts = productsRes.data || [];
	const banners = bannersRes.data || [];
	const videos = videosRes.data || [];
	const discounts = discountsRes.data || [];

	// Filter out products that are linked to controlled molecules
	const products = rawProducts
		.filter((p: any) => {
			const isControlled = p.medication_catalog?.is_controlled === true;
			return !isControlled; // exclude controlled
		})
		.map((p: any) => ({
			id: p.id,
			name: p.name,
			description: p.description,
			image_url: p.image_url,
			availability: p.availability,
			price: p.price,
			currency: p.currency,
			category_id: p.category_id
		}));

	return (
		<StorefrontTemplates
			templateId={config.template_id}
			logoUrl={config.logo_url}
			colors={{
				primary: config.color_primary,
				secondary: config.color_secondary,
				accent: config.color_accent
			}}
			whatsappNumber={config.whatsapp_number}
			content={config.content}
			categories={categories}
			products={products}
			locations={locations}
			banners={banners}
			videos={videos}
			discounts={discounts}
		/>
	);
}
