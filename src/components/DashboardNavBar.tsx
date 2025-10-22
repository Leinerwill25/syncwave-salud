'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, Bell, ChevronDown, Settings } from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let supabaseClient: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
	supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
	if (typeof window !== 'undefined') {
		// eslint-disable-next-line no-console
		console.warn('NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no definidas');
	}
}

/** Helpers */
function initialsFromName(name?: string | null) {
	if (!name) return 'SW';
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type NotificationItem = {
	id: string;
	type: string;
	title?: string | null;
	message: string;
	payload?: any;
	createdAt: string;
	read?: boolean;
};

export default function DashboardNavBar(): React.ReactElement {
	const router = useRouter();
	const [user, setUser] = useState<any | null>(null);
	const [displayName, setDisplayName] = useState<string>('Panel');
	const [loading, setLoading] = useState<boolean>(true);
	const [signOutLoading, setSignOutLoading] = useState<boolean>(false);
	const [menuOpen, setMenuOpen] = useState<boolean>(false);
	const menuRef = useRef<HTMLDivElement | null>(null);

	// notifications
	const [notifications, setNotifications] = useState<NotificationItem[]>([]);
	const [notifOpen, setNotifOpen] = useState<boolean>(false);
	const channelRef = useRef<any | null>(null);

	useEffect(() => {
		let mounted = true;

		async function init() {
			setLoading(true);
			try {
				if (!supabaseClient) {
					setUser(null);
					setDisplayName('Panel');
					return;
				}

				// reconstruir sesión / obtener user
				const { data: sessionData } = await supabaseClient.auth.getSession().catch(() => ({ data: { session: null } }));
				let u = (sessionData as any)?.session?.user ?? null;
				if (!u) {
					const { data, error } = await supabaseClient.auth.getUser().catch(() => ({ data: { user: null }, error: true }));
					if (!error && data?.user) u = data.user;
				}

				if (mounted) {
					setUser(u ?? null);
					const fullName = (u?.user_metadata && (u.user_metadata as any).fullName) ?? u?.email ?? 'Panel';
					setDisplayName(fullName);

					if (u) {
						// resolver orgId (metadata o lookup en tabla User)
						const orgId = await resolveOrganizationId(u);
						if (orgId) {
							// cargar notificaciones iniciales desde tabla Notification
							await fetchNotificationsForOrg(orgId);
							// suscribirse realtime a Notification filtrada por org
							subscribeToNotificationsForOrg(orgId);
						} else {
							// no tiene org: limpiar suscripciones / notifs
							setNotifications([]);
						}
					}
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('DashboardNavBar init error', err);
			} finally {
				if (mounted) setLoading(false);
			}
		}

		init();

		// auth state change -> recargar usuario/subs
		let authListener: any = null;
		try {
			const sub = supabaseClient?.auth.onAuthStateChange((event, session) => {
				if (event === 'SIGNED_OUT') {
					setUser(null);
					setDisplayName('Panel');
					setNotifications([]);
					unsubscribeChannel();
				}
				if (event === 'SIGNED_IN' && session?.user) {
					const u = session.user;
					const name = (u.user_metadata && (u.user_metadata as any).fullName) ?? u.email ?? 'Panel';
					setUser(u);
					setDisplayName(name);
					// re-init subs for new user
					(async () => {
						const orgId = await resolveOrganizationId(u);
						if (orgId) {
							await fetchNotificationsForOrg(orgId);
							subscribeToNotificationsForOrg(orgId);
						}
					})();
				}
			});
			authListener = (sub as any)?.data ?? sub;
		} catch (e) {
			authListener = null;
		}

		// click outside to close menu
		function onDocClick(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
			}
			// si el click está fuera del dropdown de notificaciones, cerrar el panel
			const notifPanel = document.getElementById('notif-panel');
			if (notifPanel && !notifPanel.contains(e.target as Node)) {
				// no forzamos cerrar si el click fue el botón (ese toggle se ocupa en el onClick del botón)
				// esto evita que el panel se cierre justo al abrirlo por el mismo click
				// se deja como comportamiento flexible
			}
		}
		document.addEventListener('click', onDocClick);

		return () => {
			mounted = false;
			document.removeEventListener('click', onDocClick);
			try {
				if (authListener?.subscription?.unsubscribe) authListener.subscription.unsubscribe();
				else if (authListener?.unsubscribe) authListener.unsubscribe();
			} catch {}
			unsubscribeChannel();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// resolve organizationId for a supabase auth user
	async function resolveOrganizationId(authUser: any): Promise<string | null> {
		if (!supabaseClient || !authUser) return null;
		// 1) try metadata
		const metaOrg = (authUser.user_metadata as any)?.organizationId ?? null;
		if (metaOrg) return metaOrg;

		// 2) lookup in public."User" table by authId (preferred) or email
		try {
			const authId = authUser.id;
			const { data: rowByAuth, error: errAuth } = await supabaseClient.from('User').select('organizationId').eq('authId', authId).limit(1).maybeSingle();
			if (!errAuth && rowByAuth?.organizationId) return rowByAuth.organizationId;

			const { data: rowByEmail, error: errEmail } = await supabaseClient.from('User').select('organizationId').eq('email', authUser.email).limit(1).maybeSingle();
			if (!errEmail && rowByEmail?.organizationId) return rowByEmail.organizationId;
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error('resolveOrganizationId error', err);
		}
		return null;
	}

	async function fetchNotificationsForOrg(orgId: string) {
		if (!supabaseClient) return;
		try {
			const { data, error } = await supabaseClient.from('Notification').select('*').eq('organizationId', orgId).order('createdAt', { ascending: false }).limit(200);

			if (error) {
				// eslint-disable-next-line no-console
				console.error('Error fetching notifications', error);
				setNotifications([]); // defensivo
				return;
			}
			const rows = (data ?? []) as any[];
			const mapped: NotificationItem[] = rows.map((r) => ({
				id: String(r.id),
				type: String(r.type ?? ''),
				title: r.title ?? null,
				message: String(r.message ?? ''),
				payload: r.payload ?? null,
				createdAt: String(r.createdAt ?? new Date().toISOString()),
				read: !!r.read,
			}));
			setNotifications(mapped);
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error('fetchNotificationsForOrg error', err);
			setNotifications([]);
		}
	}

	function subscribeToNotificationsForOrg(orgId: string) {
		if (!supabaseClient) return;
		unsubscribeChannel(); // safe cleanup

		// Suscribimos solo a inserts y updates (para recibir nuevas y cambios de read)
		const channel = supabaseClient
			.channel(`public:Notification:org.${orgId}`)
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Notification', filter: `organizationId=eq.${orgId}` }, (payload: any) => {
				const row = payload?.new ?? payload;
				if (!row) return;
				const n: NotificationItem = {
					id: String(row.id),
					type: String(row.type ?? ''),
					title: row.title ?? null,
					message: String(row.message ?? ''),
					payload: row.payload ?? null,
					createdAt: String(row.createdAt ?? new Date().toISOString()),
					read: !!row.read,
				};
				// prepend (most recent first)
				setNotifications((prev) => {
					// avoid duplicates
					if (!Array.isArray(prev)) return [n];
					if (prev.some((p) => p.id === n.id)) return prev;
					return [n, ...prev];
				});
			})
			.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Notification', filter: `organizationId=eq.${orgId}` }, (payload: any) => {
				const row = payload?.new ?? payload;
				if (!row) return;
				setNotifications((prev) => {
					if (!Array.isArray(prev)) return prev;
					return prev.map((p) => (p.id === String(row.id) ? { ...p, read: !!row.read } : p));
				});
			});

		channel.subscribe((status: any) => {
			// opcional: puedes loguear status
			// console.log('Notification channel status', status);
		});

		channelRef.current = channel;
	}

	function unsubscribeChannel() {
		try {
			if (channelRef.current) {
				channelRef.current.unsubscribe();
				channelRef.current = null;
			}
		} catch (err) {
			// noop
		}
	}

	async function handleLogout() {
		if (!supabaseClient) {
			router.push('/login');
			return;
		}
		setSignOutLoading(true);
		try {
			const { error } = await supabaseClient.auth.signOut();
			if (error) {
				// eslint-disable-next-line no-console
				console.error('Error al cerrar sesión en Supabase:', error);
			}
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error('Logout error:', err);
		} finally {
			setSignOutLoading(false);
			router.push('/login');
		}
	}

	function unreadCount() {
		if (!Array.isArray(notifications)) return 0;
		return notifications.filter((n) => !n.read).length;
	}

	// marcar una notificación como leída (optimista)
	async function markNotificationRead(id: string) {
		// Optimistic UI
		setNotifications((prev) => (Array.isArray(prev) ? prev.map((n) => (n.id === id ? { ...n, read: true } : n)) : prev));

		try {
			// obtener token de sesión para llamar al endpoint server que usa service-role
			const { data: sessionData } = await supabaseClient!.auth.getSession();
			const token = (sessionData as any)?.session?.access_token ?? null;
			if (!token) {
				// eslint-disable-next-line no-console
				console.warn('No session token to mark read');
				return;
			}

			const res = await fetch('/api/notifications/mark-read', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ ids: [id] }),
			});

			if (!res.ok) {
				// revertir si falla
				setNotifications((prev) => (Array.isArray(prev) ? prev.map((n) => (n.id === id ? { ...n, read: false } : n)) : prev));
				// eslint-disable-next-line no-console
				console.error('Error marking notification read', await res.text());
			}
		} catch (err) {
			// revertir optimista en error
			setNotifications((prev) => (Array.isArray(prev) ? prev.map((n) => (n.id === id ? { ...n, read: false } : n)) : prev));
			// eslint-disable-next-line no-console
			console.error('markNotificationRead error', err);
		}
	}

	async function markAllRead() {
		// optimistic
		const unreadIds = Array.isArray(notifications) ? notifications.filter((n) => !n.read).map((n) => n.id) : [];
		if (unreadIds.length === 0) return;
		setNotifications((prev) => (Array.isArray(prev) ? prev.map((n) => ({ ...n, read: true })) : prev));

		try {
			const { data: sessionData } = await supabaseClient!.auth.getSession();
			const token = (sessionData as any)?.session?.access_token ?? null;
			if (!token) return;

			const res = await fetch('/api/notifications/mark-read', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ ids: unreadIds }),
			});

			if (!res.ok) {
				// revertir si falla
				setNotifications((prev) => (Array.isArray(prev) ? prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: false } : n)) : prev));
				// eslint-disable-next-line no-console
				console.error('Error marking all read', await res.text());
			}
		} catch (err) {
			// revertir
			setNotifications((prev) => (Array.isArray(prev) ? prev.map((n) => ({ ...n, read: false })) : prev));
			// eslint-disable-next-line no-console
			console.error('markAllRead error', err);
		}
	}

	return (
		<header className="w-full sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center h-16 gap-4">
					{/* Left: logo */}
					<div className="flex items-center gap-3 min-w-0">
						<Link href="/" className="flex items-center gap-3">
							<div className="relative h-10 w-10 rounded-lg overflow-hidden shadow-inner" aria-hidden>
								<Image src="/3.png" alt="Syncwave" fill style={{ objectFit: 'cover' }} />
							</div>
							<div className="hidden md:flex flex-col leading-none">
								<span className="text-sm font-semibold text-slate-900">Syncwave</span>
								<span className="text-xs text-slate-500">Agencia de Automatizaciones</span>
							</div>
						</Link>
					</div>

					{/* Center: Bienvenido + displayName (siempre centrado) */}
					<div className="flex-1 flex items-center justify-center">
						<div className="flex flex-col items-center">
							<span className="text-xs text-slate-500">Bienvenido</span>
							<span className="text-sm md:text-lg font-semibold text-slate-900 truncate max-w-[46ch]" title={displayName}>
								{loading ? 'Cargando...' : displayName}
							</span>
						</div>
					</div>

					{/* Right: actions */}
					<div className="flex items-center gap-3">
						{/* Notifications */}
						<div className="relative">
							<button aria-label="Notificaciones" onClick={() => setNotifOpen((s) => !s)} className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition" title="Notificaciones">
								<Bell className="w-4 h-4 text-slate-600" />
								{/* badge: solo mostrar si hay >0 */}
								{unreadCount() > 0 ? <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-rose-500 text-white text-xs font-medium">{unreadCount()}</span> : null}
							</button>

							{/* notifications dropdown */}
							<div id="notif-panel" className={`absolute right-0 mt-2 w-80 rounded-lg bg-white border border-slate-100 shadow-lg py-2 transition-all duration-150 transform origin-top-right ${notifOpen ? 'opacity-100 scale-100' : 'opacity-0 pointer-events-none scale-95'}`}>
								<div className="flex items-center justify-between px-3 py-2">
									<strong className="text-sm">Notificaciones</strong>
									<div className="flex items-center gap-2">
										<button onClick={markAllRead} className="text-xs text-slate-500 hover:text-slate-700">
											Marcar todas leídas
										</button>
									</div>
								</div>

								<div className="max-h-72 overflow-auto" role="list" aria-label="Lista de notificaciones">
									{/* Mensaje cuando no hay notificaciones */}
									{!Array.isArray(notifications) || notifications.length === 0 ? (
										<div className="p-4 text-xs text-slate-500">No hay notificaciones recientes</div>
									) : (
										notifications.map((n) => (
											<div
												role="listitem"
												key={n.id}
												onClick={() => {
													if (!n.read) markNotificationRead(n.id);
													// opcional: navegar al detalle según payload
													// if (n.payload?.id) router.push(`/dashboard/clinic/users/${n.payload.id}`);
												}}
												className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 flex items-start gap-3 ${n.read ? 'opacity-70' : 'bg-white'}`}>
												<div className="flex-1">
													<div className="font-medium text-slate-800 truncate">{n.title ?? n.message}</div>
													<div className="text-xs text-slate-500 mt-1">{n.message}</div>
													<div className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
												</div>
												<div className="text-xs text-slate-400">{n.type}</div>
											</div>
										))
									)}
								</div>
							</div>
						</div>

						{/* Profile / Dropdown */}
						<div className="relative" ref={menuRef}>
							<button onClick={() => setMenuOpen((s) => !s)} aria-expanded={menuOpen} aria-haspopup="true" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition" title="Cuenta">
								<div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-white font-semibold shadow">
									{user?.user_metadata?.avatar_url ? (
										// eslint-disable-next-line jsx-a11y/alt-text
										<img src={user.user_metadata.avatar_url} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
									) : (
										<span className="select-none text-sm">{initialsFromName(displayName)}</span>
									)}
								</div>

								<div className="hidden md:flex flex-col items-start">
									<span className="text-sm font-semibold text-slate-900 leading-none">{displayName}</span>
									<span className="text-xs text-slate-500 leading-none">Mi cuenta</span>
								</div>

								<ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${menuOpen ? 'rotate-180' : 'rotate-0'}`} />
							</button>

							{/* Dropdown menu */}
							<div role="menu" aria-hidden={!menuOpen} className={`absolute right-0 mt-2 w-56 rounded-lg bg-white border border-slate-100 shadow-lg py-2 transition-all duration-150 transform origin-top-right ${menuOpen ? 'opacity-100 scale-100' : 'opacity-0 pointer-events-none scale-95'}`}>
								<Link href="/dashboard/clinic/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
									<UserIcon className="w-4 h-4 text-slate-500" />
									<span>Perfil</span>
								</Link>

								<Link href="/dashboard/clinic/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
									<Settings className="w-4 h-4 text-slate-500" />
									<span>Configuración</span>
								</Link>

								<div className="border-t border-slate-100 my-1" />

								<button onClick={handleLogout} disabled={signOutLoading} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition disabled:opacity-60" role="menuitem">
									<LogOut className="w-4 h-4" />
									<span>{signOutLoading ? 'Cerrando...' : 'Cerrar sesión'}</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}
