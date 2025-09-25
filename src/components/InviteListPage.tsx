'use client';

import React from 'react';

export type UserRole = 'ADMIN' | 'MEDICO' | 'ENFERMERA' | 'RECEPCION' | 'FARMACIA' | 'PACIENTE';

export type Invite = {
	id: string;
	email: string;
	token: string;
	role: UserRole | string;
	used: boolean;
	expiresAt: string; // ISO string (no nulo desde prisma)
	createdAt: string; // ISO string
};

type Props = {
	initialInvites: Invite[];
	organizationId: string;
};

export default function InviteListPage({ initialInvites, organizationId }: Props) {
	const [invites, setInvites] = React.useState<Invite[]>(initialInvites ?? []);
	const [loadingIds, setLoadingIds] = React.useState<Record<string, boolean>>({});
	const [message, setMessage] = React.useState<string | null>(null);

	// Helper para mostrar mensajes temporales
	const flash = (text: string, ms = 3500) => {
		setMessage(text);
		window.setTimeout(() => setMessage(null), ms);
	};

	const formatDate = (iso?: string) => {
		if (!iso) return '—';
		try {
			return new Date(iso).toLocaleString();
		} catch {
			return iso;
		}
	};

	const handleCopyToken = async (token: string) => {
		try {
			if (!token) throw new Error('Token vacío');
			await navigator.clipboard.writeText(token);
			flash('Token copiado al portapapeles');
		} catch (err) {
			console.error('copy token error', err);
			flash('No se pudo copiar el token');
		}
	};

	const handleCancelInvite = async (inviteId: string) => {
		const ok = confirm('¿Cancelar invitación? Esto no se puede deshacer.');
		if (!ok) return;

		// Optimista
		const previous = invites;
		setInvites((prev) => prev.filter((i) => i.id !== inviteId));
		setLoadingIds((s) => ({ ...s, [inviteId]: true }));

		try {
			// llama a tu API para eliminar la invitación (implementa la route)
			const res = await fetch(`/api/invites/${inviteId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
			});

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}

			flash('Invitación cancelada correctamente');
		} catch (err) {
			console.error('cancel invite failed', err);
			// rollback
			setInvites(previous);
			flash('No se pudo cancelar la invitación. Intenta de nuevo.');
		} finally {
			setLoadingIds((s) => {
				const copy = { ...s };
				delete copy[inviteId];
				return copy;
			});
		}
	};

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Invitaciones ({invites.length})</h2>
					<p className="text-sm text-slate-500">
						Organización: <span className="font-medium">{organizationId}</span>
					</p>
				</div>
				<div>
					<button
						type="button"
						className="px-3 py-1.5 rounded-md bg-sky-600 text-white text-sm hover:opacity-95"
						onClick={() => {
							flash('Implementa el modal de creación o la ruta API /api/invites (POST)');
						}}>
						Crear invitación
					</button>
				</div>
			</div>

			{message && (
				<div role="status" aria-live="polite" className="mb-3 text-sm text-slate-700">
					{message}
				</div>
			)}

			<div className="space-y-3">
				{invites.length === 0 ? (
					<div className="text-sm text-slate-500">No hay invitaciones aún.</div>
				) : (
					invites.map((inv) => {
						const isLoading = Boolean(loadingIds[inv.id]);
						return (
							<div key={inv.id} className="p-3 border rounded-lg bg-white shadow-sm flex justify-between items-center" aria-live="polite">
								<div>
									<div className="text-sm font-medium text-slate-800">{inv.email}</div>
									<div className="text-xs text-slate-500">
										Role: {inv.role} • {inv.used ? 'Usada' : 'Pendiente'}
									</div>
									<div className="text-xs text-slate-400 mt-1">
										Creada: {formatDate(inv.createdAt)} • Expira: {formatDate(inv.expiresAt)}
									</div>
								</div>

								<div className="flex items-center gap-2">
									<button className="text-sm px-2 py-1 border rounded-md text-slate-700" onClick={() => handleCopyToken(inv.token)} disabled={isLoading} aria-label={`Copiar token de invitación para ${inv.email}`}>
										{isLoading ? '...' : 'Copiar token'}
									</button>

									<button className="text-sm px-2 py-1 rounded-md bg-rose-600 text-white disabled:opacity-60" onClick={() => handleCancelInvite(inv.id)} disabled={isLoading}>
										{isLoading ? 'Cancelando…' : 'Cancelar'}
									</button>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
