'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { FiLock, FiEye, FiEyeOff, FiCheckCircle, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';
import BallpitClientWrapper from '@/components/Ballpit';

export default function ResetPasswordPage() {
	const router = useRouter();
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const supabase = React.useMemo(() => {
		const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
		if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
		return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
	}, []);

	const handleReset = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password !== confirmPassword) {
			setErrorMsg('Las contraseñas no coinciden.');
			return;
		}
		if (password.length < 8) {
			setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
			return;
		}

		setLoading(true);
		setErrorMsg(null);

		try {
			if (!supabase) throw new Error('Supabase no configurado');

			const { error } = await supabase.auth.updateUser({
				password: password
			});

			if (error) throw error;

			setSuccess(true);
			setTimeout(() => {
				router.push('/login');
			}, 3000);
		} catch (err: any) {
			setErrorMsg(err.message || 'Error al restablecer la contraseña.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="flex min-h-screen items-center justify-center bg-white p-3 sm:p-6 w-full relative overflow-hidden">
			{/* Fondo Animado (Opcional, igual al login) */}
			<div className="hidden md:block fixed inset-0 z-0">
				<BallpitClientWrapper />
			</div>

			<div className="relative z-10 w-full max-w-md">
				<div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
					<div className="text-center mb-8">
						<div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-600 mb-4 shadow-lg">
							<FiLock className="h-8 w-8 text-white" />
						</div>
						<h1 className="text-2xl font-bold text-gray-800">Nueva Contraseña</h1>
						<p className="text-gray-500 mt-2 text-sm">Ingresa tu nueva clave de acceso segura</p>
					</div>

					{success ? (
						<div className="text-center py-4 bg-green-50 rounded-2xl border border-green-100">
							<FiCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
							<h3 className="text-green-800 font-semibold">¡Contraseña restablecida!</h3>
							<p className="text-green-600 text-sm mt-1">Serás redirigido al login en segundos...</p>
						</div>
					) : (
						<form onSubmit={handleReset} className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Nueva Contraseña</label>
								<div className="relative">
									<input 
										type={showPassword ? 'text' : 'password'}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-12"
										placeholder="Mínimo 8 caracteres"
									/>
									<button 
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
									>
										{showPassword ? <FiEyeOff /> : <FiEye />}
									</button>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Contraseña</label>
								<input 
									type={showPassword ? 'text' : 'password'}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
									className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
									placeholder="Repite la contraseña"
								/>
							</div>

							{errorMsg && (
								<div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
									{errorMsg}
								</div>
							)}

							<button
								type="submit"
								disabled={loading}
								className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
							>
								{loading ? <FiRefreshCw className="animate-spin" /> : 'Actualizar Contraseña'}
							</button>

							<button 
								type="button"
								onClick={() => router.push('/login')}
								className="w-full text-center text-sm text-gray-500 hover:text-blue-600 flex items-center justify-center gap-1 transition-colors"
							>
								<FiArrowLeft className="text-xs" /> Volver al inicio
							</button>
						</form>
					)}
				</div>
			</div>
		</main>
	);
}
