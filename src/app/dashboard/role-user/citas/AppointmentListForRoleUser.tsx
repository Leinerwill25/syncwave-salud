'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Clock,
	MapPin,
	Loader2,
	ChevronDown,
	Users,
	DollarSign,
	FileText,
	X,
	Edit2,
	Trash2,
	User,
	Phone,
	Mail,
	CreditCard,
	CalendarClock,
	MessageCircle,
} from 'lucide-react';
import CurrencyDisplay from '@/components/CurrencyDisplay';
import { useAppointmentsForRoleUser } from '@/app/hooks/useAppointmentsForRoleUser';
import ReceptionAppointmentModal from './ReceptionAppointmentModal';
import RescheduleModal from './RescheduleModal';

interface Props {
	selectedDate: Date;
	roleName: string;
	canEdit: boolean;
	isReception: boolean;
	organizationId: string;
}

export default function AppointmentListForRoleUser({ selectedDate, roleName, canEdit, isReception, organizationId }: Props) {
	const { appointments, isLoading, isError, updateAppointment } = useAppointmentsForRoleUser(selectedDate);
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [rescheduleAppointment, setRescheduleAppointment] = useState<{ id: string; scheduled_at: string; patient: string } | null>(null);
	const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
	const [whatsappConfig, setWhatsappConfig] = useState<{
		whatsappNumber: string | null;
		whatsappMessageTemplate: string | null;
		doctorName: string | null;
	} | null>(null);

	// Cargar configuración básica de WhatsApp (número + plantilla)
	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			try {
				const res = await fetch('/api/role-users/whatsapp-config', { credentials: 'include' });
				const data = await res.json().catch(() => ({}));
				if (!cancelled && res.ok && data?.config) {
					setWhatsappConfig(data.config);
				}
			} catch (err) {
				if (!cancelled) {
					console.error('[AppointmentListForRoleUser] Error cargando whatsapp-config:', err);
				}
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'CONFIRMADA':
				return 'from-sky-500 to-blue-600';
			case 'EN ESPERA':
			case 'EN_ESPERA':
				return 'from-yellow-400 to-amber-500';
			case 'REAGENDADA':
				return 'from-orange-500 to-red-600';
			case 'COMPLETADA':
				// "Finalizada" en UI, pero se mantiene COMpletada internamente
				return 'from-emerald-500 to-teal-600';
			case 'CANCELADA':
				return 'from-gray-400 to-gray-500';
			case 'NO ASISTIÓ':
			case 'NO_ASISTIO':
				return 'from-red-500 to-rose-600';
			default:
				return 'from-gray-300 to-gray-400';
		}
	};

	// Estados específicos para Recepción (sin EN PROCESO ni EN CURSO)
	const receptionStatusOptions = ['EN ESPERA', 'CONFIRMADA', 'REAGENDADA', 'CANCELADA', 'COMPLETADA', 'NO ASISTIÓ'];
	// Estados para Asistente De Citas (sin EN CURSO)
	const assistantStatusOptions = ['EN ESPERA', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'REAGENDADA', 'NO ASISTIÓ'];

	const statusOptions = isReception ? receptionStatusOptions : assistantStatusOptions;

	const handleStatusChange = async (id: string, newStatus: string) => {
		try {
			setLoadingId(id);
			await updateAppointment(id, { status: newStatus });
		} catch (err) {
			console.error('❌ Error al cambiar estado:', err);
			alert('No se pudo actualizar el estado de la cita.');
		} finally {
			setLoadingId(null);
		}
	};

	const handleReschedule = async (appointmentId: string, newDate: string) => {
		try {
			// Actualizar la cita con la nueva fecha y cambiar el estado a REAGENDADA
			await updateAppointment(appointmentId, {
				status: 'REAGENDADA',
				scheduled_at: newDate,
			});
		} catch (err) {
			console.error('❌ Error al reagendar:', err);
			throw new Error('No se pudo reagendar la cita.');
		}
	};

	const handleRescheduleClick = (appt: any) => {
		setRescheduleAppointment({
			id: appt.id,
			scheduled_at: appt.scheduled_at || new Date().toISOString(),
			patient: appt.patient,
		});
		setIsRescheduleModalOpen(true);
	};

	const getDaysUntilAppointment = (appt: any): number | null => {
		const scheduled = appt.scheduled_at ? new Date(appt.scheduled_at) : null;
		if (!scheduled || Number.isNaN(scheduled.getTime())) return null;

		const today = new Date();
		const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const startOfAppt = new Date(
			scheduled.getFullYear(),
			scheduled.getMonth(),
			scheduled.getDate(),
		);

		const diffMs = startOfAppt.getTime() - startOfToday.getTime();
		return Math.round(diffMs / (1000 * 60 * 60 * 24));
	};

	const buildWhatsappMessage = (appt: any): string => {
		const template =
			whatsappConfig?.whatsappMessageTemplate ||
			'Hola {NOMBRE_PACIENTE}, le recordamos su cita el {FECHA} a las {HORA} con el Dr/a {NOMBRE_DOCTORA} en {CLÍNICA}. Por los servicios de:\n\n{SERVICIOS}\n\npor favor confirmar con un "Asistiré" o "No Asistiré"';

		const fullName =
			[appt.patientFirstName, appt.patientLastName].filter(Boolean).join(' ') || appt.patient || 'Paciente';

		// Fecha solo con día/mes/año (sin hora)
		let dateStr = '';
		if (appt.scheduled_at) {
			try {
				const d = new Date(appt.scheduled_at);
				if (!Number.isNaN(d.getTime())) {
					dateStr = d.toLocaleDateString('es-VE', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
					});
				}
			} catch {
				dateStr = '';
			}
		}

		const timeStr = appt.time || '';

		// Nombre doctora/médico: tomar SIEMPRE el médico de la organización (rol MEDICO),
		// que viene resuelto desde el backend en doctorName. Nunca usar el nombre del asistente.
		const doctorName = (appt.doctorName as string | undefined) || '';

		// Nombre de clínica / consultorio (podríamos usar location como fallback simple)
		const clinicName = (appt.clinicName as string) || (appt.location as string) || 'consultorio';

		// Servicios: si selected_service es objeto o array, intentar listar nombres
		let serviciosTexto = '';
		try {
			let raw = appt.selected_service;
			if (!raw) {
				serviciosTexto = 'Consulta médica';
			} else {
				let data = raw;
				if (typeof data === 'string') {
					try {
						data = JSON.parse(data);
					} catch {
						// texto plano (nombre de un servicio)
						data = { name: data };
					}
				}

				const names: string[] = [];
				if (Array.isArray(data)) {
					for (const item of data) {
						if (item && typeof item === 'object' && (item as any).name) {
							names.push(String((item as any).name));
						}
					}
				} else if (data && typeof data === 'object') {
					// Podría ser un combo con services_included
					if (Array.isArray((data as any).services_included)) {
						for (const s of (data as any).services_included) {
							if (s && typeof s === 'object' && (s as any).name) {
								names.push(String((s as any).name));
							}
						}
					} else if ((data as any).name) {
						names.push(String((data as any).name));
					}
				}

				serviciosTexto = names.length > 0 ? names.join(', ') : 'Consulta médica';
			}
		} catch {
			serviciosTexto = 'Consulta médica';
		}

		return template
			.replace('{NOMBRE_PACIENTE}', fullName)
			.replace('{FECHA}', dateStr)
			.replace('{HORA}', timeStr)
			.replace('{NOMBRE_DOCTORA}', doctorName || 'su médica especialista')
			.replace('{CLÍNICA}', clinicName)
			.replace('{SERVICIOS}', serviciosTexto);
	};

	const handleWhatsappReminder = (appt: any) => {
		if (!appt.patientPhone) {
			alert('Esta cita no tiene un número de teléfono asociado al paciente.');
			return;
		}

		const rawPhone = String(appt.patientPhone).trim();
		if (!rawPhone) {
			alert('Número de teléfono del paciente inválido.');
			return;
		}

		// Lógica inteligente para formatear número (asumiendo Venezuela +58 por defecto si falta)
		let cleanPhone = rawPhone.replace(/\D/g, '');

		// Si empieza por '0' (ej: 0412...), quitamos el '0'
		if (cleanPhone.startsWith('0')) {
			cleanPhone = cleanPhone.substring(1);
		}

		// Si tiene 10 dígitos (ej: 4121234567), agregamos '58' al inicio
		if (cleanPhone.length === 10) {
			cleanPhone = '58' + cleanPhone;
		}

		// Validar que tengamos un número útil
		if (cleanPhone.length < 10) {
			alert('Número de teléfono inválido (muy corto). Verifique el número en la ficha del paciente.');
			return;
		}

		const mensaje = buildWhatsappMessage(appt);
		const encodedMessage = encodeURIComponent(mensaje);

        // Detectar si es dispositivo móvil
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        let url = '';
        
        if (isMobile) {
            // En móvil, api.whatsapp.com suele funcionar mejor para deep linking
            url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
        } else {
            // En desktop, web.whatsapp.com requiere formato internacional estricto
            // cleanPhone ya debería tener el 58 si era un número local de Venezuela
            url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
        }

		if (typeof window !== 'undefined') {
			window.open(url, '_blank');
		}
	};

	const handleViewAppointment = (appt: any) => {
		if (isReception) {
			setSelectedAppointment(appt);
			setIsModalOpen(true);
		}
	};

	if (isLoading)
		return (
			<div className="flex justify-center items-center py-20 text-gray-400">
				<Loader2 className="animate-spin w-6 h-6 mr-2" />
				Cargando citas...
			</div>
		);

	if (isError) return <p className="text-red-500 text-sm mt-4">Error al cargar las citas del día.</p>;

	if (!Array.isArray(appointments) || appointments.length === 0) {
		return <p className="text-gray-500 text-sm">No hay citas para este día.</p>;
	}

	return (
		<>
			<div className="space-y-3 sm:space-y-4 w-full min-w-0">
				{appointments.map((appt) => (
					<motion.div key={appt.id} whileHover={{ y: -3 }} className={`rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-100 shadow-sm hover:shadow-lg transition-all p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 w-full min-w-0 ${isReception ? 'cursor-pointer' : ''}`} onClick={() => isReception && handleViewAppointment(appt)}>
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-3 sm:gap-4 w-full min-w-0">
							<div className="flex-1 min-w-0 w-full sm:w-auto space-y-2">
								{/* Información del paciente */}
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<User className="w-4 h-4 text-gray-400 shrink-0" />
										<div className="flex items-center gap-2 flex-wrap">
											<h3 className="text-sm sm:text-base font-semibold text-gray-800">
												{appt.patientFirstName || appt.patientLastName ? (
													<>
														{appt.patientFirstName && <span>{appt.patientFirstName}</span>}
														{appt.patientLastName && <span> {appt.patientLastName}</span>}
													</>
												) : (
													appt.patient
												)}
											</h3>
											{appt.isUnregistered && (
												<span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
													<Users className="w-3 h-3" />
													No registrado
												</span>
											)}
										</div>
									</div>

									{/* Datos del paciente - Nombre, Apellido, Cédula, Teléfono, Edad, Correo */}
									<div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3 ml-6 space-y-1.5">
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
											{appt.patientFirstName && (
												<div className="flex items-center gap-1.5">
													<span className="font-medium text-gray-500 min-w-[60px]">Nombre:</span>
													<span className="text-gray-800">{appt.patientFirstName}</span>
												</div>
											)}
											{appt.patientLastName && (
												<div className="flex items-center gap-1.5">
													<span className="font-medium text-gray-500 min-w-[60px]">Apellido:</span>
													<span className="text-gray-800">{appt.patientLastName}</span>
												</div>
											)}
											{appt.patientIdentifier && (
												<div className="flex items-center gap-1.5">
													<FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
													<span className="font-medium text-gray-500 min-w-[60px]">Cédula:</span>
													<span className="text-gray-800">{appt.patientIdentifier}</span>
												</div>
											)}
											{appt.patientPhone && (
												<div className="flex items-center gap-1.5">
													<Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
													<span className="font-medium text-gray-500 min-w-[60px]">Teléfono:</span>
													<span className="text-gray-800">{appt.patientPhone}</span>
												</div>
											)}
											{appt.patientAge !== null && appt.patientAge !== undefined && (
												<div className="flex items-center gap-1.5">
													<span className="font-medium text-gray-500 min-w-[60px]">Edad:</span>
													<span className="text-gray-800">{appt.patientAge} años</span>
												</div>
											)}
											{appt.patientEmail && (
												<div className="flex items-center gap-1.5">
													<Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
													<span className="font-medium text-gray-500 min-w-[60px]">Correo:</span>
													<span className="text-gray-800 break-words">{appt.patientEmail}</span>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Servicio solicitado */}
								{appt.selected_service && (
									<div className="bg-teal-50 border border-teal-200 rounded-lg p-2 sm:p-3 ml-6">
										<div className="flex items-center gap-2 mb-1">
											<CreditCard className="w-4 h-4 text-teal-600 shrink-0" />
											<span className="text-xs font-semibold text-teal-900">Servicios:</span>
										</div>
                                        
                                        {/* Manejar array de servicios (nuevo formato) */}
                                        {Array.isArray(appt.selected_service) ? (
                                            <div className="space-y-2">
                                                {appt.selected_service.map((item: any, idx: number) => (
                                                    <div key={idx} className="border-b border-teal-100 last:border-0 pb-1 last:pb-0">
                                                        <div className="text-sm font-medium text-teal-800">{item.name}</div>
                                                        {item.description && <p className="text-xs text-teal-700 mt-0.5">{item.description}</p>}
                                                        {item.price !== undefined && (
                                                            <div className="text-xs text-teal-600 font-semibold">
                                                                <CurrencyDisplay 
                                                                    amount={Number(item.price)} 
                                                                    currency={item.currency || 'USD'} 
                                                                    showBoth={true}
                                                                    size="xs"
                                                                    className="gap-1 items-start"
                                                                />
                                                            </div>
                                                        )}
                                                        {/* Si es un combo */}
                                                        {item.type === 'combo' && item.serviceIds && (
                                                             <div className="mt-1">
                                                                <p className="text-[10px] font-semibold text-teal-900 opacity-80">Incluye:</p>
                                                                {/* Aquí solo tenemos serviceIds, no nombres, a menos que el backend los popule. 
                                                                    Por ahora mostramos 'Combo' indicator */}
                                                             </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            /* Manejar diferentes formatos legacy (objeto único o string) */
                                            typeof appt.selected_service === 'string' ? (
                                                <div className="text-sm font-medium text-teal-800">{appt.selected_service}</div>
                                            ) : appt.selected_service.name ? (
                                                <>
                                                    <div className="text-sm font-medium text-teal-800">{appt.selected_service.name}</div>
                                                    {appt.selected_service.description && <p className="text-xs text-teal-700 mt-1">{appt.selected_service.description}</p>}
                                                    {appt.selected_service.price && (
                                                        <div className="text-xs text-teal-600 mt-1 font-semibold">
                                                            <CurrencyDisplay 
                                                                amount={Number(appt.selected_service.price)} 
                                                                currency={appt.selected_service.currency || 'USD'} 
                                                                showBoth={true}
                                                                size="xs"
                                                                className="gap-1 items-start"
                                                            />
                                                        </div>
                                                    )}
                                                    {/* Si hay múltiples servicios incluidos (Legacy Combo structure) */}
                                                    {('services_included' in appt.selected_service && appt.selected_service.services_included && Array.isArray((appt.selected_service as any).services_included) && (appt.selected_service as any).services_included.length > 0) && (
                                                        <div className="mt-2 space-y-1">
                                                            <p className="text-xs font-semibold text-teal-900">Servicios incluidos:</p>
                                                            {(appt.selected_service as any).services_included.map((service: any, idx: number) => (
                                                                <div key={idx} className="text-xs text-teal-700 pl-2">
                                                                    • {service?.name || service}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-sm font-medium text-teal-800">Servicio no especificado</div>
                                            )
                                        )}
									</div>
								)}

								{/* Motivo de la cita */}
								{appt.reason && (
									<p className="text-xs sm:text-sm text-gray-600 ml-6">
										<span className="font-medium text-gray-700">Motivo: </span>
										{appt.reason}
									</p>
								)}

								{/* Hora y ubicación */}
								<div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-2 text-gray-600 text-xs ml-6">
									<div className="flex items-center gap-1.5">
										<Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
										<span className="font-medium text-gray-500">Hora De La Cita:</span>
										<span className="text-gray-800 font-semibold">{appt.time}</span>
									</div>
									{appt.location && (
										<div className="flex items-start gap-1.5 min-w-0 flex-1 max-w-full">
											<MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
											<div className="flex-1 min-w-0">
												<span className="font-medium text-gray-500 block mb-0.5">Dirección Del Consultorio:</span>
												<span className="text-xs leading-relaxed break-words text-gray-800" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
													{appt.location}
												</span>
											</div>
										</div>
									)}
								</div>

								{isReception && (
									<p className="text-xs text-blue-600 mt-2 flex items-center gap-1 ml-6">
										<FileText className="w-3 h-3" />
										<span>Haz clic para ver servicios y gestionar pagos</span>
									</p>
								)}

								{/* Alerta para Asistente de Citas cuando faltan 2 días para la cita */}
								{!isReception && getDaysUntilAppointment(appt) === 2 && (
									<div className="mt-2 ml-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
										<span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
											!
										</span>
										<div className="text-xs text-amber-800">
											<p className="font-semibold">Faltan 2 días para esta cita.</p>
											<p>Envía el recordatorio por WhatsApp para confirmar la asistencia del paciente.</p>
										</div>
									</div>
								)}
							</div>

							{/* Botones de acción y estado */}
							<div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
								{/* Botón de WhatsApp recordatorio */}
								{appt.patientPhone && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleWhatsappReminder(appt);
										}}
										className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all shadow-sm"
									>
										<MessageCircle className="w-3.5 h-3.5" />
										WhatsApp
									</button>
								)}

								{/* Botón de reagendar */}
								{canEdit && appt.status !== 'COMPLETADA' && appt.status !== 'CANCELADA' && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleRescheduleClick(appt);
										}}
										className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all shadow-sm hover:shadow-md">
										<CalendarClock className="w-3.5 h-3.5" />
										Reagendar
									</button>
								)}

								{/* Estado editable */}
								{canEdit && (
									<div className="relative">
										{loadingId === appt.id ? (
											<div className="flex items-center justify-center w-full sm:min-w-[160px] h-10 rounded-xl bg-gray-100 text-gray-400">
												<Loader2 className="w-4 h-4 animate-spin" />
											</div>
										) : (
											<div className="relative group">
												<select
													value={appt.status}
													onChange={(e) => {
														e.stopPropagation();
														handleStatusChange(appt.id, e.target.value);
													}}
													onClick={(e) => e.stopPropagation()}
													className={`appearance-none text-white text-xs font-bold px-4 py-2.5 w-full sm:min-w-[160px] rounded-xl cursor-pointer bg-gradient-to-r ${getStatusColor(appt.status)} hover:shadow-lg transition-all focus:ring-2 focus:ring-offset-2 focus:ring-white/50 border-2 border-white/20 min-w-0`}
													style={{ paddingRight: '2rem' }}>
													{statusOptions.map((s) => (
														<option key={s} value={s} className="text-gray-800 font-medium bg-white">
															{s}
														</option>
													))}
												</select>
												<ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white w-4 h-4 pointer-events-none group-hover:scale-110 transition-transform" />
											</div>
										)}
									</div>
								)}

								{/* Si no puede editar, solo mostrar estado */}
								{!canEdit && <div className={`text-white text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r ${getStatusColor(appt.status)} shadow-md border-2 border-white/20`}>{appt.status}</div>}
							</div>
						</div>
					</motion.div>
				))}
			</div>

			{/* Modal para Recepción: ver servicios y gestionar pagos */}
			{isReception && (
				<ReceptionAppointmentModal
					isOpen={isModalOpen}
					onClose={() => {
						setIsModalOpen(false);
						setSelectedAppointment(null);
					}}
					appointment={selectedAppointment}
					organizationId={organizationId}
				/>
			)}

			{/* Modal para reagendar citas */}
			<RescheduleModal
				isOpen={isRescheduleModalOpen}
				onClose={() => {
					setIsRescheduleModalOpen(false);
					setRescheduleAppointment(null);
				}}
				appointment={rescheduleAppointment}
				onReschedule={handleReschedule}
			/>
		</>
	);
}
