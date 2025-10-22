// src/components/SpecialistsInvitesList.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, User, Copy, X, Loader2, UserX } from 'lucide-react';

type InviteRow = {
	id: string;
	email: string | null;
	token?: string | null;
	role?: string | null;
	invitedById?: string | null;
	used?: boolean | null;
	expiresAt?: string | null;
	createdAt?: string | null;
};

export default function SpecialistsInvitesList({ invites, organizationId }: { invites: InviteRow[]; organizationId: string }) {
	const [rows, setRows] = useState<InviteRow[]>((invites ?? []).filter((r) => !!r?.email && r.email !== ''));
	const [loading, setLoading] = useState<Record<string, boolean>>({});
	const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	useEffect(() => {
		setRows((invites ?? []).filter((r) => !!r?.email && r.email !== ''));
	}, [invites]);

	const formatDate = (d?: string | null) => {
		if (!d) return '—';
		try {
			return new Date(d).toLocaleString();
		} catch {
			return d;
		}
	};

	async function callAction(inviteId: string, action: 'cancel' | 'suspend') {
		setMsg(null);
		setLoading((s) => ({ ...s, [inviteId]: true }));

		try {
			const resp = await fetch('/api/specialists', {
				method: 'POST',
				credentials: 'include', // asegurar envío de cookies
				headers: { 'Content-Type': 'application/json' },
				// NOTE: no enviamos organizationId desde el cliente — el servidor lo obtiene de la sesión
				body: JSON.stringify({ action, inviteId }),
			});

			// Leemos texto crudo primero (útil para errores HTML o respuestas no-json)
			const raw = await resp.text().catch(() => '');
			// Log para depuración
			console.log('[SpecialistsInvitesList] fetch /api/specialists', resp.status, raw);

			// Intentamos parsear JSON si es posible
			let payload: any = {};
			try {
				payload = raw ? JSON.parse(raw) : {};
			} catch (e) {
				payload = { message: raw || `HTTP ${resp.status}` };
			}

			// Manejo de errores HTTP con mensajes claros
			if (!resp.ok) {
				// Si el servidor devolvió un message, lo mostramos; si no, mostramos texto crudo o status
				const text = payload?.message ?? payload?.error ?? raw ?? `Error ${resp.status}`;
				// Mensajes específicos para 401 (sesión) o 404 (no encontrado)
				if (resp.status === 401) {
					setMsg({ type: 'error', text: text || 'No autenticado. Por favor inicia sesión.' });
				} else if (resp.status === 404) {
					setMsg({ type: 'error', text: text || 'Recurso no encontrado.' });
				} else {
					setMsg({ type: 'error', text: text || 'Error en la operación' });
				}
			} else {
				// Éxito: actualizar UI según la acción
				if (action === 'cancel') {
					setRows((prev) => prev.filter((r) => r.id !== inviteId));
					setMsg({ type: 'success', text: payload?.message ?? 'Invitación cancelada y eliminada del listado.' });
				} else if (action === 'suspend') {
					setRows((prev) =>
						prev.map((r) =>
							r.id === inviteId
								? {
										...r,
										role: 'SUSPENDED',
										used: true,
								  }
								: r
						)
					);
					setMsg({ type: 'success', text: payload?.message ?? 'Especialista suspendido correctamente.' });
				}
			}
		} catch (err) {
			console.error('[SpecialistsInvitesList] network error', err);
			setMsg({ type: 'error', text: 'Error de red al comunicarse con el servidor.' });
		} finally {
			setLoading((s) => ({ ...s, [inviteId]: false }));
		}
	}

	if (!rows || rows.length === 0) {
		return (
			<div className="rounded-lg border border-slate-200 p-6 text-sm text-slate-600 bg-white">
				<div className="font-medium text-slate-800 mb-1">No hay invitaciones con email asignado</div>
				<div className="text-xs text-slate-500">Cuando haya invitaciones asignadas a un correo las verás aquí.</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{msg && (
				<div role="status" className={`flex items-center gap-3 rounded-md px-4 py-2 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-rose-50 text-rose-800'}`}>
					{msg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
					<div>{msg.text}</div>
				</div>
			)}

			{rows.map((r) => {
				const isUsed = !!r.used;
				const statusText = isUsed ? 'Registrado' : 'En espera';

				return (
					<article key={r.id} className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 md:p-5 rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50 shadow-md transition hover:shadow-lg">
						{/* LEFT: info */}
						<div className="flex-1 min-w-0">
							<div className="flex items-start md:items-center gap-4">
								{/* Icon avatar */}
								<div className="flex-shrink-0">
									<div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow">
										<span className="sr-only">Avatar</span>
										<User size={20} />
									</div>
								</div>

								<div className="min-w-0">
									<div className="flex items-center gap-3">
										<h3 className="text-sm md:text-base font-semibold text-slate-900 truncate">{r.email ?? '— sin email —'}</h3>

										<span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${isUsed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`} aria-hidden>
											{statusText}
										</span>
									</div>

									<p className="mt-1 text-xs text-slate-500">
										<span className="font-medium text-slate-700">Rol:</span> {r.role ?? '—'} · <span className="font-medium text-slate-700">Creado:</span> {formatDate(r.createdAt)}
									</p>
								</div>
							</div>
						</div>

						{/* RIGHT: actions */}
						<div className="flex-shrink-0 flex items-center gap-2">
							{/* Copy button */}
							<button type="button" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:scale-[1.02] transition text-sm shadow-sm" onClick={() => navigator.clipboard?.writeText(r.email ?? '')} disabled={!r.email} aria-label={`Copiar email ${r.email ?? ''}`} title={r.email ? 'Copiar email' : 'No hay email para copiar'}>
								<Copy size={16} />
								<span className="hidden md:inline">Copiar</span>
							</button>

							{/* Primary action */}
							{!isUsed ? (
								<button type="button" className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold shadow hover:brightness-105 active:scale-[0.995] transition" onClick={() => callAction(r.id, 'cancel')} disabled={!!loading[r.id]} aria-label="Cancelar invitación" title="Cancelar la invitación (el email se eliminará)">
									{loading[r.id] ? <Loader2 className="animate-spin" size={16} /> : <X size={16} />}
									<span>{loading[r.id] ? 'Procesando…' : 'Cancelar'}</span>
								</button>
							) : (
								<button type="button" className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold shadow hover:brightness-105 active:scale-[0.995] transition" onClick={() => callAction(r.id, 'suspend')} disabled={!!loading[r.id]} aria-label="Suspender especialista" title="Suspender cuenta del especialista (impide iniciar sesión)">
									{loading[r.id] ? <Loader2 className="animate-spin" size={16} /> : <UserX size={16} />}
									<span>{loading[r.id] ? 'Procesando…' : 'Suspender'}</span>
								</button>
							)}
						</div>
					</article>
				);
			})}
		</div>
	);
}
