// app/dashboard/pharmacy/page.tsx
import React from 'react';
import { getAuthenticatedUser } from '@/lib/auth-guards';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/app/adapters/server';
import Link from 'next/link';
import {
	Pill,
	AlertTriangle,
	Layers,
	MapPin,
	Globe,
	CheckCircle2,
	XCircle,
	ArrowRight,
	ExternalLink,
	Eye,
	HelpCircle,
	Plus
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PharmacyDashboardPage() {
	const user = await getAuthenticatedUser();
	if (!user || user.role !== 'FARMACIA') {
		redirect('/login');
	}
	const orgId = user.organizationId;
	if (!orgId) {
		return (
			<div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800">
				Error: No se encontró la organización de farmacia asociada a esta cuenta.
			</div>
		);
	}

	const supabase = await createSupabaseServerClient();

	// Fetch clinic_profile for commercial name & RIF
	const { data: profile } = await supabase
		.from('clinic_profile')
		.select('trade_name, legal_rif, address_operational')
		.eq('organization_id', orgId)
		.maybeSingle();

	// Fetch metrics
	const { count: totalProducts } = await supabase
		.from('pharmacy_products')
		.select('*', { count: 'exact', head: true })
		.eq('org_id', orgId);

	const { count: outOfStockProducts } = await supabase
		.from('pharmacy_products')
		.select('*', { count: 'exact', head: true })
		.eq('org_id', orgId)
		.eq('availability', 'out_of_stock');

	const { count: activeCategories } = await supabase
		.from('pharmacy_categories')
		.select('*', { count: 'exact', head: true })
		.eq('org_id', orgId);

	const { count: totalLocations } = await supabase
		.from('pharmacy_locations')
		.select('*', { count: 'exact', head: true })
		.eq('org_id', orgId);

	const { data: siteConfig } = await supabase
		.from('pharmacy_site_config')
		.select('slug, is_published, template_id, whatsapp_number, inventory_tracking_enabled')
		.eq('org_id', orgId)
		.maybeSingle();

	// Fetch recent out of stock products
	const { data: recentOutOfStock } = await supabase
		.from('pharmacy_products')
		.select('id, name, price')
		.eq('org_id', orgId)
		.eq('availability', 'out_of_stock')
		.limit(5);

	// Fetch recent products
	const { data: recentProducts } = await supabase
		.from('pharmacy_products')
		.select('id, name, price, availability')
		.eq('org_id', orgId)
		.order('created_at', { ascending: false })
		.limit(5);

	const trackingEnabled = siteConfig?.inventory_tracking_enabled || false;
	let lowStockProducts: any[] = [];
	if (trackingEnabled) {
		const { data: lowStock } = await supabase
			.from('pharmacy_products')
			.select('id, name, stock_units, bultos')
			.eq('org_id', orgId)
			.lte('stock_units', 5)
			.order('stock_units', { ascending: true })
			.limit(5);
		lowStockProducts = lowStock || [];
	}

	const commerceName = profile?.trade_name || 'Mi Farmacia';
	const rif = profile?.legal_rif || 'No especificado';
	const isPublished = siteConfig?.is_published || false;
	const siteSlug = siteConfig?.slug || '';

	return (
		<div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
			{/* Welcome Banner */}
			<div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-950 text-white p-6 sm:p-8 shadow-xl">
				<div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
				<div className="absolute left-1/3 bottom-0 translate-y-1/3 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
				
				<div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div>
						<div className="flex items-center gap-2 mb-2">
							<span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-bold uppercase tracking-wider">
								Farmacia Autorizada
							</span>
							<span className="text-slate-400 text-xs">• RIF: {rif}</span>
						</div>
						<h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
							{commerceName}
						</h1>
						<p className="text-purple-200 mt-2 text-sm sm:text-base max-w-xl">
							Gestiona tu catálogo, sucursales y configura tu portal web público para que tus pacientes consulten stock en tiempo real.
						</p>
					</div>
					<div className="flex gap-3">
						<Link
							href="/dashboard/pharmacy/products"
							className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-5 rounded-2xl shadow-lg shadow-purple-900/30 transition-all text-sm shrink-0"
						>
							<Plus className="w-4 h-4" />
							Nuevo Producto
						</Link>
						{isPublished && siteSlug && (
							<Link
								href={`/farmacia/${siteSlug}`}
								target="_blank"
								className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-2.5 px-5 rounded-2xl transition-all text-sm shrink-0 backdrop-blur-sm"
							>
								<Eye className="w-4 h-4" />
								Ver Web
							</Link>
						)}
					</div>
				</div>
			</div>

			{/* Site Status Banner */}
			<div className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${isPublished ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
				<div className="flex items-start sm:items-center gap-3">
					<div className={`p-2 rounded-xl shrink-0 ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
						<Globe className="w-5 h-5 animate-pulse" />
					</div>
					<div>
						<h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5">
							Sitio Web Público: {isPublished ? 'Activo y Publicado' : 'Borrador / Pausado'}
						</h3>
						<p className="text-xs sm:text-sm opacity-90 mt-0.5">
							{isPublished 
								? `Tu farmacia está disponible en internet para búsquedas en: /farmacia/${siteSlug}`
								: 'Tus productos y sucursales no son visibles al público en internet en este momento.'
							}
						</p>
					</div>
				</div>
				<Link
					href="/dashboard/pharmacy/site"
					className={`inline-flex items-center gap-1.5 font-bold text-xs sm:text-sm shrink-0 px-4 py-2 rounded-xl transition ${isPublished ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
				>
					{isPublished ? 'Modificar Sitio' : 'Configurar y Publicar'}
					<ArrowRight className="w-3.5 h-3.5" />
				</Link>
			</div>

			{/* KPI Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
				{/* KPI 1 */}
				<div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition">
					<div className="flex justify-between items-start">
						<div className="p-3 bg-purple-50 rounded-xl text-purple-600">
							<Pill className="w-6 h-6" />
						</div>
						<span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase">
							Productos
						</span>
					</div>
					<div className="mt-4">
						<h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalProducts ?? 0}</h3>
						<p className="text-xs text-slate-500 mt-1">Registrados en catálogo</p>
					</div>
				</div>

				{/* KPI 2 */}
				<div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition">
					<div className="flex justify-between items-start">
						<div className={`p-3 rounded-xl ${(outOfStockProducts ?? 0) > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
							<AlertTriangle className="w-6 h-6" />
						</div>
						<span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase">
							Agotados
						</span>
					</div>
					<div className="mt-4">
						<h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{outOfStockProducts ?? 0}</h3>
						<p className="text-xs text-slate-500 mt-1">Productos fuera de stock</p>
					</div>
				</div>

				{/* KPI 3 */}
				<div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition">
					<div className="flex justify-between items-start">
						<div className="p-3 bg-pink-50 rounded-xl text-pink-600">
							<Layers className="w-6 h-6" />
						</div>
						<span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase">
							Categorías
						</span>
					</div>
					<div className="mt-4">
						<h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{activeCategories ?? 0}</h3>
						<p className="text-xs text-slate-500 mt-1">Líneas de productos creadas</p>
					</div>
				</div>

				{/* KPI 4 */}
				<div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition">
					<div className="flex justify-between items-start">
						<div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
							<MapPin className="w-6 h-6" />
						</div>
						<span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase">
							Sucursales
						</span>
					</div>
					<div className="mt-4">
						<h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalLocations ?? 0}</h3>
						<p className="text-xs text-slate-500 mt-1">Puntos de venta geolocalizados</p>
					</div>
				</div>
			</div>

			{/* Main Grid: Data details */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
				{/* Col 1 & 2: Recent products and updates */}
				<div className="lg:col-span-2 space-y-6 sm:space-y-8">
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
						<div className="flex justify-between items-center mb-6">
							<div>
								<h2 className="text-lg font-bold text-slate-900">Productos Recientes</h2>
								<p className="text-xs text-slate-500 mt-0.5">Últimos artículos agregados al inventario</p>
							</div>
							<Link
								href="/dashboard/pharmacy/products"
								className="text-purple-600 hover:text-purple-700 font-bold text-xs flex items-center gap-1 transition"
							>
								Ver todos los productos
								<ArrowRight className="w-3.5 h-3.5" />
							</Link>
						</div>

						{(!recentProducts || recentProducts.length === 0) ? (
							<div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
								<Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
								<p className="text-sm font-medium text-slate-500">Aún no has registrado productos.</p>
								<Link
									href="/dashboard/pharmacy/products"
									className="text-xs text-purple-600 font-bold hover:underline mt-1 block"
								>
									Registrar mi primer producto
								</Link>
							</div>
						) : (
							<div className="divide-y divide-slate-100">
								{recentProducts.map((p) => (
									<div key={p.id} className="py-3 flex justify-between items-center gap-4 hover:bg-slate-50/55 px-2 rounded-xl transition">
										<div className="flex items-center gap-3 min-w-0">
											<div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 font-bold shrink-0">
												<Pill className="w-4 h-4" />
											</div>
											<span className="font-semibold text-slate-800 text-sm truncate">{p.name}</span>
										</div>
										<div className="flex items-center gap-3 shrink-0">
											<span className="text-sm font-bold text-slate-900">
												{p.price ? `€${Number(p.price).toFixed(2)}` : 'S/P'}
											</span>
											<span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${p.availability === 'in_stock' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
												{p.availability === 'in_stock' ? 'En Stock' : 'Agotado'}
											</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
						<div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
						<div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
							<div>
								<h3 className="text-lg font-bold">Importación Masiva de Catálogo</h3>
								<p className="text-xs text-indigo-200 mt-1 max-w-md">
									¿Tienes cientos de moléculas o productos? Sube un archivo CSV y mapea tus productos en segundos con vinculación asistida al vademécum.
								</p>
							</div>
							<Link
								href="/dashboard/pharmacy/products/import"
								className="bg-white text-indigo-950 font-bold text-xs py-2.5 px-5 rounded-2xl hover:bg-indigo-50 transition shrink-0 text-center shadow-lg"
							>
								Comenzar Importación
							</Link>
						</div>
					</div>
				</div>

				{/* Col 3: Side actions and warnings */}
				<div className="space-y-6 sm:space-y-8">
					{/* Out of Stock Alert list */}
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
						<h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
							<AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
							Críticos sin Stock ({outOfStockProducts ?? 0})
						</h2>
						<p className="text-xs text-slate-500 mb-4">Artículos que requieren reposición inmediata</p>

						{(!recentOutOfStock || recentOutOfStock.length === 0) ? (
							<div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
								<CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
								<p className="text-xs font-semibold text-slate-600">¡Excelente!</p>
								<p className="text-[11px] text-slate-400">No hay productos agotados actualmente.</p>
							</div>
						) : (
							<div className="space-y-2.5">
								{recentOutOfStock.map((p) => (
									<div key={p.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/50 flex justify-between items-center gap-3">
										<span className="font-semibold text-slate-800 text-xs truncate">{p.name}</span>
										<span className="text-xs font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
											Agotado
										</span>
									</div>
								))}
								{outOfStockProducts && outOfStockProducts > 5 && (
									<Link
										href="/dashboard/pharmacy/products?filter=out_of_stock"
										className="text-xs text-purple-600 font-bold hover:underline block text-center mt-2"
									>
										Ver los {outOfStockProducts} productos agotados
									</Link>
								)}
							</div>
						)}
					</div>

					{/* Bajo Stock Alert list (conditional) */}
					{trackingEnabled && (
						<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
							<h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
								<AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
								Alerta de Bajo Stock ({lowStockProducts.length})
							</h2>
							<p className="text-xs text-slate-500 mb-4">Unidades bajas en almacén privado (umbral: 5)</p>

							{lowStockProducts.length === 0 ? (
								<div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
									<CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
									<p className="text-xs font-semibold text-slate-600">¡Correcto!</p>
									<p className="text-[11px] text-slate-400">Todos tus niveles de stock están por encima del límite.</p>
								</div>
							) : (
								<div className="space-y-2.5">
									{lowStockProducts.map((p) => (
										<div key={p.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 flex justify-between items-center gap-3">
											<div className="min-w-0 flex-1">
												<span className="font-semibold text-slate-800 text-xs truncate block">{p.name}</span>
												<span className="text-[10px] text-slate-400 block">{p.bultos !== null ? `${p.bultos} bultos` : ''} ({p.stock_units ?? 0} unidades)</span>
											</div>
											<Link
												href={`/dashboard/pharmacy/products?search=${encodeURIComponent(p.name)}`}
												className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg hover:bg-amber-200 transition shrink-0"
											>
												Reponer
											</Link>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* Fast Guide / Help */}
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
						<h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
							<HelpCircle className="w-4 h-4 text-purple-600 shrink-0" />
							Puesta en Marcha Express
						</h2>
						<div className="space-y-4">
							<div className="flex gap-3">
								<div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
									1
								</div>
								<div>
									<h4 className="text-xs font-bold text-slate-800">Cargar tus categorías</h4>
									<p className="text-[11px] text-slate-500">Crea líneas de venta para organizar el vademécum.</p>
								</div>
							</div>

							<div className="flex gap-3">
								<div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
									2
								</div>
								<div>
									<h4 className="text-xs font-bold text-slate-800">Agregar medicamentos</h4>
									<p className="text-[11px] text-slate-500">Agrega productos vinculándolos al catálogo maestro de moléculas.</p>
								</div>
							</div>

							<div className="flex gap-3">
								<div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
									3
								</div>
								<div>
									<h4 className="text-xs font-bold text-slate-800">Configurar tu Sitio Web</h4>
									<p className="text-[11px] text-slate-500">Sube tu logo, define tu slug y publica para recibir consultas de pacientes vía WhatsApp.</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
