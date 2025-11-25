'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { MedicConfig } from '@/types/medic-config';

export default function ProfileCompleteGuard({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [medicConfig, setMedicConfig] = useState<MedicConfig | null>(null);

	useEffect(() => {
		loadMedicConfig();
	}, []);

	// Recargar configuración cuando cambia la ruta (por si se completó el perfil)
	useEffect(() => {
		if (pathname?.includes('/configuracion')) {
			loadMedicConfig();
		}
	}, [pathname]);

	// Escuchar evento personalizado para recargar configuración después de guardar
	useEffect(() => {
		const handleConfigUpdate = () => {
			loadMedicConfig();
		};

		window.addEventListener('medicConfigUpdated', handleConfigUpdate);
		return () => {
			window.removeEventListener('medicConfigUpdated', handleConfigUpdate);
		};
	}, []);

	const loadMedicConfig = async () => {
		try {
			const res = await fetch('/api/medic/config', {
				credentials: 'include',
			});

			if (res.ok) {
				const data = await res.json();
				setMedicConfig(data);
			}
		} catch (err) {
			console.error('Error cargando configuración del médico:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// Si está cargando, esperar
		if (loading) return;

		// Si no hay config, permitir acceso (puede ser un error de carga)
		if (!medicConfig) return;

		// Si el perfil está completo, permitir acceso a todas las rutas
		if (medicConfig.isProfileComplete) return;

		// Si el perfil no está completo y está intentando acceder a una ruta diferente a configuración, redirigir
		const configRoutes = ['/dashboard/medic/configuracion', '/dashboard/medic/configuracion/consultorio'];
		const isConfigRoute = configRoutes.some(route => pathname?.startsWith(route));

		if (!isConfigRoute) {
			router.push('/dashboard/medic/configuracion');
		}
	}, [loading, medicConfig, pathname, router]);

	// Mientras carga, mostrar el contenido (evitar flash)
	if (loading) {
		return <>{children}</>;
	}

	// Si el perfil no está completo y no está en una ruta de configuración, no mostrar contenido (será redirigido)
	if (medicConfig && !medicConfig.isProfileComplete) {
		const configRoutes = ['/dashboard/medic/configuracion', '/dashboard/medic/configuracion/consultorio'];
		const isConfigRoute = configRoutes.some(route => pathname?.startsWith(route));

		if (!isConfigRoute) {
			return (
				<div className="flex items-center justify-center min-h-[400px]">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
						<p className="text-gray-600">Redirigiendo a configuración...</p>
					</div>
				</div>
			);
		}
	}

	return <>{children}</>;
}

