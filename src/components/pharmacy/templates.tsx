// components/pharmacy/templates.tsx
'use client';

import React, { useState } from 'react';
import {
	Search,
	Pill,
	MapPin,
	Phone,
	Mail,
	Clock,
	ExternalLink,
	Heart,
	CheckCircle,
	AlertCircle
} from 'lucide-react';
import axios from 'axios';

type Category = {
	id: string;
	name: string;
	emoji: string | null;
};

type Product = {
	id: string;
	name: string;
	description: string | null;
	image_url: string | null;
	availability: 'in_stock' | 'out_of_stock';
	price: number | null;
	currency: string | null;
	category_id: string | null;
};

type Location = {
	id: string;
	name: string;
	address: string | null;
	schedule: string | null;
	lat: number | null;
	lng: number | null;
};

type Banner = {
	id: string;
	header_tag: string | null;
	product_name: string | null;
	headline: string;
	subtitle: string | null;
	image_url: string | null;
	bg_color: string;
	text_color: string;
	button_color: string;
	button_text_color: string;
	button_text: string;
	whatsapp_message: string | null;
	sort_order: number;
	is_active: boolean;
};

type VideoItem = {
	id: string;
	title: string;
	video_url: string;
	platform: string;
	embed_url: string;
	sort_order: number;
	is_active: boolean;
};

type Discount = {
	id: string;
	title: string;
	discount_pct: number;
	category_id: string | null;
	image_url: string | null;
	sort_order: number;
	is_active: boolean;
	category?: {
		id: string;
		name: string;
		emoji: string | null;
	} | null;
};

type TemplatesProps = {
	templateId: string;
	logoUrl: string | null;
	colors: { primary: string; secondary: string; accent: string };
	whatsappNumber: string;
	content: {
		hero: { title: string; subtitle: string };
		mision: string;
		vision: string;
		contacto: { email: string; phone: string };
	};
	categories: Category[];
	products: Product[];
	locations: Location[];
	banners?: Banner[];
	videos?: VideoItem[];
	discounts?: Discount[];
};

function BannerCarousel({ banners, whatsappNumber }: { banners: Banner[]; whatsappNumber: string }) {
	const [currentIndex, setCurrentIndex] = useState(0);
	if (!banners || banners.length === 0) return null;

	const current = banners[currentIndex];

	const handleBannerClick = () => {
		const formattedPhone = whatsappNumber.replace(/[^0-9]/g, '');
		const text = current.whatsapp_message || `Hola, me interesa la promoción: "${current.headline}"`;
		const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
		window.open(url, '_blank');
	};

	return (
		<div className="relative w-full rounded-3xl overflow-hidden shadow-lg transition-all duration-500 mb-8 max-w-7xl mx-auto" style={{ backgroundColor: current.bg_color, color: current.text_color }}>
			<div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10 pointer-events-none" />
			<div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />

			<div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 min-h-[240px]">
				<div className="space-y-3 text-center md:text-left flex-1 min-w-0">
					{current.header_tag && (
						<span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-white/20 tracking-wider">
							{current.header_tag}
						</span>
					)}
					{current.product_name && (
						<p className="text-xs font-semibold opacity-95">{current.product_name}</p>
					)}
					<h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold leading-tight tracking-tight">
						{current.headline}
					</h2>
					{current.subtitle && (
						<p className="text-xs sm:text-sm opacity-85 max-w-lg leading-relaxed">
							{current.subtitle}
						</p>
					)}
					<div className="pt-2">
						<button
							type="button"
							onClick={handleBannerClick}
							className="px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition shadow-md hover:scale-105 active:scale-95 cursor-pointer"
							style={{ backgroundColor: current.button_color, color: current.button_text_color }}
						>
							{current.button_text}
						</button>
					</div>
				</div>

				{current.image_url && (
					<div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl border border-white/20 bg-white/10 flex items-center justify-center p-2 shrink-0 overflow-hidden backdrop-blur-sm shadow-md">
						<img src={current.image_url} alt="Banner Promo" className="object-contain w-full h-full rounded-xl" />
					</div>
				)}
			</div>

			{banners.length > 1 && (
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
					{banners.map((_, idx) => (
						<button
							key={idx}
							type="button"
							onClick={() => setCurrentIndex(idx)}
							className={`w-2.5 h-2.5 rounded-full transition-all border border-black/10 cursor-pointer ${idx === currentIndex ? 'bg-white w-5' : 'bg-white/40'}`}
							aria-label={`Go to slide ${idx + 1}`}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function DiscountsGrid({ discounts, onSelectCategory }: { discounts: Discount[]; onSelectCategory: (catId: string) => void }) {
	if (!discounts || discounts.length === 0) return null;

	return (
		<div className="space-y-4 mb-8">
			<h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
				<span className="w-1.5 h-3.5 bg-rose-600 rounded-full" />
				Descuentos Destacados
			</h3>
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
				{discounts.map(d => (
					<div
						key={d.id}
						onClick={() => d.category_id && onSelectCategory(d.category_id)}
						className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition duration-300 cursor-pointer group hover:-translate-y-0.5"
					>
						<div className="absolute right-0 top-0 bg-rose-600 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-bl-xl shadow-sm z-10">
							-{d.discount_pct}%
						</div>

						<div className="space-y-2.5 mt-2">
							<div className="aspect-video w-full rounded-xl flex items-center justify-center p-2 relative overflow-hidden bg-slate-50 border border-slate-50">
								{d.image_url ? (
									<img src={d.image_url} alt={d.title} className="w-full h-full object-contain" />
								) : (
									<span className="text-3xl block group-hover:scale-110 transition">{d.category?.emoji || '💊'}</span>
								)}
							</div>
							<div>
								<h4 className="font-bold text-slate-800 text-xs truncate pr-10">{d.title}</h4>
								<p className="text-[10px] text-slate-400 font-medium">
									Ver categoría: <span className="font-semibold text-purple-600 hover:underline">{d.category?.name}</span>
								</p>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function VideosGrid({ videos }: { videos: VideoItem[] }) {
	if (!videos || videos.length === 0) return null;

	return (
		<div className="space-y-4 mb-8">
			<h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
				<span className="w-1.5 h-3.5 bg-purple-600 rounded-full" />
				Videos & Reseñas
			</h3>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
				{videos.map(v => (
					<div key={v.id} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-150 flex flex-col justify-between gap-3">
						<div className="aspect-video w-full rounded-xl bg-slate-950 overflow-hidden relative shadow-inner flex items-center justify-center">
							{v.embed_url ? (
								<iframe
									src={v.embed_url}
									title={v.title}
									className="w-full h-full border-0"
									allowFullScreen
								/>
							) : (
								<span className="text-xs text-slate-500">Video no reproducible</span>
							)}
						</div>
						<h4 className="font-bold text-slate-800 text-xs truncate px-1">{v.title}</h4>
					</div>
				))}
			</div>
		</div>
	);
}

export default function StorefrontTemplates({
	templateId,
	logoUrl,
	colors,
	whatsappNumber,
	content,
	categories,
	products,
	locations,
	banners = [],
	videos = [],
	discounts = []
}: TemplatesProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	const handleSelectDiscountCategory = (catId: string) => {
		setSelectedCategory(catId);
		const el = document.getElementById('catalogo-productos');
		if (el) {
			el.scrollIntoView({ behavior: 'smooth' });
		}
	};

	// Log click and redirect to WhatsApp
	async function handleWhatsAppQuery(product: Product) {
		try {
			// Fire and forget click tracking
			axios.post('/api/pharmacy/clicks', { product_id: product.id }).catch(console.error);
		} catch (e) {
			// ignore click logger errors so navigation works anyway
		}

		const formattedPhone = whatsappNumber.replace(/[^0-9]/g, '');
		const text = `Hola, vengo de su portal web y me gustaría consultar disponibilidad para el producto: *${product.name}* (Precio: ${product.currency || 'USD'} ${product.price !== null ? Number(product.price).toFixed(2) : 'S/P'})`;
		const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
		window.open(url, '_blank');
	}

	const filteredProducts = products.filter(p => {
		const matchesSearch =
			p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
		const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
		return matchesSearch && matchesCategory;
	});

	// Inject CSS custom properties for brand theme colors
	const themeStyles = {
		'--primary-color': colors.primary || '#9333ea',
		'--secondary-color': colors.secondary || '#db2777',
		'--accent-color': colors.accent || '#ec4899',
	} as React.CSSProperties;

	// Render templates dynamically
	if (templateId === 'moderna') {
		return (
			<div style={themeStyles} className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
				{/* Navbar */}
				<header className="sticky top-0 z-40 bg-slate-900 text-white backdrop-blur-md py-4 px-4 sm:px-8 shadow-sm flex items-center justify-between">
					<div className="flex items-center gap-3">
						{logoUrl ? (
							<img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain bg-white rounded-lg p-1" />
						) : (
							<div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: 'var(--primary-color)' }}>
								<Pill className="w-5 h-5 text-white" />
							</div>
						)}
						<span className="font-extrabold text-base tracking-tight uppercase">Portal Digital</span>
					</div>
					<a
						href={`https://wa.me/${whatsappNumber}`}
						target="_blank"
						rel="noopener noreferrer"
						className="px-4 py-2 rounded-xl text-xs font-extrabold text-white transition hover:scale-105"
						style={{ backgroundColor: 'var(--secondary-color)' }}
					>
						WhatsApp Express
					</a>
				</header>

				{/* Hero banner */}
				<section className="relative py-16 px-4 text-center bg-slate-950 text-white overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950" />
					<div className="absolute right-0 top-0 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: 'var(--primary-color)' }} />
					<div className="absolute left-0 bottom-0 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: 'var(--secondary-color)' }} />

					<div className="relative z-10 max-w-2xl mx-auto space-y-4">
						<h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
							{content.hero?.title || 'Bienvenidos a Nuestra Farmacia'}
						</h1>
						<p className="text-slate-400 text-sm sm:text-base">
							{content.hero?.subtitle || 'Medicamentos comerciales al alcance de un click.'}
						</p>
					</div>
				</section>

				{/* Banners Carousel */}
				{banners && banners.length > 0 && (
					<div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 w-full">
						<BannerCarousel banners={banners} whatsappNumber={whatsappNumber} />
					</div>
				)}

				{/* Search & Filter & Product Section */}
				<main id="catalogo-productos" className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
					{/* Categories Sidebar filter */}
					<div className="lg:col-span-1 space-y-4">
						<h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Categorías</h3>
						<div className="flex flex-wrap lg:flex-col gap-1.5">
							<button
								type="button"
								onClick={() => setSelectedCategory(null)}
								className={`px-3 py-2 text-xs font-bold rounded-xl text-left transition ${!selectedCategory ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
							>
								Ver Todo
							</button>
							{categories.map(c => (
								<button
									key={c.id}
									type="button"
									onClick={() => setSelectedCategory(c.id)}
									className={`px-3 py-2 text-xs font-bold rounded-xl text-left transition ${selectedCategory === c.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
								>
									{c.emoji || '📦'} {c.name}
								</button>
							))}
						</div>
					</div>

					{/* Products list grid */}
					<div className="lg:col-span-3 space-y-6">
						{/* Discounts list */}
						{discounts && discounts.length > 0 && (
							<DiscountsGrid discounts={discounts} onSelectCategory={handleSelectDiscountCategory} />
						)}

						{/* Search input */}
						<div className="relative">
							<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
							<input
								type="text"
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								placeholder="Buscar por nombre o descripción..."
								className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 transition text-sm"
							/>
						</div>

						{/* Products */}
						{filteredProducts.length === 0 ? (
							<div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-6">
								<Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" />
								<p className="text-slate-500 font-bold">No se encontraron productos disponibles</p>
								<p className="text-slate-400 text-xs mt-1">Intenta con otros términos de búsqueda.</p>
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
								{filteredProducts.map(prod => (
									<div key={prod.id} className="bg-white rounded-2xl border border-slate-150 p-4 hover:shadow-lg transition flex flex-col justify-between gap-4">
										<div>
											<div className="h-36 bg-slate-50 rounded-xl overflow-hidden mb-3 border border-slate-100 flex items-center justify-center">
												{prod.image_url ? (
													<img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
												) : (
													<Pill className="w-6 h-6 text-slate-300" />
												)}
											</div>
											<h4 className="font-bold text-slate-900 text-sm">{prod.name}</h4>
											{prod.description && (
												<p className="text-xs text-slate-400 mt-1 line-clamp-2">{prod.description}</p>
											)}
										</div>

										<div className="space-y-3 pt-3 border-t border-slate-100">
											<div className="flex justify-between items-center">
												<span className="text-sm font-extrabold text-slate-800">
													{prod.price !== null ? `${prod.currency || 'USD'} ${Number(prod.price).toFixed(2)}` : 'S/P'}
												</span>
												<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prod.availability === 'in_stock' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
													{prod.availability === 'in_stock' ? 'Disponible' : 'Agotado'}
												</span>
											</div>
											<button
												type="button"
												onClick={() => handleWhatsAppQuery(prod)}
												className="w-full py-2 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-95 transition cursor-pointer text-center"
												style={{ backgroundColor: 'var(--secondary-color)' }}
											>
												Consultar WhatsApp
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</main>

				{/* Videos and reviews */}
				{videos && videos.length > 0 && (
					<section className="bg-slate-50 border-t border-slate-150 py-12 px-4 sm:px-8 w-full">
						<div className="max-w-7xl mx-auto">
							<VideosGrid videos={videos} />
						</div>
					</section>
				)}

				{/* Info Section */}
				<section className="bg-slate-900 text-slate-300 py-12 px-4 sm:px-8">
					<div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="space-y-3">
							<h4 className="font-bold text-white uppercase text-xs tracking-wider">Nosotros</h4>
							{content.mision && (
								<p className="text-xs leading-relaxed text-slate-400">
									<strong className="text-slate-300">Misión:</strong> {content.mision}
								</p>
							)}
							{content.vision && (
								<p className="text-xs leading-relaxed text-slate-400 mt-2">
									<strong className="text-slate-300">Visión:</strong> {content.vision}
								</p>
							)}
						</div>

						<div className="space-y-3">
							<h4 className="font-bold text-white uppercase text-xs tracking-wider">Ubicación y Sedes</h4>
							<div className="space-y-2">
								{locations.map(loc => (
									<div key={loc.id} className="text-xs space-y-1">
										<p className="font-bold text-white flex items-center gap-1">
											<MapPin className="w-3.5 h-3.5" style={{ color: 'var(--accent-color)' }} />
											{loc.name}
										</p>
										<p className="text-[11px] text-slate-400 pl-4">{loc.address}</p>
										{loc.schedule && <p className="text-[10px] text-slate-500 pl-4 flex items-center gap-1"><Clock className="w-3 h-3" /> {loc.schedule}</p>}
									</div>
								))}
							</div>
						</div>

						<div className="space-y-3">
							<h4 className="font-bold text-white uppercase text-xs tracking-wider">Contacto</h4>
							<div className="space-y-2 text-xs">
								{content.contacto?.email && (
									<p className="flex items-center gap-2">
										<Mail className="w-3.5 h-3.5 text-slate-400" />
										<span>{content.contacto.email}</span>
									</p>
								)}
								{content.contacto?.phone && (
									<p className="flex items-center gap-2">
										<Phone className="w-3.5 h-3.5 text-slate-400" />
										<span>{content.contacto.phone}</span>
									</p>
								)}
							</div>
						</div>
					</div>
				</section>

				{/* Footer Disclaimer */}
				<footer className="bg-slate-950 text-slate-500 py-6 text-center text-[10px] px-4 border-t border-slate-900">
					<div className="max-w-xl mx-auto space-y-1">
						<p className="font-bold flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500 shrink-0" /> Aviso Regulatorio Farmacéutico</p>
						<p>La información sobre stock comercial provista en este portal web es de carácter estrictamente informativo. Por regulación sanitaria de publicidad, consulte a su médico farmacéutico responsable sobre las indicaciones terapéuticas antes del consumo.</p>
					</div>
				</footer>
			</div>
		);
	}

	if (templateId === 'clasica') {
		return (
			<div style={themeStyles} className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-serif">
				{/* Top Header */}
				<header className="bg-white border-b border-slate-200 py-6 px-4 text-center">
					<div className="max-w-xl mx-auto flex flex-col items-center gap-2">
						{logoUrl ? (
							<img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain mb-2" />
						) : (
							<div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-2 shadow-sm" style={{ backgroundColor: 'var(--primary-color)' }}>
								<Pill className="w-7 h-7 text-white" />
							</div>
						)}
						<h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans uppercase">
							{content.hero?.title || 'Bienvenidos'}
						</h1>
						<p className="text-xs text-slate-400 italic">
							{content.hero?.subtitle || 'Consultorio farmacéutico y dispensación.'}
						</p>
					</div>
				</header>

				{/* Banners Carousel */}
				{banners && banners.length > 0 && (
					<div className="max-w-6xl mx-auto px-4 pt-6 w-full">
						<BannerCarousel banners={banners} whatsappNumber={whatsappNumber} />
					</div>
				)}

				{/* Products main catalog */}
				<main id="catalogo-productos" className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-8 font-sans">
					{/* Search & Categories Bar */}
					<div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
							<input
								type="text"
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								placeholder="Escriba aquí para buscar medicamentos..."
								className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm"
							/>
						</div>

						{/* Quick category pills */}
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => setSelectedCategory(null)}
								className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${!selectedCategory ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
							>
								Todos
							</button>
							{categories.map(c => (
								<button
									key={c.id}
									type="button"
									onClick={() => setSelectedCategory(c.id)}
									className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${selectedCategory === c.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
								>
									{c.emoji || '📦'} {c.name}
								</button>
							))}
						</div>
					</div>

					{/* Discounts list */}
					{discounts && discounts.length > 0 && (
						<DiscountsGrid discounts={discounts} onSelectCategory={handleSelectDiscountCategory} />
					)}

					{/* Products list */}
					{filteredProducts.length === 0 ? (
						<div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
							<Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" />
							<p className="text-slate-500 font-bold">Medicamentos no disponibles</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{filteredProducts.map(prod => (
								<div key={prod.id} className="bg-white border border-slate-200 p-4 rounded-xl flex gap-4 hover:shadow-md transition">
									<div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
										{prod.image_url ? (
											<img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
										) : (
											<Pill className="w-6 h-6 text-slate-300" />
										)}
									</div>
									<div className="flex-1 min-w-0 flex flex-col justify-between">
										<div>
											<h4 className="font-bold text-slate-800 text-sm truncate">{prod.name}</h4>
											<p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{prod.description || 'Sin descripción comercial'}</p>
										</div>
										<div className="flex items-center justify-between gap-4 mt-2">
											<span className="text-xs font-extrabold text-slate-900">
												{prod.price !== null ? `${prod.currency || 'USD'} ${Number(prod.price).toFixed(2)}` : 'S/P'}
											</span>
											<button
												type="button"
												onClick={() => handleWhatsAppQuery(prod)}
												className="px-3 py-1.5 rounded-lg text-white font-bold text-[10px] shadow-sm hover:opacity-95 transition cursor-pointer"
												style={{ backgroundColor: 'var(--primary-color)' }}
											>
												Consultar WhatsApp
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{/* Videos section */}
					{videos && videos.length > 0 && (
						<div className="pt-8 border-t border-slate-200">
							<VideosGrid videos={videos} />
						</div>
					)}

					{/* Mission & Vision info */}
					{(content.mision || content.vision) && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-200">
							{content.mision && (
								<div className="space-y-2">
									<h4 className="font-bold text-slate-800 text-sm uppercase">Nuestra Misión</h4>
									<p className="text-xs text-slate-500 leading-relaxed">{content.mision}</p>
								</div>
							)}
							{content.vision && (
								<div className="space-y-2">
									<h4 className="font-bold text-slate-800 text-sm uppercase">Nuestra Visión</h4>
									<p className="text-xs text-slate-500 leading-relaxed">{content.vision}</p>
								</div>
							)}
						</div>
					)}
				</main>

				{/* Locations & footer */}
				<footer className="bg-slate-100 text-slate-600 border-t border-slate-200 mt-12 py-10 px-4">
					<div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
						<div className="space-y-3">
							<h4 className="font-bold text-slate-800 text-xs uppercase">Sedes y Horarios</h4>
							<div className="space-y-3">
								{locations.map(loc => (
									<div key={loc.id} className="text-xs">
										<p className="font-bold text-slate-800">{loc.name}</p>
										<p className="text-slate-500">{loc.address}</p>
										{loc.schedule && <p className="text-[10px] text-slate-400 mt-0.5">{loc.schedule}</p>}
									</div>
								))}
							</div>
						</div>
						<div className="space-y-3 text-xs">
							<h4 className="font-bold text-slate-800 text-xs uppercase">Contacto</h4>
							{content.contacto?.email && <p>Correo: {content.contacto.email}</p>}
							{content.contacto?.phone && <p>Teléfono: {content.contacto.phone}</p>}
							
							<div className="p-3 bg-amber-50 border border-amber-200 text-[10px] text-amber-800 rounded-lg">
								<strong>Aviso Regulatorio:</strong> Consulte las especificaciones de dosificación y venta antes de consumir los productos farmacéuticos expuestos en este listado.
							</div>
						</div>
					</div>
				</footer>
			</div>
		);
	}

	// Default layout: 'farmatuya' (sleek premium layout)
	return (
		<div style={themeStyles} className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans">
			{/* Navbar */}
			<header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md py-4 px-4 sm:px-8 shadow-sm flex items-center justify-between border-b border-slate-100">
				<div className="flex items-center gap-3">
					{logoUrl ? (
						<img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain bg-white rounded-lg p-1" />
					) : (
						<div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: 'var(--primary-color)' }}>
							<Pill className="w-5 h-5 text-white animate-pulse" />
						</div>
					)}
					<span className="font-extrabold text-sm sm:text-base tracking-tight" style={{ color: 'var(--primary-color)' }}>
						{content.hero?.title?.split(' ')[0] || 'Storefront'}
					</span>
				</div>
				<a
					href={`https://wa.me/${whatsappNumber}`}
					target="_blank"
					rel="noopener noreferrer"
					className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:scale-105 active:scale-95 transition"
					style={{ backgroundColor: 'var(--secondary-color)' }}
				>
					Consultas Express
				</a>
			</header>

			{/* Hero banner */}
			<section className="relative py-16 px-4 text-center bg-white border-b border-slate-100 overflow-hidden">
				<div className="absolute right-0 top-0 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: 'var(--primary-color)' }} />
				<div className="absolute left-0 bottom-0 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: 'var(--secondary-color)' }} />

				<div className="relative z-10 max-w-3xl mx-auto space-y-4">
					<h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
						{content.hero?.title || 'Bienvenidos a Nuestra Farmacia'}
					</h1>
					<p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto">
						{content.hero?.subtitle || 'Consulta el inventario comercial en línea y haz tus pedidos vía WhatsApp.'}
					</p>
				</div>
			</section>

			{/* Banners Carousel */}
			{banners && banners.length > 0 && (
				<div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 w-full">
					<BannerCarousel banners={banners} whatsappNumber={whatsappNumber} />
				</div>
			)}

			{/* Search & Filter pills & Product Section */}
			<main id="catalogo-productos" className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex-1 w-full space-y-6 sm:space-y-8">
				{/* Search & Category filter pills */}
				<div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-5">
					<div className="relative">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
						<input
							type="text"
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							placeholder="Escribe el nombre del medicamento comercial..."
							className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition text-sm"
						/>
					</div>

					<div className="flex flex-wrap gap-2 border-t border-slate-50 pt-3">
						<button
							type="button"
							onClick={() => setSelectedCategory(null)}
							className={`px-4.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${!selectedCategory ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100/50'}`}
						>
							Todo el Catálogo
						</button>
						{categories.map(c => (
							<button
								key={c.id}
								type="button"
								onClick={() => setSelectedCategory(c.id)}
								className={`px-4.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${selectedCategory === c.id ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100/50'}`}
							>
								<span>{c.emoji || '📦'}</span> <span className="ml-1">{c.name}</span>
							</button>
						))}
					</div>
				</div>

				{/* Discounts list */}
				{discounts && discounts.length > 0 && (
					<DiscountsGrid discounts={discounts} onSelectCategory={handleSelectDiscountCategory} />
				)}

				{/* Product Grid */}
				{filteredProducts.length === 0 ? (
					<div className="text-center py-24 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
						<Pill className="w-12 h-12 text-slate-200 mx-auto mb-3 animate-pulse" />
						<h3 className="text-slate-700 font-bold text-base">Medicamentos No Encontrados</h3>
						<p className="text-slate-400 text-xs mt-1">Busque con otros términos o consulte directamente al WhatsApp.</p>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{filteredProducts.map(prod => (
							<div key={prod.id} className="bg-white rounded-3xl border border-slate-100 p-4 hover:shadow-lg transition duration-300 flex flex-col justify-between gap-4">
								<div>
									<div className="h-40 bg-slate-50 rounded-2xl overflow-hidden mb-3 border border-slate-100 flex items-center justify-center">
										{prod.image_url ? (
											<img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
										) : (
											<Pill className="w-8 h-8 text-slate-200" />
										)}
									</div>
									<h4 className="font-bold text-slate-800 text-sm line-clamp-1">{prod.name}</h4>
									{prod.description && (
										<p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{prod.description}</p>
									)}
								</div>

								<div className="space-y-3 pt-3 border-t border-slate-100">
									<div className="flex justify-between items-center">
										<span className="text-sm font-extrabold text-slate-900">
											{prod.price !== null ? `${prod.currency || 'USD'} ${Number(prod.price).toFixed(2)}` : 'S/P'}
										</span>
										<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prod.availability === 'in_stock' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
											{prod.availability === 'in_stock' ? 'En Stock' : 'Agotado'}
										</span>
									</div>
									<button
										type="button"
										onClick={() => handleWhatsAppQuery(prod)}
										className="w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition cursor-pointer text-center"
										style={{ backgroundColor: 'var(--secondary-color)' }}
									>
										Consultar WhatsApp
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</main>

			{/* Videos and reviews */}
			{videos && videos.length > 0 && (
				<section className="bg-slate-50 border-t border-slate-100 py-12 px-4 sm:px-8 w-full">
					<div className="max-w-7xl mx-auto">
						<VideosGrid videos={videos} />
					</div>
				</section>
			)}

			{/* Info section: Mission, Vision, Locations */}
			<section className="bg-white border-t border-slate-100 py-12 px-4 sm:px-8 mt-12">
				<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
					<div className="space-y-4">
						<h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Quiénes Somos</h3>
						{content.mision && (
							<div className="space-y-1">
								<h4 className="text-xs font-bold text-slate-700">Misión:</h4>
								<p className="text-xs text-slate-500 leading-relaxed">{content.mision}</p>
							</div>
						)}
						{content.vision && (
							<div className="space-y-1 mt-3">
								<h4 className="text-xs font-bold text-slate-700">Visión:</h4>
								<p className="text-xs text-slate-500 leading-relaxed">{content.vision}</p>
							</div>
						)}
					</div>

					<div className="space-y-4">
						<h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Nuestras Sucursales</h3>
						<div className="space-y-3">
							{locations.map(loc => (
								<div key={loc.id} className="text-xs space-y-1">
									<p className="font-bold text-slate-800 flex items-center gap-1">
										<MapPin className="w-3.5 h-3.5" style={{ color: 'var(--accent-color)' }} />
										{loc.name}
									</p>
									<p className="text-slate-500 pl-4.5">{loc.address}</p>
									{loc.schedule && (
										<p className="text-[10px] text-slate-400 pl-4.5 flex items-center gap-1.5">
											<Clock className="w-3 h-3 text-purple-500" />
											{loc.schedule}
										</p>
									)}
								</div>
							))}
						</div>
					</div>

					<div className="space-y-4">
						<h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Contacto</h3>
						<div className="space-y-2.5 text-xs text-slate-500">
							{content.contacto?.email && (
								<p className="flex items-center gap-2">
									<Mail className="w-4 h-4 text-slate-400" />
									<span>{content.contacto.email}</span>
								</p>
							)}
							{content.contacto?.phone && (
								<p className="flex items-center gap-2">
									<Phone className="w-4 h-4 text-slate-400" />
									<span>{content.contacto.phone}</span>
								</p>
							)}
						</div>
					</div>
				</div>
			</section>

			{/* Legal disclaimer */}
			<footer className="bg-slate-900 text-slate-400 py-8 text-center text-[10px] px-4">
				<div className="max-w-xl mx-auto space-y-2">
					<p className="font-bold text-slate-300 flex items-center justify-center gap-1">
						<AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
						Aviso Legal y Sanitario Regulatorio
					</p>
					<p className="leading-relaxed">
						La información sobre precios y stock de productos farmacéuticos provista en este sitio web es netamente informativa de cara al público consumidor. Queda prohibida la publicidad y promoción no regulada de medicamentos comerciales sujetos a prescripción. Ante cualquier duda de dosificación, consulte con el médico responsable de su receta.
					</p>
				</div>
			</footer>
		</div>
	);
}
