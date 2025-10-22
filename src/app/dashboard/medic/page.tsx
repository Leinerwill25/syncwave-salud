'use client';
import { useState, useEffect } from 'react';
import KPISection from './components/KPISection';
import DayAgenda from './components/DayAgenda';
import DayAppointments from './components/DayAppointments';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import AppointmentForm from './components/AppointmentForm';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function MedicDashboardPage() {
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [userId, setUserId] = useState<string | null>(null);
	const [organizationId, setOrganizationId] = useState<string | null>(null);
	const [loadingSession, setLoadingSession] = useState(true);

	// Obtener userId y organizationId desde API (envío de cookies + token)
	useEffect(() => {
		async function fetchSession() {
			try {
				// obtener token (si existe) desde supabase client en el frontend
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
				console.error('Error obteniendo sesión', err);
				setUserId(null);
				setOrganizationId(null);
			} finally {
				setLoadingSession(false);
			}
		}

		fetchSession();
	}, []);

	return (
		<div className="p-8 bg-gray-50 min-h-screen space-y-8">
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
				<p className="text-gray-500 mt-1">Indicadores clave de rendimiento y agenda diaria</p>
			</div>

			{/* KPIs */}
			<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
				<KPISection />
			</motion.div>

			{/* Agenda y Citas */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="lg:col-span-2">
					<DayAgenda onDateSelect={setSelectedDate} />
				</div>
				<DayAppointments selectedDate={selectedDate} />
			</div>

			{/* Atajos Rápidos */}
			<div className="flex gap-4 pt-4">
				<Button className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-xl shadow-md transition disabled:opacity-50" onClick={() => setIsModalOpen(true)} disabled={loadingSession || !userId || !organizationId}>
					{loadingSession ? 'Cargando sesión...' : 'Nueva Cita'}
				</Button>
				<Button variant="outline" className="border-violet-600 text-violet-700 hover:bg-violet-50 px-6 py-2 rounded-xl">
					Nuevo Paciente
				</Button>
			</div>

			{/* Modal */}
			<AnimatePresence>
				{isModalOpen && userId && organizationId && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
						<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative">
							<Button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full" onClick={() => setIsModalOpen(false)}>
								X
							</Button>

							{/* AppointmentForm obtiene la sesión por su cuenta; no es obligatorio pasar props */}
							<AppointmentForm />
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
