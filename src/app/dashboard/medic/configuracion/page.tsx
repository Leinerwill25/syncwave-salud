'use client';

import { useState, useEffect } from 'react';
import { Settings, User, Clock, Bell, Lock, Building2, Stethoscope } from 'lucide-react';
import ProfessionalProfile from '@/components/medic/ProfessionalProfile';
import AvailabilitySchedule from '@/components/medic/AvailabilitySchedule';
import NotificationPreferences from '@/components/medic/NotificationPreferences';
import SecuritySettings from '@/components/medic/SecuritySettings';
import type { MedicConfig } from '@/types/medic-config';

type TabType = 'profile' | 'availability' | 'notifications' | 'security';

export default function MedicConfigurationPage() {
	const [activeTab, setActiveTab] = useState<TabType>('profile');
	const [loading, setLoading] = useState(true);
	const [config, setConfig] = useState<MedicConfig | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadConfig();
	}, []);

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

	const tabs: { id: TabType; label: string; icon: typeof Settings }[] = [
		{ id: 'profile', label: 'Perfil Profesional', icon: User },
		{ id: 'availability', label: 'Horarios', icon: Clock },
		{ id: 'notifications', label: 'Preferencias', icon: Bell },
		{ id: 'security', label: 'Seguridad', icon: Lock },
	];

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
					</div>
				</div>
			</div>
		</div>
	);
}

