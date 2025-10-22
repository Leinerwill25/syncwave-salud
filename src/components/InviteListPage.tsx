// InviteListPage.tsx
'use client';

import React from 'react';

/**
 * Tipos
 */
export type UserRole = 'ADMIN' | 'MEDICO' | 'ENFERMERA' | 'RECEPCION' | 'FARMACIA' | 'PACIENTE';

export type Invite = {
	id: string;
	email: string;
	token: string;
	role: UserRole | string;
	used: boolean;
	expiresAt: string; // ISO string
	createdAt: string; // ISO string
};

type Props = {
	initialInvites: Invite[];
	organizationId: string;
};

/* -------------------------
   Íconos (SVG simples)
   ------------------------- */

function IconCheck() {
	return (
		<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
			<path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
function IconSend() {
	return (
		<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
			<path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

/* -------------------------
   Componentes UI pequeños
   ------------------------- */

function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'neutral' | 'success' | 'danger' | 'accent' }) {
	const classes = variant === 'success' ? 'bg-emerald-100 text-emerald-800' : variant === 'danger' ? 'bg-rose-100 text-rose-800' : variant === 'accent' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-800';
	return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${classes}`}>{children}</span>;
}

/** Toasts simples (auto dismiss) */
function useToast() {
	const [toasts, setToasts] = React.useState<{ id: string; text: string }[]>([]);
	const add = (text: string, ms = 3500) => {
		const id = String(Date.now()) + Math.random().toString(16).slice(2);
		setToasts((t) => [...t, { id, text }]);
		window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
	};
	return { toasts, add, clear: () => setToasts([]) };
}

/* -------------------------
   Utilidades
   ------------------------- */
const formatDate = (iso?: string) => {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
	} catch {
		return iso;
	}
};

/* -------------------------
   Avatar (mantiene w-12 h-12)
   ------------------------- */
const Avatar = ({ email }: { email: string }) => {
	const initial = (email || 'U').trim().charAt(0).toUpperCase();
	return (
		<div
			className="w-12 h-12 rounded-lg flex items-center justify-center font-semibold text-slate-800"
			style={{
				background: 'linear-gradient(135deg, rgba(14,165,233,0.09), rgba(99,102,241,0.06))',
				boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
			}}>
			{initial}
		</div>
	);
};

/* -------------------------
   ActionButton (mejorado visualmente)
   - mantiene px-3 py-1.5 text-sm
   ------------------------- */
function ActionButton({ children, variant = 'default', onClick, className = '', disabled = false, ...rest }: { children: React.ReactNode; variant?: 'default' | 'danger' | 'ghost' | 'accent'; onClick?: () => void; className?: string; disabled?: boolean; [key: string]: any }) {
	const base = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-transform transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1';
	const variants: Record<string, string> = {
		default: 'border bg-white text-slate-700 hover:bg-slate-50 focus:ring-sky-300 shadow-sm',
		ghost: 'border bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200',
		accent: 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white hover:opacity-95 focus:ring-sky-300 shadow',
		danger: 'bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:opacity-95 focus:ring-rose-300 shadow',
	};
	const disabledClasses = disabled ? 'opacity-60 cursor-not-allowed transform-none' : 'hover:-translate-y-0.5';

	return (
		<button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${disabledClasses} ${className}`} {...rest}>
			{children}
		</button>
	);
}

/* -------------------------
   Modal genérico
   ------------------------- */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/40" onClick={onClose} />
			<div role="dialog" aria-modal="true" className="relative z-50 bg-white rounded-2xl shadow-xl w-full max-w-md p-6" style={{ border: '1px solid rgba(15,23,42,0.04)' }}>
				{title && <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>}
				{children}
			</div>
		</div>
	);
}

/* -------------------------
   Componente principal
   ------------------------- */

export default function InviteListPage({ initialInvites, organizationId }: Props) {
	const [invites, setInvites] = React.useState<Invite[]>(initialInvites ?? []);
	const [loadingIds, setLoadingIds] = React.useState<Record<string, boolean>>({});
	const toast = useToast();

	// SEND modal state (nuevo)
	const [sendModal, setSendModal] = React.useState<{ open: boolean; invite?: Invite; email: string; loading: boolean; error?: string }>({ open: false, invite: undefined, email: '', loading: false, error: undefined });

	// Abrir modal de enviar (reemplaza la acción anterior de "copiar")
	const openSendModal = (invite: Invite) => {
		setSendModal({ open: true, invite, email: invite.email ?? '', loading: false, error: undefined });
	};

	const closeSendModal = () => setSendModal({ open: false, invite: undefined, email: '', loading: false, error: undefined });

	// Enviar invitación -> llama a POST /api/invite/send
	const handleSendInvite = async () => {
		if (!sendModal.invite) return;
		const id = sendModal.invite.id;
		const email = (sendModal.email ?? '').trim();
		if (!email || !/\S+@\S+\.\S+/.test(email)) {
			setSendModal((s) => ({ ...s, error: 'Introduce un correo válido.' }));
			return;
		}

		setSendModal((s) => ({ ...s, loading: true, error: undefined }));
		setLoadingIds((s) => ({ ...s, [id]: true }));

		try {
			const res = await fetch('/api/invites/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, email }),
			});
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(payload?.message ?? `HTTP ${res.status}`);
			}

			// Actualizamos el email en la lista (optimista)
			setInvites((prev) => prev.map((p) => (p.id === id ? { ...p, email } : p)));
			toast.add('Invitación enviada correctamente');
			closeSendModal();
		} catch (err: any) {
			console.error('send invite failed', err);
			setSendModal((s) => ({ ...s, error: err?.message ?? 'Error enviando invitación.' }));
		} finally {
			setSendModal((s) => ({ ...s, loading: false }));
			setLoadingIds((s) => {
				const copy = { ...s };
				delete copy[id];
				return copy;
			});
		}
	};

	/* -------------------------------------------------------
	   NUEVO: Upload CSV / Excel -> parse -> asignar correos
	   ------------------------------------------------------- */
	const fileInputRef = React.useRef<HTMLInputElement | null>(null);

	// Extrae correos desde un texto (csv/plain)
	const extractEmailsFromText = (text: string) => {
		// Busca cadenas con formato email simple
		const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
		const matches = text.match(emailRegex) ?? [];
		// Normalizar (quitar duplicados y espacios)
		const unique = Array.from(new Set(matches.map((m) => m.trim().toLowerCase())));
		return unique;
	};

	// Handler para input file
	const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement> | null) => {
		const files = e?.target?.files;
		if (!files || files.length === 0) return;
		const file = files[0];
		const name = (file.name || '').toLowerCase();
		const isCSV = name.endsWith('.csv') || file.type === 'text/csv';
		const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || file.type.includes('spreadsheet') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

		if (!isCSV && !isExcel) {
			toast.add('Formato no soportado. Usa CSV o XLS/XLSX.');
			return;
		}

		toast.add('Procesando archivo...');

		try {
			if (isCSV) {
				// Leer como texto
				const text = await file.text();
				const emails = extractEmailsFromText(text);
				if (emails.length === 0) {
					toast.add('No se encontraron correos en el CSV.');
					return;
				}
				await assignEmailsToInvites(emails);
			} else {
				// Intentar parsear XLSX usando dynamic import de xlsx
				try {
					// read as array buffer
					const ab = await file.arrayBuffer();
					// dynamic import; si no está instalada, saltará
					// @ts-ignore
					const XLSX = await import('xlsx');
					const data = new Uint8Array(ab);
					const workbook = XLSX.read(data, { type: 'array' });
					let allText = '';
					for (const sheetName of workbook.SheetNames) {
						const sheet = workbook.Sheets[sheetName];
						// convertir sheet a csv/text y extraer correos
						const csv = XLSX.utils.sheet_to_csv(sheet);
						allText += '\n' + csv;
					}
					const emails = extractEmailsFromText(allText);
					if (emails.length === 0) {
						toast.add('No se encontraron correos en el Excel.');
						return;
					}
					await assignEmailsToInvites(emails);
				} catch (err) {
					console.error('xlsx parse failed', err);
					toast.add('No se pudo procesar el archivo Excel en el cliente. Intenta subir un CSV o instala la dependencia "xlsx" en el proyecto.');
				}
			}
		} catch (err) {
			console.error('file process error', err);
			toast.add('Error procesando el archivo. Revisa el formato.');
		} finally {
			// limpiar input para permitir re-subir mismo archivo
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	// Asigna correos extraídos a las invitaciones por índice y actualiza el backend si es posible
	const assignEmailsToInvites = async (emails: string[]) => {
		const invitesCount = invites.length;
		if (invitesCount === 0) {
			toast.add('No hay invitaciones para asignar.');
			return;
		}

		// Si hay más correos que invites, avisar y tomar solo los primeros
		if (emails.length > invitesCount) {
			toast.add(`Se encontraron ${emails.length} correos; se asignarán los primeros ${invitesCount} (sobran ${emails.length - invitesCount}).`);
		} else if (emails.length < invitesCount) {
			toast.add(`Se encontraron ${emails.length} correos; solo se actualizarán las primeras ${emails.length} invitaciones.`);
		} else {
			toast.add(`Se encontraron ${emails.length} correos. Procediendo a asignar.`);
		}

		// Crear assignments para enviar al servidor (optimista)
		const assignments = invites.map((inv, idx) => {
			const email = emails[idx] ?? inv.email; // mantener email actual si no hay nuevo
			return { id: inv.id, email };
		});

		// Actualizar UI localmente (optimista)
		setInvites((prev) => prev.map((inv, idx) => ({ ...inv, email: emails[idx] ?? inv.email })));

		// Intentar persistir en backend con endpoint batch (si existe)
		try {
			const payload = { assignments: assignments.filter((a, i) => emails[i] && emails[i] !== invites[i].email) }; // solo cambios
			if (payload.assignments.length === 0) {
				toast.add('Asignaciones aplicadas localmente (no se detectaron cambios nuevos para enviar al servidor).');
				return;
			}

			const res = await fetch('/api/invites/assign-batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				// backend no soporta endpoint o fallo: informar pero UI ya actualizada
				const txt = await res.text().catch(() => '');
				toast.add(`Asignaciones aplicadas localmente. Error guardando en servidor: HTTP ${res.status} ${txt}`);
				return;
			}

			toast.add('Asignaciones guardadas en el servidor correctamente.');
		} catch (err) {
			console.error('assign batch failed', err);
			toast.add('Asignaciones aplicadas localmente. No se pudo conectar con el servidor para persistir.');
		}
	};

	/* -------------------------------------------------------
	   FIN - Upload CSV / Excel
	   ------------------------------------------------------- */

	return (
		<div className="max-w-4xl mx-auto p-6">
			{/* Header */}
			<div className="mb-4 flex items-center justify-between">
				<div>
					{/* Mantengo text-2xl */}
					<h1 className="text-2xl font-semibold text-slate-900">Invitaciones</h1>
					<p className="text-sm text-slate-500 mt-1">
						Organización: <span className="font-medium text-slate-700">{organizationId}</span> · <span className="text-slate-600">{invites.length} invitación(es)</span>
					</p>
				</div>

				<div className="flex items-center gap-3">
					{/* NUEVO: botón para cargar CSV/XLSX */}
					<input ref={fileInputRef} type="file" accept=".csv, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFilePicked} className="hidden" />
					<ActionButton
						onClick={() => {
							if (fileInputRef.current) fileInputRef.current.click();
						}}
						variant="default"
						className="border"
						aria-label="Cargar CSV o Excel con correos">
						{/* icon simple */}
						<span className="flex items-center justify-center w-6 h-6 rounded-sm bg-sky-50 text-sky-600" aria-hidden>
							{/* simple icon: paperclip-ish */}
							<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
								<path d="M21.44 11.05L12.7 19.79a4.5 4.5 0 01-6.36-6.36l7.78-7.78a3.5 3.5 0 014.95 4.95l-7.07 7.07a2.5 2.5 0 11-3.54-3.54L16.4 6.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</span>
						<span>Cargar CSV / XLSX</span>
					</ActionButton>
				</div>
			</div>

			{/* Toasts (compactos) */}
			<div className="fixed right-5 top-5 z-50 flex flex-col gap-2">
				{toast.toasts.map((t) => (
					<div key={t.id} role="status" className="rounded-md bg-white/95 border px-4 py-2 text-sm shadow" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
						{t.text}
					</div>
				))}
			</div>

			{invites.length === 0 ? (
				<div className="rounded-lg border border-dashed border-slate-200 p-8 text-center bg-white shadow-sm" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.01), rgba(99,102,241,0.01))' }}>
					<p className="text-lg font-medium text-slate-800">No hay invitaciones</p>
				</div>
			) : (
				<ul role="list" className="space-y-4">
					{invites.map((inv) => {
						const isLoading = Boolean(loadingIds[inv.id]);

						return (
							<li key={inv.id} className="p-4 flex justify-between items-center gap-3 bg-white rounded-xl shadow-sm border" style={{ borderColor: 'rgba(15,23,42,0.04)' }} aria-live="polite">
								<div className="flex items-start gap-4 w-full">
									<div className="flex-none">
										<Avatar email={inv.email} />
									</div>

									<div className="min-w-0 flex-1">
										<div className="flex items-center justify-between gap-4">
											<div className="truncate">
												<div className="text-sm font-semibold text-slate-900 truncate">{inv.email}</div>
												<div className="mt-1 text-xs text-slate-500">
													Rol: <span className="font-medium text-slate-700">{inv.role}</span> · {inv.used ? <Badge variant="danger">Usada</Badge> : <Badge variant="accent">Pendiente</Badge>}
												</div>
											</div>

											<div className="hidden sm:flex sm:flex-col sm:items-end sm:text-right">
												<div className="text-xs text-slate-400">Creada</div>
												<div className="text-sm text-slate-700">{formatDate(inv.createdAt)}</div>
											</div>
										</div>

										<div className="mt-3 sm:mt-2 flex items-center gap-3 flex-wrap">
											<div className="text-xs text-slate-400 sm:hidden">Creada: {formatDate(inv.createdAt)}</div>

											<div className="text-xs text-slate-400">
												Expira: <span className="text-slate-600 ml-1">{formatDate(inv.expiresAt)}</span>
											</div>

											<div className="ml-0 sm:ml-2 text-xs text-slate-500">
												Token:{' '}
												<span className="font-mono text-xs text-slate-700 ml-1 inline-block align-middle truncate max-w-[220px]" title={inv.token}>
													{inv.token}
												</span>
											</div>
										</div>
									</div>
								</div>

								{/* ---------- BOTONES MEJORADOS ---------- */}
								<div className="flex items-center gap-2">
									{/* Send button (reemplaza Copy) */}
									<ActionButton onClick={() => openSendModal(inv)} className="border" aria-label={`Enviar invitación para ${inv.email}`} disabled={isLoading} variant="default">
										{/* Icon background */}
										<span className="flex items-center justify-center w-6 h-6 rounded-sm bg-sky-50 text-sky-600" aria-hidden>
											<IconSend />
										</span>

										<span className="truncate">{isLoading ? 'Enviando…' : 'Enviar'}</span>

										{/* small status badge when invite already has an email */}
										{inv.email ? (
											<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-50" aria-hidden>
												<IconCheck />
											</span>
										) : null}
									</ActionButton>
								</div>
							</li>
						);
					})}
				</ul>
			)}

			{/* SEND modal (nuevo) */}
			{sendModal.open && sendModal.invite && (
				<Modal open={sendModal.open} onClose={closeSendModal} title="Enviar invitación">
					<p className="text-sm text-slate-500 mb-3">Asigna el correo al que se enviará la invitación. Puedes editarlo antes de enviar.</p>

					<div className="space-y-3">
						<div>
							<label className="block text-xs font-medium text-slate-600">Email de destino</label>
							<input value={sendModal.email} onChange={(e) => setSendModal((s) => ({ ...s, email: e.target.value }))} type="email" placeholder="correo@ejemplo.com" className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200" />
						</div>

						{sendModal.error && <div className="text-sm text-rose-600">{sendModal.error}</div>}

						<div className="flex justify-end gap-2 pt-2">
							<button type="button" onClick={closeSendModal} className="px-4 py-2 rounded-md text-sm border">
								Cancelar
							</button>
							<button type="button" onClick={handleSendInvite} disabled={sendModal.loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-sky-600 to-indigo-600 text-white hover:opacity-95 disabled:opacity-60">
								<IconSend />
								<span>{sendModal.loading ? 'Enviando…' : 'Enviar invitación'}</span>
							</button>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
}
