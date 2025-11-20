// app/dashboard/medic/pacientes/[id]/AccessCodeModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AccessCodeModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId: string;
	onSuccess: () => void;
}

export default function AccessCodeModal({ isOpen, onClose, patientId, onSuccess }: AccessCodeModalProps) {
	const [code, setCode] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [timeLeft, setTimeLeft] = useState(300); // 5 minutos en segundos
	const [isValidated, setIsValidated] = useState(false);

	useEffect(() => {
		if (isOpen && !isValidated) {
			setTimeLeft(300);
			setCode('');
			setError(null);
		}
	}, [isOpen, isValidated]);

	useEffect(() => {
		if (isOpen && timeLeft > 0 && !isValidated) {
			const timer = setInterval(() => {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						clearInterval(timer);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
	}, [isOpen, timeLeft, isValidated]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!code || code.length !== 6) {
			setError('El código debe tener 6 dígitos');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const res = await fetch('/api/medical-access/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					patientId,
					code,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Código inválido');
			}

			const data = await res.json();
			if (data.success && data.valid && data.token) {
				// Guardar token en localStorage o sessionStorage
				sessionStorage.setItem(`patient_access_token_${patientId}`, data.token);
				// El grant ya se creó automáticamente en el backend
				setIsValidated(true);
				setTimeout(() => {
					onSuccess();
					onClose();
				}, 1500);
			} else {
				throw new Error('Código inválido');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al validar código');
		} finally {
			setLoading(false);
		}
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
				onClick={onClose}
			>
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0.9, opacity: 0 }}
					onClick={(e) => e.stopPropagation()}
					className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative"
				>
					<button
						onClick={onClose}
						className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
					>
						<X className="w-5 h-5" />
					</button>

					{isValidated ? (
						<div className="text-center py-8">
							<CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
							<h2 className="text-2xl font-bold text-slate-900 mb-2">Código Válido</h2>
							<p className="text-slate-600">Acceso autorizado. Redirigiendo...</p>
						</div>
					) : (
						<>
							<div className="flex items-center gap-3 mb-6">
								<Lock className="w-8 h-8 text-teal-600" />
								<div>
									<h2 className="text-2xl font-bold text-slate-900">Código de Acceso</h2>
									<p className="text-sm text-slate-600">Ingresa el código TOTP del paciente</p>
								</div>
							</div>

							{timeLeft === 0 && (
								<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
									<AlertCircle className="w-5 h-5 text-red-600" />
									<p className="text-sm text-red-700">El tiempo ha expirado. Por favor, solicita un nuevo código.</p>
								</div>
							)}

							{timeLeft > 0 && (
								<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Clock className="w-5 h-5 text-blue-600" />
										<span className="text-sm text-blue-700">Tiempo restante:</span>
									</div>
									<span className="text-lg font-bold text-blue-900">{formatTime(timeLeft)}</span>
								</div>
							)}

							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-2">
										Código de 6 dígitos
									</label>
									<input
										type="text"
										maxLength={6}
										value={code}
										onChange={(e) => {
											const value = e.target.value.replace(/\D/g, '');
											setCode(value);
											setError(null);
										}}
										placeholder="000000"
										disabled={timeLeft === 0 || loading}
										className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 disabled:bg-slate-100"
									/>
								</div>

								{error && (
									<div className="p-3 bg-red-50 border border-red-200 rounded-xl">
										<p className="text-sm text-red-700">{error}</p>
									</div>
								)}

								<div className="flex gap-3 pt-4">
									<Button
										type="submit"
										disabled={code.length !== 6 || timeLeft === 0 || loading}
										className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
									>
										{loading ? 'Validando...' : 'Validar Código'}
									</Button>
									<Button type="button" onClick={onClose} variant="outline" className="border-blue-200 text-slate-700">
										Cancelar
									</Button>
								</div>
							</form>
						</>
					)}
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}

