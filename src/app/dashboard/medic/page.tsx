'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { useLiteMode } from '@/contexts/LiteModeContext';
import { getLiteAnimation } from '@/lib/lite-mode-utils';
import { Loader2 } from 'lucide-react';
import { useSessionCache } from '@/hooks/useSessionCache';

// Lazy load de componentes pesados
const KPISection = lazy(() => import('./components/KPISection'));
const TodayConsultations = lazy(() => import('./components/TodayConsultations'));
const DayAgenda = lazy(() => import('./components/DayAgenda'));
const DayAppointments = lazy(() => import('./components/DayAppointments'));
const PendingPaymentAlerts = lazy(() => import('./components/PendingPaymentAlerts'));
const AppointmentForm = lazy(() => import('./components/AppointmentForm'));

// Loading skeleton para componentes
const ComponentSkeleton = ({ className = '' }: { className?: string }) => (
	<div className={`animate-pulse bg-white/70 rounded-xl ${className}`}>
		<div className="h-32 bg-slate-200 rounded-xl" />
	</div>
);

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function MedicDashboardPage() {
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [userId, setUserId] = useState<string | null>(null);
	const [organizationId, setOrganizationId] = useState<string | null>(null);
	const [loadingSession, setLoadingSession] = useState(true);
	const { isLiteMode } = useLiteMode();
	const { getCachedSession, setCachedSession } = useSessionCache();

	useEffect(() => {
		async function fetchSession() {
			// Intentar usar caché primero para carga instantánea
			const cached = getCachedSession();
			if (cached) {
				setUserId(cached.userId);
				setOrganizationId(cached.organizationId);
				setLoadingSession(false);
				
				// Actualizar en background sin bloquear
				if ('requestIdleCallback' in window) {
					requestIdleCallback(() => {
						refreshSession();
					}, { timeout: 1000 });
				} else {
					setTimeout(() => refreshSession(), 100);
				}
				return;
			}

			// Si no hay caché, cargar normalmente
			await refreshSession();
		}

		async function refreshSession() {
			try {
				const { data: sessionData } = await supabase.auth.getSession();
				const token = sessionData?.session?.access_token;

				const res = await axios.get('/api/auth/me', {
					withCredentials: true,
					headers: token ? { Authorization: `Bearer ${token}` } : {},
				});

				if (res.status === 200 && res.data?.id && res.data?.organizationId) {
					setUserId(res.data.id);
					setOrganizationId(res.data.organizationId);
					// Actualizar caché
					setCachedSession(res.data.id, res.data.organizationId);
				} else {
					setUserId(null);
					setOrganizationId(null);
				}
			} catch (err) {
				console.error('Error obteniendo sesión', err);
				setUserId(null);
				setOrganizationId(null);
			} finally {
				setLoadingSession(false);
			}
		}

		fetchSession();
	}, [getCachedSession, setCachedSession]);

	return (
		<div className="p-1 sm:p-6 md:p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 min-h-screen space-y-6 sm:space-y-8">
			<div>
				<h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Panel de Control</h1>
				<p className="text-sm sm:text-base text-slate-600 mt-1">Indicadores clave de rendimiento y agenda diaria</p>
			</div>

			<Suspense fallback={<ComponentSkeleton className="h-48" />}>
				<motion.div {...getLiteAnimation(isLiteMode)}>
					<KPISection />
				</motion.div>
			</Suspense>

			<Suspense fallback={<ComponentSkeleton className="h-64" />}>
				<motion.div {...getLiteAnimation(isLiteMode)}>
					<TodayConsultations />
				</motion.div>
			</Suspense>

			<Suspense fallback={<ComponentSkeleton className="h-32" />}>
				<motion.div {...getLiteAnimation(isLiteMode)}>
					<div className="bg-white rounded-xl shadow-md border border-amber-100 p-4 sm:p-6">
						<PendingPaymentAlerts />
					</div>
				</motion.div>
			</Suspense>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
				<div className="lg:col-span-2">
					<Suspense fallback={<ComponentSkeleton className="h-96" />}>
						<DayAgenda onDateSelect={setSelectedDate} />
					</Suspense>
				</div>
				<Suspense fallback={<ComponentSkeleton className="h-96" />}>
					<DayAppointments selectedDate={selectedDate} />
				</Suspense>
			</div>

			<div className="flex gap-4 pt-4">
				<Button 
					className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 sm:px-6 py-2 text-sm sm:text-base rounded-xl shadow-md transition disabled:opacity-50" 
					onClick={() => setIsModalOpen(true)} 
					disabled={loadingSession || !userId || !organizationId}
				>
					{loadingSession ? 'Cargando sesión...' : 'Nueva Cita'}
				</Button>
			</div>

			<AnimatePresence>
				{isModalOpen && userId && organizationId && (
					<motion.div 
						initial={isLiteMode ? { opacity: 1 } : { opacity: 0 }} 
						animate={{ opacity: 1 }} 
						exit={{ opacity: 0 }} 
						className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
					>
						<motion.div 
							initial={isLiteMode ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }} 
							animate={{ scale: 1, opacity: 1 }} 
							exit={{ scale: 0.9, opacity: 0 }} 
							transition={isLiteMode ? { duration: 0 } : { duration: 0.2 }} 
							className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative"
						>
							<Button 
								className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full" 
								onClick={() => setIsModalOpen(false)}
							>
								X
							</Button>
							<Suspense fallback={
								<div className="flex items-center justify-center p-8">
									<Loader2 className="w-6 h-6 animate-spin text-teal-600" />
								</div>
							}>
								<AppointmentForm />
							</Suspense>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
