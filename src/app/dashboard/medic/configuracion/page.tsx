'use client';

import { useState, useEffect } from 'react';
import { Settings, User, Clock, Bell, Lock, Building2, Stethoscope, FileText } from 'lucide-react';
import GenericReportConfig from '@/components/medic/GenericReportConfig';
import ProfessionalProfile from '@/components/medic/ProfessionalProfile';
import AvailabilitySchedule from '@/components/medic/AvailabilitySchedule';
import NotificationPreferences from '@/components/medic/NotificationPreferences';
import SecuritySettings from '@/components/medic/SecuritySettings';
import type { MedicConfig } from '@/types/medic-config';

type TabType = 'profile' | 'availability' | 'notifications' | 'security' | 'report';

export default function MedicConfigurationPage() {
	const [activeTab, setActiveTab] = useState<TabType>('profile');
	const [loading, setLoading] = useState(true);
	const [config, setConfig] = useState<MedicConfig | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [gamificationStatus, setGamificationStatus] = useState<{
		completed_missions: string[];
		total_points: number;
		current_level: number;
	} | null>(null);

	useEffect(() => {
		loadConfig();
		fetchGamification();
	}, []);

	const fetchGamification = async () => {
		try {
			const res = await fetch('/api/gamification/status');
			if (res.ok) {
				const data = await res.json();
				setGamificationStatus(data);
			}
		} catch (err) {
			console.warn('[Page] No se pudo cargar el estado de gamificación:', err);
		}
	};

	const loadConfig = async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch('/api/medic/config', {
				credentials: 'include',
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al cargar configuración');
			}

			const data = await res.json();
			setConfig(data);
		} catch (err) {
			console.error('Error cargando configuración:', err);
			const errorMessage = err instanceof Error ? err.message : 'Error al cargar la configuración';
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};


	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6">
				<div className="max-w-7xl mx-auto">
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
						<div className="animate-pulse space-y-4">
							<div className="h-6 sm:h-8 bg-gray-200 rounded w-1/3"></div>
							<div className="h-4 bg-gray-200 rounded w-1/2"></div>
							<div className="mt-6 sm:mt-8 space-y-4">
								<div className="h-10 sm:h-12 bg-gray-200 rounded"></div>
								<div className="h-48 sm:h-64 bg-gray-200 rounded"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6">
				<div className="max-w-7xl mx-auto">
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
						<div className="text-center py-8 sm:py-12">
							<div className="text-red-500 text-lg sm:text-xl font-semibold mb-2">Error</div>
							<div className="text-gray-600 mb-4 text-sm sm:text-base">{error}</div>
							<button
								onClick={loadConfig}
								className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base"
							>
								Reintentar
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!config) {
		return null;
	}

	const tabs: { id: TabType; label: string; icon: typeof Settings }[] = [
		{ id: 'profile', label: 'Perfil Profesional', icon: User },
		{ id: 'availability', label: 'Horarios', icon: Clock },
		{ id: 'notifications', label: 'Preferencias', icon: Bell },
		{ id: 'security', label: 'Seguridad', icon: Lock },
		{ id: 'report', label: config.isAffiliated ? 'Informe Genérico (Solo lectura)' : 'Informe Genérico', icon: FileText },
	];

	const hasSchedules = config.config?.availability?.schedule && 
		Object.values(config.config.availability.schedule).some((daySlots: any) => 
			daySlots?.[0]?.enabled === true
		);

	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6">
			<div className="max-w-7xl mx-auto">
				{/* Alerta si el perfil no está completo */}
				{!config.isProfileComplete && (
					<div className="mb-4 sm:mb-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg shadow-sm">
						<div className="flex items-start">
							<div className="flex-shrink-0">
								<Settings className="w-5 h-5 text-amber-600" />
							</div>
							<div className="ml-3 flex-1">
								<h3 className="text-sm font-semibold text-amber-800">
									Completa tu perfil profesional
								</h3>
								<div className="mt-2 text-sm text-amber-700">
									<p className="mb-2">
										Para acceder a todas las funcionalidades del sistema, necesitas completar tu perfil profesional con la siguiente información:
									</p>
									<ul className="list-disc list-inside space-y-1 ml-2">
										<li>Nombre completo</li>
										<li>Especialidad {config.isAffiliated ? 'en la clínica' : 'privada'}</li>
										<li>
											<strong>Licencia médica completa:</strong>
											<ul className="list-circle list-inside ml-4 mt-1 space-y-0.5">
												<li>Tipo de licencia</li>
												<li>Número de licencia</li>
												<li>Emitida por (organismo emisor)</li>
												<li>Fecha de expiración (no vencida)</li>
												<li>Al menos un documento de credenciales subido</li>
											</ul>
										</li>
										<li>
											<strong>Historial crediticio básico:</strong>
											<ul className="list-circle list-inside ml-4 mt-1 space-y-0.5">
												<li>Universidad</li>
												<li>Título obtenido</li>
												<li>Año de graduación</li>
											</ul>
										</li>
									</ul>
									<p className="mt-3 font-medium">
										Esta información es necesaria para validar que eres un especialista legalmente titulado.
									</p>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Mensaje de Ash si el perfil está completo */}
				{config.isProfileComplete && (
					<div className="mb-6 p-5 bg-linear-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl shadow-sm">
						<div className="flex items-start gap-4">
							<div className="shrink-0 w-12 h-12 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
								Ash
							</div>
							<div className="flex-1">
								{(() => {
									const completed = gamificationStatus?.completed_missions || [];
									
									// Fallback local si el API no responde o no tiene datos
									const isM2Complete = completed.includes('M2') || hasSchedules;
									const isM1Complete = completed.includes('M1') || config.isProfileComplete;
									
									if (!isM1Complete) {
										return (
											<>
												<h3 className="text-base font-bold text-indigo-900 mb-1">
													¡Bienvenido a ASHIRA! 🚀
												</h3>
												<p className="text-sm text-indigo-700 leading-relaxed mb-3">
													Para empezar, completa tu **Perfil Profesional**. Esto permitirá que los pacientes te reconozcan y que el sistema valide tus credenciales.
												</p>
												<div className="bg-white/80 backdrop-blur-xs rounded-lg p-3 border border-indigo-50">
													<p className="text-xs font-semibold text-purple-700 uppercase mb-1">Próximo Paso:</p>
													<p className="text-sm text-gray-700 font-medium">
														Completa los campos requeridos en la pestaña "Perfil Profesional".
													</p>
												</div>
											</>
										);
									}
									
									if (!isM2Complete) {
										return (
											<>
												<h3 className="text-base font-bold text-indigo-900 mb-1">
													¡En hora buena, has completado la primera etapa! 🎉
												</h3>
												<p className="text-sm text-indigo-700 leading-relaxed mb-3">
													Ya has completado tu perfil profesional. ¡Excelente trabajo! Ahora te voy a seguir acompañando para indicarte los siguientes pasos.
												</p>
												<div className="bg-white/80 backdrop-blur-xs rounded-lg p-3 border border-indigo-50">
													<p className="text-xs font-semibold text-purple-700 uppercase mb-1">Próximo Paso:</p>
													<p className="text-sm text-gray-700 font-medium">
														Configura tus <span className="text-indigo-600 font-bold">Horarios de Disponibilidad</span>. Ve a la pestaña "Horarios" arriba y define en qué días y horas atiendes.
													</p>
												</div>
											</>
										);
									}
									
									if (!completed.includes('M3')) {
										return (
											<>
												<h3 className="text-base font-bold text-indigo-900 mb-1">
													¡Horarios configurados! 🕒
												</h3>
												<p className="text-sm text-indigo-700 leading-relaxed mb-3">
													Vas por muy buen camino. Ahora debes configurar tu **Consultorio Privado** o la **Moneda** de cobro para poder emitir recetas y cobrar.
												</p>
												<div className="bg-white/80 backdrop-blur-xs rounded-lg p-3 border border-indigo-50">
													<p className="text-xs font-semibold text-purple-700 uppercase mb-1">Próximo Paso:</p>
													<p className="text-sm text-gray-700 font-medium">
														Ve al módulo de <span className="text-indigo-600 font-bold">Consultorio Privado</span> o <span className="text-indigo-600 font-bold">Moneda</span> en el menú lateral.
													</p>
												</div>
											</>
										);
									}
									
									if (!completed.includes('M4')) {
										return (
											<>
												<h3 className="text-base font-bold text-indigo-900 mb-1">
													¡Espacio de trabajo listo! 🏢
												</h3>
												<p className="text-sm text-indigo-700 leading-relaxed mb-3">
													Ahora configura tu **Plantilla de Informe** para que puedas generar informes médicos rápidamente con IA.
												</p>
												<div className="bg-white/80 backdrop-blur-xs rounded-lg p-3 border border-indigo-50">
													<p className="text-xs font-semibold text-purple-700 uppercase mb-1">Próximo Paso:</p>
													<p className="text-sm text-gray-700 font-medium">
														Ve al módulo de <span className="text-indigo-600 font-bold">Plantillas de Informe</span> en el menú lateral.
													</p>
												</div>
											</>
										);
									}
									
									if (!completed.includes('M5')) {
										return (
											<>
												<h3 className="text-base font-bold text-indigo-900 mb-1">
													¡Casi listo! 📱
												</h3>
												<p className="text-sm text-indigo-700 leading-relaxed mb-3">
													Por último, conecta tu **WhatsApp** para que tus pacientes reciban recordatorios automáticos de sus citas.
												</p>
												<div className="bg-white/80 backdrop-blur-xs rounded-lg p-3 border border-indigo-50">
													<p className="text-xs font-semibold text-purple-700 uppercase mb-1">Próximo Paso:</p>
													<p className="text-sm text-gray-700 font-medium">
														Ve al módulo de <span className="text-indigo-600 font-bold">Integración WhatsApp</span> en el menú lateral.
													</p>
												</div>
											</>
										);
									}
									
									return (
										<>
											<h3 className="text-base font-bold text-indigo-900 mb-1">
												¡Felicidades! Has completado la hoja de ruta. 🏆
											</h3>
											<p className="text-sm text-indigo-700 leading-relaxed mb-3">
												Has completado todas las misiones iniciales. Ya tienes tu consultorio digital 100% operativo y optimizado.
											</p>
											<div className="bg-white/80 backdrop-blur-xs rounded-lg p-3 border border-indigo-50">
												<p className="text-xs font-semibold text-purple-700 uppercase mb-1">Estado:</p>
												<p className="text-sm text-gray-700 font-medium">
													¡Ya estás listo para atender a tus pacientes con todo el poder de ASHIRA!
												</p>
											</div>
										</>
									);
								})()}
							</div>
						</div>
					</div>
				)}

				{/* Header */}
				<div className="mb-4 sm:mb-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-2">
						<div className="p-2 sm:p-3 bg-indigo-100 rounded-lg sm:rounded-xl">
							<Settings className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
						</div>
						<div>
							<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Configuración del Médico</h1>
							<p className="text-xs sm:text-sm text-gray-600 mt-1">Gestiona tu perfil profesional y preferencias</p>
						</div>
					</div>

					{/* Badge de afiliación */}
					{config.isAffiliated && config.clinicProfile ? (
						<div className="mt-3 sm:mt-4 inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs sm:text-sm">
							<Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
							<span className="font-medium text-blue-900">
								Afiliado a: {config.clinicProfile.name}
							</span>
						</div>
					) : (
						<div className="mt-3 sm:mt-4 inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-50 border border-purple-200 rounded-lg text-xs sm:text-sm">
							<Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
							<span className="font-medium text-purple-900">
								Consultorio Privado
							</span>
						</div>
					)}
				</div>

				{/* Tabs */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
					<div className="border-b border-gray-200 bg-gray-50 px-3 sm:px-6">
						<div className="flex gap-1 sm:gap-2 overflow-x-auto">
							{tabs.map((tab) => {
								const Icon = tab.icon;
								return (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 font-semibold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
											activeTab === tab.id
												? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
												: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
										}`}
									>
										<Icon className="w-4 h-4 sm:w-5 sm:h-5" />
										<span className="hidden sm:inline">{tab.label}</span>
										<span className="sm:hidden">{tab.label.split(' ')[0]}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Content */}
					<div className="p-4 sm:p-6">
						{activeTab === 'profile' && (
							<ProfessionalProfile 
								config={config} 
								onUpdate={loadConfig}
							/>
						)}
						{activeTab === 'availability' && (
							<AvailabilitySchedule 
								config={config} 
								onUpdate={loadConfig}
							/>
						)}
						{activeTab === 'notifications' && (
							<NotificationPreferences 
								config={config} 
								onUpdate={loadConfig}
							/>
						)}
						{activeTab === 'security' && (
							<SecuritySettings 
								config={config} 
								onUpdate={loadConfig}
							/>
						)}
						{activeTab === 'report' && (
							<>
								{config.isAffiliated && (
									<div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
										<Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
										<div>
											<p className="text-sm font-semibold text-amber-800">Informe genérico (solo lectura)</p>
											<p className="text-xs text-amber-700 mt-1">
												Estás afiliado a {config.clinicProfile?.name ?? 'una clínica'}. El diseño del informe genérico lo gestiona el director de la clínica. Solo puedes visualizarlo.
											</p>
										</div>
									</div>
								)}
								<GenericReportConfig readOnly={config.isAffiliated} />
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

