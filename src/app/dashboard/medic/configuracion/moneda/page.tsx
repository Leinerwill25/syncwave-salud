/**
 * Página de configuración de moneda
 * Permite al usuario seleccionar la moneda principal del sistema desde las monedas disponibles en la base de datos rates
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, CheckCircle, AlertCircle, RefreshCw, Loader2, TrendingUp, Globe, Info, ChevronDown } from 'lucide-react';
import { useCurrencyRate } from '@/hooks/useCurrencyRate';
import CurrencyDisplay from '@/components/CurrencyDisplay';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type CurrencyOption = {
	code: string;
	rate: number;
	rate_datetime: string;
	curr_date: string;
};

export default function CurrencyConfigPage() {
	const [preference, setPreference] = useState<string>('USD');
	const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyOption[]>([]);
	const [loadingCurrencies, setLoadingCurrencies] = useState(true);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	
	// Obtener la tasa de la moneda preferida
	const { rate, loading: rateLoading, error: rateError, refresh: refreshRate } = useCurrencyRate(preference || 'USD');

	useEffect(() => {
		loadAvailableCurrencies();
		loadPreference();
	}, []);

	// Actualizar la tasa cuando cambie la preferencia
	useEffect(() => {
		if (preference) {
			refreshRate();
		}
	}, [preference]);

	const loadAvailableCurrencies = async () => {
		try {
			setLoadingCurrencies(true);
			const res = await fetch('/api/currency/available', {
				credentials: 'include',
			});

			if (!res.ok) {
				throw new Error('Error al obtener monedas disponibles');
			}

			const data = await res.json();
			if (data.success && Array.isArray(data.currencies)) {
				setAvailableCurrencies(data.currencies);
			}
		} catch (err: any) {
			console.error('Error cargando monedas disponibles:', err);
			setMessage({ type: 'error', text: 'Error al cargar monedas disponibles' });
		} finally {
			setLoadingCurrencies(false);
		}
	};

	const loadPreference = async () => {
		try {
			setLoading(true);
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session?.user) {
				setMessage({ type: 'error', text: 'No hay sesión activa' });
				return;
			}

			// Obtener preferencia del usuario desde la base de datos
			const { data: userData, error } = await supabase
				.from('user')
				.select('currency_preference')
				.eq('authId', session.user.id)
				.maybeSingle();

			if (error) {
				console.error('Error cargando preferencia:', error);
				return;
			}

			if (userData?.currency_preference) {
				setPreference(userData.currency_preference);
			}
		} catch (err) {
			console.error('Error cargando preferencia de moneda:', err);
			setMessage({ type: 'error', text: 'Error al cargar la configuración' });
		} finally {
			setLoading(false);
		}
	};

	const savePreference = async (newPreference: string) => {
		try {
			setSaving(true);
			setMessage(null);

			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session?.user) {
				setMessage({ type: 'error', text: 'No hay sesión activa' });
				return;
			}

			// Actualizar preferencia en la base de datos
			const { error } = await supabase
				.from('user')
				.update({ currency_preference: newPreference })
				.eq('authId', session.user.id);

			if (error) {
				throw error;
			}

			setPreference(newPreference);
			setMessage({ type: 'success', text: 'Preferencia de moneda guardada correctamente' });

			// Guardar también en localStorage para acceso rápido
			localStorage.setItem('currency_preference', newPreference);

			// Disparar evento personalizado para que otros componentes se actualicen
			window.dispatchEvent(new CustomEvent('currencyPreferenceChanged', { detail: { preference: newPreference } }));
		} catch (err) {
			console.error('Error guardando preferencia:', err);
			setMessage({ type: 'error', text: 'Error al guardar la configuración' });
		} finally {
			setSaving(false);
		}
	};

	// Obtener la moneda seleccionada para mostrar su tasa
	const selectedCurrency = availableCurrencies.find((c) => c.code === preference);

	// Obtener nombre de moneda más legible
	const getCurrencyName = (code: string): string => {
		const names: Record<string, string> = {
			USD: 'Dólar Estadounidense',
			EUR: 'Euro',
			BS: 'Bolívares',
			VES: 'Bolívares Soberanos',
			COP: 'Peso Colombiano',
			MXN: 'Peso Mexicano',
			ARS: 'Peso Argentino',
		};
		return names[code] || code;
	};

	if (loading || loadingCurrencies) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
					<p className="text-sm text-slate-600">Cargando configuración...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-4 sm:p-6 md:p-8">
			<div className="max-w-5xl mx-auto space-y-6">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-xl border border-slate-200/50 p-6 sm:p-8"
				>
					<div className="flex items-center gap-4 mb-2">
						<div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
							<DollarSign className="w-7 h-7 text-white" />
						</div>
						<div className="flex-1">
							<h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Configuración de Moneda</h1>
							<p className="text-sm sm:text-base text-slate-600 mt-1">Selecciona tu moneda preferida para cotizar precios en el sistema</p>
						</div>
					</div>
				</motion.div>

				{/* Tasa de Cambio Actual */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-xl border border-slate-200/50 p-6 sm:p-8"
				>
					<div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-100 rounded-lg">
								<TrendingUp className="w-5 h-5 text-blue-600" />
							</div>
							<h2 className="text-xl font-bold text-slate-900">
								Tasa de Cambio Actual ({preference || 'USD'})
							</h2>
						</div>
						<button
							onClick={refreshRate}
							disabled={rateLoading}
							className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50 font-medium text-sm"
						>
							<RefreshCw className={`w-4 h-4 ${rateLoading ? 'animate-spin' : ''}`} />
							<span>Actualizar</span>
						</button>
					</div>

					{rateLoading ? (
						<div className="flex items-center gap-3 text-slate-600 py-8">
							<Loader2 className="w-5 h-5 animate-spin" />
							<span>Cargando tasa de cambio...</span>
						</div>
					) : rateError ? (
						<div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
							<AlertCircle className="w-5 h-5 shrink-0" />
							<span>{rateError}</span>
						</div>
					) : rate ? (
						<div className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200">
									<div className="flex items-center justify-between mb-3">
										<p className="text-sm font-medium text-slate-600">1 {preference} =</p>
										<div className="p-2 bg-teal-100 rounded-lg">
											<Globe className="w-4 h-4 text-teal-600" />
										</div>
									</div>
									<p className="text-3xl font-bold text-slate-900 mb-2">
										{Number(rate.rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
									</p>
									<p className="text-xs text-slate-500">
										Actualizado: {new Date(rate.rate_datetime).toLocaleDateString('es-VE')} {new Date(rate.rate_datetime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
									</p>
								</div>

								<div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
									<div className="flex items-center justify-between mb-3">
										<p className="text-sm font-medium text-slate-600">Ejemplo de conversión</p>
										<div className="p-2 bg-blue-100 rounded-lg">
											<DollarSign className="w-4 h-4 text-blue-600" />
										</div>
									</div>
									<div className="mb-2">
										<CurrencyDisplay 
											amount={preference === 'EUR' ? 20 : preference === 'BS' ? 5000 : 100} 
											currency={preference as 'USD' | 'EUR' | 'BS'} 
											showBoth={true} 
											size="lg" 
										/>
									</div>
									<p className="text-xs text-slate-500">
										Basado en tu moneda preferida: <strong>{preference}</strong>
									</p>
								</div>
							</div>
						</div>
					) : (
						<div className="flex items-center gap-3 text-slate-600 py-8">
							<AlertCircle className="w-5 h-5" />
							<span>No se pudo obtener la tasa de cambio</span>
						</div>
					)}
				</motion.div>

				{/* Selección de Moneda Principal */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-xl border border-slate-200/50 p-6 sm:p-8"
				>
					<div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
						<div className="p-2 bg-indigo-100 rounded-lg">
							<Globe className="w-5 h-5 text-indigo-600" />
						</div>
						<h2 className="text-xl font-bold text-slate-900">Moneda de Preferencia para Cotización</h2>
					</div>

					<p className="text-sm text-slate-600 mb-6">
						Selecciona la moneda en la que deseas que se muestren y cotizen los precios de tus servicios. Esta preferencia se aplicará en todo el sistema.
					</p>

					{availableCurrencies.length === 0 ? (
						<div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-lg text-center">
							<AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
							<p className="text-sm text-amber-700">No hay monedas disponibles en la base de datos</p>
						</div>
					) : (
						<div className="space-y-4">
							<div className="relative">
								<label className="block text-sm font-semibold text-slate-700 mb-2">
									Selecciona tu moneda preferida
								</label>
								<div className="relative">
									<select
										value={preference}
										onChange={(e) => savePreference(e.target.value)}
										disabled={saving}
										className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-slate-200 bg-white text-slate-900 font-semibold text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{availableCurrencies.map((currency) => (
											<option key={currency.code} value={currency.code}>
												{currency.code} - {getCurrencyName(currency.code)}
											</option>
										))}
									</select>
									<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
								</div>
							</div>

							{/* Información de la moneda seleccionada */}
							{selectedCurrency && (
								<div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200">
									<div className="flex items-center justify-between mb-3">
										<div>
											<h3 className="text-lg font-bold text-slate-900 mb-1">
												{selectedCurrency.code} - {getCurrencyName(selectedCurrency.code)}
											</h3>
											<p className="text-sm text-slate-600">Moneda seleccionada para cotización</p>
										</div>
										<div className="p-3 bg-indigo-100 rounded-lg">
											<CheckCircle className="w-6 h-6 text-indigo-600" />
										</div>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-indigo-200">
										<div>
											<p className="text-xs text-slate-500 mb-1">Tasa actual</p>
											<p className="text-xl font-bold text-slate-900">
												1 {selectedCurrency.code} = {selectedCurrency.rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} Bs
											</p>
										</div>
										<div>
											<p className="text-xs text-slate-500 mb-1">Última actualización</p>
											<p className="text-sm font-medium text-slate-700">
												{new Date(selectedCurrency.rate_datetime).toLocaleDateString('es-VE')} {new Date(selectedCurrency.rate_datetime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
											</p>
										</div>
									</div>
								</div>
							)}

							{/* Grid de todas las monedas disponibles */}
							<div className="mt-6">
								<h3 className="text-sm font-semibold text-slate-700 mb-4">Todas las monedas disponibles</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{availableCurrencies.map((currency) => {
										const isSelected = currency.code === preference;
										return (
											<div
												key={currency.code}
												onClick={() => !saving && savePreference(currency.code)}
												className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
													isSelected
														? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-md'
														: 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
												} ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
											>
												<div className="flex items-center justify-between mb-2">
													<div>
														<div className="text-lg font-bold text-slate-900">{currency.code}</div>
														<div className="text-xs text-slate-600">{getCurrencyName(currency.code)}</div>
													</div>
													{isSelected && <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0" />}
												</div>
												<div className="mt-2 pt-2 border-t border-slate-200">
													<p className="text-xs text-slate-500 mb-1">Tasa actual:</p>
													<p className="text-sm font-semibold text-slate-700">
														1 {currency.code} = {currency.rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} Bs
													</p>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{message && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${
								message.type === 'success' ? 'bg-green-50 border-2 border-green-200 text-green-700' : 'bg-red-50 border-2 border-red-200 text-red-700'
							}`}
						>
							{message.type === 'success' ? (
								<CheckCircle className="w-5 h-5 shrink-0" />
							) : (
								<AlertCircle className="w-5 h-5 shrink-0" />
							)}
							<span className="text-sm font-medium">{message.text}</span>
						</motion.div>
					)}
				</motion.div>

				{/* Información adicional */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6 sm:p-8"
				>
					<div className="flex items-center gap-3 mb-4">
						<div className="p-2 bg-blue-100 rounded-lg">
							<Info className="w-5 h-5 text-blue-600" />
						</div>
						<h3 className="text-lg font-bold text-slate-900">Información Importante</h3>
					</div>
					<ul className="space-y-3 text-sm text-slate-700">
						<li className="flex items-start gap-3">
							<div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 shrink-0" />
							<span>
								<strong className="font-semibold">Monedas disponibles:</strong> Las monedas mostradas provienen de la base de datos de tasas de cambio y se actualizan automáticamente.
							</span>
						</li>
						<li className="flex items-start gap-3">
							<div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 shrink-0" />
							<span>
								<strong className="font-semibold">Cambio de preferencia:</strong> Puedes cambiar tu moneda preferida en cualquier momento y se aplicará inmediatamente en todo el sistema (servicios, facturación, reportes).
							</span>
						</li>
						<li className="flex items-start gap-3">
							<div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 shrink-0" />
							<span>
								<strong className="font-semibold">Visualización dual:</strong> Los montos siempre mostrarán ambas monedas (tu preferencia y la conversión a Bolívares) para tu referencia y la de tus pacientes.
							</span>
						</li>
						<li className="flex items-start gap-3">
							<div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 shrink-0" />
							<span>
								<strong className="font-semibold">Aplicación global:</strong> Esta configuración afecta cómo se muestran los precios en servicios, citas, consultas, facturación y reportes.
							</span>
						</li>
					</ul>
				</motion.div>
			</div>
		</div>
	);
}
