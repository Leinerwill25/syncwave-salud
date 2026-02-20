'use client';

import React, { useState, useRef, useMemo } from 'react';
import { bulkUploadAndSendInvites } from '@/lib/actions/invites';
import { Upload, Check, AlertCircle, ChevronLeft, ChevronRight, FileSpreadsheet, Search, Loader2, Plus, Send, RefreshCw, X } from 'lucide-react';
import * as XLSX from 'xlsx';

/**
 * Tipos
 */
export type UserRole = 'ADMIN' | 'MEDICO' | 'ENFERMERA' | 'RECEPCION' | 'FARMACIA' | 'PACIENTE';

const INVITE_ROLES: { value: UserRole; label: string }[] = [
	{ value: 'MEDICO', label: 'Médico / Especialista' },
	{ value: 'ENFERMERA', label: 'Enfermer@' },
	{ value: 'RECEPCION', label: 'Recepción / Asistente de Citas' },
];

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
   Componentes UI
   ------------------------- */

function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'neutral' | 'success' | 'danger' | 'accent' | 'warning' }) {
	const variants = {
		neutral: 'bg-slate-100 text-slate-600 ring-slate-500/10',
		success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
		danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
		accent: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
		warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
	};
	return <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ring-1 ring-inset ${variants[variant]}`}>{children}</span>;
}

function useToast() {
	const [toasts, setToasts] = useState<{ id: string; text: string; type: 'success' | 'error' }[]>([]);
	const add = (text: string, type: 'success' | 'error' = 'success', ms = 4000) => {
		const id = String(Date.now()) + Math.random().toString(16).slice(2);
		setToasts((t) => [...t, { id, text, type }]);
		setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
	};
	return { toasts, add };
}

/* -------------------------
   Componente Principal
   ------------------------- */

export default function InviteListPage({ initialInvites, organizationId }: Props) {
	const [invites, setInvites] = useState<Invite[]>(initialInvites ?? []);
	const [isUploading, setIsUploading] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { toasts, add: toast } = useToast();

	// Estado Modal Manual
	const [showManualModal, setShowManualModal] = useState(false);
	const [manualEmail, setManualEmail] = useState('');
	const [manualRole, setManualRole] = useState<UserRole>('MEDICO');
	const [isSendingManual, setIsSendingManual] = useState(false);

	// Estado Modal Asignar
	const [assignModal, setAssignModal] = useState<{ open: boolean; inviteId: string | null }>({ open: false, inviteId: null });
	const [assignEmail, setAssignEmail] = useState('');
	const [isAssigning, setIsAssigning] = useState(false);

	// Filtrado y Paginación
	const filteredInvites = useMemo(() => {
		return invites.filter(invite => 
			invite.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			invite.role.toLowerCase().includes(searchTerm.toLowerCase())
		);
	}, [invites, searchTerm]);

	const totalPages = Math.ceil(filteredInvites.length / itemsPerPage);
	const paginatedInvites = filteredInvites.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	// Manejo de Archivos
	const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;
		
		const file = files[0];
		setIsUploading(true);
		
		try {
			let emails: string[] = [];
			
			if (file.name.endsWith('.csv')) {
				const text = await file.text();
				emails = extractEmails(text);
			} else {
				const data = await file.arrayBuffer();
				const workbook = XLSX.read(data);
				const sheetName = workbook.SheetNames[0];
				const sheet = workbook.Sheets[sheetName];
				const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
				const text = jsonData.map(row => row.join(' ')).join(' ');
				emails = extractEmails(text);
			}

			if (emails.length === 0) {
				toast('No se encontraron correos válidos en el archivo.', 'error');
				return;
			}

			toast(`Procesando ${emails.length} correos...`, 'success');

			const result = await bulkUploadAndSendInvites(organizationId, emails);

			if (result.success > 0) {
				toast(`Se enviaron ${result.success} invitaciones exitosamente.`, 'success');
				window.location.reload(); 
			}
			
			if (result.failed > 0) {
				toast(`Hubo ${result.failed} errores. Revisa la consola.`, 'error');
				console.error('Errores de envío:', result.errors);
			}

		} catch (error) {
			console.error('Error procesando archivo:', error);
			toast('Error al procesar el archivo.', 'error');
		} finally {
			setIsUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	};

	const handleManualInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!manualEmail || !/\S+@\S+\.\S+/.test(manualEmail)) {
			toast('Ingresa un correo válido.', 'error');
			return;
		}

		setIsSendingManual(true);
		try {
			const { assignToFirstAvailableInvite } = await import('@/lib/actions/invites');
			const result = await assignToFirstAvailableInvite(organizationId, manualEmail, manualRole);
			
			if (result.success) {
				toast(`Invitación enviada a ${manualEmail} como ${manualRole}`, 'success');
				setManualEmail('');
				setManualRole('MEDICO');
				setShowManualModal(false);
				window.location.reload();
			} else {
				toast(result.error || 'Error al enviar la invitación.', 'error');
			}
		} catch (error) {
			console.error(error);
			toast('Error inesperado.', 'error');
		} finally {
			setIsSendingManual(false);
		}
	};

	const handleAssignEmail = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!assignEmail || !/\S+@\S+\.\S+/.test(assignEmail)) {
			toast('Ingresa un correo válido.', 'error');
			return;
		}
		if (!assignModal.inviteId) return;

		setIsAssigning(true);
		try {
			const { assignEmailToInvite } = await import('@/lib/actions/invites');
			const result = await assignEmailToInvite(assignModal.inviteId, assignEmail);
			
			if (result.success) {
				toast(`Invitación asignada y enviada a ${assignEmail}`, 'success');
				setAssignEmail('');
				setAssignModal({ open: false, inviteId: null });
				window.location.reload();
			} else {
				toast(result.error || 'Error al asignar la invitación.', 'error');
			}
		} catch (error) {
			console.error(error);
			toast('Error inesperado.', 'error');
		} finally {
			setIsAssigning(false);
		}
	};

	const extractEmails = (text: string) => {
		const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
		return Array.from(new Set(text.match(emailRegex) || [])).map(e => e.toLowerCase());
	};

	return (
		<div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
			{/* Header Premium */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
				<div>
					<h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestión de Invitaciones</h1>
					<p className="text-slate-500 mt-2 text-lg">Administra el acceso de especialistas a tu clínica.</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<button
						onClick={() => setShowManualModal(true)}
						className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
					>
						<Plus className="w-5 h-5" />
						<span className="font-medium">Invitar Manualmente</span>
					</button>

					<div className="relative group">
						<input
							ref={fileInputRef}
							type="file"
							accept=".csv,.xlsx,.xls"
							onChange={handleFilePicked}
							className="hidden"
						/>
						<button
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading}
							className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
						>
							{isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
							<span className="font-medium">Cargar Excel / CSV</span>
						</button>
					</div>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
					<p className="text-sm font-medium text-slate-500">Total Invitaciones</p>
					<p className="text-3xl font-bold text-slate-900 mt-2">{invites.length}</p>
				</div>
				<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
					<p className="text-sm font-medium text-slate-500">Pendientes</p>
					<p className="text-3xl font-bold text-amber-500 mt-2">{invites.filter(i => !i.used).length}</p>
				</div>
				<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
					<p className="text-sm font-medium text-slate-500">Aceptadas</p>
					<p className="text-3xl font-bold text-emerald-600 mt-2">{invites.filter(i => i.used).length}</p>
				</div>
			</div>

			{/* Search & Filter */}
			<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
				<div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
					<Search className="w-5 h-5 text-slate-400" />
					<input
						type="text"
						placeholder="Buscar por correo o rol..."
						value={searchTerm}
						onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
						className="bg-transparent border-none focus:ring-0 text-sm w-full text-slate-700 placeholder:text-slate-400"
					/>
				</div>

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="bg-slate-50 text-slate-500 font-medium">
							<tr>
								<th className="px-6 py-4">Especialista</th>
								<th className="px-6 py-4">Estado</th>
								<th className="px-6 py-4">Rol</th>
								<th className="px-6 py-4">Creada el</th>
								<th className="px-6 py-4 text-right">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{paginatedInvites.length > 0 ? (
								paginatedInvites.map((invite) => (
									<tr key={invite.id} className="hover:bg-slate-50/50 transition-colors">
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
													{(invite.email || 'U').charAt(0).toUpperCase()}
												</div>
												<span className="font-medium text-slate-900">{invite.email || 'Sin asignar'}</span>
											</div>
										</td>
										<td className="px-6 py-4">
											{invite.used ? (
												<Badge variant="success">Aceptada</Badge>
											) : (
												<Badge variant="warning">Pendiente</Badge>
											)}
										</td>
										<td className="px-6 py-4 text-slate-600">{invite.role}</td>
										<td className="px-6 py-4 text-slate-500">
											{new Date(invite.createdAt).toLocaleDateString()}
										</td>
										<td className="px-6 py-4 text-right">
											{!invite.used && (
												<button
													onClick={async () => {
														if (!invite.email) {
															setAssignModal({ open: true, inviteId: invite.id });
															return;
														}
														toast('Reenviando invitación...', 'success');
														await bulkUploadAndSendInvites(organizationId, [invite.email]);
														toast('Invitación reenviada.', 'success');
													}}
													className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all text-xs font-medium"
												>
													{invite.email ? (
														<>
															<RefreshCw className="w-3.5 h-3.5" />
															Reenviar
														</>
													) : (
														<>
															<Send className="w-3.5 h-3.5" />
															Asignar
														</>
													)}
												</button>
											)}
										</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan={5} className="px-6 py-12 text-center text-slate-500">
										<div className="flex flex-col items-center gap-2">
											<FileSpreadsheet className="w-8 h-8 text-slate-300" />
											<p>No se encontraron invitaciones</p>
										</div>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
						<p className="text-sm text-slate-500">
							Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredInvites.length)}</span> de <span className="font-medium">{filteredInvites.length}</span>
						</p>
						<div className="flex gap-2">
							<button
								onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
							>
								<ChevronLeft className="w-4 h-4 text-slate-600" />
							</button>
							<button
								onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
							>
								<ChevronRight className="w-4 h-4 text-slate-600" />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Modal Manual Invite */}
			{showManualModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
						<div className="p-6 border-b border-slate-100 flex justify-between items-center">
							<h3 className="text-lg font-bold text-slate-900">Nueva Invitación</h3>
							<button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
								<X className="w-5 h-5" />
							</button>
						</div>
						<form onSubmit={handleManualInvite} className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
								<input
									type="email"
									value={manualEmail}
									onChange={(e) => setManualEmail(e.target.value)}
									placeholder="ejemplo@correo.com"
									className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
									autoFocus
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">Rol del Usuario</label>
								<select
									value={manualRole}
									onChange={(e) => setManualRole(e.target.value as UserRole)}
									className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-700"
								>
									{INVITE_ROLES.map((r) => (
										<option key={r.value} value={r.value}>{r.label}</option>
									))}
								</select>
								<p className="text-xs text-slate-500 mt-2">
									Se enviará un correo con el enlace de registro al colaborador seleccionado.
								</p>
							</div>
							<div className="flex justify-end gap-3 pt-2">
								<button
									type="button"
									onClick={() => setShowManualModal(false)}
									className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={isSendingManual}
									className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-70 flex items-center gap-2"
								>
									{isSendingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
									Enviar Invitación
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Modal Assign Invite */}
			{assignModal.open && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
						<div className="p-6 border-b border-slate-100 flex justify-between items-center">
							<h3 className="text-lg font-bold text-slate-900">Asignar Invitación</h3>
							<button onClick={() => setAssignModal({ open: false, inviteId: null })} className="text-slate-400 hover:text-slate-600 transition-colors">
								<X className="w-5 h-5" />
							</button>
						</div>
						<form onSubmit={handleAssignEmail} className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
								<input
									type="email"
									value={assignEmail}
									onChange={(e) => setAssignEmail(e.target.value)}
									placeholder="ejemplo@correo.com"
									className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
									autoFocus
								/>
								<p className="text-xs text-slate-500 mt-2">
									Se asignará este correo a la invitación existente y se enviará el enlace.
								</p>
							</div>
							<div className="flex justify-end gap-3 pt-2">
								<button
									type="button"
									onClick={() => setAssignModal({ open: false, inviteId: null })}
									className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={isAssigning}
									className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-70 flex items-center gap-2"
								>
									{isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
									Asignar y Enviar
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Toasts Container */}
			<div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
				{toasts.map((t) => (
					<div
						key={t.id}
						className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-right-10 ${
							t.type === 'success' ? 'bg-white border-emerald-100 text-emerald-800' : 'bg-white border-rose-100 text-rose-800'
						}`}
					>
						{t.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
						<span className="text-sm font-medium">{t.text}</span>
					</div>
				))}
			</div>
		</div>
	);
}
