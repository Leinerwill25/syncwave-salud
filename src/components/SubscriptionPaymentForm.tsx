'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, CheckCircle2, AlertCircle, CreditCard, Smartphone, Loader2, Shield, Lock, Euro, TrendingUp, Building2, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

type PaymentMethod = 'BINANCE' | 'PAGO_MOVIL' | null;

interface PaymentFormData {
	paymentMethod: PaymentMethod;
	// Binance
	binanceTransactionHash: string;
	// Pago Móvil
	paymentReferenceNumber: string;
	paymentScreenshot: File | null;
	organizationName: string;
	organizationPhone: string;
}

interface Props {
	organizationId: string;
	userId: string;
	amountEuros: number;
	onPaymentSubmitted?: () => void;
}

export default function SubscriptionPaymentForm({ organizationId, userId, amountEuros, onPaymentSubmitted }: Props) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [exchangeRate, setExchangeRate] = useState<number | null>(null);
	const [loadingRate, setLoadingRate] = useState(true);

	const [formData, setFormData] = useState<PaymentFormData>({
		paymentMethod: null,
		binanceTransactionHash: '',
		paymentReferenceNumber: '',
		paymentScreenshot: null,
		organizationName: '',
		organizationPhone: '',
	});

	// Obtener tasa de cambio Euro a Bolívares
	useEffect(() => {
		async function fetchExchangeRate() {
			try {
				const res = await fetch('/api/currency-rate?currency=EUR');
				if (res.ok) {
					const data = await res.json();
					setExchangeRate(data.rate || null);
				}
			} catch (err) {
				console.error('Error obteniendo tasa de cambio:', err);
			} finally {
				setLoadingRate(false);
			}
		}
		fetchExchangeRate();
	}, []);

	const amountBs = exchangeRate ? amountEuros * exchangeRate : null;

	const handlePaymentMethodChange = (method: PaymentMethod) => {
		setFormData(prev => ({ ...prev, paymentMethod: method }));
		setError(null);
	};

	const handleInputChange = (field: keyof PaymentFormData, value: string | File | null) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		setError(null);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			if (file.size > 5 * 1024 * 1024) {
				setError('La imagen no debe superar los 5MB');
				return;
			}
			if (!file.type.startsWith('image/')) {
				setError('El archivo debe ser una imagen');
				return;
			}
			handleInputChange('paymentScreenshot', file);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			if (!formData.paymentMethod) {
				throw new Error('Debes seleccionar un método de pago');
			}

			if (!formData.organizationName.trim()) {
				throw new Error('El nombre del consultorio es obligatorio');
			}

			if (!formData.organizationPhone.trim()) {
				throw new Error('El teléfono del consultorio es obligatorio');
			}

			if (formData.paymentMethod === 'BINANCE') {
				if (!formData.binanceTransactionHash.trim()) {
					throw new Error('El hash de la transacción de Binance es obligatorio');
				}
			}

			if (formData.paymentMethod === 'PAGO_MOVIL') {
				if (!formData.paymentReferenceNumber.trim()) {
					throw new Error('El número de referencia del pago móvil es obligatorio');
				}
				if (!formData.paymentScreenshot) {
					throw new Error('Debes subir una captura de pantalla del pago móvil');
				}
			}

			// Subir captura de pantalla si existe
			let screenshotUrl: string | null = null;
			if (formData.paymentScreenshot) {
				const formDataUpload = new FormData();
				formDataUpload.append('file', formData.paymentScreenshot);
				formDataUpload.append('folder', 'subscription-payments');

				const uploadRes = await fetch('/api/upload', {
					method: 'POST',
					body: formDataUpload,
				});

				if (!uploadRes.ok) {
					throw new Error('Error al subir la captura de pantalla');
				}

				const uploadData = await uploadRes.json();
				screenshotUrl = uploadData.url || null;
			}

			// Enviar datos del pago
			const paymentPayload: any = {
				organizationId,
				userId,
				paymentMethod: formData.paymentMethod,
				amountEuros,
				amountBs: formData.paymentMethod === 'PAGO_MOVIL' ? amountBs : null,
				exchangeRate: formData.paymentMethod === 'PAGO_MOVIL' ? exchangeRate : null,
				organizationName: formData.organizationName.trim(),
				organizationPhone: formData.organizationPhone.trim(),
			};

			if (formData.paymentMethod === 'BINANCE') {
				paymentPayload.binanceId = '791706063';
				paymentPayload.binanceTransactionHash = formData.binanceTransactionHash.trim();
			}

			if (formData.paymentMethod === 'PAGO_MOVIL') {
				paymentPayload.paymentMobileCi = '29897548';
				paymentPayload.paymentMobilePhone = '04126111969';
				paymentPayload.paymentMobileBank = 'Banco Venezuela'; // Por defecto, puede cambiarse
				paymentPayload.paymentReferenceNumber = formData.paymentReferenceNumber.trim();
				paymentPayload.paymentScreenshotUrl = screenshotUrl;
			}

			const res = await fetch('/api/subscription-payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(paymentPayload),
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Error al registrar el pago');
			}

			// Limpiar localStorage solo después de que el pago se haya registrado exitosamente
			localStorage.removeItem('pendingPayment_organizationId');
			localStorage.removeItem('pendingPayment_userId');
			localStorage.removeItem('pendingPayment_amount');
			localStorage.removeItem('pendingPayment_role');

			setSuccess(true);
			if (onPaymentSubmitted) {
				onPaymentSubmitted();
			}

			// Redirigir al login después de 2 segundos
			setTimeout(() => {
				router.push('/login');
			}, 2000);
		} catch (err: any) {
			setError(err.message || 'Error al procesar el pago');
		} finally {
			setLoading(false);
		}
	};

	if (success) {
		return (
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.3 }}
				className="max-w-2xl mx-auto"
			>
				<div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-3xl shadow-2xl border border-emerald-100/50 p-8 sm:p-12">
					{/* Decoración de fondo */}
					<div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
					<div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-200/20 to-teal-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
					
					<div className="relative text-center">
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ type: "spring", stiffness: 200, damping: 15 }}
							className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mb-6 shadow-lg shadow-emerald-500/30"
						>
							<CheckCircle2 className="w-10 h-10 text-white" />
						</motion.div>
						<motion.h2
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="text-3xl font-bold text-slate-900 mb-3"
						>
							¡Pago Registrado Exitosamente!
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="text-slate-600 mb-8 text-lg"
						>
							Tu pago ha sido registrado y será verificado por nuestro equipo. Te notificaremos cuando sea aprobado.
						</motion.p>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.3 }}
							className="flex items-center justify-center gap-2 text-sm text-slate-500"
						>
							<Loader2 className="w-4 h-4 animate-spin" />
							<span>Redirigiendo al login...</span>
						</motion.div>
					</div>
				</div>
			</motion.div>
		);
	}

	return (
		<div className="max-w-5xl mx-auto">
			{/* Header con gradiente */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-t-3xl p-8 sm:p-10 text-white"
			>
				{/* Patrón de fondo */}
				<div className="absolute inset-0 opacity-10">
					<div className="absolute inset-0" style={{
						backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
						backgroundSize: '40px 40px'
					}} />
				</div>
				
				<div className="relative z-10">
					<div className="flex items-center gap-3 mb-4">
						<div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
							<Lock className="w-6 h-6 text-emerald-400" />
						</div>
						<h2 className="text-3xl sm:text-4xl font-bold">Completa tu Pago de Suscripción</h2>
					</div>
					<p className="text-slate-300 text-lg mb-6">Proceso seguro y rápido para activar tu cuenta</p>
					
					{/* Resumen de pago destacado */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
						<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
							<div className="flex items-center gap-2 mb-2">
								<Euro className="w-5 h-5 text-emerald-400" />
								<span className="text-sm text-slate-300">Monto a Pagar</span>
							</div>
							<p className="text-2xl font-bold text-white">€{amountEuros.toFixed(2)}</p>
						</div>
						{exchangeRate && amountBs && (
							<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
								<div className="flex items-center gap-2 mb-2">
									<TrendingUp className="w-5 h-5 text-cyan-400" />
									<span className="text-sm text-slate-300">Equivalente en Bs.</span>
								</div>
								<p className="text-2xl font-bold text-white">Bs. {amountBs.toFixed(2)}</p>
								<p className="text-xs text-slate-400 mt-1">Tasa: {exchangeRate.toFixed(2)}</p>
							</div>
						)}
						<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
							<div className="flex items-center gap-2 mb-2">
								<Shield className="w-5 h-5 text-blue-400" />
								<span className="text-sm text-slate-300">Pago Seguro</span>
							</div>
							<p className="text-sm font-semibold text-white">Encriptado SSL</p>
						</div>
					</div>
				</div>
			</motion.div>

			{/* Contenido principal */}
			<div className="bg-white rounded-b-3xl shadow-2xl border-x border-b border-slate-200 p-6 sm:p-10">

				<AnimatePresence>
					{error && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-xl flex items-start gap-3 shadow-sm"
						>
							<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
							<p className="text-sm text-red-700 font-medium">{error}</p>
						</motion.div>
					)}
				</AnimatePresence>

				<form onSubmit={handleSubmit} className="space-y-8">
					{/* Información del Consultorio */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/50 p-6 sm:p-8 shadow-sm"
					>
						<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-100/30 to-cyan-100/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
						<div className="relative z-10">
							<div className="flex items-center gap-3 mb-6">
								<div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
									<Building2 className="w-5 h-5 text-white" />
								</div>
								<h3 className="text-xl font-bold text-slate-900">Información del Consultorio</h3>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
								<div>
									<label className="block text-sm font-semibold text-slate-700 mb-2">
										Nombre del Consultorio <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={formData.organizationName}
										onChange={(e) => handleInputChange('organizationName', e.target.value)}
										required
										className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white shadow-sm hover:shadow-md"
										placeholder="Ej: Consultorio Médico XYZ"
									/>
								</div>
								<div>
									<label className="block text-sm font-semibold text-slate-700 mb-2">
										<div className="flex items-center gap-2">
											<Phone className="w-4 h-4" />
											<span>Teléfono del Consultorio/Doctor <span className="text-red-500">*</span></span>
										</div>
									</label>
									<input
										type="tel"
										value={formData.organizationPhone}
										onChange={(e) => handleInputChange('organizationPhone', e.target.value)}
										required
										className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white shadow-sm hover:shadow-md"
										placeholder="Ej: 04121234567"
									/>
								</div>
							</div>
						</div>
					</motion.div>

					{/* Métodos de Pago */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
					>
						<div className="flex items-center gap-3 mb-6">
							<div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
								<CreditCard className="w-5 h-5 text-white" />
							</div>
							<h3 className="text-xl font-bold text-slate-900">Selecciona tu Método de Pago</h3>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							{/* Binance */}
							<motion.button
								type="button"
								onClick={() => handlePaymentMethodChange('BINANCE')}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className={`relative overflow-hidden p-6 sm:p-8 rounded-2xl border-2 transition-all duration-300 ${
									formData.paymentMethod === 'BINANCE'
										? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-lg shadow-teal-500/20'
										: 'border-slate-200 hover:border-teal-300 bg-white hover:shadow-lg'
								}`}
							>
								{formData.paymentMethod === 'BINANCE' && (
									<motion.div
										layoutId="paymentMethodBg"
										className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5"
										transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
									/>
								)}
								<div className="relative z-10">
									<div className="flex items-center gap-3 mb-4">
										<div className={`p-3 rounded-xl transition-all ${
											formData.paymentMethod === 'BINANCE'
												? 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg'
												: 'bg-slate-100'
										}`}>
											<CreditCard className={`w-6 h-6 ${formData.paymentMethod === 'BINANCE' ? 'text-white' : 'text-slate-400'}`} />
										</div>
										<h4 className="text-lg font-bold text-slate-900">Binance (USDT)</h4>
										{formData.paymentMethod === 'BINANCE' && (
											<motion.div
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												className="ml-auto"
											>
												<CheckCircle2 className="w-6 h-6 text-teal-600" />
											</motion.div>
										)}
									</div>
									<p className="text-sm text-slate-600 mb-4 leading-relaxed">
										Paga con USDT de forma instantánea y segura. El monto es equivalente:
									</p>
									<div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-4 border border-slate-200">
										<p className="text-lg font-bold text-slate-900 text-center">
											€{amountEuros.toFixed(2)} = {amountEuros.toFixed(2)} USDT
										</p>
									</div>
									<div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200">
										<div className="flex items-center justify-between">
											<span className="text-xs font-medium text-slate-500">ID de Binance:</span>
											<span className="text-sm font-bold text-slate-900 font-mono">791 706 063</span>
										</div>
										<p className="text-xs text-slate-500">Envía el monto exacto en USDT a este ID</p>
									</div>
								</div>
							</motion.button>

							{/* Pago Móvil */}
							<motion.button
								type="button"
								onClick={() => handlePaymentMethodChange('PAGO_MOVIL')}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className={`relative overflow-hidden p-6 sm:p-8 rounded-2xl border-2 transition-all duration-300 ${
									formData.paymentMethod === 'PAGO_MOVIL'
										? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-lg shadow-teal-500/20'
										: 'border-slate-200 hover:border-teal-300 bg-white hover:shadow-lg'
								}`}
							>
								{formData.paymentMethod === 'PAGO_MOVIL' && (
									<motion.div
										layoutId="paymentMethodBg"
										className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5"
										transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
									/>
								)}
								<div className="relative z-10">
									<div className="flex items-center gap-3 mb-4">
										<div className={`p-3 rounded-xl transition-all ${
											formData.paymentMethod === 'PAGO_MOVIL'
												? 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg'
												: 'bg-slate-100'
										}`}>
											<Smartphone className={`w-6 h-6 ${formData.paymentMethod === 'PAGO_MOVIL' ? 'text-white' : 'text-slate-400'}`} />
										</div>
										<h4 className="text-lg font-bold text-slate-900">Pago Móvil</h4>
										{formData.paymentMethod === 'PAGO_MOVIL' && (
											<motion.div
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												className="ml-auto"
											>
												<CheckCircle2 className="w-6 h-6 text-teal-600" />
											</motion.div>
										)}
									</div>
									<p className="text-sm text-slate-600 mb-4 leading-relaxed">
										Paga en Bolívares usando Pago Móvil desde tu banco
									</p>
									{amountBs && (
										<div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 mb-4 text-white shadow-lg">
											<p className="text-xs font-medium mb-1 opacity-90">Monto a Pagar</p>
											<p className="text-2xl font-bold">Bs. {amountBs.toFixed(2)}</p>
										</div>
									)}
									<div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200">
										<div className="flex items-center justify-between">
											<span className="text-xs font-medium text-slate-500">Cédula:</span>
											<span className="text-sm font-bold text-slate-900 font-mono">29.897.548</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-xs font-medium text-slate-500">Teléfono:</span>
											<span className="text-sm font-bold text-slate-900 font-mono">04126111969</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-xs font-medium text-slate-500">Banco:</span>
											<span className="text-sm font-semibold text-slate-900">Banco Venezuela / Bancamiga</span>
										</div>
									</div>
								</div>
							</motion.button>
						</div>
					</motion.div>

					{/* Formulario Binance */}
					<AnimatePresence>
						{formData.paymentMethod === 'BINANCE' && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.3 }}
								className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 rounded-2xl border border-teal-200/50 p-6 sm:p-8 shadow-lg"
							>
								<div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-200/20 to-cyan-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
								<div className="relative z-10">
									<div className="flex items-center gap-3 mb-6">
										<div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
											<CreditCard className="w-5 h-5 text-white" />
										</div>
										<h4 className="text-lg font-bold text-slate-900">Datos de la Transacción Binance</h4>
									</div>
									<div>
										<label className="block text-sm font-semibold text-slate-700 mb-2">
											Hash de la Transacción (Transaction Hash) <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={formData.binanceTransactionHash}
											onChange={(e) => handleInputChange('binanceTransactionHash', e.target.value)}
											required
											className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white shadow-sm hover:shadow-md font-mono text-sm"
											placeholder="Ej: 0x1234567890abcdef..."
										/>
										<p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
											<Shield className="w-3 h-3" />
											Copia el hash completo de la transacción desde tu wallet de Binance
										</p>
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Formulario Pago Móvil */}
					<AnimatePresence>
						{formData.paymentMethod === 'PAGO_MOVIL' && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.3 }}
								className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 rounded-2xl border border-teal-200/50 p-6 sm:p-8 shadow-lg space-y-6"
							>
								<div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-200/20 to-cyan-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
								<div className="relative z-10">
									<div className="flex items-center gap-3 mb-6">
										<div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
											<Smartphone className="w-5 h-5 text-white" />
										</div>
										<h4 className="text-lg font-bold text-slate-900">Datos del Pago Móvil</h4>
									</div>
									
									<div>
										<label className="block text-sm font-semibold text-slate-700 mb-2">
											Número de Referencia <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={formData.paymentReferenceNumber}
											onChange={(e) => handleInputChange('paymentReferenceNumber', e.target.value)}
											required
											className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white shadow-sm hover:shadow-md font-mono"
											placeholder="Ej: 021321312"
										/>
										<p className="text-xs text-slate-500 mt-2">Ingresa el número de referencia que recibiste después del pago</p>
									</div>

									<div>
										<label className="block text-sm font-semibold text-slate-700 mb-2">
											Captura de Pantalla del Pago <span className="text-red-500">*</span>
										</label>
										<label className="group flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-all duration-300 bg-white/50 backdrop-blur-sm">
											{formData.paymentScreenshot ? (
												<motion.div
													initial={{ scale: 0.9 }}
													animate={{ scale: 1 }}
													className="p-6 text-center"
												>
													<CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
													<p className="text-sm font-semibold text-slate-700">{formData.paymentScreenshot.name}</p>
													<p className="text-xs text-slate-500 mt-2">Click para cambiar archivo</p>
												</motion.div>
											) : (
												<div className="p-6 text-center">
													<div className="p-4 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl inline-block mb-3 group-hover:scale-110 transition-transform">
														<Upload className="w-8 h-8 text-teal-600" />
													</div>
													<p className="text-sm font-semibold text-slate-700 mb-1">Click para subir captura</p>
													<p className="text-xs text-slate-500">PNG, JPG hasta 5MB</p>
												</div>
											)}
											<input
												type="file"
												accept="image/*"
												onChange={handleFileChange}
												className="hidden"
											/>
										</label>
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Botones */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t-2 border-slate-200"
					>
						<button
							type="button"
							onClick={() => router.push('/dashboard')}
							className="w-full sm:w-auto px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all duration-200"
						>
							Pagar más tarde
						</button>
						<button
							type="submit"
							disabled={loading || !formData.paymentMethod || loadingRate}
							className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40"
						>
							{loading ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									<span>Registrando pago...</span>
								</>
							) : (
								<>
									<Lock className="w-4 h-4" />
									<span>Registrar Pago</span>
								</>
							)}
						</button>
					</motion.div>
				</form>
			</div>
		</div>
	);
}

