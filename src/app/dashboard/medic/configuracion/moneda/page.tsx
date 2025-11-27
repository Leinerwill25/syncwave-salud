/**
 * Página de configuración de moneda
 * Permite al usuario seleccionar la moneda principal del sistema (USD o Bs)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, CheckCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useCurrencyRate } from '@/hooks/useCurrencyRate';
import CurrencyDisplay from '@/components/CurrencyDisplay';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type CurrencyPreference = 'USD' | 'BS';

export default function CurrencyConfigPage() {
	const { rate, loading: rateLoading, error: rateError, refresh: refreshRate } = useCurrencyRate('USD');
	const [preference, setPreference] = useState<CurrencyPreference>('USD');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	useEffect(() => {
		loadPreference();
	}, []);

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
				.from('User')
				.select('currency_preference')
				.eq('authId', session.user.id)
				.maybeSingle();

			if (error) {
				console.error('Error cargando preferencia:', error);
				return;
			}

			if (userData?.currency_preference) {
				setPreference(userData.currency_preference as CurrencyPreference);
			}
		} catch (err) {
			console.error('Error cargando preferencia de moneda:', err);
			setMessage({ type: 'error', text: 'Error al cargar la configuración' });
		} finally {
			setLoading(false);
		}
	};

	const savePreference = async (newPreference: CurrencyPreference) => {
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
				.from('User')
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

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-4 sm:p-6 md:p-8">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/50 p-6 sm:p-8"
				>
					<div className="flex items-center gap-4 mb-4">
						<div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
							<DollarSign className="w-6 h-6 text-white" />
						</div>
						<div>
							<h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Configuración de Moneda</h1>
							<p className="text-sm sm:text-base text-slate-600 mt-1">Selecciona la moneda principal para mostrar en el sistema</p>
						</div>
					</div>
				</motion.div>

				{/* Tasa de Cambio Actual */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/50 p-6 sm:p-8"
				>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-semibold text-slate-900">Tasa de Cambio Actual</h2>
						<button
							onClick={refreshRate}
							disabled={rateLoading}
							className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50"
						>
							<RefreshCw className={`w-4 h-4 ${rateLoading ? 'animate-spin' : ''}`} />
							<span className="text-sm font-medium">Actualizar</span>
						</button>
					</div>

					{rateLoading ? (
						<div className="flex items-center gap-3 text-slate-600">
							<Loader2 className="w-5 h-5 animate-spin" />
							<span>Cargando tasa de cambio...</span>
						</div>
					) : rateError ? (
						<div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-lg">
							<AlertCircle className="w-5 h-5" />
							<span>{rateError}</span>
						</div>
					) : rate ? (
						<div className="space-y-4">
							<div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200">
								<div>
									<p className="text-sm text-slate-600">1 USD =</p>
									<p className="text-2xl font-bold text-slate-900">
										{Number(rate.rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
									</p>
								</div>
								<div className="text-right">
									<p className="text-xs text-slate-500">Actualizado:</p>
									<p className="text-sm font-medium text-slate-700">
										{new Date(rate.rate_datetime).toLocaleDateString('es-VE')} {new Date(rate.rate_datetime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
									</p>
								</div>
							</div>

							{/* Ejemplo de conversión */}
							<div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
								<p className="text-sm font-medium text-slate-700 mb-2">Ejemplo de conversión:</p>
								<CurrencyDisplay amount={100} currency="USD" showBoth={true} primaryCurrency={preference} />
							</div>
						</div>
					) : (
						<div className="flex items-center gap-3 text-slate-600">
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
					className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/50 p-6 sm:p-8"
				>
					<h2 className="text-xl font-semibold text-slate-900 mb-6">Moneda Principal del Sistema</h2>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{/* Opción USD */}
						<button
							onClick={() => savePreference('USD')}
							disabled={saving || preference === 'USD'}
							className={`relative p-6 rounded-xl border-2 transition-all ${
								preference === 'USD'
									? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md'
									: 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm'
							} disabled:opacity-50 disabled:cursor-not-allowed`}
						>
							{preference === 'USD' && (
								<div className="absolute top-4 right-4">
									<CheckCircle className="w-6 h-6 text-teal-600" />
								</div>
							)}
							<div className="text-center">
								<div className="text-3xl font-bold text-slate-900 mb-2">USD</div>
								<div className="text-sm text-slate-600">Dólares Americanos</div>
								<div className="mt-4 text-xs text-slate-500">
									Los montos se mostrarán principalmente en USD, con conversión a Bs
								</div>
							</div>
						</button>

						{/* Opción Bs */}
						<button
							onClick={() => savePreference('BS')}
							disabled={saving || preference === 'BS'}
							className={`relative p-6 rounded-xl border-2 transition-all ${
								preference === 'BS'
									? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md'
									: 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm'
							} disabled:opacity-50 disabled:cursor-not-allowed`}
						>
							{preference === 'BS' && (
								<div className="absolute top-4 right-4">
									<CheckCircle className="w-6 h-6 text-teal-600" />
								</div>
							)}
							<div className="text-center">
								<div className="text-3xl font-bold text-slate-900 mb-2">Bs</div>
								<div className="text-sm text-slate-600">Bolívares</div>
								<div className="mt-4 text-xs text-slate-500">
									Los montos se mostrarán principalmente en Bs, con conversión a USD
								</div>
							</div>
						</button>
					</div>

					{message && (
						<div
							className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
								message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
							}`}
						>
							{message.type === 'success' ? (
								<CheckCircle className="w-5 h-5" />
							) : (
								<AlertCircle className="w-5 h-5" />
							)}
							<span className="text-sm font-medium">{message.text}</span>
						</div>
					)}
				</motion.div>

				{/* Información adicional */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="bg-blue-50/80 backdrop-blur-md rounded-2xl border border-blue-200/50 p-6 sm:p-8"
				>
					<h3 className="text-lg font-semibold text-slate-900 mb-3">Información</h3>
					<ul className="space-y-2 text-sm text-slate-700">
						<li className="flex items-start gap-2">
							<span className="text-blue-600 mt-1">•</span>
							<span>La tasa de cambio se actualiza automáticamente todos los días a las 6:00 PM desde el Banco Central de Venezuela.</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-blue-600 mt-1">•</span>
							<span>Puedes cambiar la moneda principal en cualquier momento y se aplicará en todo el sistema.</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-blue-600 mt-1">•</span>
							<span>Los montos siempre mostrarán ambas monedas para tu referencia.</span>
						</li>
					</ul>
				</motion.div>
			</div>
		</div>
	);
}

