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

	// Cargar preferencia de "recuérdame" y email desde localStorage
	const [email, setEmail] = useState(() => {
		if (typeof window !== 'undefined') {
			const remembered = localStorage.getItem('rememberMe') === 'true';
			return remembered ? localStorage.getItem('userEmail') || '' : '';
		}
		return '';
	});
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [detectedRole, setDetectedRole] = useState<Role | null>(null);
	const [rememberMe, setRememberMe] = useState(() => {
		if (typeof window !== 'undefined') {
			return localStorage.getItem('rememberMe') === 'true';
		}
		return false;
	});

	function routeForRole(role?: Role, isRoleUser?: boolean) {
		// Si es un usuario de rol, redirigir al dashboard de usuarios de rol
		if (isRoleUser) {
			return '/dashboard/role-user';
		}

		switch ((role || '').toString().toUpperCase()) {
			case 'ADMIN':
				return '/dashboard/clinic';
			case 'MEDICO':
				return '/dashboard/medic';
			case 'FARMACIA':
				return '/dashboard/pharmacy';
			case 'PACIENTE':
				return '/dashboard/patient';
			case 'RECEPCION':
				// Si es RECEPCION y tiene isRoleUser, ir al dashboard de roles
				// Si no, redirigir al login de usuarios de rol
				return '/login/role-user';
			default:
				return '/dashboard';
		}
	}

	async function fetchRoleFromServer(authId: string): Promise<Role | null> {
		try {
			// Add timeout to prevent hanging
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
			
			const resp = await fetch(`/api/auth/profile?authId=${encodeURIComponent(authId)}`, {
				signal: controller.signal,
				credentials: 'include',
			});
			clearTimeout(timeoutId);
			
			if (!resp.ok) return null;
			const json = await resp.json();
			return json?.data?.role ?? null;
		} catch (err: any) {
			if (err.name === 'AbortError') {
				console.warn('fetchRoleFromServer timeout');
			} else {
				console.warn('fetchRoleFromServer error', err);
			}
			return null;
		}
	}

	async function postSessionToServer(session: { access_token?: string; refresh_token?: string; expires_in?: number; session?: any }, remember: boolean = false) {
		if (!session?.access_token) return false;
		try {
			// Add timeout to prevent hanging
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
			
			const resp = await fetch('/api/auth/set-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ ...session, rememberMe: remember }),
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
			return resp.ok;
		} catch (err: any) {
			if (err.name === 'AbortError') {
				console.error('postSessionToServer timeout');
			} else {
				console.error('postSessionToServer error', err);
			}
			return false;
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setErrorMsg(null);
		setDetectedRole(null);
		setLoading(true);

		try {
			// Limpiar sesiones anteriores antes de iniciar una nueva
			try {
				// Cerrar cualquier sesión existente en Supabase
				await supabase.auth.signOut();
				
				// Limpiar cookies del servidor
				await fetch('/api/auth/clear-session', {
					method: 'POST',
					credentials: 'include',
				}).catch(() => {
					// Ignorar errores si el endpoint no está disponible
				});

				// Limpiar localStorage de sesiones anteriores (excepto rememberMe y userEmail)
				if (typeof window !== 'undefined') {
					const rememberMeValue = localStorage.getItem('rememberMe');
					const userEmailValue = localStorage.getItem('userEmail');
					localStorage.clear();
					if (rememberMeValue) localStorage.setItem('rememberMe', rememberMeValue);
					if (userEmailValue) localStorage.setItem('userEmail', userEmailValue);
				}
			} catch (cleanupErr) {
				console.warn('Error limpiando sesiones anteriores:', cleanupErr);
				// Continuar con el login aunque falle la limpieza
			}

			// Pequeña pausa para asegurar que las cookies se hayan limpiado
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Intentar login con el endpoint especial que maneja múltiples usuarios
			// Esto es necesario para usuarios con roles RECEPCION/Asistente De Citas que pueden tener múltiples registros
			let data: any = null;
			let error: any = null;
			
			try {
				const loginResponse = await fetch('/api/auth/login-multiple-users', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ email, password }),
				});

				if (loginResponse.ok) {
					const loginData = await loginResponse.json();
					if (loginData.success && loginData.user && loginData.session) {
						data = {
							user: loginData.user,
							session: loginData.session,
						};
					} else {
						error = { message: 'Invalid login credentials' };
					}
				} else {
					const errorData = await loginResponse.json();
					error = { message: errorData.error || 'Invalid login credentials' };
				}
			} catch (fetchError) {
				console.warn('[LoginForm] Error en login-multiple-users, intentando login normal:', fetchError);
				// Fallback a login normal si el endpoint falla
				const normalLogin = await supabase.auth.signInWithPassword({ email, password });
				data = normalLogin.data;
				error = normalLogin.error;
			}

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

			// Guardar preferencia de "recuérdame" en localStorage inmediatamente (no bloquea)
			if (rememberMe) {
				localStorage.setItem('rememberMe', 'true');
				localStorage.setItem('userEmail', email);
			} else {
				localStorage.removeItem('rememberMe');
				localStorage.removeItem('userEmail');
			}

			// Ejecutar llamadas en paralelo para mayor velocidad
			const isRoleUser = (user.user_metadata as any)?.isRoleUser === true;
			
			// Hacer ambas llamadas en paralelo con timeout individual
			const results = await Promise.allSettled([
				access_token ? postSessionToServer({ access_token, refresh_token, expires_in, session }, rememberMe) : Promise.resolve(true),
				user.id ? fetchRoleFromServer(user.id) : Promise.resolve(null),
			]);
			
			// Extract values from settled promises, defaulting to safe values on failure
			const sessionResult = results[0].status === 'fulfilled' ? results[0].value : false;
			const roleFromServer: Role | null = results[1].status === 'fulfilled' ? (results[1].value as Role | null) : null;

			// Precargar datos de sesión en background (no bloquea la redirección)
			if (access_token && sessionResult) {
				// Prefetch de /api/auth/me para cachear la sesión
				fetch('/api/auth/me', {
					credentials: 'include',
					headers: { Authorization: `Bearer ${access_token}` },
				})
					.then((res) => res.json())
					.then((data) => {
						if (data?.id && data?.organizationId && typeof window !== 'undefined') {
							// Guardar en caché para uso inmediato en el dashboard
							try {
								const cache = {
									userId: data.id,
									organizationId: data.organizationId,
									timestamp: Date.now(),
								};
								localStorage.setItem('user_session_cache', JSON.stringify(cache));
							} catch {
								// Ignorar errores de localStorage
							}
						}
					})
					.catch(() => {
						// Ignorar errores de prefetch
					});
			}

			// Determinar el rol a usar
			let roleToUse: Role | null = null;
			if (roleFromServer) {
				roleToUse = roleFromServer;
			} else {
				// Fallback a user_metadata solo si no se puede obtener de la BD
				const metadataRole = (user.user_metadata as any)?.role as Role | undefined;
				roleToUse = metadataRole ?? null;
			}

			// Determinar la ruta de destino ANTES de cualquier delay
			const targetRoute = routeForRole(roleToUse ?? '', isRoleUser);
			
			// Prefetch del dashboard y datos críticos ANTES de redirigir (no bloquea)
			if (targetRoute && targetRoute !== '/dashboard/role-user') {
				router.prefetch(targetRoute);
				
				// Prefetch de datos críticos según el rol (en background, no bloquea)
				if (roleToUse === 'MEDICO') {
					// Prefetch de APIs críticas para médico
					Promise.all([
						fetch('/api/medic/config', { credentials: 'include' }).catch(() => null),
						fetch('/api/consultations?page=1&pageSize=8', { credentials: 'include' }).catch(() => null),
						fetch('/api/dashboard/medic/kpis?period=week', { credentials: 'include' }).catch(() => null),
					]).catch(() => {
						// Ignorar errores de prefetch
					});
				} else if (roleToUse === 'ADMIN') {
					// Prefetch de APIs críticas para admin
					fetch('/api/clinic/profile', { credentials: 'include' }).catch(() => null);
				}
			}

			setDetectedRole(roleToUse ?? 'UNKNOWN');

			// Verificar si hay un pago pendiente (después de registro)
			const pendingPaymentOrgId = localStorage.getItem('pendingPayment_organizationId');
			const pendingPaymentUserId = localStorage.getItem('pendingPayment_userId');
			const pendingPaymentAmount = localStorage.getItem('pendingPayment_amount');
			const pendingPaymentRole = localStorage.getItem('pendingPayment_role');

			// Esperar un momento para asegurar que las cookies se hayan establecido correctamente
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Si es un usuario de rol, redirigir al dashboard de usuarios de rol
			if (isRoleUser) {
				// Usar window.location para forzar una recarga completa y evitar problemas de caché
				window.location.href = '/dashboard/role-user';
				return;
			}

			// Si hay pago pendiente y el rol coincide (MEDICO o ADMIN), redirigir a página de pago
			if (pendingPaymentOrgId && pendingPaymentUserId && pendingPaymentAmount && 
				(pendingPaymentRole === 'MEDICO' || pendingPaymentRole === 'ADMIN') &&
				(roleToUse === 'MEDICO' || roleToUse === 'ADMIN')) {
				// NO limpiar localStorage aquí - la página de pago lo limpiará después de cargar correctamente
				window.location.href = `/register/payment?organizationId=${pendingPaymentOrgId}&userId=${pendingPaymentUserId}&amount=${pendingPaymentAmount}`;
				return;
			}

			// Redirigir usando window.location para forzar recarga completa y evitar conflictos de sesión
			// Esto asegura que se cargue con la nueva sesión correcta
			window.location.href = targetRoute;
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
		<form onSubmit={handleSubmit} className="w-full max-w-6xl mx-auto px-3 sm:px-6 mt-6 sm:mt-12 overflow-x-hidden">
			<div className="relative w-full">
				{/* Glass card */}
				<div className="relative z-10 rounded-2xl sm:rounded-3xl overflow-hidden bg-[rgba(255,255,255,0.95)] sm:bg-[rgba(255,255,255,0.72)] backdrop-blur-md border border-[rgba(44,62,80,0.06)] shadow-lg w-full">
					<div className="grid grid-cols-1 md:grid-cols-2">
						{/* Left decorative panel */}
						<div
							className="hidden md:flex items-center justify-center p-8 lg:p-10"
							style={{
								background: 'linear-gradient(180deg, rgba(74,144,226,0.08) 0%, rgba(142,124,195,0.06) 100%)',
							}}>
							<div className="w-full max-w-sm text-center">
								{/* Primary graphic: stylized shield + cross (health) */}
								<div
									className="mx-auto mb-6 flex h-20 w-20 lg:h-24 lg:w-24 items-center justify-center rounded-xl"
									style={{
										background: 'linear-gradient(135deg, #4A90E2 0%, #8E7CC3 100%)',
										boxShadow: '0 8px 20px rgba(72,88,120,0.12)',
									}}>
									{/* Icon from library */}
									<FiShield className="h-8 w-8 lg:h-10 lg:w-10 text-white" aria-hidden />
								</div>

								<h2 className="text-2xl lg:text-3xl font-semibold text-[#2C3E50] mb-2">Bienvenido de nuevo</h2>
								<p className="text-sm lg:text-base text-[#2C3E50]/75">Accede a tu panel profesional — seguridad empresarial y diseño pensado para tu flujo.</p>

								<div className="mt-6 lg:mt-8 flex flex-wrap justify-center gap-2 lg:gap-3">
									<span className="inline-flex items-center gap-2 rounded-full bg-[rgba(44,62,80,0.04)] px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm text-[#2C3E50]/80 ring-1 ring-[rgba(44,62,80,0.04)]">
										{/* Shield check icon */}
										<FiCheckCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-[#2C3E50]" aria-hidden />
										Acceso seguro
									</span>
									<span className="inline-flex items-center gap-2 rounded-full bg-[rgba(44,62,80,0.04)] px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm text-[#2C3E50]/80 ring-1 ring-[rgba(44,62,80,0.04)]">
										{/* Corporate icon */}
										<FiBriefcase className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-[#2C3E50]" aria-hidden />
										Corporativo
									</span>
								</div>
							</div>
						</div>
						{/* Right: form */}
						<div className="p-4 sm:p-6 lg:p-10">
							<div className="mx-auto max-w-2xl">
								<div className="rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 lg:p-8 shadow-sm ring-1 ring-[rgba(44,62,80,0.03)]">
									<div className="mb-4">
										<h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2C3E50]">Iniciar sesión</h3>
										<p className="text-xs sm:text-sm text-[#2C3E50]/70 mt-1">Introduce tus credenciales para continuar</p>
									</div>

									<div className="space-y-4 sm:space-y-5">
										{/* Email with icon */}
										<label htmlFor="email" className="block">
											<span className="text-xs sm:text-sm text-[#2C3E50]/80">Correo electrónico</span>
											<div className="relative mt-2 sm:mt-3">
												{/* Mail icon (left) */}
												<div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
													<FiMail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#2C3E50]/70" aria-hidden />
												</div>

												<input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-0 w-full rounded-md border border-[rgba(44,62,80,0.08)] bg-[#FFFFFF] px-3 sm:px-4 py-2.5 sm:py-3 pl-9 sm:pl-11 text-sm sm:text-base text-[#2C3E50] placeholder-[#2C3E50]/40 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition" placeholder="tu@ejemplo.com" />
											</div>
										</label>

										{/* Password with interactive eye icon */}
										<label htmlFor="password" className="block">
											<span className="text-xs sm:text-sm text-[#2C3E50]/80">Contraseña</span>

											<div className="relative mt-2 sm:mt-3">
												<input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-md border border-[rgba(44,62,80,0.08)] bg-[#FFFFFF] px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-[#2C3E50] placeholder-[#2C3E50]/40 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition pr-10 sm:pr-12" placeholder="••••••••" />

												{/* Eye button (interactive) */}
												<button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute inset-y-0 right-2 sm:right-3 flex items-center justify-center p-1 rounded focus:outline-none focus:ring-2 focus:ring-[#4A90E2]">
													{showPassword ? <FiEyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-[#2C3E50]" aria-hidden /> : <FiEye className="h-4 w-4 sm:h-5 sm:w-5 text-[#2C3E50]" aria-hidden />}
												</button>
											</div>
										</label>

										<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
											<label className="inline-flex items-center gap-2 sm:gap-3 cursor-pointer select-none text-xs sm:text-sm text-[#2C3E50]/80">
												<input 
													type="checkbox" 
													checked={rememberMe}
													onChange={(e) => setRememberMe(e.target.checked)}
													className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded border-[rgba(44,62,80,0.08)] bg-white text-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2]" 
												/>
												<span>Recordarme</span>
											</label>

											<button type="button" onClick={handleForgotPassword} className="text-xs sm:text-sm text-[#4A90E2] hover:underline transition">
												¿Olvidaste tu contraseña?
											</button>
										</div>

										{/* Submit */}
										<div>
											<button
												type="submit"
												disabled={loading}
												aria-busy={loading}
												className="relative flex w-full items-center justify-center gap-2 sm:gap-3 rounded-lg px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
												style={{
													background: 'linear-gradient(90deg,#4A90E2 0%, #8E7CC3 100%)',
													boxShadow: '0 10px 30px rgba(74,144,226,0.15), 0 0 40px rgba(142,124,195,0.06)',
												}}>
												{loading ? (
													<>
														<FiRefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" aria-hidden />
														Iniciando...
													</>
												) : (
													<>
														<FiLogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-90" aria-hidden />
														Iniciar sesión
													</>
												)}
											</button>
										</div>
									</div>

									{/* Footer small actions */}
									<div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 text-xs sm:text-sm text-[#2C3E50]/70">
										<div className="flex items-center gap-2 sm:gap-3">
											<span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-[rgba(74,144,226,0.06)] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-[#4A90E2]">Acceso seguro</span>
										</div>

										<a href="/register" className="text-[#8E7CC3] hover:underline font-medium text-xs sm:text-sm">
											Crear cuenta
										</a>
									</div>

									{/* Role badge + error */}
									<div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
										<div className="min-h-5 w-full sm:w-2/3" aria-live="polite">
											{errorMsg && (
												<div
													role="alert"
													className="rounded-md px-3 py-2 text-xs sm:text-sm"
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
													className="text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1"
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
