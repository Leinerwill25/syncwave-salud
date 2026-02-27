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
							const roleName = roleUserData.user.role?.name?.toUpperCase();
							
							// Si es enfermería, ir al dashboard de enfermería sin importar que sea usuario de rol
							if (roleName === 'ENFERMERO' || roleName === 'ENFERMERA') {
								router.replace('/dashboard/nurse');
							} else {
								// Otros roles (Asistentes, Recepción, etc.) van al panel de role-user
								router.replace('/dashboard/role-user');
							}
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
						case 'ENFERMERO':
						case 'ENFERMERA':
							// Si es ENFERMERO/A siempre va a /dashboard/nurse
							if (role === 'ENFERMERO' || role === 'ENFERMERA') {
								router.replace('/dashboard/nurse');
							} else if (isRoleUser) {
								// Otros roles de "Role User" que no son enfermería van al login específico
								router.replace('/login/role-user');
							} else {
								router.replace('/login');
							}
							break;
						default:
							if (isRoleUser) {
								router.replace('/login/role-user');
							} else {
								router.replace('/login');
							}
							break;
					}
				} else {
					// Si no se puede obtener el perfil y es usuario de rol, intentar el login de rol
					if (isRoleUser) {
						router.replace('/login/role-user');
					} else {
						router.replace('/login');
					}
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

