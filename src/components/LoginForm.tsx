// components/LoginFormAdvanced.tsx
'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { FiMail, FiEye, FiEyeOff, FiShield, FiBriefcase, FiCheckCircle, FiLogIn, FiRefreshCw } from 'react-icons/fi';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type Role = 'ADMIN' | 'MEDICO' | 'FARMACIA' | 'PACIENTE' | string;

export default function LoginFormAdvanced(): React.ReactElement {
	const router = useRouter();

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [detectedRole, setDetectedRole] = useState<Role | null>(null);

	function routeForRole(role?: Role) {
		switch ((role || '').toString().toUpperCase()) {
			case 'ADMIN':
			case 'CLINICA':
				return '/dashboard/clinic';
			case 'MEDICO':
				return '/dashboard/medic';
			case 'FARMACIA':
				return '/dashboard/pharmacy';
			case 'PACIENTE':
				return '/dashboard/patient';
			default:
				return '/dashboard';
		}
	}

	async function fetchRoleFromServer(authId: string): Promise<Role | null> {
		try {
			const resp = await fetch(`/api/auth/profile?authId=${encodeURIComponent(authId)}`);
			if (!resp.ok) return null;
			const json = await resp.json();
			return json?.data?.role ?? null;
		} catch (err) {
			console.warn('fetchRoleFromServer error', err);
			return null;
		}
	}

	async function postSessionToServer(session: { access_token?: string; refresh_token?: string; expires_in?: number; session?: any }) {
		if (!session?.access_token) return false;
		try {
			const resp = await fetch('/api/auth/set-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(session),
			});
			return resp.ok;
		} catch (err) {
			console.error('postSessionToServer error', err);
			return false;
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setErrorMsg(null);
		setDetectedRole(null);
		setLoading(true);

		try {
			const { data, error } = await supabase.auth.signInWithPassword({ email, password });
			if (error) {
				setErrorMsg(error.message || 'Error al iniciar sesión');
				setLoading(false);
				return;
			}

			const user = (data as any)?.user ?? null;
			const session = (data as any)?.session ?? null;

			if (!user) {
				setErrorMsg('No se obtuvo información del usuario tras el login.');
				setLoading(false);
				return;
			}
			const access_token = session?.access_token;
			const refresh_token = session?.refresh_token;
			const expires_in = session?.expires_in;

			if (access_token) {
				await postSessionToServer({ access_token, refresh_token, expires_in, session });
			}

			const metadataRole = (user.user_metadata as any)?.role as Role | undefined;
			let roleToUse: Role | null = metadataRole ?? null;

			if (!roleToUse && user.id) {
				const fromServer = await fetchRoleFromServer(user.id);
				if (fromServer) roleToUse = fromServer;
			}

			setDetectedRole(roleToUse ?? 'UNKNOWN');

			// breve pausa visual para que el usuario identifique el role
			await new Promise((r) => setTimeout(r, 400));
			router.push(routeForRole(roleToUse ?? ''));
		} catch (err: any) {
			console.error('Login error', err);
			setErrorMsg(err?.message || 'Error inesperado');
		} finally {
			setLoading(false);
		}
	}

	async function handleForgotPassword() {
		if (!email) {
			setErrorMsg('Ingresa tu email para enviar el enlace de recuperación.');
			return;
		}
		setErrorMsg(null);
		setLoading(true);
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/reset-password`,
			});
			if (error) setErrorMsg(error.message || 'Error al solicitar recuperación.');
			else setErrorMsg('Se envió un enlace de recuperación al correo (revisa spam).');
		} catch (err: any) {
			setErrorMsg(err?.message || 'Error inesperado');
		} finally {
			setLoading(false);
		}
	}

	// palette notes:
	// primary: #4A90E2 (blue)
	// secondary: #8E7CC3 (soft purple)
	// bg: #F5F7FA
	// text: #2C3E50
	// error: #E74C3C
	// success: #27AE60

	return (
		<form onSubmit={handleSubmit} className="w-full max-w-6xl mx-auto px-6 mt-12">
			<div className="relative">
				{/* Glass card */}
				<div className="relative z-10 rounded-3xl overflow-hidden bg-[rgba(255,255,255,0.72)] backdrop-blur-md border border-[rgba(44,62,80,0.06)] shadow-lg">
					<div className="grid grid-cols-1 md:grid-cols-2">
						{/* Left decorative panel */}
						<div
							className="hidden md:flex items-center justify-center p-10"
							style={{
								background: 'linear-gradient(180deg, rgba(74,144,226,0.08) 0%, rgba(142,124,195,0.06) 100%)',
							}}>
							<div className="w-full max-w-sm text-center">
								{/* Primary graphic: stylized shield + cross (health) */}
								<div
									className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-xl"
									style={{
										background: 'linear-gradient(135deg, #4A90E2 0%, #8E7CC3 100%)',
										boxShadow: '0 8px 20px rgba(72,88,120,0.12)',
									}}>
									{/* Icon from library */}
									<FiShield className="h-10 w-10 text-white" aria-hidden />
								</div>

								<h2 className="text-3xl font-semibold text-[#2C3E50] mb-2">Bienvenido de nuevo</h2>
								<p className="text-base text-[#2C3E50]/75">Accede a tu panel profesional — seguridad empresarial y diseño pensado para tu flujo.</p>

								<div className="mt-8 flex justify-center gap-3">
									<span className="inline-flex items-center gap-2 rounded-full bg-[rgba(44,62,80,0.04)] px-4 py-2 text-sm text-[#2C3E50]/80 ring-1 ring-[rgba(44,62,80,0.04)]">
										{/* Shield check icon */}
										<FiCheckCircle className="h-4 w-4 text-[#2C3E50]" aria-hidden />
										Acceso seguro
									</span>
									<span className="inline-flex items-center gap-2 rounded-full bg-[rgba(44,62,80,0.04)] px-4 py-2 text-sm text-[#2C3E50]/80 ring-1 ring-[rgba(44,62,80,0.04)]">
										{/* Corporate icon */}
										<FiBriefcase className="h-4 w-4 text-[#2C3E50]" aria-hidden />
										Corporativo
									</span>
								</div>
							</div>
						</div>
						{/* Right: form */}
						<div className="p-6 sm:p-10">
							<div className="mx-auto max-w-2xl">
								<div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-[rgba(44,62,80,0.03)]">
									<div className="mb-4">
										<h3 className="text-2xl sm:text-3xl font-bold text-[#2C3E50]">Iniciar sesión</h3>
										<p className="text-sm text-[#2C3E50]/70">Introduce tus credenciales para continuar</p>
									</div>

									<div className="space-y-5">
										{/* Email with icon */}
										<label htmlFor="email" className="block">
											<span className="text-sm text-[#2C3E50]/80">Correo electrónico</span>
											<div className="relative mt-3">
												{/* Mail icon (left) */}
												<div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
													<FiMail className="h-4 w-4 text-[#2C3E50]/70" aria-hidden />
												</div>

												<input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-0 w-full rounded-md border border-[rgba(44,62,80,0.08)] bg-[#FFFFFF] px-4 py-3 pl-11 text-[#2C3E50] placeholder-[#2C3E50]/40 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition" placeholder="tu@ejemplo.com" />
											</div>
										</label>

										{/* Password with interactive eye icon */}
										<label htmlFor="password" className="block">
											<span className="text-sm text-[#2C3E50]/80">Contraseña</span>

											<div className="relative mt-3">
												<input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-md border border-[rgba(44,62,80,0.08)] bg-[#FFFFFF] px-4 py-3 text-[#2C3E50] placeholder-[#2C3E50]/40 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition pr-12" placeholder="••••••••" />

												{/* Eye button (interactive) */}
												<button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute inset-y-0 right-3 flex items-center justify-center p-1 rounded focus:outline-none focus:ring-2 focus:ring-[#4A90E2]">
													{showPassword ? <FiEyeOff className="h-5 w-5 text-[#2C3E50]" aria-hidden /> : <FiEye className="h-5 w-5 text-[#2C3E50]" aria-hidden />}
												</button>
											</div>
										</label>

										<div className="flex items-center justify-between">
											<label className="inline-flex items-center gap-3 cursor-pointer select-none text-sm text-[#2C3E50]/80">
												<input type="checkbox" className="h-4 w-4 rounded border-[rgba(44,62,80,0.08)] bg-white text-[#4A90E2]" />
												<span>Recordarme</span>
											</label>

											<button type="button" onClick={handleForgotPassword} className="text-sm text-[#4A90E2] hover:underline transition">
												¿Olvidaste tu contraseña?
											</button>
										</div>

										{/* Submit */}
										<div>
											<button
												type="submit"
												disabled={loading}
												aria-busy={loading}
												className="relative flex w-full items-center justify-center gap-3 rounded-lg px-5 py-3 text-base font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
												style={{
													background: 'linear-gradient(90deg,#4A90E2 0%, #8E7CC3 100%)',
													boxShadow: '0 10px 30px rgba(74,144,226,0.15), 0 0 40px rgba(142,124,195,0.06)',
												}}>
												{loading ? (
													<>
														<FiRefreshCw className="h-5 w-5 animate-spin" aria-hidden />
														Iniciando...
													</>
												) : (
													<>
														<FiLogIn className="h-4 w-4 opacity-90" aria-hidden />
														Iniciar sesión
													</>
												)}
											</button>
										</div>
									</div>

									{/* Footer small actions */}
									<div className="mt-5 flex items-center justify-between text-sm text-[#2C3E50]/70">
										<div className="flex items-center gap-3">
											<span className="inline-flex items-center gap-2 rounded-full bg-[rgba(74,144,226,0.06)] px-4 py-2 text-sm text-[#4A90E2]">Acceso seguro</span>
										</div>

										<a href="/register" className="text-[#8E7CC3] hover:underline font-medium">
											Crear cuenta
										</a>
									</div>

									{/* Role badge + error */}
									<div className="mt-4 flex items-center justify-between">
										<div className="min-h-5 w-2/3" aria-live="polite">
											{errorMsg && (
												<div
													role="alert"
													className="rounded-md px-3 py-2 text-sm"
													style={{
														background: 'rgba(231,76,60,0.08)',
														border: '1px solid rgba(231,76,60,0.16)',
														color: '#E74C3C',
													}}>
													{errorMsg}
												</div>
											)}
										</div>

										<div>
											{detectedRole && (
												<span
													className="text-sm rounded-full px-4 py-1"
													style={{
														background: 'rgba(142,124,195,0.12)',
														color: '#4A2E86',
													}}>
													{detectedRole}
												</span>
											)}
										</div>
									</div>
								</div>
							</div>
						</div>{' '}
						{/* end right */}
					</div>
				</div>
			</div>

			<style jsx>{`
				@keyframes gradient-xy {
					0% {
						transform: rotate(0deg) scale(1);
						opacity: 0.65;
					}
					50% {
						transform: rotate(180deg) scale(1.02);
						opacity: 0.75;
					}
					100% {
						transform: rotate(360deg) scale(1);
						opacity: 0.65;
					}
				}
				.animate-gradient-xy {
					animation: gradient-xy 12s linear infinite;
				}
			`}</style>
		</form>
	);
}
