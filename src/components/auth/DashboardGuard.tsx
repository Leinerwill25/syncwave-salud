// components/auth/DashboardGuard.tsx
// Componente guard para proteger páginas de dashboard

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

type UserRole = 'ADMIN' | 'MEDICO' | 'ENFERMERA' | 'ENFERMERO' | 'RECEPCION' | 'FARMACIA' | 'PACIENTE';

interface DashboardGuardProps {
	children: React.ReactNode;
	allowedRoles: UserRole[];
}

export default function DashboardGuard({ children, allowedRoles }: DashboardGuardProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function checkAuth() {
			try {
				// Verificar sesión y rol
				const response = await fetch('/api/auth/me', {
					credentials: 'include',
				});

				if (!response.ok) {
					// No autenticado
					router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
					return;
				}

				const data = await response.json();
				const userRole = data?.data?.role;

				if (!userRole || !allowedRoles.includes(userRole)) {
					// Rol incorrecto, redirigir a su dashboard
					let redirectPath = '/dashboard';
					switch (userRole) {
						case 'ADMIN':
							redirectPath = '/dashboard/clinic';
							break;
						case 'MEDICO':
							redirectPath = '/dashboard/medic';
							break;
						case 'FARMACIA':
							redirectPath = '/dashboard/pharmacy';
							break;
						case 'PACIENTE':
							redirectPath = '/dashboard/patient';
							break;
					}
					router.push(redirectPath);
					return;
				}

				setIsAuthorized(true);
			} catch (error) {
				console.error('[Dashboard Guard] Error:', error);
				router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
			} finally {
				setIsLoading(false);
			}
		}

		checkAuth();
	}, [router, pathname, allowedRoles]);

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
					<p className="text-slate-700">Verificando acceso...</p>
				</div>
			</div>
		);
	}

	if (!isAuthorized) {
		return null; // La redirección ya se está manejando
	}

	return <>{children}</>;
}

