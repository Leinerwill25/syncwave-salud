// app/dashboard/pharmacy/users/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
	Users,
	UserPlus,
	Mail,
	Check,
	X,
	Loader2,
	AlertCircle,
	Copy,
	CheckCircle,
	Shield,
	RefreshCw,
	UserCheck,
	UserMinus
} from 'lucide-react';
import axios from 'axios';

type UserRow = {
	id: string;
	fullName: string | null;
	email: string;
	role: string;
	used: boolean;
	created_at: string;
};

type InviteRow = {
	id: string;
	email: string;
	token: string;
	role: string;
	used: boolean;
	expiresAt: string;
	createdAt: string;
};

export default function PharmacyUsersPage() {
	const [users, setUsers] = useState<UserRow[]>([]);
	const [invites, setInvites] = useState<InviteRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [actionId, setActionId] = useState<string | null>(null);
	
	// Message feedback
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	// Invite Form fields
	const [email, setEmail] = useState('');
	const [role, setRole] = useState('RECEPCION'); // default to cashier

	// Copy status indicator
	const [copiedId, setCopiedId] = useState<string | null>(null);

	useEffect(() => {
		fetchData();
	}, []);

	async function fetchData() {
		try {
			setLoading(true);
			setError(null);
			const res = await axios.get('/api/pharmacy/users');
			if (res.data?.success) {
				setUsers(res.data.users);
				setInvites(res.data.invites);
			}
		} catch (err: any) {
			console.error('Error fetching users/invites:', err);
			setError(err?.response?.data?.message || 'Error al cargar los usuarios de la farmacia');
		} finally {
			setLoading(false);
		}
	}

	async function handleSendInvite(e: React.FormEvent) {
		e.preventDefault();
		if (!email.trim()) return;

		setSubmitting(true);
		setError(null);
		setSuccessMsg(null);

		try {
			// Call shared invites endpoint
			const res = await axios.post('/api/invites', {
				email: email.trim().toLowerCase(),
				role: role
			});

			if (res.status === 201 && res.data?.id) {
				setSuccessMsg(`Invitación enviada con éxito a: ${email}`);
				setEmail('');
				// Reload invites list
				fetchData();
			}
		} catch (err: any) {
			console.error('Error sending invite:', err);
			setError(err?.response?.data?.error || 'Error al enviar la invitación');
		} finally {
			setSubmitting(false);
		}
	}

	async function toggleUserStatus(userRow: UserRow) {
		const newStatus = !userRow.used;
		setActionId(userRow.id);
		setError(null);
		setSuccessMsg(null);

		try {
			const res = await axios.put(`/api/pharmacy/users/${userRow.id}`, {
				used: newStatus
			});

			if (res.data?.success) {
				setUsers(prev =>
					prev.map(u => (u.id === userRow.id ? { ...u, used: newStatus } : u))
				);
				setSuccessMsg(
					newStatus
						? `Usuario "${userRow.fullName || userRow.email}" reactivado correctamente.`
						: `Usuario "${userRow.fullName || userRow.email}" suspendido temporalmente.`
				);
			}
		} catch (err: any) {
			console.error('Error toggling user status:', err);
			setError(err?.response?.data?.message || 'Error al modificar estado de cuenta.');
		} finally {
			setActionId(null);
		}
	}

	async function handleCancelInvite(inviteId: string) {
		if (!confirm('¿Estás seguro de que deseas cancelar esta invitación? El enlace ya no será válido.')) {
			return;
		}

		setActionId(inviteId);
		setError(null);
		setSuccessMsg(null);

		try {
			const res = await axios.delete('/api/invites', {
				data: { id: inviteId }
			});

			if (res.data?.ok) {
				setInvites(prev => prev.filter(i => i.id !== inviteId));
				setSuccessMsg('Invitación cancelada y removida del listado.');
			}
		} catch (err: any) {
			console.error('Error canceling invite:', err);
			setError(err?.response?.data?.error || 'Error al cancelar la invitación.');
		} finally {
			setActionId(null);
		}
	}

	function handleCopyLink(token: string, inviteId: string) {
		const origin = window.location.origin;
		const link = `${origin}/invite/${token}`;
		navigator.clipboard.writeText(link).then(() => {
			setCopiedId(inviteId);
			setTimeout(() => setCopiedId(null), 2000);
		});
	}

	function getRoleBadge(roleKey: string) {
		const key = (roleKey || '').toUpperCase();
		if (key === 'FARMACIA') {
			return (
				<span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
					Encargado Farmacia
				</span>
			);
		}
		if (key === 'RECEPCION') {
			return (
				<span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
					Venta / Caja
				</span>
			);
		}
		if (key === 'ADMINISTRACION') {
			return (
				<span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
					Administrador
				</span>
			);
		}
		return (
			<span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
				{roleKey}
			</span>
		);
	}

	return (
		<div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
			{/* Page Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
						<Users className="w-8 h-8 text-purple-600 shrink-0" />
						Usuarios y Permisos
					</h1>
					<p className="text-sm text-slate-500 mt-1">
						Administra las cuentas de tu personal de farmacia, invita nuevos cajeros y controla el acceso a la plataforma.
					</p>
				</div>
				<button
					type="button"
					onClick={fetchData}
					disabled={loading}
					className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-purple-600 rounded-xl hover:shadow-sm transition cursor-pointer"
					title="Recargar listados"
				>
					<RefreshCw className={`w-4.5 h-4.5 ${loading ? 'animate-spin' : ''}`} />
				</button>
			</div>

			{/* Status Alerts */}
			{error && (
				<div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm flex items-start gap-2 max-w-3xl">
					<AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
					<span>{error}</span>
				</div>
			)}
			{successMsg && (
				<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm flex items-start gap-2 animate-in slide-in-from-top duration-300 max-w-3xl">
					<CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
					<span>{successMsg}</span>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
				{/* List Col 1 & 2 */}
				<div className="lg:col-span-2 space-y-6 sm:space-y-8">
					{/* Active Users List */}
					<div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-5">
						<h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
							<Shield className="w-5 h-5 text-purple-600" />
							Personal Activo ({users.length})
						</h3>

						{loading ? (
							<div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
								<Loader2 className="w-6 h-6 animate-spin text-purple-600" />
								<p className="text-xs">Cargando personal...</p>
							</div>
						) : users.length === 0 ? (
							<p className="text-slate-400 text-xs italic text-center py-6">No hay personal registrado.</p>
						) : (
							<div className="divide-y divide-slate-100">
								{users.map(u => (
									<div key={u.id} className="py-3.5 flex justify-between items-center gap-4 hover:bg-slate-50/50 px-2 rounded-xl transition">
										<div className="min-w-0">
											<h4 className="font-bold text-slate-800 text-sm truncate">
												{u.fullName || <span className="text-slate-400 italic">Nombre no registrado</span>}
											</h4>
											<p className="text-xs text-slate-400 mt-0.5 truncate">{u.email}</p>
											<div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
												{getRoleBadge(u.role)}
												{!u.used && (
													<span className="inline-flex items-center text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100 uppercase tracking-wider">
														Suspendido
													</span>
												)}
											</div>
										</div>

										<div className="shrink-0 flex items-center gap-3">
											<button
												type="button"
												disabled={actionId !== null}
												onClick={() => toggleUserStatus(u)}
												className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm transition active:scale-95 cursor-pointer ${u.used ? 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50/55 hover:border-rose-200' : 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700'}`}
											>
												{actionId === u.id ? (
													<Loader2 className="w-3.5 h-3.5 animate-spin" />
												) : u.used ? (
													<>
														<UserMinus className="w-3.5 h-3.5" />
														Suspender
													</>
												) : (
													<>
														<UserCheck className="w-3.5 h-3.5" />
														Habilitar
													</>
												)}
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Sent Invites List */}
					<div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-5">
						<h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
							<Mail className="w-5 h-5 text-purple-600" />
							Invitaciones Pendientes ({invites.filter(i => !i.used).length})
						</h3>

						{loading ? (
							<div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
								<Loader2 className="w-6 h-6 animate-spin text-purple-600" />
								<p className="text-xs">Cargando invitaciones...</p>
							</div>
						) : invites.filter(i => !i.used).length === 0 ? (
							<p className="text-slate-400 text-xs italic text-center py-6">No hay invitaciones pendientes.</p>
						) : (
							<div className="divide-y divide-slate-100">
								{invites.filter(i => !i.used).map(inv => (
									<div key={inv.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
										<div className="min-w-0 space-y-1">
											<div className="flex items-center gap-2">
												<h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate">{inv.email}</h4>
												<span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 rounded uppercase border border-amber-100 tracking-wider">
													Espera
												</span>
											</div>
											<div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-medium">
												<span>Rol asignado: {inv.role || 'RECEPCION'}</span>
												<span>• Expira: {new Date(inv.expiresAt).toLocaleDateString()}</span>
											</div>
										</div>

										<div className="shrink-0 flex items-center gap-2 justify-end">
											<button
												type="button"
												onClick={() => handleCopyLink(inv.token, inv.id)}
												className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl text-[11px] shadow-sm transition cursor-pointer"
											>
												{copiedId === inv.id ? (
													<>
														<Check className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
														Copiado
													</>
												) : (
													<>
														<Copy className="w-3.5 h-3.5" />
														Copiar Enlace
													</>
												)}
											</button>
											<button
												type="button"
												disabled={actionId === inv.id}
												onClick={() => handleCancelInvite(inv.id)}
												className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition cursor-pointer disabled:opacity-50"
												title="Revocar invitación"
											>
												{actionId === inv.id ? (
													<Loader2 className="w-4 h-4 animate-spin text-rose-600" />
												) : (
													<X className="w-4 h-4" />
												)}
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Invite Form Col 3 */}
				<div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-5">
					<h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
						<UserPlus className="w-5 h-5 text-purple-600" />
						Invitar Empleado
					</h3>

					<form onSubmit={handleSendInvite} className="space-y-4">
						<div>
							<label className="block text-xs font-bold text-slate-700 mb-1.5">
								Correo Electrónico
							</label>
							<input
								type="email"
								value={email}
								onChange={e => setEmail(e.target.value)}
								placeholder="empleado@farmacia.com"
								required
								className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 hover:border-slate-300 transition"
							/>
						</div>

						<div>
							<label className="block text-xs font-bold text-slate-700 mb-1.5">
								Rol del Empleado
							</label>
							<select
								value={role}
								onChange={e => setRole(e.target.value)}
								className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 hover:border-slate-300 transition"
							>
								<option value="RECEPCION">Cajero / Mostrador (RECEPCION)</option>
								<option value="FARMACIA">Auxiliar / Encargado (FARMACIA)</option>
								<option value="ADMINISTRACION">Contabilidad / Auditor (ADMINISTRACION)</option>
							</select>
						</div>

						<button
							type="submit"
							disabled={submitting || !email.trim()}
							className="w-full inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-5 rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
						>
							{submitting ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Enviando invitación...
								</>
							) : (
								<>
									<UserPlus className="w-4 h-4" />
									Enviar Enlace de Invitación
								</>
							)}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
