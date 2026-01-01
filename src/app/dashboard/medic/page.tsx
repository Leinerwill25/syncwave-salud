'use client';

import { useState, useEffect } from 'react';
import KPISection from './components/KPISection';
import DayAgenda from './components/DayAgenda';
import DayAppointments from './components/DayAppointments';
import PendingPaymentAlerts from './components/PendingPaymentAlerts';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import AppointmentForm from './components/AppointmentForm';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { useLiteMode } from '@/contexts/LiteModeContext';
import { getLiteAnimation } from '@/lib/lite-mode-utils';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function MedicDashboardPage() {
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [userId, setUserId] = useState<string | null>(null);
	const [organizationId, setOrganizationId] = useState<string | null>(null);
	const [loadingSession, setLoadingSession] = useState(true);
	const { isLiteMode } = useLiteMode();

	useEffect(() => {
		async function fetchSession() {
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
				} else {
					setUserId(null);
					setOrganizationId(null);
				}
			} catch (err) {
				console.error('Error obteniendo sesiÃ³n', err);
				setUserId(null);
				setOrganizationId(null);
			} finally {
				setLoadingSession(false);
			}
		}

		fetchSession();
	}, []);

	return (
		<div className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 min-h-screen space-y-6 sm:space-y-8">
			<div>
				<h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Panel de Control</h1>
				<p className="text-sm sm:text-base text-slate-600 mt-1">Indicadores clave de rendimiento y agenda diaria</p>
			</div>

			<motion.div {...getLiteAnimation(isLiteMode)}>
				<KPISection />
			</motion.div>

			<motion.div {...getLiteAnimation(isLiteMode)}>
				<div className="bg-white rounded-xl shadow-md border border-amber-100 p-4 sm:p-6">
					<PendingPaymentAlerts />
				</div>
			</motion.div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
				<div className="lg:col-span-2">
					<DayAgenda onDateSelect={setSelectedDate} />
				</div>
				<DayAppointments selectedDate={selectedDate} />
			</div>

			<div className="flex gap-4 pt-4">
				<Button 
					className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 sm:px-6 py-2 text-sm sm:text-base rounded-xl shadow-md transition disabled:opacity-50" 
					onClick={() => setIsModalOpen(true)} 
					disabled={loadingSession || !userId || !organizationId}
				>
					{loadingSession ? 'Cargando sesiÃ³n...' : 'Nueva Cita'}
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
							<AppointmentForm />
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}