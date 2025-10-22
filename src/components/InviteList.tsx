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

/* -------------------------
   Íconos pequeños
   ------------------------- */
function IconCopy() {
	return (
		<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
			<path d="M16 21H8a2 2 0 01-2-2V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
			<rect x="8" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
function IconSend() {
	return (
		<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
			<path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M22 2l-7 20 2-8 7-12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
function IconLink() {
	return (
		<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
			<path d="M10 14a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L10 6.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M14 10a5 5 0 00-7.07 0L4.81 11.88a5 5 0 007.07 7.07L14 17.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

/* -------------------------
   Helpers y utilidades
   ------------------------- */
const formatShortDate = (d?: string | Date) => {
	if (!d) return '—';
	try {
		return new Date(String(d)).toLocaleDateString();
	} catch {
		return String(d);
	}
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

			const data = await resp.json().catch(() => null);
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
		try {
			if (typeof window !== 'undefined' && window.location && window.location.origin) {
				return `${window.location.origin}/register/accept?token=${token}`;
			}
		} catch (e) {
			/* ignore */
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
		// Contenedor corporativo: card con acento y padding generoso
		<div className="w-full">
			<div className="relative rounded-2xl bg-white/95 border border-slate-200 shadow-lg p-6 max-w-4xl mx-auto">
				{/* franja de acento superior (decorativa) */}
				<div className="absolute -top-3 left-6 w-24 h-1 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 shadow-sm" aria-hidden />

				{/* Contenido interior */}
				<div className="space-y-6">
					{/* Header con contador y tarjeta */}
					<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
						<div className="min-w-0">
							<h4 className="text-lg font-semibold text-slate-900">Invitaciones</h4>
							<p className="text-sm text-slate-500 mt-1 max-w-[60ch]">Administra las invitaciones para tu clínica. Puedes asignar correos, copiar la URL de registro y enviar las invitaciones por correo electrónico.</p>
						</div>

						{/* Panel de estadísticas: tarjeta corporativa */}
						<div className="flex-shrink-0 w-full md:w-auto">
							<div className="bg-gradient-to-br from-white to-slate-50 border rounded-lg px-4 py-3 shadow-sm flex items-center gap-4">
								<div className="flex flex-col text-right">
									<div className="text-xs text-slate-500">Enviadas / Total</div>
									<div className="text-sm font-semibold text-slate-900">
										{counts.sent}/{counts.total}
									</div>
									<div className="text-xs text-slate-400 mt-1">
										Disponibles: <span className="font-medium text-slate-700">{counts.available}</span>
									</div>
								</div>

								{/* Barra de progreso sutil */}
								<div className="flex-1 min-w-[140px]">
									<div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden" aria-hidden>
										<div className="h-2 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 transition-all duration-500" style={{ width: `${Math.min(100, Math.round((counts.sent / Math.max(1, counts.total)) * 100))}%` }} />
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Lista de invitaciones */}
					{invites.length === 0 ? (
						<div className="text-sm text-slate-500 p-4 rounded-lg border bg-white shadow-sm">No hay invitaciones creadas. Genera invitaciones desde Facturación o Configuración.</div>
					) : (
						<ul className="space-y-3">
							{invites.map((inv) => {
								const tokenKey = String(inv.token ?? inv.id ?? '');
								const isCopied = Boolean(copiedMap[tokenKey]);
								const avatarLabel = inv.email ? inv.email[0]?.toUpperCase() : (inv.token ?? 'T')[0].toUpperCase();

								return (
									<li key={tokenKey} className="p-3 rounded-xl bg-white border border-slate-100 flex items-center justify-between gap-4 hover:shadow-lg transition-shadow duration-150">
										{/* Left: avatar + meta */}
										<div className="flex items-center gap-3 min-w-0">
											{/* avatar (mantiene w-10 h-10) */}
											<div
												className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-semibold"
												style={{
													background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(14,165,233,0.05))',
													color: '#0f172a',
													boxShadow: '0 6px 18px rgba(15,23,42,0.04)',
												}}
												aria-hidden>
												{avatarLabel}
											</div>

											{/* details */}
											<div className="min-w-0">
												<div className="text-sm font-medium text-slate-900 truncate">{inv.email || 'Sin email asignado'}</div>
												<div className="text-xs text-slate-500 truncate">Token: {inv.token ? String(inv.token).slice(0, 18) : '—'}</div>
												<div className="text-xs text-slate-400 mt-1">
													{inv.expiresAt ? `Expira: ${formatShortDate(inv.expiresAt)}` : ''}
													{inv.createdAt ? ` • Creado: ${formatShortDate(inv.createdAt)}` : ''}
												</div>
											</div>
										</div>

										{/* Right: acciones */}
										<div className="flex items-center gap-2">
											{/* Copy URL */}
											<button onClick={() => handleCopyUrl(inv.token)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm ${isCopied ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-white hover:bg-sky-50 text-slate-700'}`} title="Copiar URL de invitación" aria-label={`Copiar URL invitación ${tokenKey}`}>
												<span className="flex items-center justify-center w-6 h-6 rounded-sm text-sky-600 bg-sky-50">
													<IconLink />
												</span>
												<span className="truncate">{isCopied ? 'Copiado' : 'Copiar URL'}</span>
											</button>

											{/* Send */}
											<button onClick={() => openAssignModal(inv)} className={`px-3 py-1.5 rounded-md text-sm inline-flex items-center gap-2 ${counts.available <= 0 && !inv.email ? 'bg-slate-200 text-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow hover:opacity-95'}`} disabled={counts.available <= 0 && !inv.email} title={counts.available <= 0 && !inv.email ? 'No quedan plazas disponibles' : 'Asignar correo y enviar invitación'} aria-label="Asignar correo y enviar invitación">
												<span className="flex items-center justify-center w-5 h-5 rounded-sm bg-white/10 text-white/90">
													<IconSend />
												</span>
												<span>{inv.email ? 'Reenviar' : 'Enviar'}</span>
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
							{/* backdrop */}
							<div className="absolute inset-0 bg-black/40" onClick={closeModal} />

							{/* dialog */}
							<div role="dialog" aria-modal="true" aria-labelledby="invite-modal-title" className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border p-6 z-10" style={{ borderColor: 'rgba(15,23,42,0.04)' }}>
								<header className="flex items-start justify-between gap-4">
									<div>
										<h3 id="invite-modal-title" className="text-lg font-semibold text-slate-800">
											Enviar invitación
										</h3>
										<p className="text-sm text-slate-500 mt-1">
											Introduce el correo del especialista y pulsa <strong>Enviar</strong>. La invitación se actualizará y se enviará por e-mail.
										</p>
									</div>

									<button onClick={closeModal} className="text-slate-400 hover:text-slate-600 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-sky-200" aria-label="Cerrar">
										×
									</button>
								</header>

								<form onSubmit={handleSendInvitation} className="mt-4 space-y-3">
									<label className="block">
										<span className="text-sm text-slate-700">Correo del especialista</span>
										<input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300" placeholder="medico@ejemplo.com" required />
									</label>

									<div className="text-sm text-slate-500">
										URL de invitación: <code className="break-words text-xs bg-slate-50 px-2 py-1 rounded">{getInviteUrl(activeInvite.token)}</code>
									</div>

									{message && <div className={`text-sm ${message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{message.text}</div>}

									<div className="flex items-center justify-end gap-3 mt-3">
										<button type="button" onClick={closeModal} className="px-4 py-2 rounded-md bg-white border text-slate-700">
											Cancelar
										</button>

										<button type="submit" disabled={sending} className={`px-4 py-2 rounded-md text-white inline-flex items-center gap-2 ${sending ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:opacity-95'}`}>
											{sending ? (
												'Enviando...'
											) : (
												<>
													<span className="inline-flex items-center justify-center w-4 h-4">
														<IconSend />
													</span>
													Enviar invitación
												</>
											)}
										</button>
									</div>
								</form>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
