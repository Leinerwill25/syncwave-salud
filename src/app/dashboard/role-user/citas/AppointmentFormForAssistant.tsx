'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import AppointmentForm from '@/app/dashboard/medic/components/AppointmentForm';
import { getRoleUserSession } from '@/lib/role-user-auth-client';
import axios from 'axios';

interface Props {
	onClose: () => void;
	organizationId: string;
}

export default function AppointmentFormForAssistant({ onClose, organizationId }: Props) {
	const [roleUserId, setRoleUserId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadRoleUserSession();
	}, []);

	const loadRoleUserSession = async () => {
		try {
			const session = await getRoleUserSession();
			if (session) {
				setRoleUserId(session.roleUserId);
			}
		} catch (err) {
			console.error('[AppointmentFormForAssistant] Error cargando sesión:', err);
		} finally {
			setLoading(false);
		}
	};

	// Interceptar axios para agregar createdByRoleUserId y redirigir llamadas de servicios
	useEffect(() => {
		if (!roleUserId) return;

		const interceptor = axios.interceptors.request.use(
			(config) => {
				// Si es una llamada POST a /api/appointments, agregar createdByRoleUserId
				if (config.url?.includes('/api/appointments') && config.method === 'post' && config.data) {
					config.data = {
						...config.data,
						createdByRoleUserId: roleUserId,
					};
				}

				// Si es una llamada GET a /api/medic/services, redirigir a /api/role-users/services
				if (config.url?.includes('/api/medic/services') && config.method === 'get') {
					config.url = config.url.replace('/api/medic/services', '/api/role-users/services');
				}

				return config;
			},
			(error) => {
				return Promise.reject(error);
			}
		);

		return () => {
			axios.interceptors.request.eject(interceptor);
		};
	}, [roleUserId]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="w-6 h-6 animate-spin text-teal-600" />
			</div>
		);
	}

	return (
		<div className="relative">
			<AppointmentForm />
		</div>
	);
}
