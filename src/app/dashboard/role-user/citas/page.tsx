'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, CalendarDays } from 'lucide-react';
import { getRoleUserSession, hasRoleUserPermission } from '@/lib/role-user-auth-client';
import DayAgenda from '@/app/dashboard/medic/components/DayAgenda';
import AppointmentListForRoleUser from './AppointmentListForRoleUser';
import AppointmentFormForAssistant from './AppointmentFormForAssistant';

export default function CitasPageForRoleUser() {
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [session, setSession] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadSession();
	}, []);

	const loadSession = async () => {
		try {
			const roleUserSession = await getRoleUserSession();
			if (roleUserSession) {
				setSession(roleUserSession);
			}
		} catch (err) {
			console.error('[Citas Role User] Error cargando sesión:', err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-500"></div>
			</div>
		);
	}

	if (!session) {
		return <div className="text-red-500">No se pudo cargar la sesión del usuario</div>;
	}

	const isAssistant = session.roleName === 'Asistente De Citas';
	const isReception = session.roleName === 'Recepción';
	const canCreate = hasRoleUserPermission(session, 'citas', 'create');
	const canEdit = hasRoleUserPermission(session, 'citas', 'edit');
	const canView = hasRoleUserPermission(session, 'citas', 'view');
	
	// Permitir crear citas tanto a Asistente De Citas como a Recepción si tienen el permiso
	const canCreateAppointments = canCreate && (isAssistant || isReception);

	return (
		<div className="w-full min-w-0 overflow-x-hidden">
			<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full min-w-0 flex flex-col gap-4 sm:gap-6">
				{/* Calendario */}
				<div className="w-full min-w-0">
					<DayAgenda onDateSelect={(date) => date && setSelectedDate(date)} />
				</div>

				{/* Header y Lista */}
				<div className="w-full min-w-0 flex flex-col gap-4">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full min-w-0">
						<h1 className="text-xl sm:text-2xl font-semibold text-gray-900 break-words min-w-0 flex-1">
							Citas —{' '}
							<span className="text-indigo-600 text-lg sm:text-2xl break-words">
								{selectedDate.toLocaleDateString('es-ES', {
									weekday: 'long',
									day: 'numeric',
									month: 'long',
								})}
							</span>
						</h1>

						{/* Mostrar botón si tiene permiso de crear (Asistente De Citas o Recepción) */}
						{canCreateAppointments && (
							<button
								onClick={() => setIsModalOpen(true)}
								className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base rounded-xl sm:rounded-2xl font-medium text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 hover:shadow-lg transition-all flex-shrink-0 whitespace-nowrap"
							>
								<PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
								<span className="hidden sm:inline">Nueva Cita</span>
								<span className="sm:hidden">Nueva</span>
							</button>
						)}
					</div>

					{canView && (
						<div className="w-full min-w-0">
							<AppointmentListForRoleUser
								selectedDate={selectedDate}
								roleName={session.roleName}
								canEdit={canEdit}
								isReception={isReception}
								organizationId={session.organizationId}
							/>
						</div>
					)}
				</div>
			</motion.div>

			{/* Modal para crear cita (Asistente De Citas o Recepción con permiso) */}
			{canCreateAppointments && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: isModalOpen ? 1 : 0 }}
					exit={{ opacity: 0 }}
					className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${isModalOpen ? '' : 'pointer-events-none hidden'}`}
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: isModalOpen ? 1 : 0.9, opacity: isModalOpen ? 1 : 0 }}
						exit={{ scale: 0.9, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-2xl p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto min-w-0"
						style={{ maxWidth: 'calc(100vw - 2rem)' }}
					>
						<button
							className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full z-10"
							onClick={() => setIsModalOpen(false)}
						>
							X
						</button>
						<AppointmentFormForAssistant onClose={() => setIsModalOpen(false)} organizationId={session.organizationId} />
					</motion.div>
				</motion.div>
			)}
		</div>
	);
}
