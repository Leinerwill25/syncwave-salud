// components/InviteList.tsx
'use client';
import React, { useEffect, useMemo, useState } from 'react';

type Invite = {
	id?: string;
	token?: string;
	email?: string;
	role?: string;
	used?: boolean;
	expiresAt?: string | Date;
	createdAt?: string | Date;
};

type Props = {
	initialInvites: Invite[];
	organizationId: string;
	/** Número total de plazas/invitaciones contratadas (ej: 94). Si no se pasa, se usará invites.length */
	totalSlots?: number | null;
};

export default function InviteList({ initialInvites, organizationId, totalSlots = null }: Props) {
	const [invites, setInvites] = useState<Invite[]>(initialInvites || []);
	const [modalOpen, setModalOpen] = useState(false);
	const [activeInvite, setActiveInvite] = useState<Invite | null>(null);
	const [emailInput, setEmailInput] = useState('');
	const [sending, setSending] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

	useEffect(() => {
		setInvites(initialInvites || []);
	}, [initialInvites]);

	// Conteos: "enviadas" = invites con email no vacío
	const counts = useMemo(() => {
		const sent = invites.filter((i) => i.email && String(i.email).trim().length > 0).length;
		const total = totalSlots ?? invites.length;
		const available = Math.max(0, total - sent);
		return { sent, total, available };
	}, [invites, totalSlots]);

	function openAssignModal(inv: Invite) {
		setActiveInvite(inv);
		setEmailInput(inv.email ?? '');
		setMessage(null);
		setModalOpen(true);
	}

	function closeModal() {
		setModalOpen(false);
		setActiveInvite(null);
		setEmailInput('');
		setMessage(null);
	}

	function isValidEmail(e: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
	}

	async function handleSendInvitation(e: React.FormEvent) {
		e.preventDefault();
		if (!activeInvite) return;
		setMessage(null);

		const email = emailInput.trim();
		if (!isValidEmail(email)) {
			setMessage({ type: 'error', text: 'Introduce un correo válido.' });
			return;
		}

		// Si no hay plazas disponibles y la invitación no tenía email previamente, bloquear
		if (counts.available <= 0 && !activeInvite.email) {
			setMessage({ type: 'error', text: 'No quedan plazas disponibles para enviar nuevas invitaciones.' });
			return;
		}

		setSending(true);
		try {
			const resp = await fetch('/api/invite/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					inviteId: activeInvite.id ?? null,
					token: activeInvite.token ?? null,
					email,
					organizationId,
				}),
			});

			const data = await resp.json();
			if (!resp.ok) {
				setMessage({ type: 'error', text: data?.message || 'Error al enviar la invitación.' });
			} else {
				setMessage({ type: 'success', text: 'Invitación enviada correctamente.' });

				// Actualizar UI localmente: asignar email y dejar used = false (solo cambia cuando el invitado acepte)
				setInvites((prev) => prev.map((i) => ((i.id && activeInvite.id && i.id === activeInvite.id) || (i.token && activeInvite.token && i.token === activeInvite.token) ? { ...i, email } : i)));

				// Cerrar modal tras breve delay para que se vea el mensaje
				setTimeout(() => {
					closeModal();
				}, 700);
			}
		} catch (err: any) {
			console.error('invite send error', err);
			setMessage({ type: 'error', text: 'Error interno al enviar invitación.' });
		} finally {
			setSending(false);
		}
	}

	function getInviteUrl(token?: string) {
		if (!token) return '—';
		// En cliente usar window.origin; si no existe (SSR) intentar NEXT_PUBLIC_APP_URL fallback
		try {
			if (typeof window !== 'undefined' && window.location && window.location.origin) {
				return `${window.location.origin}/register/accept?token=${token}`;
			}
		} catch (e) {
			// ignore
		}
		const fallback = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
		return fallback ? `${fallback}/register/accept?token=${token}` : `#/register/accept?token=${token}`;
	}

	async function handleCopyUrl(token?: string) {
		if (!token) return;
		try {
			const url = getInviteUrl(token);
			if (typeof navigator !== 'undefined' && navigator.clipboard) {
				await navigator.clipboard.writeText(url);
				setCopiedMap((m) => ({ ...m, [String(token)]: true }));
				setTimeout(() => setCopiedMap((m) => ({ ...m, [String(token)]: false })), 2000);
			}
		} catch (e) {
			console.error('copy error', e);
		}
	}

	return (
		<div className="space-y-4">
			{/* Header con contador */}
			<div className="flex items-start justify-between gap-4">
				{/* limitar ancho aquí: min-w-0 para que pueda encoger en flex, y md:max-w-[54ch] para no ocupar tanto */}
				<div className="min-w-0 flex-1 md:max-w-[54ch]">
					<h4 className="text-lg font-semibold text-slate-800">Invitaciones</h4>
					<p className="text-sm text-slate-500 mt-1">Gestiona y envía invitaciones a especialistas. Cada invitación permite que un especialista se registre ligado a tu clínica.</p>
				</div>

				<div className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border flex flex-col items-end">
					<div className="text-xs text-slate-500">Enviadas / Total</div>
					<div className="font-semibold text-slate-900">
						{counts.sent}/{counts.total} <span className="text-xs text-slate-500">({counts.available} disponibles)</span>
					</div>
				</div>
			</div>

			{/* Lista de invitaciones */}
			{invites.length === 0 ? (
				<div className="text-sm text-slate-500 p-4 rounded-lg border bg-white">No hay invitaciones creadas. Genera invitaciones desde Facturación o Configuración.</div>
			) : (
				<ul className="space-y-2">
					{invites.map((inv) => {
						const tokenKey = String(inv.token ?? inv.id ?? '');
						const isCopied = Boolean(copiedMap[tokenKey]);
						return (
							<li key={tokenKey} className="p-3 rounded-xl bg-white border flex items-center justify-between gap-4 hover:shadow transition">
								<div className="flex items-center gap-3 min-w-0">
									<div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-sky-50 to-sky-100 text-sky-700 font-semibold text-sm">{inv.email ? inv.email[0]?.toUpperCase() : (inv.token ?? 'T')[0].toUpperCase()}</div>

									<div className="min-w-0">
										<div className="text-sm font-medium text-slate-800 truncate">{inv.email || 'Sin email asignado'}</div>
										<div className="text-xs text-slate-500 truncate">Token: {inv.token ? String(inv.token).slice(0, 18) : '—'}</div>
										<div className="text-xs text-slate-400 mt-1">
											{inv.expiresAt ? `Expira: ${new Date(String(inv.expiresAt)).toLocaleDateString()}` : ''}
											{inv.createdAt ? ` • Creado: ${new Date(String(inv.createdAt)).toLocaleDateString()}` : ''}
										</div>
									</div>
								</div>

								<div className="flex items-center gap-2">
									<button onClick={() => handleCopyUrl(inv.token)} className="px-3 py-1.5 rounded-md border bg-white text-sm text-slate-700 hover:bg-sky-50" title="Copiar URL de invitación" aria-label={`Copiar URL invitación ${tokenKey}`}>
										{isCopied ? 'Copiado' : 'Copiar URL'}
									</button>

									<button onClick={() => openAssignModal(inv)} className="px-3 py-1.5 rounded-md bg-sky-600 text-white text-sm hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Asignar correo y enviar invitación" disabled={counts.available <= 0 && !inv.email} title={counts.available <= 0 && !inv.email ? 'No quedan plazas disponibles' : 'Asignar correo y enviar invitación'}>
										Enviar
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			)}

			<div className="text-xs text-slate-400">Puedes asignar un correo a una invitación y enviarla automáticamente mediante el botón "Enviar".</div>

			{/* Modal para asignar correo y enviar */}
			{modalOpen && activeInvite && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/40" onClick={closeModal} />

					<div role="dialog" aria-modal="true" aria-labelledby="invite-modal-title" className="relative w-full max-w-md bg-white rounded-2xl shadow-lg border p-6 z-10">
						<h3 id="invite-modal-title" className="text-lg font-semibold text-slate-800">
							Enviar invitación
						</h3>
						<p className="text-sm text-slate-500 mt-1">
							Introduce el correo del especialista y pulsa <strong>Enviar</strong>. La invitación se actualizará y se enviará por e-mail.
						</p>

						<form onSubmit={handleSendInvitation} className="mt-4 space-y-3">
							<label className="block">
								<span className="text-sm text-slate-700">Correo del especialista</span>
								<input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300" placeholder="medico@ejemplo.com" required />
							</label>

							<div className="text-sm text-slate-500">
								URL de invitación: <code className="break-words text-xs bg-slate-50 px-2 py-1 rounded">{getInviteUrl(activeInvite.token)}</code>
							</div>

							{message && <div className={`text-sm ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</div>}

							<div className="flex items-center justify-end gap-3 mt-3">
								<button type="button" onClick={closeModal} className="px-4 py-2 rounded-md bg-white border text-slate-700">
									Cancelar
								</button>
								<button type="submit" disabled={sending} className={`px-4 py-2 rounded-md text-white ${sending ? 'bg-slate-400' : 'bg-sky-600 hover:bg-sky-700'}`}>
									{sending ? 'Enviando...' : 'Enviar invitación'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
