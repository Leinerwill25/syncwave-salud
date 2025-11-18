'use client';

import { useState, useEffect } from 'react';
import { Settings, User, Clock, Bell, Lock, Building2, Stethoscope } from 'lucide-react';
import ProfessionalProfile from '@/components/medic/ProfessionalProfile';
import AvailabilitySchedule from '@/components/medic/AvailabilitySchedule';
import NotificationPreferences from '@/components/medic/NotificationPreferences';
import SecuritySettings from '@/components/medic/SecuritySettings';

type MedicConfig = {
	user: {
		id: string;
		name: string | null;
		email: string | null;
		organizationId: string | null;
	};
	isAffiliated: boolean;
	clinicProfile: {
		name: string;
		specialties: any[];
	} | null;
	config: {
		specialty: string | null;
		privateSpecialty: string | null;
		signature: string | null;
		photo: string | null;
		credentials: any;
		creditHistory: any;
		availability: any;
		notifications: {
			whatsapp: boolean;
			email: boolean;
			push: boolean;
		};
		services: any[];
	};
};

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
		} catch (err: any) {
			console.error('Error cargando configuración:', err);
			setError(err.message || 'Error al cargar la configuración');
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
			<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
				<div className="max-w-7xl mx-auto">
					<div className="bg-white rounded-2xl shadow-lg p-8">
						<div className="animate-pulse space-y-4">
							<div className="h-8 bg-gray-200 rounded w-1/3"></div>
							<div className="h-4 bg-gray-200 rounded w-1/2"></div>
							<div className="mt-8 space-y-4">
								<div className="h-12 bg-gray-200 rounded"></div>
								<div className="h-64 bg-gray-200 rounded"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
				<div className="max-w-7xl mx-auto">
					<div className="bg-white rounded-2xl shadow-lg p-8">
						<div className="text-center py-12">
							<div className="text-red-500 text-xl font-semibold mb-2">Error</div>
							<div className="text-gray-600 mb-4">{error}</div>
							<button
								onClick={loadConfig}
								className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
		<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-6">
					<div className="flex items-center gap-3 mb-2">
						<div className="p-3 bg-indigo-100 rounded-xl">
							<Settings className="w-6 h-6 text-indigo-600" />
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Configuración del Médico</h1>
							<p className="text-gray-600 mt-1">Gestiona tu perfil profesional y preferencias</p>
						</div>
					</div>

					{/* Badge de afiliación */}
					{config.isAffiliated && config.clinicProfile ? (
						<div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
							<Building2 className="w-4 h-4 text-blue-600" />
							<span className="text-sm font-medium text-blue-900">
								Afiliado a: {config.clinicProfile.name}
							</span>
						</div>
					) : (
						<div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
							<Stethoscope className="w-4 h-4 text-purple-600" />
							<span className="text-sm font-medium text-purple-900">
								Consultorio Privado
							</span>
						</div>
					)}
				</div>

				{/* Tabs */}
				<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
					<div className="border-b border-gray-200 bg-gray-50 px-6">
						<div className="flex gap-2 overflow-x-auto">
							{tabs.map((tab) => {
								const Icon = tab.icon;
								return (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
											activeTab === tab.id
												? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
												: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
										}`}
									>
										<Icon className="w-5 h-5" />
										{tab.label}
									</button>
								);
							})}
						</div>
					</div>

					{/* Content */}
					<div className="p-6">
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

