// app/dashboard/pharmacy/site/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
	Globe,
	Loader2,
	Upload,
	Eye,
	Check,
	Info,
	Heart,
	Layers,
	Smartphone,
	Save,
	ExternalLink
} from 'lucide-react';
import axios from 'axios';

type ContentSlots = {
	hero: { title: string; subtitle: string };
	mision: string;
	vision: string;
	contacto: { email: string; phone: string };
};

type SiteConfig = {
	template_id: string;
	slug: string;
	logo_url: string | null;
	color_primary: string;
	color_secondary: string;
	color_accent: string;
	whatsapp_number: string;
	content: ContentSlots;
	is_published: boolean;
};

export default function SiteConfigPage() {
	const [config, setConfig] = useState<SiteConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// Form states
	const [slug, setSlug] = useState('');
	const [templateId, setTemplateId] = useState('farmatuya');
	const [colorPrimary, setColorPrimary] = useState('#9333ea');
	const [colorSecondary, setColorSecondary] = useState('#db2777');
	const [colorAccent, setColorAccent] = useState('#ec4899');
	const [whatsappNumber, setWhatsappNumber] = useState('');
	const [logoUrl, setLogoUrl] = useState('');
	const [isPublished, setIsPublished] = useState(false);

	// Slots states
	const [heroTitle, setHeroTitle] = useState('');
	const [heroSubtitle, setHeroSubtitle] = useState('');
	const [mision, setMision] = useState('');
	const [vision, setVision] = useState('');
	const [contactEmail, setContactEmail] = useState('');
	const [contactPhone, setContactPhone] = useState('');

	useEffect(() => {
		fetchSiteConfig();
	}, []);

	async function fetchSiteConfig() {
		try {
			setLoading(true);
			setError(null);
			const res = await axios.get('/api/pharmacy/site');
			if (res.data?.success && res.data?.data) {
				const d = res.data.data as SiteConfig;
				setConfig(d);
				setSlug(d.slug || '');
				setTemplateId(d.template_id || 'farmatuya');
				setColorPrimary(d.color_primary || '#9333ea');
				setColorSecondary(d.color_secondary || '#db2777');
				setColorAccent(d.color_accent || '#ec4899');
				setWhatsappNumber(d.whatsapp_number || '');
				setLogoUrl(d.logo_url || '');
				setIsPublished(d.is_published || false);

				// Slots
				const slots = d.content || {};
				setHeroTitle(slots.hero?.title || '');
				setHeroSubtitle(slots.hero?.subtitle || '');
				setMision(slots.mision || '');
				setVision(slots.vision || '');
				setContactEmail(slots.contacto?.email || '');
				setContactPhone(slots.contacto?.phone || '');
			}
		} catch (err: any) {
			console.error('Error fetching site config:', err);
			setError(err?.response?.data?.message || 'Error al cargar la configuración de sitio');
		} finally {
			setLoading(false);
		}
	}

	async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		setUploadingLogo(true);
		setError(null);
		setSuccessMsg(null);

		const formData = new FormData();
		formData.append('file', files[0]);
		formData.append('photo_type', 'logo');

		try {
			const res = await axios.post('/api/clinic/upload-photo', formData, {
				headers: { 'Content-Type': 'multipart/form-data' }
			});
			if (res.data?.url) {
				setLogoUrl(res.data.url);
				setSuccessMsg('Logotipo cargado con éxito.');
			}
		} catch (err: any) {
			console.error('Error uploading logo:', err);
			setError(err?.response?.data?.error || 'Error al subir el logotipo.');
		} finally {
			setUploadingLogo(false);
		}
	}

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		if (!slug.trim()) {
			setError('La URL personalizada es obligatoria.');
			return;
		}

		setSaving(true);
		setError(null);
		setSuccessMsg(null);

		const payload = {
			template_id: templateId,
			slug: slug.trim(),
			logo_url: logoUrl || null,
			color_primary: colorPrimary,
			color_secondary: colorSecondary,
			color_accent: colorAccent,
			whatsapp_number: whatsappNumber.trim(),
			is_published: isPublished,
			content: {
				hero: { title: heroTitle.trim(), subtitle: heroSubtitle.trim() },
				mision: mision.trim(),
				vision: vision.trim(),
				contacto: { email: contactEmail.trim(), phone: contactPhone.trim() }
			}
		};

		try {
			const res = await axios.put('/api/pharmacy/site', payload);
			if (res.data?.success) {
				setSuccessMsg('Configuración guardada correctamente.');
				setConfig(res.data.data);
				// Update format slug in case API returned formatted version
				setSlug(res.data.data.slug);
			}
		} catch (err: any) {
			console.error('Error saving site config:', err);
			setError(err?.response?.data?.message || 'Error al guardar la configuración.');
		} finally {
			setSaving(false);
		}
	}

	// Helper to render URL Preview
	const formattedSlug = slug
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/(^-|-$)+/g, '');

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
				<Loader2 className="w-8 h-8 animate-spin text-purple-600" />
				<p className="text-sm font-medium">Cargando constructor web...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
			{/* Page Header */}
			<div>
				<h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
					<Globe className="w-8 h-8 text-purple-600 shrink-0" />
					Constructor de Sitio Web
				</h1>
				<p className="text-sm text-slate-500 mt-1">
					Personaliza los colores de tu marca, logo y publica tu propio portal web público para que los pacientes consulten tu catálogo.
				</p>
			</div>

			{/* Status Alerts */}
			{error && (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm flex items-start gap-2">
					<Info className="w-4 h-4 shrink-0 mt-0.5" />
					<span>{error}</span>
				</div>
			)}
			{successMsg && (
				<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm flex items-start gap-2 animate-in slide-in-from-top duration-300">
					<Check className="w-4 h-4 shrink-0 mt-0.5" />
					<span>{successMsg}</span>
				</div>
			)}

			<form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
				{/* Col 1 & 2: Site details */}
				<div className="lg:col-span-2 space-y-6">
					{/* Brand Design */}
					<div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-6">
						<h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
							<Heart className="w-5 h-5 text-purple-600" />
							1. Identidad Visual de Marca
						</h3>

						{/* Logo Upload */}
						<div className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
							<div className="w-20 h-20 rounded-xl bg-white flex items-center justify-center border border-slate-200 overflow-hidden shrink-0 shadow-sm">
								{logoUrl ? (
									<img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
								) : (
									<Globe className="w-8 h-8 text-slate-300" />
								)}
							</div>
							<div className="flex-1 w-full text-center sm:text-left space-y-1">
								<h4 className="text-sm font-bold text-slate-800 font-sans">Logo de la Farmacia</h4>
								<p className="text-xs text-slate-400">Archivos PNG o JPG transparentes recomendados. Máx. 2MB.</p>
							</div>
							<div className="relative shrink-0 w-full sm:w-auto">
								<input
									type="file"
									accept="image/*"
									onChange={handleLogoUpload}
									disabled={uploadingLogo}
									className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
								/>
								<button
									type="button"
									disabled={uploadingLogo}
									className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer"
								>
									{uploadingLogo ? (
										<>
											<Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
											Subiendo...
										</>
									) : (
										<>
											<Upload className="w-3.5 h-3.5" />
											Cargar Logotipo
										</>
									)}
								</button>
							</div>
						</div>

						{/* Color Pickers */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="space-y-1.5">
								<label className="block text-xs font-bold text-slate-700">
									Color Principal (Hero/Navbar)
								</label>
								<div className="flex gap-2">
									<input
										type="color"
										value={colorPrimary}
										onChange={e => setColorPrimary(e.target.value)}
										className="w-10 h-10 rounded-xl border border-slate-200 p-0 cursor-pointer overflow-hidden shrink-0"
									/>
									<input
										type="text"
										value={colorPrimary}
										onChange={e => setColorPrimary(e.target.value)}
										placeholder="#9333ea"
										maxLength={7}
										className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs uppercase"
									/>
								</div>
							</div>

							<div className="space-y-1.5">
								<label className="block text-xs font-bold text-slate-700">
									Color Secundario (Botones)
								</label>
								<div className="flex gap-2">
									<input
										type="color"
										value={colorSecondary}
										onChange={e => setColorSecondary(e.target.value)}
										className="w-10 h-10 rounded-xl border border-slate-200 p-0 cursor-pointer overflow-hidden shrink-0"
									/>
									<input
										type="text"
										value={colorSecondary}
										onChange={e => setColorSecondary(e.target.value)}
										placeholder="#db2777"
										maxLength={7}
										className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs uppercase"
									/>
								</div>
							</div>

							<div className="space-y-1.5">
								<label className="block text-xs font-bold text-slate-700">
									Color de Acento (Badges)
								</label>
								<div className="flex gap-2">
									<input
										type="color"
										value={colorAccent}
										onChange={e => setColorAccent(e.target.value)}
										className="w-10 h-10 rounded-xl border border-slate-200 p-0 cursor-pointer overflow-hidden shrink-0"
									/>
									<input
										type="text"
										value={colorAccent}
										onChange={e => setColorAccent(e.target.value)}
										placeholder="#ec4899"
										maxLength={7}
										className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs uppercase"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Slots Text content */}
					<div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-5">
						<h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
							<Layers className="w-5 h-5 text-purple-600" />
							2. Contenidos Informativos (Slots)
						</h3>

						{/* Hero slots */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-bold text-slate-700 mb-1.5">
									Título Principal de Bienvenida
								</label>
								<input
									type="text"
									value={heroTitle}
									onChange={e => setHeroTitle(e.target.value)}
									placeholder="Ej: Bienvenidos a Farmacia La Salud"
									required
									className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
								/>
							</div>
							<div>
								<label className="block text-xs font-bold text-slate-700 mb-1.5">
									Subtítulo de Bienvenida
								</label>
								<input
									type="text"
									value={heroSubtitle}
									onChange={e => setHeroSubtitle(e.target.value)}
									placeholder="Ej: Cuidamos de tu familia en el centro de la ciudad"
									required
									className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
								/>
							</div>
						</div>

						{/* Mision & Vision */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-bold text-slate-700 mb-1.5">
									Misión de la Farmacia
								</label>
								<textarea
									value={mision}
									onChange={e => setMision(e.target.value)}
									placeholder="Describe la misión o propósito..."
									rows={3}
									className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm resize-none"
								/>
							</div>
							<div>
								<label className="block text-xs font-bold text-slate-700 mb-1.5">
									Visión de la Farmacia
								</label>
								<textarea
									value={vision}
									onChange={e => setVision(e.target.value)}
									placeholder="Describe la visión o metas..."
									rows={3}
									className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm resize-none"
								/>
							</div>
						</div>

						{/* Contact slots */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-bold text-slate-700 mb-1.5">
									Correo Electrónico de Contacto
								</label>
								<input
									type="email"
									value={contactEmail}
									onChange={e => setContactEmail(e.target.value)}
									placeholder="contacto@farmacia.com"
									className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
								/>
							</div>
							<div>
								<label className="block text-xs font-bold text-slate-700 mb-1.5">
									Teléfono Adicional Fijo/Móvil
								</label>
								<input
									type="text"
									value={contactPhone}
									onChange={e => setContactPhone(e.target.value)}
									placeholder="+58 212 1234567"
									className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Col 3: Publishing configuration */}
				<div className="space-y-6">
					{/* Settings Card */}
					<div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-5">
						<h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
							<Smartphone className="w-5 h-5 text-purple-600" />
							3. Publicación y Enlaces
						</h3>

						{/* Slug URL */}
						<div className="space-y-1.5">
							<label className="block text-xs font-bold text-slate-700">
								URL del Portal Público <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={slug}
								onChange={e => setSlug(e.target.value)}
								placeholder="mi-farmacia-salud"
								required
								className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
							/>
							<div className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 break-all space-y-1">
								<span className="font-bold text-slate-600 block">Previsualización URL:</span>
								<span className="text-purple-600 select-all font-semibold font-mono">
									/farmacia/{formattedSlug || 'mi-farmacia-slug'}
								</span>
							</div>
						</div>

						{/* WhatsApp click number */}
						<div className="space-y-1.5">
							<label className="block text-xs font-bold text-slate-700">
								Número de WhatsApp consultas <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={whatsappNumber}
								onChange={e => setWhatsappNumber(e.target.value)}
								placeholder="Ej: 584120000000"
								required
								className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
							/>
							<p className="text-[10px] text-slate-400">
								Incluye código de país sin el signo &apos;+&apos; (ej: 58 para Venezuela).
							</p>
						</div>

						{/* Template selector */}
						<div className="space-y-1.5">
							<label className="block text-xs font-bold text-slate-700">
								Plantilla Visual del Portal
							</label>
							<div className="grid grid-cols-3 gap-2">
								{['farmatuya', 'moderna', 'clasica'].map(tId => (
									<button
										key={tId}
										type="button"
										onClick={() => setTemplateId(tId)}
										className={`py-2 text-[11px] font-bold rounded-xl border text-center transition ${templateId === tId ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
									>
										{tId === 'farmatuya' ? 'FarmaTuya' : tId === 'moderna' ? 'Moderna' : 'Clásica'}
									</button>
								))}
							</div>
						</div>

						{/* Law Compliance Notice */}
						<div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-800 leading-relaxed">
							<span className="font-bold block mb-0.5">⚠️ Marco Regulatorio Legal</span>
							Asegúrate de que la publicidad de tus medicamentos comerciales cumpla con la normativa sanitaria nacional de publicidad de productos farmacéuticos de venta libre. Los medicamentos controlados se omitirán de forma automática.
						</div>

						{/* Publish Toggle */}
						<label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-xl cursor-pointer hover:bg-slate-100/70 transition">
							<input
								type="checkbox"
								checked={isPublished}
								onChange={e => setIsPublished(e.target.checked)}
								className="w-4.5 h-4.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
							/>
							<div>
								<h4 className="text-xs font-bold text-slate-800">Habilitar Sitio Web</h4>
								<p className="text-[9px] text-slate-500 mt-0.5">Si se apaga, los pacientes recibirán un error 404 al intentar ingresar.</p>
							</div>
						</label>

						{/* Save Action */}
						<button
							type="submit"
							disabled={saving || !slug.trim()}
							className="w-full inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-5 rounded-xl text-xs shadow-md shadow-purple-900/10 transition disabled:opacity-50 cursor-pointer"
						>
							{saving ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Guardando...
								</>
							) : (
								<>
									<Save className="w-4 h-4" />
									Guardar Cambios
								</>
							)}
						</button>
					</div>

					{/* Live URL Link */}
					{config?.is_published && config?.slug && (
						<div className="bg-gradient-to-br from-purple-900 to-indigo-950 rounded-2xl p-5 text-white shadow-xl text-center space-y-3">
							<h4 className="text-xs font-bold text-purple-200">¡Tu Sitio está en Línea!</h4>
							<a
								href={`/farmacia/${config.slug}`}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 bg-white text-purple-900 font-bold px-4 py-2 rounded-xl text-xs shadow-md hover:bg-slate-100 transition w-full justify-center"
							>
								Visitar Sitio Público
								<ExternalLink className="w-3.5 h-3.5" />
							</a>
						</div>
					)}
				</div>
			</form>
		</div>
	);
}
