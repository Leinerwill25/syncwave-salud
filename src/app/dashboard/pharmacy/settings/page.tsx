// app/dashboard/pharmacy/settings/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
	Settings,
	Loader2,
	AlertCircle,
	CheckCircle2,
	Package,
	ShieldAlert,
	Save
} from 'lucide-react';
import axios from 'axios';

type SiteConfig = {
	org_id: string;
	template_id: string;
	slug: string;
	logo_url: string | null;
	color_primary: string;
	color_secondary: string;
	color_accent: string;
	whatsapp_number: string;
	content: any;
	is_published: boolean;
	inventory_tracking_enabled: boolean;
};

export default function PharmacySettingsPage() {
	const [config, setConfig] = useState<SiteConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// Form field
	const [inventoryTrackingEnabled, setInventoryTrackingEnabled] = useState(false);

	useEffect(() => {
		fetchConfig();
	}, []);

	async function fetchConfig() {
		try {
			setLoading(true);
			setError(null);
			const res = await axios.get('/api/pharmacy/site');
			if (res.data?.success && res.data?.data) {
				const data = res.data.data;
				setConfig(data);
				setInventoryTrackingEnabled(!!data.inventory_tracking_enabled);
			}
		} catch (err: any) {
			console.error('Error fetching site config:', err);
			setError(err?.response?.data?.message || 'Error al cargar la configuración de ajustes');
		} finally {
			setLoading(false);
		}
	}

	async function handleSaveSettings(e: React.FormEvent) {
		e.preventDefault();
		if (!config) return;

		setSubmitting(true);
		setError(null);
		setSuccessMsg(null);

		try {
			const payload = {
				...config,
				inventory_tracking_enabled: inventoryTrackingEnabled
			};

			const res = await axios.put('/api/pharmacy/site', payload);
			if (res.data?.success) {
				setSuccessMsg('Ajustes guardados con éxito.');
				setConfig(res.data.data);
				setInventoryTrackingEnabled(!!res.data.data.inventory_tracking_enabled);
			}
		} catch (err: any) {
			console.error('Error saving settings:', err);
			setError(err?.response?.data?.message || 'Error al guardar los ajustes');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
			{/* Page Header */}
			<div>
				<h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
					<Settings className="w-8 h-8 text-purple-600 shrink-0" />
					Configuración General
				</h1>
				<p className="text-sm text-slate-500 mt-1">
					Administra las preferencias generales del módulo de tu farmacia y activa funciones adicionales.
				</p>
			</div>

			{/* Status Feedback */}
			{error && (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm flex items-start gap-2 max-w-3xl">
					<AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
					<span>{error}</span>
				</div>
			)}
			{successMsg && (
				<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm flex items-start gap-2 max-w-3xl">
					<CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
					<span>{successMsg}</span>
				</div>
			)}

			{loading ? (
				<div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
					<Loader2 className="w-8 h-8 animate-spin text-purple-600" />
					<p className="text-sm font-medium">Cargando ajustes...</p>
				</div>
			) : (
				<form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 max-w-3xl space-y-6">
					<div className="space-y-4">
						<h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
							<Package className="w-4.5 h-4.5 text-purple-600" />
							Módulo de Inventario Interno
						</h3>
						
						<div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100/50 transition">
							<input
								type="checkbox"
								id="inventory-tracking-checkbox"
								checked={inventoryTrackingEnabled}
								onChange={e => setInventoryTrackingEnabled(e.target.checked)}
								className="w-4.5 h-4.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 mt-1 cursor-pointer"
							/>
							<div className="space-y-1">
								<label htmlFor="inventory-tracking-checkbox" className="text-sm font-bold text-slate-800 cursor-pointer block select-none">
									Activar seguimiento de inventario (recepción y alertas de bajo stock)
								</label>
								<p className="text-xs text-slate-500 leading-relaxed">
									Habilita el ingreso de mercancía detallada por bulto/unidades, historial de recepciones, y muestra alertas de bajo stock en tu panel de control principal.
								</p>
								
								<div className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100 mt-2.5">
									<ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
									<span>
										<strong>Regla de desacople:</strong> Activar esta función es privado. La disponibilidad de cara al público seguirá dependiendo única y exclusivamente del toggle manual (En Stock/Agotado) del producto.
									</span>
								</div>
							</div>
						</div>
					</div>

					<div className="flex justify-end pt-4 border-t border-slate-100">
						<button
							type="submit"
							disabled={submitting}
							className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer text-sm"
						>
							{submitting ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Guardando...
								</>
							) : (
								<>
									<Save className="w-4 h-4" />
									Guardar Ajustes
								</>
							)}
						</button>
					</div>
				</form>
			)}
		</div>
	);
}
