'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SubscriptionPaymentForm from '@/components/SubscriptionPaymentForm';
import { Loader2 } from 'lucide-react';

function PaymentPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [organizationId, setOrganizationId] = useState<string | null>(null);
	const [userId, setUserId] = useState<string | null>(null);
	const [amountEuros, setAmountEuros] = useState<number | null>(null);

	useEffect(() => {
		async function loadPaymentData() {
			try {
				// Obtener datos de la URL o del localStorage
				const orgId = searchParams.get('organizationId') || localStorage.getItem('pendingPayment_organizationId');
				const usrId = searchParams.get('userId') || localStorage.getItem('pendingPayment_userId');
				const amount = searchParams.get('amount') || localStorage.getItem('pendingPayment_amount');

				if (!orgId || !usrId || !amount) {
					// Si no hay datos, redirigir al dashboard
					router.push('/dashboard');
					return;
				}

				setOrganizationId(orgId);
				setUserId(usrId);
				setAmountEuros(parseFloat(amount));

				// Limpiar datos del localStorage después de cargarlos
				localStorage.removeItem('pendingPayment_organizationId');
				localStorage.removeItem('pendingPayment_userId');
				localStorage.removeItem('pendingPayment_amount');
				localStorage.removeItem('pendingPayment_role');
			} catch (error) {
				console.error('Error cargando datos de pago:', error);
				router.push('/dashboard');
			} finally {
				setLoading(false);
			}
		}

		loadPaymentData();
	}, [router, searchParams]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
				<div className="text-center">
					<Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
					<p className="text-slate-600">Cargando información de pago...</p>
				</div>
			</div>
		);
	}

	if (!organizationId || !userId || !amountEuros) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
				<div className="text-center p-6 bg-white rounded-2xl shadow-xl max-w-md">
					<p className="text-slate-600 mb-4">No se encontraron datos de pago.</p>
					<button
						onClick={() => router.push('/dashboard')}
						className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
					>
						Ir al Dashboard
					</button>
				</div>
			</div>
		);
	}

	return (
		<main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 py-6 sm:py-8 lg:py-12 px-3 sm:px-4 md:px-6 lg:px-8">
			<div className="max-w-5xl mx-auto">
				<SubscriptionPaymentForm
					organizationId={organizationId}
					userId={userId}
					amountEuros={amountEuros}
					onPaymentSubmitted={() => {
						// Callback opcional cuando se completa el pago
					}}
				/>
			</div>
		</main>
	);
}

export default function PaymentPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
				<div className="text-center">
					<Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
					<p className="text-slate-600">Cargando información de pago...</p>
				</div>
			</div>
		}>
			<PaymentPageContent />
		</Suspense>
	);
}

