'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon, ChevronDown, Settings } from 'lucide-react';
import UserNotificationsBell from '@/components/notifications/UserNotificationsBell';
import { createSupabaseBrowserClient } from '@/app/adapters/client'; // <--- singleton

const supabaseClient = createSupabaseBrowserClient(); // solo una instancia

/** Helper para iniciales de usuario */
function initialsFromName(name?: string | null) {
	if (!name) return 'SW';
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Obtener URL de perfil según el rol */
function getProfileUrl(role: string | null): string {
	switch (role) {
		case 'PACIENTE':
			return '/dashboard/patient/configuracion';
		case 'MEDICO':
			return '/dashboard/medic/configuracion';
		case 'ADMIN':
		case 'CLINICA':
			return '/dashboard/clinic/profile';
		case 'FARMACIA':
			return '/dashboard/pharmacy/profile';
		default:
			return '/dashboard';
	}
}

/** Obtener URL de configuración según el rol */
function getSettingsUrl(role: string | null): string {
	switch (role) {
		case 'PACIENTE':
			return '/dashboard/patient/configuracion';
		case 'MEDICO':
			return '/dashboard/medic/configuracion';
		case 'ADMIN':
		case 'CLINICA':
			return '/dashboard/clinic/settings';
		case 'FARMACIA':
			return '/dashboard/pharmacy/settings';
		default:
			return '/dashboard';
	}
}

export default function DashboardNavBar(): React.ReactElement {
	const router = useRouter();
	const [user, setUser] = useState<any | null>(null);
	const [userRole, setUserRole] = useState<string | null>(null);
	const [displayName, setDisplayName] = useState<string>('Panel');
	const [loading, setLoading] = useState<boolean>(true);
	const [signOutLoading, setSignOutLoading] = useState<boolean>(false);
	const [menuOpen, setMenuOpen] = useState<boolean>(false);
	const menuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		let mounted = true;

		async function initUser() {
			setLoading(true);
			try {
				const { data: sessionData } = await supabaseClient.auth.getSession();
				let u = (sessionData as any)?.session?.user ?? null;

				if (!u) {
					const { data, error } = await supabaseClient.auth.getUser();
					if (!error && data?.user) u = data.user;
				}

				if (mounted && u) {
					setUser(u);
					const fullName = (u.user_metadata?.fullName ?? `${u.user_metadata?.firstName ?? ''} ${u.user_metadata?.lastName ?? ''}`).trim() || 'Panel';
					setDisplayName(fullName);

					// Obtener rol del usuario desde la base de datos
					try {
						const { data: userData } = await supabaseClient.from('User').select('role').eq('authId', u.id).maybeSingle();

						if (userData?.role) {
							setUserRole(userData.role);
						}
					} catch (err) {
						console.error('Error obteniendo rol:', err);
					}
				}
			} catch (err) {
				console.error('Error inicializando usuario:', err);
			} finally {
				if (mounted) setLoading(false);
			}
		}

		initUser();

		// Escucha cambios de auth
		let authListener: any = null;
		try {
			const sub = supabaseClient?.auth.onAuthStateChange((event, session) => {
				if (event === 'SIGNED_OUT') {
					setUser(null);
					setDisplayName('Panel');
				}
				if (event === 'SIGNED_IN' && session?.user) {
					const u = session.user;
					setUser(u);
					setDisplayName(u.user_metadata?.fullName ?? u.email ?? 'Panel');
				}
			});
			authListener = (sub as any)?.data ?? sub;
		} catch {}

		return () => {
			mounted = false;
			try {
				if (authListener?.subscription?.unsubscribe) authListener.subscription.unsubscribe();
				else if (authListener?.unsubscribe) authListener.unsubscribe();
			} catch {}
		};
	}, []);

	async function handleLogout() {
		setSignOutLoading(true);
		try {
			const { error } = await supabaseClient.auth.signOut();
			if (error) console.error('Error al cerrar sesión:', error);
		} catch (err) {
			console.error(err);
		} finally {
			setSignOutLoading(false);
			router.push('/login');
		}
	}

	return (
		<header className="w-full sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center h-16 gap-4">
					{/* Logo */}
					<div className="flex items-center gap-3 min-w-0">
						<Link href="/" className="flex items-center gap-3">
							<div className="relative h-10 w-10 rounded-lg overflow-hidden shadow-inner" aria-hidden>
								<Image src="/3.png" alt="KAVIRA" fill style={{ objectFit: 'cover' }} />
							</div>
							<div className="hidden md:flex flex-col leading-none">
								<span className="text-sm font-semibold text-slate-900">KAVIRA</span>
								<span className="text-xs text-slate-500">Plataforma de Salud</span>
							</div>
						</Link>
					</div>

					{/* Center: Bienvenido */}
					<div className="flex-1 flex items-center justify-center min-w-0">
						<div className="flex flex-col items-center min-w-0 w-full px-2">
							<span className="text-xs text-slate-500">Bienvenido</span>
							<span className="text-sm md:text-lg font-semibold text-slate-900 truncate w-full text-center" title={displayName}>
								{loading ? 'Cargando...' : displayName}
							</span>
						</div>
					</div>

					{/* Right: Notificaciones + Perfil */}
					<div className="flex items-center gap-3">
						<div className="relative z-[60]">
							<UserNotificationsBell user={user} role={user?.role} />
						</div>

						<div className="relative z-[50]" ref={menuRef}>
							<button onClick={() => setMenuOpen((s) => !s)} aria-expanded={menuOpen} aria-haspopup="true" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition" title="Cuenta">
								<div className="hidden md:flex h-9 w-9 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 items-center justify-center text-white font-semibold shadow">{user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt={displayName} className="h-9 w-9 rounded-full object-cover" /> : <span className="select-none text-sm">{initialsFromName(displayName)}</span>}</div>

								<div className="hidden md:flex flex-col items-start">
									<span className="text-sm font-semibold text-slate-900 leading-none">{displayName}</span>
									<span className="text-xs text-slate-500 leading-none">Mi cuenta</span>
								</div>

								<ChevronDown className={`hidden md:block w-4 h-4 text-slate-500 transition-transform ${menuOpen ? 'rotate-180' : 'rotate-0'}`} />
								{/* Icono simple en móvil */}
								<UserIcon className="md:hidden w-5 h-5 text-slate-600" />
							</button>

							<div role="menu" aria-hidden={!menuOpen} className={`absolute right-0 mt-2 w-56 rounded-lg bg-white border border-slate-100 shadow-lg py-2 transition-all duration-150 transform origin-top-right z-[55] ${menuOpen ? 'opacity-100 scale-100' : 'opacity-0 pointer-events-none scale-95'}`}>
								<Link href={getProfileUrl(userRole)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setMenuOpen(false)}>
									<UserIcon className="w-4 h-4 text-slate-500" /> Perfil
								</Link>
								<Link href={getSettingsUrl(userRole)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setMenuOpen(false)}>
									<Settings className="w-4 h-4 text-slate-500" /> Configuración
								</Link>
								<div className="border-t border-slate-100 my-1" />
								<button onClick={handleLogout} disabled={signOutLoading} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition disabled:opacity-60">
									<LogOut className="w-4 h-4" />
									{signOutLoading ? 'Cerrando...' : 'Cerrar sesión'}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}
