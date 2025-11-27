'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function RoleUserLoginPage() {
	const router = useRouter();
	const [identifier, setIdentifier] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [useEmail, setUseEmail] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);
		setLoading(true);

		if (!password) {
			setError('La contraseña es requerida');
			setLoading(false);
			return;
		}

		if (useEmail && !email.trim()) {
			setError('El email es requerido');
			setLoading(false);
			return;
		}

		if (!useEmail && !identifier.trim()) {
			setError('La cédula de identidad es requerida');
			setLoading(false);
			return;
		}

		try {
			const res = await fetch('/api/role-users/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					identifier: useEmail ? null : identifier.trim(),
					email: useEmail ? email.trim() : null,
					password,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al iniciar sesión');
			}

			setSuccess('Inicio de sesión exitoso. Redirigiendo...');
			setTimeout(() => {
				router.push('/dashboard/role-user');
			}, 1000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
			>
				{/* Header */}
				<div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 px-6 py-8 text-center">
					<div className="flex justify-center mb-4">
						<div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
							<Shield className="w-8 h-8 text-white" />
						</div>
					</div>
					<h1 className="text-2xl font-bold text-white mb-2">Acceso de Personal</h1>
					<p className="text-teal-50 text-sm">Inicia sesión con tus credenciales de rol</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-6 space-y-5">
					{/* Toggle entre Cédula y Email */}
					<div className="flex items-center justify-center gap-4 p-3 bg-slate-50 rounded-lg">
						<button
							type="button"
							onClick={() => {
								setUseEmail(false);
								setEmail('');
								setError(null);
							}}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
								!useEmail
									? 'bg-teal-600 text-white shadow-md'
									: 'bg-white text-slate-600 hover:bg-slate-100'
							}`}
						>
							Cédula
						</button>
						<button
							type="button"
							onClick={() => {
								setUseEmail(true);
								setIdentifier('');
								setError(null);
							}}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
								useEmail
									? 'bg-teal-600 text-white shadow-md'
									: 'bg-white text-slate-600 hover:bg-slate-100'
							}`}
						>
							Email
						</button>
					</div>

					{/* Campo de identificación */}
					{!useEmail ? (
						<div>
							<label className="block text-sm font-semibold text-slate-700 mb-2">Cédula de Identidad *</label>
							<input
								type="text"
								value={identifier}
								onChange={(e) => setIdentifier(e.target.value)}
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
								placeholder="Ej: 12345678"
								required
							/>
						</div>
					) : (
						<div>
							<label className="block text-sm font-semibold text-slate-700 mb-2">Email *</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
								placeholder="tu@email.com"
								required
							/>
						</div>
					)}

					{/* Contraseña */}
					<div>
						<label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña *</label>
						<div className="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition pr-12"
								placeholder="Ingresa tu contraseña"
								required
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
							>
								{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
							</button>
						</div>
					</div>

					{/* Mensajes */}
					<AnimatePresence>
						{error && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3"
							>
								<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
								<p className="text-sm text-red-800 flex-1">{error}</p>
								<button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
									×
								</button>
							</motion.div>
						)}
						{success && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start gap-3"
							>
								<CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
								<p className="text-sm text-green-800 flex-1">{success}</p>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Botón de envío */}
					<button
						type="submit"
						disabled={loading}
						className="w-full py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-teal-700 hover:to-cyan-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{loading ? (
							<>
								<svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Iniciando sesión...
							</>
						) : (
							<>
								<Shield className="w-5 h-5" />
								Iniciar Sesión
							</>
						)}
					</button>

					{/* Link de ayuda */}
					<div className="text-center pt-4 border-t border-slate-200">
						<p className="text-sm text-slate-600">
							¿Eres médico?{' '}
							<Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
								Inicia sesión aquí
							</Link>
						</p>
					</div>
				</form>
			</motion.div>
		</div>
	);
}

