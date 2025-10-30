'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

type NotificationItem = {
	id: string;
	userId: string | null;
	organizationId: string | null;
	type: string;
	title?: string | null;
	message: string;
	payload?: any;
	createdAt: string;
	read?: boolean;
};

interface UserNotificationsBellProps {
	user: any; // auth user (supabase.auth user)
	role: string;
}

export default function UserNotificationsBell({ user, role }: UserNotificationsBellProps) {
	const [notifications, setNotifications] = useState<NotificationItem[]>([]);
	const [open, setOpen] = useState(false);

	const supabase = createSupabaseBrowserClient();
	const channelRef = useRef<any>(null);
	const appUserIdRef = useRef<string | null>(null);
	const orgIdRef = useRef<string | null>(null);
	const mountedRef = useRef(false);

	// --- Init: silent initial load + subscribe to Realtime ---
	useEffect(() => {
		if (!user) return;

		mountedRef.current = true;

		// init sequence
		(async () => {
			try {
				// obtener token/session de forma segura
				const { data: sessionData } = await supabase.auth.getSession();
				const token = sessionData?.session?.access_token ?? user?.access_token ?? user?.token;

				// petición al endpoint que devuelve appUserId + notificaciones iniciales
				// la petición es "silenciosa" (no spinner visible)
				if (token) {
					const res = await fetch('/api/notifications', {
						method: 'GET',
						headers: { Authorization: `Bearer ${token}` },
					});

					if (res.ok) {
						const json = await res.json();
						// json = { notifications: [...], appUserId: 'uuid' }
						const initial = Array.isArray(json.notifications) ? json.notifications : [];
						setNotifications((prev) => {
							// dedupe safe: merge initial with prev (prefer initial order newest first)
							const ids = new Set(prev.map((p) => p.id));
							const merged = [...initial.filter((i: { id: string }) => !ids.has(i.id)), ...prev];
							return merged;
						});
						appUserIdRef.current = json.appUserId ?? null;
						// get orgId from user metadata or response (endpoint may include org)
						orgIdRef.current = (user.user_metadata?.organizationId ?? null) || null;
					} else {
						// si falla, intentar fallback: obtener appUserId consultando tabla User directamente (una sola vez)
						console.warn('[NOTIFS] /api/notifications returned non-ok:', res.status);
						await fetchAppUserIdFallback();
					}
				} else {
					// sin token: intentar fallback
					await fetchAppUserIdFallback();
				}
			} catch (err) {
				console.error('[NOTIFS] init error', err);
				// intentar fallback si algo falla
				await fetchAppUserIdFallback();
			} finally {
				// iniciar suscripción Realtime (si tenemos org/appUser)
				subscribeRealtime();
			}
		})();

		return () => {
			mountedRef.current = false;
			unsubscribeRealtime();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user, role]);

	// Fallback para obtener appUserId directamente desde Supabase client (una sola petición)
	async function fetchAppUserIdFallback() {
		try {
			// obtener auth session para authUser id
			const { data: sessionData } = await supabase.auth.getSession();
			const authUserId = sessionData?.session?.user?.id ?? user?.id;

			if (!authUserId) return;

			// consulta "User" para mapear authId -> app user id (UNA sola vez)
			const { data: appUserRow, error } = await supabase.from('User').select('id, "organizationId"').eq('authId', authUserId).limit(1).maybeSingle();

			if (error) {
				console.warn('[NOTIFS] fetchAppUserIdFallback error', error);
				return;
			}

			if (appUserRow?.id) {
				appUserIdRef.current = appUserRow.id;
				orgIdRef.current = orgIdRef.current ?? appUserRow.organizationId ?? null;
			}
		} catch (err) {
			console.error('[NOTIFS] fetchAppUserIdFallback unexpected error', err);
		}
	}

	// Unsubscribe helper
	function unsubscribeRealtime() {
		try {
			if (channelRef.current) {
				channelRef.current.unsubscribe();
			}
		} catch (err) {
			// noop
		} finally {
			channelRef.current = null;
		}
	}

	// Subscribe to Realtime (WebSocket) — only once with filters on organizationId + userId (and global)
	function subscribeRealtime() {
		const orgId = orgIdRef.current ?? user.user_metadata?.organizationId;
		const appUserId = appUserIdRef.current;

		// If no orgId available yet, subscribe to organizationless or wait until it's available.
		if (!orgId) {
			console.warn('[NOTIFS] subscribeRealtime: orgId missing, retrying in background when available');
			// we don't poll — but we still can re-run subscribe when appUserIdRef/orgIdRef gets set
			// To keep it simple, we'll attempt to subscribe again after a short backoff only if mounted
			setTimeout(() => {
				if (mountedRef.current) subscribeRealtime();
			}, 800);
			return;
		}

		// cleanup any previous
		unsubscribeRealtime();

		// Use quoted column names because your table uses camelCase quoted identifiers ("userId", "organizationId")
		// We'll subscribe to two filters:
		// 1) notifications aimed to this app user (userId = appUserId)
		// 2) notifications global to the organization (userId IS NULL)
		const filters: { filter: string; description: string }[] = [];
		if (appUserId) {
			filters.push({
				filter: `"organizationId"=eq.${orgId},"userId"=eq.${appUserId}`,
				description: 'user-specific',
			});
		}
		// always subscribe to global notifications (userId IS NULL)
		filters.push({
			filter: `"organizationId"=eq.${orgId},"userId".is.null`,
			description: 'global',
		});

		// create a channel and attach handlers
		const channel = supabase.channel(`notifications-org-${orgId}`);

		filters.forEach((f) => {
			channel.on(
				'postgres_changes',
				{
					event: '*', // capture INSERT, UPDATE, DELETE
					schema: 'public',
					table: 'Notification',
					filter: f.filter,
				},
				(payload: any) => {
					// payload structure: { schema, table, commit_timestamp, eventType?, old, new } depending on event
					try {
						const newRow = payload?.new ?? null;
						const oldRow = payload?.old ?? null;
						const event = payload?.eventType ?? payload?.type ?? payload?.event ?? null;

						// handle INSERT / UPDATE / DELETE generically
						if (newRow && !oldRow) {
							// INSERT
							handleInsert(newRow);
						} else if (newRow && oldRow) {
							// UPDATE
							handleUpdate(newRow);
						} else if (!newRow && oldRow) {
							// DELETE
							handleDelete(oldRow);
						} else {
							// fallback: if newRow exists, treat as insert/update
							if (newRow) handleUpdate(newRow);
						}
					} catch (err) {
						console.error('[NOTIFS-RT] payload handler error', err, payload);
					}
				}
			);
		});

		// subscribe
		channel.subscribe((status: any) => {
			console.debug('[NOTIFS-RT] channel status:', status);
		});

		channelRef.current = channel;
	}

	// Handlers for realtime events
	function handleInsert(row: any) {
		// double-check target: if row.userId exists and it's not this appUserId, ignore
		const appUserId = appUserIdRef.current;
		if (row.userId && appUserId && row.userId !== appUserId) return;

		setNotifications((prev) => {
			if (prev.find((p) => p.id === row.id)) return prev;
			return [normalizeRow(row), ...prev];
		});
	}

	function handleUpdate(row: any) {
		setNotifications((prev) => {
			const exists = prev.find((p) => p.id === row.id);
			if (!exists) {
				// insert updated row at top
				return [normalizeRow(row), ...prev];
			}
			return prev.map((p) => (p.id === row.id ? { ...p, ...normalizeRow(row) } : p));
		});
	}

	function handleDelete(oldRow: any) {
		setNotifications((prev) => prev.filter((p) => p.id !== oldRow.id));
	}

	// Normalize DB row -> NotificationItem (handles camelCase quoted columns)
	function normalizeRow(row: any): NotificationItem {
		// Some payloads might have columns exactly matching case ("userId"), so map both possibilities
		return {
			id: row.id,
			userId: row.userId ?? row.userid ?? null,
			organizationId: row.organizationId ?? row.organizationid ?? null,
			type: row.type,
			title: row.title ?? null,
			message: row.message ?? '',
			payload: row.payload ?? null,
			createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
			read: typeof row.read === 'boolean' ? row.read : row.read === 'true',
		};
	}

	// --- mark as read (optimistic + persist) ---
	async function markAsRead(id: string) {
		// optimistic UI update
		setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

		try {
			// persist using Supabase client (this triggers realtime UPDATE event too)
			await supabase.from('Notification').update({ read: true }).eq('id', id);
		} catch (err) {
			console.error('[NOTIFS] markAsRead error', err);
		}
	}

	async function markAllRead() {
		const ids = notifications.filter((n) => !n.read).map((n) => n.id);
		if (!ids.length) return;

		// optimistic
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

		try {
			await supabase.from('Notification').update({ read: true }).in('id', ids);
		} catch (err) {
			console.error('[NOTIFS] markAllRead error', err);
		}
	}

	// unread count
	const unreadCount = notifications.filter((n) => !n.read).length;

	// UI: no visible loading spinner for initial fetch (silent)
	return (
		<div className="relative">
			<button onClick={() => setOpen((s) => !s)} className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition" title="Notificaciones">
				<Bell className="w-4 h-4 text-slate-600" />
				{unreadCount > 0 && <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-xs font-medium">{unreadCount}</span>}
			</button>

			<AnimatePresence>
				{open && (
					<motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-100 shadow-lg py-2 z-50">
						<div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
							<strong className="text-sm">Notificaciones</strong>
							{unreadCount > 0 && (
								<button onClick={markAllRead} className="text-xs text-slate-500 hover:text-slate-700">
									Marcar todas leídas
								</button>
							)}
						</div>

						<div className="max-h-72 overflow-y-auto">
							{notifications.length === 0 ? (
								<div className="p-4 text-xs text-slate-500 text-center">No hay notificaciones</div>
							) : (
								notifications.map((n) => (
									<div key={n.id} onClick={() => markAsRead(n.id)} className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 transition ${n.read ? 'opacity-70' : 'bg-white'}`}>
										<div className="font-medium text-slate-800 truncate">{n.title ?? n.message}</div>
										<div className="text-xs text-slate-500 mt-1">{n.message}</div>
										<div className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
									</div>
								))
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
