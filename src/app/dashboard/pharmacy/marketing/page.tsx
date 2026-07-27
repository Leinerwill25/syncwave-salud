// app/dashboard/pharmacy/marketing/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
	Megaphone,
	Video,
	Percent,
	Plus,
	Trash,
	Edit,
	Loader2,
	AlertCircle,
	CheckCircle2,
	Eye,
	Save,
	X,
	ExternalLink
} from 'lucide-react';
import axios from 'axios';

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

type Category = {
	id: string;
	name: string;
	emoji: string | null;
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

export default function PharmacyMarketingPage() {
	const [activeTab, setActiveTab] = useState<'banners' | 'videos' | 'discounts'>('banners');
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// Data states
	const [banners, setBanners] = useState<Banner[]>([]);
	const [videos, setVideos] = useState<VideoItem[]>([]);
	const [discounts, setDiscounts] = useState<Discount[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);

	// Form Modals / States
	const [bannerModalOpen, setBannerModalOpen] = useState(false);
	const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
	
	const [videoModalOpen, setVideoModalOpen] = useState(false);
	const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);

	const [discountModalOpen, setDiscountModalOpen] = useState(false);
	const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

	// Banner Form Fields
	const [bannerFields, setBannerFields] = useState({
		header_tag: '',
		product_name: '',
		headline: '',
		subtitle: '',
		image_url: '',
		bg_color: '#312e81', // Sleek Indigo deepbg default
		text_color: '#ffffff',
		button_color: '#10b981',
		button_text_color: '#ffffff',
		button_text: 'Comprar',
		whatsapp_message: '',
		sort_order: 0,
		is_active: true
	});

	// Video Form Fields
	const [videoFields, setVideoFields] = useState({
		title: '',
		video_url: '',
		sort_order: 0,
		is_active: true
	});

	// Discount Form Fields
	const [discountFields, setDiscountFields] = useState({
		title: '',
		discount_pct: 10,
		category_id: '',
		image_url: '',
		sort_order: 0,
		is_active: true
	});

	useEffect(() => {
		fetchData();
	}, []);

	async function fetchData() {
		try {
			setLoading(true);
			setError(null);
			const [resBanners, resVideos, resDiscounts, resCategories] = await Promise.all([
				axios.get('/api/pharmacy/marketing/banners'),
				axios.get('/api/pharmacy/marketing/videos'),
				axios.get('/api/pharmacy/marketing/discounts'),
				axios.get('/api/pharmacy/categories')
			]);

			if (resBanners.data?.success) setBanners(resBanners.data.data || []);
			if (resVideos.data?.success) setVideos(resVideos.data.data || []);
			if (resDiscounts.data?.success) setDiscounts(resDiscounts.data.data || []);
			if (resCategories.data?.success) setCategories(resCategories.data.data || []);

		} catch (err: any) {
			console.error('Error fetching marketing data:', err);
			setError('Error al cargar la información del panel de marketing.');
		} finally {
			setLoading(false);
		}
	}

	function showSuccess(msg: string) {
		setSuccessMsg(msg);
		setTimeout(() => setSuccessMsg(null), 4000);
	}

	// Banners Handlers
	function openBannerCreate() {
		setEditingBanner(null);
		setBannerFields({
			header_tag: 'OFERTA ESPECIAL',
			product_name: 'Producto Destacado',
			headline: '¡Descuento Exclusivo!',
			subtitle: 'Consigue este medicamento a un precio increíble hoy.',
			image_url: '',
			bg_color: '#1e1b4b',
			text_color: '#ffffff',
			button_color: '#10b981',
			button_text_color: '#ffffff',
			button_text: 'Pedir por WhatsApp',
			whatsapp_message: 'Hola, me gustaría comprar el producto destacado en promoción.',
			sort_order: 0,
			is_active: true
		});
		setBannerModalOpen(true);
	}

	function openBannerEdit(b: Banner) {
		setEditingBanner(b);
		setBannerFields({
			header_tag: b.header_tag || '',
			product_name: b.product_name || '',
			headline: b.headline,
			subtitle: b.subtitle || '',
			image_url: b.image_url || '',
			bg_color: b.bg_color,
			text_color: b.text_color,
			button_color: b.button_color,
			button_text_color: b.button_text_color,
			button_text: b.button_text,
			whatsapp_message: b.whatsapp_message || '',
			sort_order: b.sort_order,
			is_active: b.is_active
		});
		setBannerModalOpen(true);
	}

	async function handleSaveBanner(e: React.FormEvent) {
		e.preventDefault();
		if (!bannerFields.headline.trim()) {
			setError('El titular (headline) del banner es obligatorio.');
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			if (editingBanner) {
				const res = await axios.put(`/api/pharmacy/marketing/banners/${editingBanner.id}`, bannerFields);
				if (res.data?.success) {
					setBanners(prev => prev.map(b => b.id === editingBanner.id ? res.data.data : b));
					showSuccess('Banner actualizado con éxito.');
					setBannerModalOpen(false);
				}
			} else {
				const res = await axios.post('/api/pharmacy/marketing/banners', bannerFields);
				if (res.data?.success) {
					setBanners(prev => [res.data.data, ...prev]);
					showSuccess('Banner creado con éxito.');
					setBannerModalOpen(false);
				}
			}
		} catch (err: any) {
			console.error(err);
			setError(err?.response?.data?.message || 'Error al guardar el banner.');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDeleteBanner(id: string) {
		if (!confirm('¿Estás seguro de que deseas eliminar este banner?')) return;
		try {
			const res = await axios.delete(`/api/pharmacy/marketing/banners/${id}`);
			if (res.data?.success) {
				setBanners(prev => prev.filter(b => b.id !== id));
				showSuccess('Banner eliminado.');
			}
		} catch (err: any) {
			console.error(err);
			setError('Error al eliminar el banner.');
		}
	}

	// Videos Handlers
	function openVideoCreate() {
		setEditingVideo(null);
		setVideoFields({
			title: 'Presentación de Nuestra Sucursal',
			video_url: '',
			sort_order: 0,
			is_active: true
		});
		setVideoModalOpen(true);
	}

	function openVideoEdit(v: VideoItem) {
		setEditingVideo(v);
		setVideoFields({
			title: v.title,
			video_url: v.video_url,
			sort_order: v.sort_order,
			is_active: v.is_active
		});
		setVideoModalOpen(true);
	}

	async function handleSaveVideo(e: React.FormEvent) {
		e.preventDefault();
		if (!videoFields.title.trim() || !videoFields.video_url.trim()) {
			setError('El título y la URL del video son obligatorios.');
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			if (editingVideo) {
				const res = await axios.put(`/api/pharmacy/marketing/videos/${editingVideo.id}`, videoFields);
				if (res.data?.success) {
					setVideos(prev => prev.map(v => v.id === editingVideo.id ? res.data.data : v));
					showSuccess('Video actualizado con éxito.');
					setVideoModalOpen(false);
				}
			} else {
				const res = await axios.post('/api/pharmacy/marketing/videos', videoFields);
				if (res.data?.success) {
					setVideos(prev => [res.data.data, ...prev]);
					showSuccess('Video agregado con éxito.');
					setVideoModalOpen(false);
				}
			}
		} catch (err: any) {
			console.error(err);
			setError(err?.response?.data?.message || 'Error al guardar el video.');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDeleteVideo(id: string) {
		if (!confirm('¿Estás seguro de que deseas quitar este video?')) return;
		try {
			const res = await axios.delete(`/api/pharmacy/marketing/videos/${id}`);
			if (res.data?.success) {
				setVideos(prev => prev.filter(v => v.id !== id));
				showSuccess('Video eliminado.');
			}
		} catch (err: any) {
			console.error(err);
			setError('Error al eliminar el video.');
		}
	}

	// Discounts Handlers
	function openDiscountCreate() {
		setEditingDiscount(null);
		setDiscountFields({
			title: 'Descuento de Temporada',
			discount_pct: 15,
			category_id: categories[0]?.id || '',
			image_url: '',
			sort_order: 0,
			is_active: true
		});
		setDiscountModalOpen(true);
	}

	function openDiscountEdit(d: Discount) {
		setEditingDiscount(d);
		setDiscountFields({
			title: d.title,
			discount_pct: d.discount_pct,
			category_id: d.category_id || '',
			image_url: d.image_url || '',
			sort_order: d.sort_order,
			is_active: d.is_active
		});
		setDiscountModalOpen(true);
	}

	async function handleSaveDiscount(e: React.FormEvent) {
		e.preventDefault();
		if (!discountFields.title.trim() || !discountFields.discount_pct) {
			setError('El título y porcentaje de descuento son obligatorios.');
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			if (editingDiscount) {
				const res = await axios.put(`/api/pharmacy/marketing/discounts/${editingDiscount.id}`, discountFields);
				if (res.data?.success) {
					// We refresh discounts list from server to resolve category association name easily
					await fetchData();
					showSuccess('Descuento actualizado con éxito.');
					setDiscountModalOpen(false);
				}
			} else {
				const res = await axios.post('/api/pharmacy/marketing/discounts', discountFields);
				if (res.data?.success) {
					await fetchData();
					showSuccess('Descuento creado con éxito.');
					setDiscountModalOpen(false);
				}
			}
		} catch (err: any) {
			console.error(err);
			setError(err?.response?.data?.message || 'Error al guardar el descuento.');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDeleteDiscount(id: string) {
		if (!confirm('¿Estás seguro de que deseas eliminar este descuento?')) return;
		try {
			const res = await axios.delete(`/api/pharmacy/marketing/discounts/${id}`);
			if (res.data?.success) {
				setDiscounts(prev => prev.filter(d => d.id !== id));
				showSuccess('Descuento eliminado.');
			}
		} catch (err: any) {
			console.error(err);
			setError('Error al eliminar el descuento.');
		}
	}

	return (
		<div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-16">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
						<Megaphone className="w-8 h-8 text-purple-600 shrink-0" />
						Panel de Marketing & Campañas
					</h1>
					<p className="text-sm text-slate-500 mt-1">
						Crea ofertas visuales, sube videos promocionales y define banners atractivos conectados a WhatsApp para aumentar las ventas de tu farmacia.
					</p>
				</div>
			</div>

			{/* Status Feedback */}
			{error && (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm flex items-start gap-2 max-w-4xl">
					<AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
					<span>{error}</span>
				</div>
			)}
			{successMsg && (
				<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm flex items-start gap-2 max-w-4xl animate-bounce">
					<CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
					<span>{successMsg}</span>
				</div>
			)}

			{/* Custom Modern Tabs */}
			<div className="flex border-b border-slate-100 gap-2 max-w-4xl">
				<button
					type="button"
					onClick={() => { setActiveTab('banners'); setError(null); }}
					className={`px-5 py-3 font-bold text-sm border-b-2 transition flex items-center gap-2 cursor-pointer ${activeTab === 'banners' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
				>
					<Megaphone className="w-4 h-4" />
					Carrusel Banners
					<span className="text-xs bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-full ml-1">{banners.length}</span>
				</button>
				<button
					type="button"
					onClick={() => { setActiveTab('videos'); setError(null); }}
					className={`px-5 py-3 font-bold text-sm border-b-2 transition flex items-center gap-2 cursor-pointer ${activeTab === 'videos' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
				>
					<Video className="w-4 h-4" />
					Videos
					<span className="text-xs bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-full ml-1">{videos.length}</span>
				</button>
				<button
					type="button"
					onClick={() => { setActiveTab('discounts'); setError(null); }}
					className={`px-5 py-3 font-bold text-sm border-b-2 transition flex items-center gap-2 cursor-pointer ${activeTab === 'discounts' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
				>
					<Percent className="w-4 h-4" />
					Grilla de Descuentos
					<span className="text-xs bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-full ml-1">{discounts.length}</span>
				</button>
			</div>

			{loading ? (
				<div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
					<Loader2 className="w-8 h-8 animate-spin text-purple-600" />
					<p className="text-sm font-medium">Cargando material de marketing...</p>
				</div>
			) : (
				<div className="max-w-6xl">
					{/* TAB: BANNERS */}
					{activeTab === 'banners' && (
						<div className="space-y-6">
							<div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
								<div>
									<h3 className="font-bold text-slate-800 text-sm sm:text-base">Hero Carousel Banners</h3>
									<p className="text-xs text-slate-500">Banners gigantes interactivos con fondo personalizado que enlazan directo a WhatsApp.</p>
								</div>
								<button
									type="button"
									onClick={openBannerCreate}
									className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-xl text-xs sm:text-sm shadow-sm transition cursor-pointer"
								>
									<Plus className="w-4 h-4" />
									Crear Banner
								</button>
							</div>

							{banners.length === 0 ? (
								<div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
									<Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
									<p className="text-sm font-bold text-slate-600">No hay banners promocionales creados</p>
									<p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Crea un banner para capturar la atención en tu tienda con ofertas por WhatsApp.</p>
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									{banners.map((b) => (
										<div key={b.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition gap-4">
											{/* Visual Live Representation of the actual banner */}
											<div
												className="rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between min-h-[160px] shadow-inner"
												style={{ backgroundColor: b.bg_color, color: b.text_color }}
											>
												<div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
												
												<div className="space-y-1">
													{b.header_tag && (
														<span className="inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/20 tracking-wider">
															{b.header_tag}
														</span>
													)}
													{b.product_name && (
														<p className="text-xs opacity-80 font-medium">{b.product_name}</p>
													)}
													<h4 className="font-extrabold text-base leading-tight mt-1">{b.headline}</h4>
													{b.subtitle && (
														<p className="text-[11px] opacity-75 max-w-[70%] line-clamp-2">{b.subtitle}</p>
													)}
												</div>

												{/* Image representation if supplied */}
												{b.image_url && (
													<div className="absolute right-2 bottom-2 w-16 h-16 rounded-xl border border-white/20 bg-white/10 flex items-center justify-center p-1 shrink-0 overflow-hidden">
														<img src={b.image_url} alt="Promo" className="object-contain w-full h-full rounded" />
													</div>
												)}

												<div className="mt-3">
													<span
														className="inline-block text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
														style={{ backgroundColor: b.button_color, color: b.button_text_color }}
													>
														{b.button_text}
													</span>
												</div>
											</div>

											{/* Metadata & Actions */}
											<div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
												<div className="flex items-center gap-2">
													<span className={`px-2 py-0.5 rounded-full font-extrabold uppercase text-[9px] ${b.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
														{b.is_active ? 'Activo' : 'Pausado'}
													</span>
													<span className="text-slate-400 font-medium">Orden: {b.sort_order}</span>
												</div>
												<div className="flex items-center gap-1">
													<button
														type="button"
														onClick={() => openBannerEdit(b)}
														className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
														title="Editar"
													>
														<Edit className="w-4 h-4" />
													</button>
													<button
														type="button"
														onClick={() => handleDeleteBanner(b.id)}
														className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition cursor-pointer"
														title="Eliminar"
													>
														<Trash className="w-4 h-4" />
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* TAB: VIDEOS */}
					{activeTab === 'videos' && (
						<div className="space-y-6">
							<div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
								<div>
									<h3 className="font-bold text-slate-800 text-sm sm:text-base">Videos Promocionales</h3>
									<p className="text-xs text-slate-500">Inserta videos de YouTube, Reels de Instagram o Google Drive para humanizar tu negocio.</p>
								</div>
								<button
									type="button"
									onClick={openVideoCreate}
									className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-xl text-xs sm:text-sm shadow-sm transition cursor-pointer"
								>
									<Plus className="w-4 h-4" />
									Añadir Video
								</button>
							</div>

							{videos.length === 0 ? (
								<div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
									<Video className="w-10 h-10 text-slate-300 mx-auto mb-3" />
									<p className="text-sm font-bold text-slate-600">No hay videos agregados</p>
									<p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Coloca links de YouTube o Instagram para mostrar reseñas o explicativos de productos.</p>
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
									{videos.map((v) => (
										<div key={v.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition flex flex-col justify-between gap-3">
											{/* Embed Video Preview container */}
											<div className="aspect-video w-full rounded-2xl bg-slate-900 overflow-hidden relative shadow-inner flex items-center justify-center">
												{v.embed_url ? (
													<iframe
														src={v.embed_url}
														title={v.title}
														className="w-full h-full border-0"
														allowFullScreen
													/>
												) : (
													<div className="text-slate-500 text-xs flex flex-col items-center gap-1">
														<Video className="w-8 h-8 text-slate-600 animate-pulse" />
														<span>URL no reproducible</span>
													</div>
												)}
											</div>

											<div className="space-y-1">
												<h4 className="font-bold text-slate-800 text-sm truncate">{v.title}</h4>
												<div className="flex items-center justify-between text-[11px] text-slate-400">
													<span className="capitalize font-semibold text-purple-600">{v.platform}</span>
													<a href={v.video_url} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-0.5 text-slate-500">
														Enlace original <ExternalLink className="w-2.5 h-2.5" />
													</a>
												</div>
											</div>

											{/* Footer Action area */}
											<div className="flex justify-between items-center pt-2.5 border-t border-slate-50 text-xs">
												<div className="flex items-center gap-2">
													<span className={`px-2 py-0.5 rounded-full font-extrabold uppercase text-[9px] ${v.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
														{v.is_active ? 'Activo' : 'Pausado'}
													</span>
													<span className="text-slate-400 font-medium">Orden: {v.sort_order}</span>
												</div>
												<div className="flex items-center gap-1">
													<button
														type="button"
														onClick={() => openVideoEdit(v)}
														className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
													>
														<Edit className="w-4 h-4" />
													</button>
													<button
														type="button"
														onClick={() => handleDeleteVideo(v.id)}
														className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition cursor-pointer"
													>
														<Trash className="w-4 h-4" />
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* TAB: DISCOUNTS */}
					{activeTab === 'discounts' && (
						<div className="space-y-6">
							<div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
								<div>
									<h3 className="font-bold text-slate-800 text-sm sm:text-base">Descuentos Visuales</h3>
									<p className="text-xs text-slate-500">Muestra globos llamativos de ofertas vinculados a categorías de medicamentos específicas.</p>
								</div>
								<button
									type="button"
									onClick={openDiscountCreate}
									disabled={categories.length === 0}
									className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-xl text-xs sm:text-sm shadow-sm transition disabled:opacity-50 cursor-pointer"
								>
									<Plus className="w-4 h-4" />
									Añadir Descuento
								</button>
							</div>

							{categories.length === 0 && (
								<div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs flex items-center gap-2">
									<AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
									<span>Debes crear al menos una <strong>Categoría</strong> antes de poder crear un banner de descuento para ella.</span>
								</div>
							)}

							{discounts.length === 0 ? (
								<div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
									<Percent className="w-10 h-10 text-slate-300 mx-auto mb-3" />
									<p className="text-sm font-bold text-slate-600">No hay descuentos visuales configurados</p>
									<p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Define porcentajes de rebajas por categoría para enganchar el interés de tus clientes.</p>
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
									{discounts.map((d) => (
										<div key={d.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition flex flex-col justify-between gap-4 relative overflow-hidden">
											
											{/* Ribbon overlay for % */}
											<div className="absolute right-0 top-0 bg-rose-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-bl-2xl shadow-sm z-10 flex items-center gap-0.5">
												-{d.discount_pct}%
											</div>

											<div className="space-y-3">
												{/* Mock category card image */}
												<div className="aspect-square w-full rounded-2xl bg-slate-55 flex items-center justify-center p-2 relative overflow-hidden border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100">
													{d.image_url ? (
														<img src={d.image_url} alt={d.title} className="w-full h-full object-contain" />
													) : (
														<div className="text-center space-y-1 text-slate-400">
															<span className="text-3xl block">{d.category?.emoji || '💊'}</span>
															<span className="text-[10px] font-semibold text-slate-500 uppercase">{d.category?.name || 'Categoría'}</span>
														</div>
													)}
												</div>

												<div>
													<h4 className="font-bold text-slate-800 text-sm truncate pr-14">{d.title}</h4>
													<p className="text-[11px] text-slate-400 font-medium">
														Aplica a:{' '}
														<span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
															{d.category?.emoji} {d.category?.name || 'Todo el catálogo'}
														</span>
													</p>
												</div>
											</div>

											{/* Footer Action area */}
											<div className="flex justify-between items-center pt-2.5 border-t border-slate-50 text-xs">
												<div className="flex items-center gap-2">
													<span className={`px-2 py-0.5 rounded-full font-extrabold uppercase text-[9px] ${d.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
														{d.is_active ? 'Activo' : 'Pausado'}
													</span>
													<span className="text-slate-400 font-medium">Orden: {d.sort_order}</span>
												</div>
												<div className="flex items-center gap-1">
													<button
														type="button"
														onClick={() => openDiscountEdit(d)}
														className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
													>
														<Edit className="w-4 h-4" />
													</button>
													<button
														type="button"
														onClick={() => handleDeleteDiscount(d.id)}
														className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition cursor-pointer"
													>
														<Trash className="w-4 h-4" />
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* MODAL: BANNERS CREATE/EDIT */}
			{bannerModalOpen && (
				<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
						{/* Left: Interactive Live Preview of layout */}
						<div className="md:w-1/2 bg-slate-50 p-6 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-slate-100 gap-4">
							<h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest self-start">Vista Previa Interactiva</h3>
							
							<div
								className="w-full rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[260px] shadow-lg transition-all"
								style={{ backgroundColor: bannerFields.bg_color, color: bannerFields.text_color }}
							>
								<div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
								
								<div className="space-y-2">
									{bannerFields.header_tag && (
										<span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-white/20 tracking-wider">
											{bannerFields.header_tag}
										</span>
									)}
									{bannerFields.product_name && (
										<p className="text-xs opacity-90 font-semibold">{bannerFields.product_name}</p>
									)}
									<h4 className="font-extrabold text-xl sm:text-2xl leading-snug mt-1.5">{bannerFields.headline || '¡Titular del Banner!'}</h4>
									{bannerFields.subtitle && (
										<p className="text-xs opacity-80 max-w-[75%] leading-relaxed">{bannerFields.subtitle}</p>
									)}
								</div>

								{/* Image representation if supplied */}
								{bannerFields.image_url ? (
									<div className="absolute right-4 bottom-4 w-24 h-24 rounded-2xl border border-white/20 bg-white/10 flex items-center justify-center p-2 shrink-0 overflow-hidden backdrop-blur-sm">
										<img src={bannerFields.image_url} alt="Promo" className="object-contain w-full h-full rounded-lg" />
									</div>
								) : (
									<div className="absolute right-4 bottom-4 w-24 h-24 rounded-2xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-[10px] opacity-40 shrink-0">
										Sin imagen
									</div>
								)}

								<div className="mt-4">
									<span
										className="inline-block text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md transition"
										style={{ backgroundColor: bannerFields.button_color, color: bannerFields.button_text_color }}
									>
										{bannerFields.button_text}
									</span>
								</div>
							</div>
							
							<p className="text-[10px] text-slate-400 text-center leading-normal max-w-xs">El banner se renderizará como un elemento destacado en el carrusel de inicio en la tienda web pública.</p>
						</div>

						{/* Right: Form fields */}
						<form onSubmit={handleSaveBanner} className="md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto max-h-[80vh] md:max-h-none">
							<div className="space-y-4">
								<div className="flex justify-between items-center">
									<h3 className="font-extrabold text-slate-900 text-lg">{editingBanner ? 'Editar Banner' : 'Nuevo Banner'}</h3>
									<button type="button" onClick={() => setBannerModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-400" /></button>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-1">
										<label className="text-[11px] font-bold text-slate-600">Tag Superior</label>
										<input
											type="text"
											value={bannerFields.header_tag}
											onChange={e => setBannerFields(prev => ({ ...prev, header_tag: e.target.value }))}
											placeholder="OFERTA, NUEVO..."
											className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
										/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-bold text-slate-600">Nombre de Producto</label>
										<input
											type="text"
											value={bannerFields.product_name}
											onChange={e => setBannerFields(prev => ({ ...prev, product_name: e.target.value }))}
											placeholder="Paracetamol, etc."
											className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
										/>
									</div>
								</div>

								<div className="space-y-1">
									<label className="text-[11px] font-bold text-slate-600">Titular Principal *</label>
									<input
										type="text"
										required
										value={bannerFields.headline}
										onChange={e => setBannerFields(prev => ({ ...prev, headline: e.target.value }))}
										placeholder="¡Llevate 3 al precio de 2!"
										className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-[11px] font-bold text-slate-600">Subtítulo descriptivo</label>
									<textarea
										value={bannerFields.subtitle}
										onChange={e => setBannerFields(prev => ({ ...prev, subtitle: e.target.value }))}
										placeholder="Descripción corta de la promoción..."
										rows={2}
										className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-[11px] font-bold text-slate-600">URL de Imagen (Opcional)</label>
									<input
										type="url"
										value={bannerFields.image_url}
										onChange={e => setBannerFields(prev => ({ ...prev, image_url: e.target.value }))}
										placeholder="https://servidor.com/imagen.png"
										className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
									/>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-1">
										<label className="text-[11px] font-bold text-slate-600">Fondo Banner (Color)</label>
										<div className="flex gap-2 items-center">
											<input
												type="color"
												value={bannerFields.bg_color}
												onChange={e => setBannerFields(prev => ({ ...prev, bg_color: e.target.value }))}
												className="w-8 h-8 rounded-lg border border-slate-200 p-0.5 cursor-pointer"
											/>
											<input
												type="text"
												value={bannerFields.bg_color}
												onChange={e => setBannerFields(prev => ({ ...prev, bg_color: e.target.value }))}
												className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
											/>
										</div>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-bold text-slate-600">Color de Texto</label>
										<div className="flex gap-2 items-center">
											<input
												type="color"
												value={bannerFields.text_color}
												onChange={e => setBannerFields(prev => ({ ...prev, text_color: e.target.value }))}
												className="w-8 h-8 rounded-lg border border-slate-200 p-0.5 cursor-pointer"
											/>
											<input
												type="text"
												value={bannerFields.text_color}
												onChange={e => setBannerFields(prev => ({ ...prev, text_color: e.target.value }))}
												className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
											/>
										</div>
									</div>
								</div>

								<div className="grid grid-cols-3 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-bold text-slate-600">Texto Botón</label>
										<input
											type="text"
											value={bannerFields.button_text}
											onChange={e => setBannerFields(prev => ({ ...prev, button_text: e.target.value }))}
											className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none"
										/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-bold text-slate-600">Color Botón</label>
										<input
											type="color"
											value={bannerFields.button_color}
											onChange={e => setBannerFields(prev => ({ ...prev, button_color: e.target.value }))}
											className="w-full h-8 rounded-xl border border-slate-200 p-0.5 cursor-pointer"
										/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-bold text-slate-600">Color Texto Botón</label>
										<input
											type="color"
											value={bannerFields.button_text_color}
											onChange={e => setBannerFields(prev => ({ ...prev, button_text_color: e.target.value }))}
											className="w-full h-8 rounded-xl border border-slate-200 p-0.5 cursor-pointer"
										/>
									</div>
								</div>

								<div className="space-y-1">
									<label className="text-[11px] font-bold text-slate-600">Mensaje WhatsApp Predefinido</label>
									<input
										type="text"
										value={bannerFields.whatsapp_message}
										onChange={e => setBannerFields(prev => ({ ...prev, whatsapp_message: e.target.value }))}
										placeholder="Ej: Hola, quiero ordenar la promoción de..."
										className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
									/>
								</div>

								<div className="grid grid-cols-2 gap-3 pt-1">
									<div className="space-y-1">
										<label className="text-[11px] font-bold text-slate-600">Orden de Visualización</label>
										<input
											type="number"
											value={bannerFields.sort_order}
											onChange={e => setBannerFields(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
											className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none"
										/>
									</div>
									<div className="flex items-center gap-2 mt-6">
										<input
											type="checkbox"
											id="banner-is-active"
											checked={bannerFields.is_active}
											onChange={e => setBannerFields(prev => ({ ...prev, is_active: e.target.checked }))}
											className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
										/>
										<label htmlFor="banner-is-active" className="text-xs font-bold text-slate-700 cursor-pointer">Activar Banner</label>
									</div>
								</div>
							</div>

							<div className="flex justify-end gap-2 pt-6 border-t border-slate-100 mt-4">
								<button
									type="button"
									onClick={() => setBannerModalOpen(false)}
									className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-bold transition cursor-pointer"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
								>
									{submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
									Guardar Banner
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* MODAL: VIDEOS CREATE/EDIT */}
			{videoModalOpen && (
				<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<form onSubmit={handleSaveVideo} className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden flex flex-col p-6 space-y-4">
						<div className="flex justify-between items-center">
							<h3 className="font-extrabold text-slate-900 text-lg">{editingVideo ? 'Editar Video Promocional' : 'Añadir Video Promocional'}</h3>
							<button type="button" onClick={() => setVideoModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-400" /></button>
						</div>

						<div className="space-y-1">
							<label className="text-[11px] font-bold text-slate-600">Título del Video *</label>
							<input
								type="text"
								required
								value={videoFields.title}
								onChange={e => setVideoFields(prev => ({ ...prev, title: e.target.value }))}
								placeholder="Ej: Tour por el almacén"
								className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
							/>
						</div>

						<div className="space-y-1">
							<label className="text-[11px] font-bold text-slate-600">Enlace del Video *</label>
							<input
								type="url"
								required
								value={videoFields.video_url}
								onChange={e => setVideoFields(prev => ({ ...prev, video_url: e.target.value }))}
								placeholder="YouTube URL, Instagram Reel, Google Drive"
								className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
							/>
							<p className="text-[10px] text-slate-400 mt-1 leading-normal">
								Formatos soportados: youtube.com/watch?v=..., instagram.com/reel/..., drive.google.com/file/...
							</p>
						</div>

						<div className="grid grid-cols-2 gap-3 pt-1">
							<div className="space-y-1">
								<label className="text-[11px] font-bold text-slate-600">Orden de Visualización</label>
								<input
									type="number"
									value={videoFields.sort_order}
									onChange={e => setVideoFields(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
									className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2 mt-6">
								<input
									type="checkbox"
									id="video-is-active"
									checked={videoFields.is_active}
									onChange={e => setVideoFields(prev => ({ ...prev, is_active: e.target.checked }))}
									className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
								/>
								<label htmlFor="video-is-active" className="text-xs font-bold text-slate-700 cursor-pointer">Activar Video</label>
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
							<button
								type="button"
								onClick={() => setVideoModalOpen(false)}
								className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-bold transition cursor-pointer"
							>
								Cancelar
							</button>
							<button
								type="submit"
								disabled={submitting}
								className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
							>
								{submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
								Guardar Video
							</button>
						</div>
					</form>
				</div>
			)}

			{/* MODAL: DISCOUNTS CREATE/EDIT */}
			{discountModalOpen && (
				<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<form onSubmit={handleSaveDiscount} className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden flex flex-col p-6 space-y-4">
						<div className="flex justify-between items-center">
							<h3 className="font-extrabold text-slate-900 text-lg">{editingDiscount ? 'Editar Descuento Visual' : 'Añadir Descuento Visual'}</h3>
							<button type="button" onClick={() => setDiscountModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-400" /></button>
						</div>

						<div className="space-y-1">
							<label className="text-[11px] font-bold text-slate-600">Título / Nombre de Campaña *</label>
							<input
								type="text"
								required
								value={discountFields.title}
								onChange={e => setDiscountFields(prev => ({ ...prev, title: e.target.value }))}
								placeholder="Ej: Descuento de Cardiología"
								className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
							/>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<label className="text-[11px] font-bold text-slate-600">Porcentaje de Descuento (%) *</label>
								<input
									type="number"
									required
									min={1}
									max={100}
									value={discountFields.discount_pct}
									onChange={e => setDiscountFields(prev => ({ ...prev, discount_pct: parseFloat(e.target.value) || 0 }))}
									placeholder="Ej: 15"
									className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
								/>
							</div>
							<div className="space-y-1">
								<label className="text-[11px] font-bold text-slate-600">Categoría Vinculada *</label>
								<select
									required
									value={discountFields.category_id}
									onChange={e => setDiscountFields(prev => ({ ...prev, category_id: e.target.value }))}
									className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
								>
									<option value="" disabled>Selecciona categoría...</option>
									{categories.map(c => (
										<option key={c.id} value={c.id}>
											{c.emoji} {c.name}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="space-y-1">
							<label className="text-[11px] font-bold text-slate-600">URL de Imagen de Fondo (Opcional)</label>
							<input
								type="url"
								value={discountFields.image_url}
								onChange={e => setDiscountFields(prev => ({ ...prev, image_url: e.target.value }))}
								placeholder="https://servidor.com/portada-descuento.jpg"
								className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
							/>
							<p className="text-[10px] text-slate-400 mt-1">Si no provees una imagen, se mostrará el emoji de la categoría en grande.</p>
						</div>

						<div className="grid grid-cols-2 gap-3 pt-1">
							<div className="space-y-1">
								<label className="text-[11px] font-bold text-slate-600">Orden de Visualización</label>
								<input
									type="number"
									value={discountFields.sort_order}
									onChange={e => setDiscountFields(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
									className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none"
								/>
							</div>
							<div className="flex items-center gap-2 mt-6">
								<input
									type="checkbox"
									id="discount-is-active"
									checked={discountFields.is_active}
									onChange={e => setDiscountFields(prev => ({ ...prev, is_active: e.target.checked }))}
									className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
								/>
								<label htmlFor="discount-is-active" className="text-xs font-bold text-slate-700 cursor-pointer">Activar Oferta</label>
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
							<button
								type="button"
								onClick={() => setDiscountModalOpen(false)}
								className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-bold transition cursor-pointer"
							>
								Cancelar
							</button>
							<button
								type="submit"
								disabled={submitting}
								className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
							>
								{submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
								Guardar Descuento
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
