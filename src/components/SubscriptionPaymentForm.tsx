'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, CheckCircle2, AlertCircle, CreditCard, Smartphone, Loader2 } from 'lucide-react';
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
			<div className="max-w-2xl mx-auto p-6 sm:p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
				<div className="text-center">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
						<CheckCircle2 className="w-8 h-8 text-green-600" />
					</div>
					<h2 className="text-2xl font-bold text-slate-900 mb-2">¡Pago Registrado Exitosamente!</h2>
					<p className="text-slate-600 mb-6">
						Tu pago ha sido registrado y será verificado por nuestro equipo. Te notificaremos cuando sea aprobado.
					</p>
					<p className="text-sm text-slate-500">Redirigiendo al login...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto p-6 sm:p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
			<div className="mb-6">
				<h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Completa tu Pago de Suscripción</h2>
				<p className="text-slate-600">Monto a pagar: <span className="font-bold text-emerald-600">€{amountEuros.toFixed(2)}</span></p>
				{exchangeRate && amountBs && (
					<p className="text-sm text-slate-500 mt-1">
						Equivalente en Bolívares: <span className="font-semibold">Bs. {amountBs.toFixed(2)}</span> (Tasa: {exchangeRate.toFixed(2)})
					</p>
				)}
			</div>

			{error && (
				<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
					<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
					<p className="text-sm text-red-700">{error}</p>
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Información del Consultorio */}
				<div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
					<h3 className="font-semibold text-slate-900 mb-4">Información del Consultorio</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Nombre del Consultorio <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.organizationName}
								onChange={(e) => handleInputChange('organizationName', e.target.value)}
								required
								className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
								placeholder="Ej: Consultorio Médico XYZ"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Teléfono del Consultorio/Doctor <span className="text-red-500">*</span>
							</label>
							<input
								type="tel"
								value={formData.organizationPhone}
								onChange={(e) => handleInputChange('organizationPhone', e.target.value)}
								required
								className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
								placeholder="Ej: 04121234567"
							/>
						</div>
					</div>
				</div>

				{/* Métodos de Pago */}
				<div>
					<h3 className="font-semibold text-slate-900 mb-4">Selecciona tu Método de Pago</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Binance */}
						<button
							type="button"
							onClick={() => handlePaymentMethodChange('BINANCE')}
							className={`p-6 rounded-xl border-2 transition-all ${
								formData.paymentMethod === 'BINANCE'
									? 'border-teal-500 bg-teal-50'
									: 'border-slate-200 hover:border-teal-300 bg-white'
							}`}
						>
							<div className="flex items-center gap-3 mb-3">
								<CreditCard className={`w-6 h-6 ${formData.paymentMethod === 'BINANCE' ? 'text-teal-600' : 'text-slate-400'}`} />
								<h4 className="font-semibold text-slate-900">Binance (USDT)</h4>
							</div>
							<p className="text-sm text-slate-600 mb-3">
								Paga con USDT. El monto es equivalente: <span className="font-bold">€{amountEuros.toFixed(2)} = {amountEuros.toFixed(2)} USDT</span>
							</p>
							<div className="text-xs text-slate-500 space-y-1">
								<p><strong>ID de Binance:</strong> 791 706 063</p>
								<p>Envía el monto exacto en USDT a este ID</p>
							</div>
						</button>

						{/* Pago Móvil */}
						<button
							type="button"
							onClick={() => handlePaymentMethodChange('PAGO_MOVIL')}
							className={`p-6 rounded-xl border-2 transition-all ${
								formData.paymentMethod === 'PAGO_MOVIL'
									? 'border-teal-500 bg-teal-50'
									: 'border-slate-200 hover:border-teal-300 bg-white'
							}`}
						>
							<div className="flex items-center gap-3 mb-3">
								<Smartphone className={`w-6 h-6 ${formData.paymentMethod === 'PAGO_MOVIL' ? 'text-teal-600' : 'text-slate-400'}`} />
								<h4 className="font-semibold text-slate-900">Pago Móvil</h4>
							</div>
							<p className="text-sm text-slate-600 mb-3">
								Paga en Bolívares usando Pago Móvil
							</p>
							<div className="text-xs text-slate-500 space-y-1">
								<p><strong>Cédula:</strong> 29.897.548</p>
								<p><strong>Teléfono:</strong> 04126111969</p>
								<p><strong>Banco:</strong> Banco Venezuela o Banco Bancamiga</p>
								{amountBs && <p className="font-semibold text-teal-600 mt-2">Monto: Bs. {amountBs.toFixed(2)}</p>}
							</div>
						</button>
					</div>
				</div>

				{/* Formulario Binance */}
				{formData.paymentMethod === 'BINANCE' && (
					<div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
						<h4 className="font-semibold text-slate-900 mb-4">Datos de la Transacción Binance</h4>
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Hash de la Transacción (Transaction Hash) <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.binanceTransactionHash}
								onChange={(e) => handleInputChange('binanceTransactionHash', e.target.value)}
								required
								className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
								placeholder="Ej: 0x1234567890abcdef..."
							/>
							<p className="text-xs text-slate-500 mt-1">Copia el hash completo de la transacción desde tu wallet de Binance</p>
						</div>
					</div>
				)}

				{/* Formulario Pago Móvil */}
				{formData.paymentMethod === 'PAGO_MOVIL' && (
					<div className="p-4 bg-teal-50 rounded-lg border border-teal-200 space-y-4">
						<h4 className="font-semibold text-slate-900">Datos del Pago Móvil</h4>
						
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Número de Referencia <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.paymentReferenceNumber}
								onChange={(e) => handleInputChange('paymentReferenceNumber', e.target.value)}
								required
								className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
								placeholder="Ej: 021321312"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">
								Captura de Pantalla del Pago <span className="text-red-500">*</span>
							</label>
							<div className="mt-1">
								<label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
									{formData.paymentScreenshot ? (
										<div className="p-4 text-center">
											<CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
											<p className="text-sm text-slate-700">{formData.paymentScreenshot.name}</p>
											<p className="text-xs text-slate-500 mt-1">Click para cambiar</p>
										</div>
									) : (
										<div className="p-4 text-center">
											<Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
											<p className="text-sm text-slate-700">Click para subir captura</p>
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
					</div>
				)}

				{/* Botones */}
				<div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
					<button
						type="button"
						onClick={() => router.push('/dashboard')}
						className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
					>
						Pagar más tarde
					</button>
					<button
						type="submit"
						disabled={loading || !formData.paymentMethod || loadingRate}
						className="px-6 py-2.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
					>
						{loading ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Registrando pago...
							</>
						) : (
							'Registrar Pago'
						)}
					</button>
				</div>
			</form>
		</div>
	);
}

