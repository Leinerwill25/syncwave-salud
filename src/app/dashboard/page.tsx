'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

const supabase = createSupabaseBrowserClient();

export default function DashboardRedirectPage() {
	const router = useRouter();

	useEffect(() => {
		async function determineRedirect() {
			try {
				// Primero verificar si es un usuario de rol usando la API
				try {
					const roleUserRes = await fetch('/api/role-users/login', {
						credentials: 'include',
					});

					if (roleUserRes.ok) {
						const roleUserData = await roleUserRes.json();
						if (roleUserData.authenticated && roleUserData.user) {
							// Es un usuario de rol, redirigir al dashboard de usuarios de rol
							router.replace('/dashboard/role-user');
							return;
						}
					}
				} catch (err) {
					// Si falla la verificación de usuario de rol, continuar con la verificación normal
					console.log('No hay sesión de usuario de rol activa');
				}

				// Si no es usuario de rol, verificar si hay sesión de Supabase Auth
				const { data: { session } } = await supabase.auth.getSession();
				if (!session?.user) {
					router.replace('/login');
					return;
				}

				// Verificar si el usuario tiene el flag isRoleUser en metadata
				const isRoleUser = session.user.user_metadata?.isRoleUser === true;
				
				// Si es usuario de rol pero no tiene sesión de rol activa, redirigir al login de rol
				if (isRoleUser) {
					router.replace('/login/role-user');
					return;
				}

				// Obtener el rol del usuario desde la base de datos
				const res = await fetch(`/api/auth/profile?authId=${encodeURIComponent(session.user.id)}`, {
					headers: {
						'Authorization': `Bearer ${session.access_token}`
					}
				});
				if (res.ok) {
					const data = await res.json();
					const role = data?.data?.role;

					// Redirigir según el rol
					switch (role) {
						case 'ADMIN':
							router.replace('/dashboard/clinic');
							break;
						case 'MEDICO':
							router.replace('/dashboard/medic');
							break;
						case 'FARMACIA':
							router.replace('/dashboard/pharmacy');
							break;
						case 'PACIENTE':
							router.replace('/dashboard/patient');
							break;
						case 'RECEPCION':
							// Si es RECEPCION, verificar si es usuario de rol
							if (isRoleUser) {
								router.replace('/login/role-user');
							} else {
								// RECEPCION que no es usuario de rol, no tiene dashboard específico
								router.replace('/login');
							}
							break;
						case 'ENFERMERO':
						case 'ENFERMERA':
							router.replace('/nurse/dashboard');
							break;
						default:
							router.replace('/login');
							break;
					}
				} else {
					// Si no se puede obtener el perfil, redirigir al login
					router.replace('/login');
				}
			} catch (err) {
				console.error('Error determinando redirección:', err);
				router.replace('/login');
			}
		}

		determineRedirect();
	}, [router]);

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
			<div className="text-center">
				<div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mb-4"></div>
				<p className="text-slate-600 text-lg">Redirigiendo...</p>
			</div>
		</div>
	);
}

