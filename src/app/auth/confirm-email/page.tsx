'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function ConfirmEmailContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
	const [message, setMessage] = useState<string>('Verificando tu email...');

	useEffect(() => {
		async function confirmEmail() {
			try {
				// Crear cliente de Supabase
				const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
				const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

				if (!supabaseUrl || !supabaseAnonKey) {
					setStatus('error');
					setMessage('Error de configuración del servidor.');
					return;
				}

				const supabase = createClient(supabaseUrl, supabaseAnonKey);

				// Primero, verificar si ya hay una sesión activa (Supabase puede haber confirmado automáticamente)
				const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
				
				if (sessionData?.session?.user?.email_confirmed_at) {
					// El email ya está confirmado
					setStatus('success');
					setMessage('¡Email verificado exitosamente! Redirigiendo al login...');
					
					// Verificar si hay un pago pendiente
					const pendingPaymentOrgId = localStorage.getItem('pendingPayment_organizationId');
					const pendingPaymentUserId = localStorage.getItem('pendingPayment_userId');
					const pendingPaymentAmount = localStorage.getItem('pendingPayment_amount');
					const pendingPaymentRole = localStorage.getItem('pendingPayment_role');

					// Esperar un momento antes de redirigir
					setTimeout(() => {
						// Si hay pago pendiente, redirigir directamente a la página de pago
						if (pendingPaymentOrgId && pendingPaymentUserId && pendingPaymentAmount) {
							router.push(`/register/payment?organizationId=${pendingPaymentOrgId}&userId=${pendingPaymentUserId}&amount=${pendingPaymentAmount}`);
						} else {
							router.push('/login');
						}
					}, 2000);
					return;
				}

				// Si no hay sesión, intentar verificar con los tokens de la URL
				const token = searchParams.get('token');
				const type = searchParams.get('type');
				const tokenHash = searchParams.get('token_hash');

				if (!token && !tokenHash) {
					// Si no hay tokens, puede que Supabase ya haya confirmado pero no haya sesión
					// En este caso, simplemente redirigir al login
					setStatus('success');
					setMessage('Redirigiendo al login...');
					setTimeout(() => {
						router.push('/login');
					}, 2000);
					return;
				}

				// Intentar verificar el email usando el token
				const { data, error } = await supabase.auth.verifyOtp({
					token_hash: tokenHash || token || '',
					type: (type as any) || 'email',
				});

				if (error) {
					console.error('Error verificando email:', error);
					
					// Si el error es que el token ya fue usado o es inválido, verificar el estado del usuario
					if (error.message.includes('already been verified') || 
						error.message.includes('already confirmed') ||
						error.message.includes('Token has expired') ||
						error.message.includes('Invalid token')) {
						
						// Verificar nuevamente el estado del usuario
						const { data: userData } = await supabase.auth.getUser();
						if (userData?.user?.email_confirmed_at) {
							setStatus('success');
							setMessage('Tu email ya ha sido verificado. Redirigiendo al login...');
							setTimeout(() => {
								router.push('/login');
							}, 2000);
							return;
						}
						
						setStatus('error');
						setMessage('El enlace de verificación ha expirado o ya fue usado. Por favor, solicita un nuevo enlace de verificación desde el login.');
						return;
					}

					setStatus('error');
					setMessage(error.message || 'Error al verificar el email. Por favor, intenta nuevamente.');
					return;
				}

				// Si la verificación fue exitosa
				if (data?.user) {
					setStatus('success');
					setMessage('¡Email verificado exitosamente! Redirigiendo al login...');
					
					// Verificar si hay un pago pendiente
					const pendingPaymentOrgId = localStorage.getItem('pendingPayment_organizationId');
					const pendingPaymentUserId = localStorage.getItem('pendingPayment_userId');
					const pendingPaymentAmount = localStorage.getItem('pendingPayment_amount');
					const pendingPaymentRole = localStorage.getItem('pendingPayment_role');

					// Esperar un momento antes de redirigir
					setTimeout(() => {
						// Si hay pago pendiente, redirigir directamente a la página de pago
						if (pendingPaymentOrgId && pendingPaymentUserId && pendingPaymentAmount) {
							router.push(`/register/payment?organizationId=${pendingPaymentOrgId}&userId=${pendingPaymentUserId}&amount=${pendingPaymentAmount}`);
						} else {
							router.push('/login');
						}
					}, 2000);
				} else {
					setStatus('error');
					setMessage('No se pudo verificar el email. Por favor, intenta nuevamente.');
				}
			} catch (err: any) {
				console.error('Error en confirmEmail:', err);
				setStatus('error');
				setMessage(err?.message || 'Error inesperado al verificar el email.');
			}
		}

		confirmEmail();
	}, [router, searchParams]);

	if (status === 'loading') {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
				<div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
					<Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
					<p className="text-slate-600">{message}</p>
				</div>
			</div>
		);
	}

	if (status === 'success') {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
				<div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
						<CheckCircle2 className="w-8 h-8 text-green-600" />
					</div>
					<h2 className="text-2xl font-bold text-slate-900 mb-2">¡Email Verificado!</h2>
					<p className="text-slate-600 mb-4">{message}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
			<div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
				<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
					<AlertCircle className="w-8 h-8 text-red-600" />
				</div>
				<h2 className="text-2xl font-bold text-slate-900 mb-2">Error al Verificar</h2>
				<p className="text-slate-600 mb-6">{message}</p>
				<button
					onClick={() => router.push('/login')}
					className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
				>
					Ir al Login
				</button>
			</div>
		</div>
	);
}

export default function ConfirmEmailPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
					<div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
						<Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
						<p className="text-slate-600">Cargando...</p>
					</div>
				</div>
			}
		>
			<ConfirmEmailContent />
		</Suspense>
	);
}

