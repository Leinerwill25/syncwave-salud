// components/UserNotificationsBell.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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

interface Props {
	user: any; // supabase auth user
	role?: string;
}

export default function UserNotificationsBell({ user }: Props) {
	const [notifications, setNotifications] = useState<NotificationItem[]>([]);
	const [open, setOpen] = useState(false);
	const supabase = createSupabaseBrowserClient();

	const channelRef = useRef<any | null>(null);
	const mountedRef = useRef(false);
	const appUserIdRef = useRef<string | null>(null);
	const orgIdRef = useRef<string | null>(null);
	const seenIdsRef = useRef<Set<string>>(new Set());
	const reconnectAttemptsRef = useRef(0);
	const backoffTimerRef = useRef<any>(null);

	// ---------- Helpers ----------
	function normalizeRow(row: any): NotificationItem {
		return {
			id: row.id,
			userId: row.userId ?? row.userid ?? null,
			organizationId: row.organizationId ?? row.organizationid ?? null,
			type: row.type,
			title: row.title ?? null,
			message: row.message ?? '',
			payload: row.payload ?? null,
			createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
			read: typeof row.read === 'boolean' ? row.read : row.read === 'true' || false,
		};
	}

	const upsertNotification = useCallback((row: any) => {
		const n = normalizeRow(row);
		// ignore if not for this user
		const appUserId = appUserIdRef.current;
		if (n.userId && appUserId && n.userId !== appUserId) return;

		setNotifications((prev) => {
			// dedupe & update
			const found = prev.find((p) => p.id === n.id);
			if (!found) {
				// new
				if (!seenIdsRef.current.has(n.id)) {
					seenIdsRef.current.add(n.id);
					return [n, ...prev];
				}
				return prev;
			}
			// update existing
			return prev.map((p) => (p.id === n.id ? { ...p, ...n } : p));
		});
	}, []);

	const removeNotification = useCallback((row: any) => {
		setNotifications((prev) => prev.filter((p) => p.id !== (row.id ?? row.ID)));
		if (row?.id) seenIdsRef.current.delete(row.id);
	}, []);

	// ---------- mark read helpers ----------
	async function markAsRead(id: string) {
		setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
		try {
			await supabase.from('notification').update({ read: true }).eq('id', id);
		} catch (err) {
			console.error('[NOTIFS] markAsRead error', err);
		}
	}

	async function markAllRead() {
		const ids = notifications.filter((n) => !n.read).map((n) => n.id);
		if (!ids.length) return;
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
		try {
			await supabase.from('notification').update({ read: true }).in('id', ids);
		} catch (err) {
			console.error('[NOTIFS] markAllRead error', err);
		}
	}

	// ---------- unsubscribe ----------
	function unsubscribeRealtime() {
		if (backoffTimerRef.current) {
			clearTimeout(backoffTimerRef.current);
			backoffTimerRef.current = null;
		}
		try {
			const ch = channelRef.current;
			if (ch) {
				// supabase-js v2: unsubscribe by calling channel.unsubscribe()
				ch.unsubscribe();
			}
		} catch (err) {
			// noop
		} finally {
			channelRef.current = null;
		}
	}

	// ---------- subscribe ----------
	function subscribeRealtimeOnce(orgId: string, appUserId?: string | null) {
		// cleanup first
		unsubscribeRealtime();

		// reset reconnect attempts after a successful subscribe attempt
		reconnectAttemptsRef.current = 0;

		// create channel name unique per org (so server can debug easily)
		const channel = supabase.channel(`realtime:notifications:org:${orgId}`);

		// two filters: user-specific (if appUserId) and org-global (userId IS NULL)
		if (appUserId) {
			channel.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'notification',
					filter: `"organizationId"=eq.${orgId},"userId"=eq.${appUserId}`,
				},
				(payload: any) => {
					// events: INSERT => payload.new; UPDATE => new+old; DELETE => old
					try {
						const newRow = payload?.new ?? null;
						const oldRow = payload?.old ?? null;
						if (newRow && !oldRow) {
							upsertNotification(newRow);
						} else if (newRow && oldRow) {
							upsertNotification(newRow);
						} else if (!newRow && oldRow) {
							removeNotification(oldRow);
						}
					} catch (err) {
						console.error('[NOTIFS-RT user filter] handler error', err, payload);
					}
				}
			);
		}

		// global notifications for this org (userId IS NULL)
		channel.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'notification',
				filter: `"organizationId"=eq.${orgId},"userId".is.null`,
			},
			(payload: any) => {
				try {
					const newRow = payload?.new ?? null;
					const oldRow = payload?.old ?? null;
					if (newRow && !oldRow) {
						upsertNotification(newRow);
					} else if (newRow && oldRow) {
						upsertNotification(newRow);
					} else if (!newRow && oldRow) {
						removeNotification(oldRow);
					}
				} catch (err) {
					console.error('[NOTIFS-RT global] handler error', err, payload);
				}
			}
		);

		// subscribe
		channel.subscribe((status: any) => {
			// status could be { error } or 'SUBSCRIBED' depending on implementation; we log for debug
			console.debug('[NOTIFS-RT] channel status:', status);
			// if subscription failed, try reconnect with backoff
			if (status?.error || status === 'TIMED_OUT' || status === 'REJECTED') {
				attemptReconnect(orgId, appUserId);
			}
		});

		channelRef.current = channel;
	}

	function attemptReconnect(orgId?: string | null, appUserId?: string | null) {
		unsubscribeRealtime();
		const attempts = reconnectAttemptsRef.current ?? 0;
		reconnectAttemptsRef.current = attempts + 1;
		const delay = Math.min(30000, 500 * Math.pow(2, attempts)); // exponential backoff capped to 30s
		backoffTimerRef.current = setTimeout(() => {
			if (!mountedRef.current) return;
			if (orgId) subscribeRealtimeOnce(orgId, appUserId);
		}, delay);
	}

	// ---------- initial load + subscription orchestration ----------
	useEffect(() => {
		if (!user) return;
		mountedRef.current = true;

		let initialFetched = false;

		(async () => {
			try {
				// 1) ensure we have fresh session token
				const { data: sessionData } = await supabase.auth.getSession();
				const token = sessionData?.session?.access_token ?? (user?.access_token || user?.token);

				// 2) initial fetch to your API (returns notifications + appUserId + (optional) orgId)
				let resJson: any = null;
				try {
					if (token) {
						const res = await fetch('/api/notifications', {
							method: 'GET',
							headers: { Authorization: `Bearer ${token}` },
						});
						if (res.ok) resJson = await res.json();
						else console.warn('[NOTIFS] /api/notifications non-ok', res.status);
					}
				} catch (err) {
					console.warn('[NOTIFS] /api/notifications fetch error', err);
				}

				// fallback: if endpoint didn't return appUserId, query User table once
				if (resJson?.appUserId) {
					appUserIdRef.current = resJson.appUserId;
				} else {
					// fallback query
					try {
						const authUserId = sessionData?.session?.user?.id ?? user?.id;
						if (authUserId) {
							const { data: appUserRow, error } = await supabase.from('users').select('id, "organizationId"').eq('authId', authUserId).limit(1).maybeSingle();

							if (!error && appUserRow?.id) {
								appUserIdRef.current = appUserRow.id;
								if (!orgIdRef.current) orgIdRef.current = appUserRow.organizationId ?? null;
							}
						}
					} catch (err) {
						console.warn('[NOTIFS] fallback appUserId query failed', err);
					}
				}

				// set notifications from API if present (dedupe carefully)
				if (Array.isArray(resJson?.notifications)) {
					const initial = resJson.notifications.map((r: any) => normalizeRow(r));
					setNotifications((prev) => {
						// merge but avoid duplicates
						const existingIds = new Set(prev.map((p) => p.id));
						const merged = [...initial.filter((i: NotificationItem) => !existingIds.has(i.id)), ...prev];
						merged.forEach((m) => seenIdsRef.current.add(m.id));
						return merged;
					});
					// derive orgId from response if provided
					if (resJson?.orgId) orgIdRef.current = resJson.orgId;
				}

				// also if user metadata contains orgId, use it
				if (!orgIdRef.current) {
					const maybeOrg = user?.user_metadata?.organizationId ?? null;
					if (maybeOrg) orgIdRef.current = maybeOrg;
				}

				initialFetched = true;
			} catch (err) {
				console.error('[NOTIFS] init error', err);
			} finally {
				// 3) start subscription only when orgId is available (subscribeRealtimeOnce will handle appUserId possibly null)
				const org = orgIdRef.current;
				if (!org) {
					// try to derive org from user metadata and wait a bit (but avoid tight loops)
					const maybeOrg = user?.user_metadata?.organizationId ?? null;
					if (maybeOrg) orgIdRef.current = maybeOrg;
					else {
						// if still not available, schedule a single retry after short backoff
						setTimeout(() => {
							if (mountedRef.current) {
								const orgAttempt = orgIdRef.current ?? user?.user_metadata?.organizationId ?? null;
								if (orgAttempt) subscribeRealtimeOnce(orgAttempt, appUserIdRef.current);
								else console.warn('[NOTIFS] cannot subscribe: organizationId missing');
							}
						}, 800);
						return;
					}
				}
				// final subscribe
				subscribeRealtimeOnce(orgIdRef.current as string, appUserIdRef.current);
			}
		})();

		// re-subscribe on auth/session change (token rotate)
		const { data: listener } = supabase.auth.onAuthStateChange((_event: any, _session: any) => {
			// re-init subscription if token changed
			if (!mountedRef.current) return;
			// force resubscribe using stored org/appUser
			const org = orgIdRef.current ?? user?.user_metadata?.organizationId ?? null;
			if (org) {
				attemptReconnect(org, appUserIdRef.current);
			}
		});

		return () => {
			mountedRef.current = false;
			unsubscribeRealtime();
			listener?.subscription?.unsubscribe?.();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user]);

	const unreadCount = notifications.filter((n) => !n.read).length;

	return (
		<div className="relative z-[60]">
			<button onClick={() => setOpen((s) => !s)} className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition z-[60]" title="Notificaciones">
				<Bell className="w-4 h-4 text-slate-600" />
				{unreadCount > 0 && <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-xs font-medium z-[61]">{unreadCount}</span>}
			</button>

			<AnimatePresence>
				{open && (
					<motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-100 shadow-lg py-2 z-[65]">
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
