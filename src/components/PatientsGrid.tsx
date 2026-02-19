// src/components/PatientsGrid.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, FileText, X, Calendar, User, Building2, Pill, FlaskConical, Stethoscope, Receipt, ChevronRight, Clock, AlertCircle, CheckCircle2, DollarSign, Check, XCircle, RotateCcw, Loader2, Plus } from 'lucide-react';

/* ---------------------- Types ---------------------- */

type Patient = {
	id: string;
	firstName: string;
	lastName: string;
	identifier?: string | null;
	dob?: string | null;
	gender?: string | null;
	phone?: string | null;
	address?: string | null;
	createdAt?: string;
	updatedAt?: string;
	consultationsCount?: number;
	prescriptionsCount?: number;
	labResultsCount?: number;
	billingsCount?: number;
	billingsTotal?: number;
	lastConsultationAt?: string | null;
	lastPrescriptionAt?: string | null;
	lastLabResultAt?: string | null;
	organizationsTouched?: string[];
};

type PatientsResponse = {
	data: Patient[];
	meta?: { page: number; per_page: number; total: number };
};

/* History types (reemplaza/ajusta si tu backend usa otros campos) */

type Medication = {
	name: string;
	dose?: string;
	instructions?: string;
};

export type Prescription = {
	id: string;
	createdAt?: string;
	date?: string;
	doctor?: string;
	medications?: Medication[]; // preferido
	meds?: Medication[]; // alias posible
	notes?: string;
	instructions?: string;
};

export type LabResult = {
	id: string;
	testName?: string;
	name?: string;
	date?: string;
	collectedAt?: string;
	result?: string | number;
	unit?: string;
	referenceRange?: string;
	comment?: string;
	status?: string;
	is_critical?: boolean;
};

export type Consultation = {
	id: string;
	date?: string;
	createdAt?: string;
	scheduledAt?: string;
	reason?: string;
	presentingComplaint?: string;
	doctor?: string;
	diagnosis?: string;
	notes?: string;
	status?: string;
	location?: string;
	durationMinutes?: number;
	isAppointment?: boolean;
	billing?: {
		id?: string;
		total?: number;
		currency?: string;
		estadoPago?: string;
		fechaPago?: string;
	} | null;
};

export type BillingItem = {
	name?: string;
	desc?: string;
	price?: number;
	amount?: number;
};

export type Billing = {
	id: string;
	date?: string;
	createdAt?: string;
	total?: number;
	amount?: number;
	status?: string;
	items?: BillingItem[];
	note?: string;
};

export type Organization = { id: string; lastSeenAt: string; types: string[] };

export type PatientHistory = {
	patientId: string;
	summary?: {
		consultationsCount: number;
		prescriptionsCount: number;
		labResultsCount: number;
		billingsCount: number;
		billingsTotal?: number;
	};
	organizations: Organization[];
	consultations: Consultation[];
	prescriptions: Prescription[];
	lab_results: LabResult[];
	facturacion: Billing[];
};

type HistoryItem = Prescription | LabResult | Consultation | Billing;

/* ---------------------- Utilities ---------------------- */

const formatDate = (iso?: string | null) => {
	if (!iso) return '—';
	try {
		const d = new Date(iso);
		return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
	} catch {
		return iso;
	}
};

const formatDateTime = (iso?: string | null) => {
	if (!iso) return '—';
	try {
		const d = new Date(iso);
		return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	} catch {
		return iso;
	}
};

const formatCurrency = (n?: number) => {
	if (n == null) return '—';
	try {
		return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
	} catch {
		return String(n);
	}
};

const initials = (first?: string, last?: string) => {
	const a = ((first || '').trim()[0] ?? '') || '';
	const b = ((last || '').trim()[0] ?? '') || '';
	return `${a}${b}`.toUpperCase();
};

const truncate = (text?: string, len = 120) => {
	if (!text) return '—';
	return text.length > len ? text.slice(0, len) + '…' : text;
};

/* ---------------------- Skeleton ---------------------- */

function SkeletonCard() {
	return (
		<div className="animate-pulse bg-white/80 rounded-2xl p-4 shadow-sm border border-gray-200 min-h-40">
			<div className="flex items-center gap-4">
				<div className="rounded-full bg-gray-200 h-12 w-12" />
				<div className="flex-1 space-y-2">
					<div className="h-4 bg-gray-200 rounded w-3/5" />
					<div className="h-3 bg-gray-200 rounded w-1/3" />
				</div>
			</div>
			<div className="mt-4 grid grid-cols-2 gap-2">
				<div className="h-8 bg-gray-200 rounded" />
				<div className="h-8 bg-gray-200 rounded" />
			</div>
		</div>
	);
}

/* ---------------------- Patient Card Mejorada ---------------------- */

function PatientCard({ patient, onLoadReports, onViewHistory }: { patient: Patient; onLoadReports: (id: string) => void; onViewHistory: (id: string) => void }) {
	return (
		<motion.article whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="relative bg-white/90 shadow-sm hover:shadow-xl border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-52" aria-labelledby={`patient-${patient.id}`}>
			{/* Header */}
			<div className="flex gap-4 items-start">
				{/* Avatar */}
				<div className="flex-none h-14 w-14 rounded-full bg-linear-to-br from-violet-200 via-indigo-200 to-emerald-200 text-white flex items-center justify-center text-xl font-bold shadow-lg" title={`${patient.firstName} ${patient.lastName}`}>
					{initials(patient.firstName, patient.lastName)}
				</div>

				{/* Info paciente */}
				<div className="flex-1 min-w-0">
					<h3 id={`patient-${patient.id}`} className="text-gray-900 font-bold text-lg md:text-xl truncate">
						{patient.firstName} {patient.lastName}
					</h3>

					<p className="text-sm text-gray-500 mt-0.5 truncate">
						Cédula: {patient.identifier != null ? String(patient.identifier) : '—'} • Género: {patient.gender != null ? String(patient.gender) : '—'} • Teléfono: {patient.phone != null ? String(patient.phone) : '—'}
					</p>

					{/* Estadísticas */}
					<div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
						<div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-medium shadow-sm">
							<ClipboardList className="w-3 h-3" /> Consultas: {patient.consultationsCount ?? 0}
						</div>
						<div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-800 border border-green-200 text-xs font-medium shadow-sm">
							<FileText className="w-3 h-3" /> Recetas: {patient.prescriptionsCount ?? 0}
						</div>
						<div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200 text-xs font-medium shadow-sm">🧪 Labs: {patient.labResultsCount ?? 0}</div>
						<div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-xs font-medium shadow-sm">📅 Última: {formatDate(patient.lastConsultationAt)}</div>
					</div>
				</div>
			</div>

			{/* Botones */}
			<div className="mt-4 flex gap-2 flex-wrap">
				<button onClick={() => onLoadReports(patient.id)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-linear-to-br from-sky-300 to-indigo-300 text-white text-sm font-semibold shadow-md hover:scale-[1.03] transition-transform focus:outline-none focus:ring-2 focus:ring-sky-300" aria-label={`Ver recetas e informes de ${patient.firstName} ${patient.lastName}`}>
					<ClipboardList className="w-4 h-4" /> Recetas / Informes
				</button>

				<button onClick={() => onViewHistory(patient.id)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300" aria-label={`Ver historial de ${patient.firstName} ${patient.lastName}`}>
					<FileText className="w-4 h-4" /> Historial
				</button>
			</div>
		</motion.article>
	);
}

/* ---------------------- Small UI Helpers ---------------------- */

function Tab({ label, id, active, onClick }: { label: string; id?: string; active: boolean; onClick: () => void }) {
	return (
		<button id={id} onClick={onClick} className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`} aria-pressed={active}>
			{label}
		</button>
	);
}

function MetaCard({ title, value, color, icon: Icon }: { title: string; value: string; color?: 'blue' | 'green' | 'yellow' | 'purple'; icon?: React.ComponentType<{ className?: string }> }) {
	const colors = {
		blue: {
			bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
			border: 'border-blue-200',
			text: 'text-blue-900',
			iconBg: 'bg-blue-500',
			icon: 'text-white',
		},
		green: {
			bg: 'bg-gradient-to-br from-green-50 to-green-100/50',
			border: 'border-green-200',
			text: 'text-green-900',
			iconBg: 'bg-green-500',
			icon: 'text-white',
		},
		yellow: {
			bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50',
			border: 'border-yellow-200',
			text: 'text-yellow-900',
			iconBg: 'bg-yellow-500',
			icon: 'text-white',
		},
		purple: {
			bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
			border: 'border-purple-200',
			text: 'text-purple-900',
			iconBg: 'bg-purple-500',
			icon: 'text-white',
		},
	} as const;
	const selected = colors[color ?? 'blue'];
	return (
		<div className={`p-5 rounded-xl border ${selected.border} ${selected.bg} shadow-sm hover:shadow-md transition-shadow duration-200`}>
			<div className="flex items-center justify-between mb-3">
				<div className={`p-2 ${selected.iconBg} rounded-lg`}>{Icon ? <Icon className={`w-5 h-5 ${selected.icon}`} /> : null}</div>
			</div>
			<div className={`text-xs font-semibold ${selected.text} uppercase tracking-wide mb-1`}>{title}</div>
			<div className={`text-3xl font-bold ${selected.text}`}>{value}</div>
		</div>
	);
}

/* ---------------------- Card renderers por tipo ---------------------- */

function PrescriptionCard({ item, onStatusUpdate }: { item: Prescription; onStatusUpdate?: () => void }) {
	const meds = item.medications ?? item.meds ?? [];
	const hasMeds = Array.isArray(meds) && meds.length > 0;
	const status = (item as any).status;
	const validUntil = (item as any).validUntil;
	const issuedAt = (item as any).issuedAt ?? item.date ?? item.createdAt;
	const treatmentPlan = (item as any).treatment_plan;

	return (
		<div className="group relative bg-gradient-to-br from-white to-green-50/30 border border-green-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-green-300">
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-green-100 rounded-lg">
						<Pill className="w-5 h-5 text-green-600" />
					</div>
					<div>
						<h4 className="font-semibold text-gray-900 text-base">Receta Médica</h4>
						<div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
							<Calendar className="w-3 h-3" />
							<span>Emitida: {formatDateTime(issuedAt)}</span>
						</div>
						{validUntil && (
							<div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
								<Clock className="w-3 h-3" />
								<span>Válida hasta: {formatDate(validUntil)}</span>
							</div>
						)}
					</div>
				</div>
				<div className="flex flex-col items-end gap-2">
					<div className="flex gap-2">
						{item.doctor && (
							<div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
								<User className="w-3 h-3" />
								<span className="font-medium">{item.doctor}</span>
							</div>
						)}
					</div>
					{status && <div className={`text-xs font-semibold px-2 py-1 rounded-md ${status === 'ACTIVE' ? 'bg-green-100 text-green-700 border border-green-200' : status === 'EXPIRED' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>{status}</div>}
				</div>
			</div>

			{hasMeds && (
				<div className="mb-4">
					<div className="flex items-center gap-2 mb-3">
						<Pill className="w-4 h-4 text-green-600" />
						<span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Medicamentos Prescritos ({meds.length})</span>
					</div>
					<div className="space-y-2.5">
						{meds.map((m, i) => (
							<div key={i} className="bg-white/60 rounded-lg p-3.5 border border-green-100 hover:border-green-200 transition-colors">
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1">
										<div className="font-semibold text-gray-900 text-sm">{m.name}</div>
										<div className="flex flex-wrap gap-2 mt-2">
											{m.dose && (
												<div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
													<span className="font-medium">Dosis:</span> {m.dose}
												</div>
											)}
											{(m as any).frequency && (
												<div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
													<span className="font-medium">Frecuencia:</span> {(m as any).frequency}
												</div>
											)}
											{(m as any).duration && (
												<div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
													<span className="font-medium">Duración:</span> {(m as any).duration}
												</div>
											)}
											{(m as any).quantity && (
												<div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
													<span className="font-medium">Cantidad:</span> {(m as any).quantity}
												</div>
											)}
										</div>
										{m.instructions && (
											<div className="mt-2 text-xs text-gray-600 italic bg-green-50 px-2 py-1.5 rounded border border-green-100">
												<span className="font-medium not-italic">Instrucciones:</span> {m.instructions}
											</div>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{!hasMeds && (
				<div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
					<div className="p-1.5 bg-amber-100 rounded-lg">
						<AlertCircle className="w-4 h-4 text-amber-600" />
					</div>
					<div>
						<p className="text-sm font-medium text-amber-900">Sin medicamentos estructurados</p>
						<p className="text-xs text-amber-700 mt-0.5">La receta existe pero los medicamentos no han sido extraídos del documento todavía.</p>
					</div>
				</div>
			)}

			{treatmentPlan && (
				<div className="mb-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
					<div className="flex items-center gap-2 mb-2">
						<FileText className="w-4 h-4 text-indigo-600" />
						<span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Plan de Tratamiento</span>
					</div>
					<div className="text-sm text-indigo-900 leading-relaxed font-medium">{treatmentPlan}</div>
				</div>
			)}

			{item.notes && (
				<div className="pt-3 border-t border-green-100">
					<div className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Notas Adicionales</div>
					<div className="text-sm text-gray-700 leading-relaxed bg-white/60 rounded-lg p-3 border border-green-100">{item.notes}</div>
				</div>
			)}
		</div>
	);
}

function LabResultCard({ item }: { item: LabResult }) {
	const testName = item.testName ?? item.name ?? 'Resultado de laboratorio';

	// Asegurar que nunca se renderice un objeto crudo como hijo de React
	const rawResult = item.result;
	const result = rawResult === null || rawResult === undefined ? null : typeof rawResult === 'object' ? JSON.stringify(rawResult) : String(rawResult);

	const unit = item.unit != null ? String(item.unit) : undefined;
	const status = item.status != null ? String(item.status) : undefined;
	const referenceRange = item.referenceRange != null ? String(item.referenceRange) : undefined;
	const comment = item.comment != null ? String(item.comment) : undefined;

	const isCritical = item.is_critical ?? false;

	return (
		<div className={`group relative bg-gradient-to-br from-white to-blue-50/30 border ${isCritical ? 'border-red-300' : 'border-blue-200/60'} rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 ${isCritical ? 'hover:border-red-400' : 'hover:border-blue-300'}`}>
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-center gap-3">
					<div className={`p-2 rounded-lg ${isCritical ? 'bg-red-100' : 'bg-blue-100'}`}>
						<FlaskConical className={`w-5 h-5 ${isCritical ? 'text-red-600' : 'text-blue-600'}`} />
					</div>
					<div>
						<h4 className="font-semibold text-gray-900 text-base">{testName}</h4>
						<div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
							<Calendar className="w-3 h-3" />
							<span>{formatDateTime(item.date ?? item.collectedAt)}</span>
						</div>
					</div>
				</div>
				{isCritical && (
					<div className="flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-xs font-semibold">
						<AlertCircle className="w-3.5 h-3.5" />
						Crítico
					</div>
				)}
			</div>

			{result !== undefined && result !== null && (
				<div className="mb-4">
					<div className="bg-white/60 rounded-lg p-4 border border-blue-100">
						<div className="flex items-baseline gap-2">
							<span className="text-2xl font-bold text-gray-900">{result}</span>
							{unit && <span className="text-sm text-gray-600 font-medium">{unit}</span>}
						</div>
						{status && (
							<div className="mt-2 flex items-center gap-1.5">
								<CheckCircle2 className="w-4 h-4 text-green-600" />
								<span className="text-xs text-gray-600 font-medium">{status}</span>
							</div>
						)}
					</div>
				</div>
			)}

			{referenceRange && (
				<div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
					<div className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Rango de Referencia</div>
					<div className="text-sm text-gray-800 font-mono">{referenceRange}</div>
				</div>
			)}

			{comment && (
				<div className="pt-3 border-t border-blue-100">
					<div className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Comentarios</div>
					<div className="text-sm text-gray-700 leading-relaxed bg-white/60 rounded-lg p-3 border border-blue-100">{comment}</div>
				</div>
			)}
		</div>
	);
}

function ConsultationCard({ item, onStatusUpdate }: { item: Consultation; onStatusUpdate?: () => void }) {
	const appointment = item as any;
	const scheduledAt = appointment.scheduledAt ?? item.date ?? item.createdAt;
	const status = appointment.status || item.status || 'SCHEDULED';
	const durationMinutes = appointment.durationMinutes || item.durationMinutes;
	const location = appointment.location || item.location;
	const reason = item.reason ?? item.presentingComplaint;
	const isAppointment = item.isAppointment || appointment.isAppointment;
	const billing = item.billing || appointment.billing;
	const [updatingStatus, setUpdatingStatus] = React.useState(false);

	// Detectar estado temporal
	const getTemporalStatus = () => {
		if (!scheduledAt) return null;
		try {
			const scheduledDate = new Date(scheduledAt);
			const now = new Date();
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const scheduledDay = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());

			// Si es pasada
			if (scheduledDay < today) {
				return { type: 'past', label: 'Pasada', color: 'bg-gray-500 text-white', icon: Clock };
			}
			// Si es hoy
			if (scheduledDay.getTime() === today.getTime()) {
				return { type: 'today', label: 'Hoy', color: 'bg-blue-500 text-white', icon: Calendar };
			}
			// Si es futura
			const daysDiff = Math.ceil((scheduledDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
			if (daysDiff === 1) {
				return { type: 'tomorrow', label: 'Mañana', color: 'bg-cyan-500 text-white', icon: Calendar };
			}
			if (daysDiff <= 7) {
				return { type: 'this_week', label: `En ${daysDiff} días`, color: 'bg-indigo-500 text-white', icon: Calendar };
			}
			return { type: 'future', label: 'Futura', color: 'bg-purple-500 text-white', icon: Calendar };
		} catch {
			return null;
		}
	};

	const temporalStatus = getTemporalStatus();

	// Mapear estados de appointment
	const getStatusColor = (status: string) => {
		switch (status?.toUpperCase()) {
			case 'SCHEDULED':
			case 'PROGRAMADA':
				return 'bg-blue-100 text-blue-700';
			case 'COMPLETED':
			case 'COMPLETADA':
				return 'bg-green-100 text-green-700';
			case 'CANCELLED':
			case 'CANCELADA':
				return 'bg-red-100 text-red-700';
			case 'IN_PROGRESS':
			case 'EN_PROGRESO':
			case 'EN_CURSO':
				return 'bg-yellow-100 text-yellow-700';
			case 'RESCHEDULED':
			case 'REAGENDADA':
				return 'bg-orange-100 text-orange-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status?.toUpperCase()) {
			case 'SCHEDULED':
			case 'PROGRAMADA':
				return 'Agendada';
			case 'COMPLETED':
			case 'COMPLETADA':
				return 'Atendida';
			case 'CANCELLED':
			case 'CANCELADA':
				return 'Cancelada';
			case 'IN_PROGRESS':
			case 'EN_PROGRESO':
			case 'EN_CURSO':
				return 'En Curso';
			case 'RESCHEDULED':
			case 'REAGENDADA':
				return 'Reagendada';
			default:
				return status || 'Sin estado';
		}
	};

	const handleStatusChange = async (newStatus: string) => {
		if (!isAppointment) {
			alert('Solo las citas (appointments) pueden cambiar de estado.');
			return;
		}

		setUpdatingStatus(true);
		try {
			const res = await fetch(`/api/dashboard/medic/appointments/${item.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Error al actualizar estado');
			}

			if (onStatusUpdate) {
				onStatusUpdate();
			} else {
				window.location.reload();
			}
		} catch (err: any) {
			console.error('Error al actualizar estado:', err);
			alert(err.message || 'Error al actualizar el estado de la consulta');
		} finally {
			setUpdatingStatus(false);
		}
	};

	const isCompleted = status?.toUpperCase() === 'COMPLETED' || status?.toUpperCase() === 'COMPLETADA';
	const isPaid = billing?.estadoPago === 'pagado' || billing?.estadoPago === 'paid';
	const isPendingPayment = isCompleted && billing && !isPaid;

	return (
		<div className="group relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 hover:border-indigo-300 overflow-hidden">
			{/* Header con gradiente de color según estado */}
			<div className={`px-5 py-4 ${isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500' : status?.toUpperCase() === 'CANCELLED' || status?.toUpperCase() === 'CANCELADA' ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
							<Calendar className="w-5 h-5 text-white" />
						</div>
						<div>
							<h4 className="font-bold text-white text-base">Consulta Médica</h4>
							<div className="flex items-center gap-2 mt-0.5">
								<Calendar className="w-3 h-3 text-white/90" />
								<span className="text-xs text-white/90 font-medium">{formatDateTime(scheduledAt)}</span>
							</div>
						</div>
					</div>
					<div className="flex flex-col items-end gap-1.5">
						{temporalStatus && (
							<div className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm ${temporalStatus.color}`}>
								{React.createElement(temporalStatus.icon, { className: 'w-3 h-3' })}
								{temporalStatus.label}
							</div>
						)}
						{status && <div className={`text-xs font-bold px-2.5 py-1 rounded-md shadow-sm ${getStatusColor(status)}`}>{getStatusLabel(status)}</div>}
					</div>
				</div>
			</div>

			{/* Contenido principal */}
			<div className="px-5 py-4 space-y-4">
				{/* Información de la cita */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{item.doctor && (
						<div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
							<div className="p-1.5 bg-indigo-100 rounded-md">
								<User className="w-4 h-4 text-indigo-600" />
							</div>
							<div className="flex-1 min-w-0">
								<div className="text-xs text-gray-500 font-medium">Médico</div>
								<div className="text-sm font-semibold text-gray-900 truncate">{item.doctor}</div>
							</div>
						</div>
					)}
					{durationMinutes && (
						<div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
							<div className="p-1.5 bg-blue-100 rounded-md">
								<Clock className="w-4 h-4 text-blue-600" />
							</div>
							<div className="flex-1 min-w-0">
								<div className="text-xs text-gray-500 font-medium">Duración</div>
								<div className="text-sm font-semibold text-gray-900">{durationMinutes} minutos</div>
							</div>
						</div>
					)}
				</div>

				{/* Información de pago si fue atendida */}
				{isCompleted && billing && (
					<div className={`p-4 rounded-lg border-2 ${isPaid ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2">
								{isPaid ? (
									<>
										<CheckCircle2 className="w-5 h-5 text-green-600" />
										<span className="text-sm font-bold text-green-900">Pago Completado</span>
									</>
								) : (
									<>
										<AlertCircle className="w-5 h-5 text-yellow-600" />
										<span className="text-sm font-bold text-yellow-900">Pago Pendiente</span>
									</>
								)}
							</div>
							<div className="flex items-center gap-1.5">
								<DollarSign className="w-4 h-4 text-gray-600" />
								<span className="text-base font-bold text-gray-900">
									{formatCurrency(billing.total || 0)} <span className="text-xs text-gray-600">{billing.currency || 'USD'}</span>
								</span>
							</div>
						</div>
						{billing.fechaPago && isPaid && <div className="text-xs text-gray-600 mt-1">Pagado el: {formatDate(billing.fechaPago)}</div>}
					</div>
				)}

				{/* Información de la consulta - Sección unificada */}
				<div className="space-y-2.5">
					{/* Motivo de la consulta */}
					{reason && (
						<div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
							<div className="flex items-start gap-2">
								<AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
								<div className="flex-1 min-w-0">
									<div className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-1">Motivo</div>
									<p className="text-sm text-amber-900 leading-relaxed">{reason}</p>
								</div>
							</div>
						</div>
					)}

					{/* Diagnóstico */}
					{item.diagnosis && (
						<div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200">
							<div className="flex items-start gap-2">
								<Stethoscope className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
								<div className="flex-1 min-w-0">
									<div className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-1">Diagnóstico</div>
									<p className="text-sm text-blue-900 leading-relaxed">{item.diagnosis}</p>
								</div>
							</div>
						</div>
					)}

					{/* Ubicación */}
					{location && (
						<div className="p-3 bg-purple-50/70 rounded-lg border border-purple-200">
							<div className="flex items-start gap-2">
								<Building2 className="w-4 h-4 text-purple-700 mt-0.5 flex-shrink-0" />
								<div className="flex-1 min-w-0">
									<div className="text-xs font-bold text-purple-900 uppercase tracking-wide mb-1">Ubicación</div>
									<p className="text-sm text-purple-900 leading-relaxed">{location}</p>
								</div>
							</div>
						</div>
					)}

					{/* Notas adicionales */}
					{item.notes && (
						<div className="p-3 bg-gray-50/70 rounded-lg border border-gray-200">
							<div className="flex items-start gap-2">
								<FileText className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
								<div className="flex-1 min-w-0">
									<div className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1">Notas</div>
									<p className="text-sm text-gray-700 leading-relaxed">{item.notes}</p>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Botones de acción para cambiar estado */}
				{isAppointment && (
					<div className="pt-3 mt-3 border-t border-gray-200">
						<div className="flex flex-wrap gap-2">
							{status?.toUpperCase() !== 'COMPLETED' && status?.toUpperCase() !== 'COMPLETADA' && (
								<button onClick={() => handleStatusChange('COMPLETADA')} disabled={updatingStatus} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow">
									{updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
									<span>Atendida</span>
								</button>
							)}
							{status?.toUpperCase() !== 'CANCELLED' && status?.toUpperCase() !== 'CANCELADA' && (
								<button onClick={() => handleStatusChange('CANCELADA')} disabled={updatingStatus} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow">
									{updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
									<span>Cancelar</span>
								</button>
							)}
							{status?.toUpperCase() !== 'RESCHEDULED' && status?.toUpperCase() !== 'REAGENDADA' && (
								<button
									onClick={() => {
										if (confirm('¿Deseas reagendar esta cita?')) {
											handleStatusChange('REAGENDADA');
										}
									}}
									disabled={updatingStatus}
									className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow">
									{updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
									<span>Reagendar</span>
								</button>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function BillingCard({ item }: { item: Billing }) {
	const total = item.total ?? item.amount ?? 0;
	const status = item.status;
	const items = item.items;
	const hasItems = Array.isArray(items) && items.length > 0;

	return (
		<div className="group relative bg-gradient-to-br from-white to-purple-50/30 border border-purple-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-purple-300">
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-purple-100 rounded-lg">
						<Receipt className="w-5 h-5 text-purple-600" />
					</div>
					<div>
						<h4 className="font-semibold text-gray-900 text-base">Factura</h4>
						<div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
							<Calendar className="w-3 h-3" />
							<span>{formatDateTime(item.date ?? item.createdAt)}</span>
						</div>
					</div>
				</div>
				<div className="text-right">
					<div className="text-xl font-bold text-gray-900">{formatCurrency(total)}</div>
					{status && <div className="mt-1 inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-xs font-medium">{status}</div>}
				</div>
			</div>

			{hasItems && items && (
				<div className="mb-4">
					<div className="flex items-center gap-2 mb-2">
						<Receipt className="w-4 h-4 text-purple-600" />
						<span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Detalles de Facturación</span>
					</div>
					<div className="space-y-2">
						{items.map((it, idx) => (
							<div key={idx} className="bg-white/60 rounded-lg p-3 border border-purple-100 flex items-center justify-between">
								<div className="flex-1">
									<div className="font-medium text-gray-900">{it.name ?? it.desc ?? 'Item'}</div>
								</div>
								<div className="text-sm font-semibold text-gray-800 ml-3">{formatCurrency(it.price ?? it.amount ?? 0)}</div>
							</div>
						))}
					</div>
				</div>
			)}

			{item.note && (
				<div className="pt-3 border-t border-purple-100">
					<div className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Notas</div>
					<div className="text-sm text-gray-700 leading-relaxed bg-white/60 rounded-lg p-3 border border-purple-100">{item.note}</div>
				</div>
			)}
		</div>
	);
}

/* ---------------------- Type guards ---------------------- */

function isPrescription(item: HistoryItem): item is Prescription {
	const p = item as Prescription;
	const asAny = item as any;

	// Prescription debe tener medications o meds (arrays) - esto es el indicador más fuerte
	if (Array.isArray(p.medications) && p.medications.length > 0) return true;
	if (Array.isArray(p.meds) && p.meds.length > 0) return true;

	// Si tiene issuedAt o validUntil, es definitivamente una prescription
	if (asAny.issuedAt || asAny.validUntil) return true;

	// O tener campos específicos de prescription pero NO scheduledAt (que es de appointment)
	if ((!!p.medications || !!p.meds) && !asAny.scheduledAt && !asAny.durationMinutes) return true;

	return false;
}

function isLabResult(item: HistoryItem): item is LabResult {
	const l = item as LabResult;
	// LabResult debe tener testName, name, result, o referenceRange
	// Y NO debe tener medications (para distinguirlo de prescription)
	return (!!l.testName || !!l.name || l.result !== undefined || !!l.referenceRange) && !(item as Prescription).medications && !(item as Prescription).meds;
}

function isConsultation(item: HistoryItem): item is Consultation {
	const asAny = item as any;
	const p = item as Prescription;
	const l = item as LabResult;
	const b = item as Billing;
	const c = item as Consultation;

	// Verificar que NO sea otro tipo primero
	const isNotOtherType = !p.medications && !p.meds && !l.testName && l.result === undefined && b.total === undefined && b.amount === undefined && !asAny.issuedAt && !asAny.validUntil;

	if (!isNotOtherType) {
		return false;
	}

	// Consultation (appointment) debe tener scheduledAt (campo único de appointment)
	if (asAny.scheduledAt) {
		return true;
	}

	// O tener durationMinutes (campo único de appointment)
	if (asAny.durationMinutes !== undefined) {
		return true;
	}

	// O tener status de appointment con valores específicos
	if (asAny.status && typeof asAny.status === 'string' && ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'IN_PROGRESS'].includes(asAny.status.toUpperCase())) {
		return true;
	}

	// O tener campos específicos de consulta (de la tabla consultation)
	// Consultas tienen: reason, presentingComplaint, diagnosis, notes, doctor, createdAt
	const hasConsultationFields = c.reason || c.presentingComplaint || c.diagnosis || c.notes || c.doctor || c.createdAt || c.date;

	// Si tiene campos de consulta y tiene un ID, es una consulta
	if (hasConsultationFields && (asAny.id || c.id)) {
		// Asegurarse de que no tenga campos de otros tipos que puedan causar confusión
		if (!asAny.scheduledAt && !asAny.durationMinutes && !asAny.testName && !asAny.result && !asAny.referenceRange) {
			return true;
		}
	}

	return false;
}

function isBilling(item: HistoryItem): item is Billing {
	const b = item as Billing;
	const asAny = item as any;
	const p = item as Prescription;
	const l = item as LabResult;

	// Billing debe tener total, amount, items, o status de factura
	// Y NO debe tener medications, scheduledAt, o testName
	const hasBillingFields: boolean = b.total !== undefined || b.amount !== undefined || (Array.isArray(b.items) && b.items.length > 0);

	const hasBillingStatus: boolean = Boolean(b.status && typeof b.status === 'string' && !['SCHEDULED', 'COMPLETED', 'CANCELLED', 'IN_PROGRESS', 'ACTIVE', 'EXPIRED'].includes(b.status.toUpperCase()));

	const isNotOtherType: boolean = Boolean(!p.medications && !p.meds && !asAny.scheduledAt && !l.testName);

	return (hasBillingFields || hasBillingStatus) && isNotOtherType;
}

/* ---------------------- HistoryTab: decide renderer and layout ---------------------- */

function HistoryTab({ data, emptyText, onStatusUpdate }: { data: HistoryItem[] | undefined; emptyText: string; onStatusUpdate?: () => void }) {
	if (!data || !Array.isArray(data) || data.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 px-4">
				<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
					<FileText className="w-8 h-8 text-gray-400" />
				</div>
				<p className="text-gray-500 font-medium">{emptyText}</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			{data.map((raw, idx) => {
				// IMPORTANTE: Verificar en orden específico para evitar conflictos
				// 1. Prescription primero (tiene medications/meds)
				if (isPrescription(raw)) return <PrescriptionCard key={(raw as Prescription).id ?? idx} item={raw} />;
				// 2. LabResult (tiene testName/result)
				if (isLabResult(raw)) return <LabResultCard key={(raw as LabResult).id ?? idx} item={raw} />;
				// 3. Billing (tiene total/amount/items)
				if (isBilling(raw)) return <BillingCard key={(raw as Billing).id ?? idx} item={raw} />;
				// 4. Consultation último (appointment - tiene scheduledAt/status)
				if (isConsultation(raw)) return <ConsultationCard key={(raw as Consultation).id ?? idx} item={raw} onStatusUpdate={onStatusUpdate} />;
				// fallback: no renderizar nada si no coincide con ningún tipo conocido
				return null;
			})}
		</div>
	);
}

/* ---------------------- Modal and helpers ---------------------- */

function HistoryModal({ open, onClose, loading, history, activeTab, setActiveTab, onReload }: { open: boolean; onClose: () => void; loading: boolean; history?: PatientHistory | null; activeTab: 'overview' | 'prescriptions' | 'labs' | 'consultations'; setActiveTab: (t: 'overview' | 'prescriptions' | 'labs' | 'consultations') => void; onReload?: () => void }) {
	if (!open) return null;

	const organizations = history?.organizations ?? [];
	const hasOrganizations = Array.isArray(organizations) && organizations.length > 0;

	return (
		<div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
			<div className="relative max-w-6xl w-full bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden max-h-[90vh] flex flex-col">
				{/* Header mejorado */}
				<div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-white/20 rounded-lg">
							<FileText className="w-6 h-6" />
						</div>
						<div>
							<h3 className="text-xl font-bold">Historial Clínico del Paciente</h3>
							<p className="text-sm text-indigo-100 mt-0.5">Registros médicos completos</p>
						</div>
					</div>
					<button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200" aria-label="Cerrar historial">
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Tabs mejorados */}
				<div className="px-6 pt-5 pb-4 bg-gray-50/50 border-b border-gray-200">
					<div className="flex gap-3 flex-wrap">
						<Tab label="Resumen General" id="overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
						<Tab label={`Recetas (${history?.summary?.prescriptionsCount ?? 0})`} id="presc" active={activeTab === 'prescriptions'} onClick={() => setActiveTab('prescriptions')} />
						<Tab label={`Laboratorios (${history?.summary?.labResultsCount ?? 0})`} id="labs" active={activeTab === 'labs'} onClick={() => setActiveTab('labs')} />
						<Tab label={`Consultas (${history?.summary?.consultationsCount ?? 0})`} id="consult" active={activeTab === 'consultations'} onClick={() => setActiveTab('consultations')} />
					</div>
				</div>

				{/* Contenido con scroll */}
				<div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-white">
					<div className="p-6">
						{loading && (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								{Array.from({ length: 4 }).map((_, i) => (
									<SkeletonCard key={i} />
								))}
							</div>
						)}

						{!loading && !history && (
							<div className="flex flex-col items-center justify-center py-16">
								<div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
									<FileText className="w-10 h-10 text-gray-400" />
								</div>
								<p className="text-gray-500 font-medium text-lg">No se encontró historial para este paciente.</p>
							</div>
						)}

						{!loading && history && (
							<div>
								{activeTab === 'overview' && (
									<div className="space-y-6">
										{/* Cards de resumen mejorados */}
										<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
											<MetaCard title="Consultas" value={`${history.summary?.consultationsCount ?? 0}`} color="blue" icon={Stethoscope} />
											<MetaCard title="Recetas" value={`${history.summary?.prescriptionsCount ?? 0}`} color="green" icon={Pill} />
											<MetaCard title="Laboratorios" value={`${history.summary?.labResultsCount ?? 0}`} color="yellow" icon={FlaskConical} />
											<MetaCard title="Facturación" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(history.summary?.billingsTotal ?? 0)} color="purple" icon={Receipt} />
										</div>

										{/* Clínicas visitadas mejorado */}
										{hasOrganizations && (
											<div className="mt-6">
												<div className="flex items-center gap-2 mb-4">
													<Building2 className="w-5 h-5 text-gray-700" />
													<h4 className="text-lg font-bold text-gray-900">Clínicas Visitadas</h4>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
													{organizations.map((org) => (
														<div key={org.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
															<div className="flex items-start justify-between">
																<div className="flex-1">
																	<div className="flex items-center gap-2 mb-2">
																		<Building2 className="w-4 h-4 text-indigo-600" />
																		<span className="text-sm font-semibold text-gray-900">Organización</span>
																	</div>
																	<div className="text-xs font-mono text-gray-600 mb-2 bg-gray-50 px-2 py-1 rounded inline-block">{org.id}</div>
																	<div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
																		<Clock className="w-3 h-3" />
																		<span>Última actividad: {formatDate(org.lastSeenAt)}</span>
																	</div>
																	{Array.isArray(org.types) && org.types.length > 0 && (
																		<div className="mt-2 flex flex-wrap gap-1.5">
																			{org.types.map((type, idx) => (
																				<span key={idx} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium">
																					{type}
																				</span>
																			))}
																		</div>
																	)}
																</div>
															</div>
														</div>
													))}
												</div>
											</div>
										)}

										{!hasOrganizations && (
											<div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
												<p className="text-sm text-gray-500 text-center">Sin registros en otras clínicas.</p>
											</div>
										)}
									</div>
								)}

								{activeTab === 'prescriptions' && <HistoryTab data={history.prescriptions} emptyText="No hay recetas médicas registradas para este paciente." onStatusUpdate={onReload} />}
								{activeTab === 'labs' && <HistoryTab data={history.lab_results} emptyText="No hay resultados de laboratorio registrados para este paciente." onStatusUpdate={onReload} />}
								{activeTab === 'consultations' && <HistoryTab data={history.consultations} emptyText="No hay consultas médicas registradas para este paciente." onStatusUpdate={onReload} />}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

/* ---------------------- Main Component ---------------------- */

export default function PatientsGrid({ perPage = 18 }: { perPage?: number }) {
	const [patients, setPatients] = useState<Patient[]>([]);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState<number | null>(null);
	const [query, setQuery] = useState('');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [modalOpen, setModalOpen] = useState(false);
	const [modalHistory, setModalHistory] = useState<PatientHistory | null>(null);
	const [modalActiveTab, setModalActiveTab] = useState<'overview' | 'prescriptions' | 'labs' | 'consultations'>('overview');
	const [loadingHistory, setLoadingHistory] = useState(false);
	const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);

	const [debouncedQuery, setDebouncedQuery] = useState(query);
	useEffect(() => {
		const id = setTimeout(() => setDebouncedQuery(query), 400);
		return () => clearTimeout(id);
	}, [query]);

	const fetchPatients = async (p = page, q = debouncedQuery) => {
		try {
			setLoading(true);
			setError(null);
			const url = new URL('/api/patients', location.origin);
			url.searchParams.set('include_summary', 'true');
			url.searchParams.set('page', String(p));
			url.searchParams.set('per_page', String(perPage));
			if (q) url.searchParams.set('q', q);

			const res = await fetch(url.toString(), { credentials: 'include' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error((body as any)?.error ?? `HTTP ${res.status}`);
			}
			const json = (await res.json()) as PatientsResponse;
			setPatients(json.data ?? []);
			setTotal(json.meta?.total ?? null);
		} catch (err: unknown) {
			console.error(err);
			setError((err as Error)?.message ?? 'Error al cargar pacientes');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPatients(1, debouncedQuery).then(() => setPage(1));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedQuery, perPage]);

	useEffect(() => {
		fetchPatients(page, debouncedQuery);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page]);

	const totalPages = useMemo(() => {
		if (!total) return null;
		return Math.max(1, Math.ceil(total / perPage));
	}, [total, perPage]);

	const loadHistory = async (patientId: string, tab: typeof modalActiveTab) => {
		try {
			setCurrentPatientId(patientId);
			setModalOpen(true);
			setModalActiveTab(tab);
			setLoadingHistory(true);
			setModalHistory(null);

			const url = new URL('/api/patients', location.origin);
			url.searchParams.set('historyFor', patientId);

			const res = await fetch(url.toString(), { credentials: 'include' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error((body as any)?.error ?? `HTTP ${res.status}`);
			}
			const json = (await res.json()) as PatientHistory;
			setModalHistory(json);
		} catch (err: unknown) {
			console.error(err);
			setModalHistory(null);
		} finally {
			setLoadingHistory(false);
		}
	};

	const reloadHistory = async () => {
		if (currentPatientId) {
			await loadHistory(currentPatientId, modalActiveTab);
		}
	};

	const onLoadReports = (id: string) => loadHistory(id, 'prescriptions');
	const onViewHistory = (id: string) => {
		// Redirigir a la nueva página de historial
		window.location.href = `/dashboard/medic/pacientes/${id}/historial`;
	};

	return (
		<div>
			<header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
				<div className="flex-1 md:max-w-md">
					<h2 className="text-2xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-violet-600 via-indigo-600 to-emerald-600">Pacientes</h2>
					<p className="text-sz text-gray-500">Lista completa de pacientes — gestiona recetas, informes e historial clínico.</p>
				</div>

				{/* Search */}
				<div className="flex flex-col items-end gap-3">
					<div className="relative w-[280px] md:w-[370px]">
						<label htmlFor="patients-search" className="sr-only">
							Buscar pacientes
						</label>
						<input id="patients-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, apellido o identificación..." className="pl-4 pr-10 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300 w-full" />
					</div>
					<div className="text-sm text-gray-500 pl-1 ">Mostrando {perPage} por página</div>
				</div>
			</header>

			{error && <div className="mb-4 text-red-600">{error}</div>}

			<div className="grid grid-cols-1 sm:grid-cols-1 gap-4">{loading ? Array.from({ length: perPage > 12 ? 12 : perPage }).map((_, i) => <SkeletonCard key={i} />) : patients.map((p) => <PatientCard key={p.id} patient={p} onLoadReports={onLoadReports} onViewHistory={onViewHistory} />)}</div>

			<footer className="mt-6 flex items-center justify-between">
				<div className="text-sm text-gray-500">{total !== null ? `Total pacientes: ${total}` : 'Total: —'}</div>

				<div className="flex items-center gap-2">
					<button onClick={() => setPage((s) => Math.max(1, s - 1))} disabled={page <= 1 || loading} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm disabled:opacity-50">
						Anterior
					</button>

					<div className="px-3 py-2 rounded-lg text-sm bg-gray-50 border border-gray-200">
						Página {page} {totalPages ? `de ${totalPages}` : ''}
					</div>

					<button onClick={() => setPage((s) => (totalPages ? Math.min(totalPages, s + 1) : s + 1))} disabled={(totalPages !== null && page >= totalPages) || loading} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm disabled:opacity-50">
						Siguiente
					</button>
				</div>
			</footer>

			{/* Modal */}
			<HistoryModal open={modalOpen} onClose={() => setModalOpen(false)} loading={loadingHistory} history={modalHistory} activeTab={modalActiveTab} setActiveTab={(t) => setModalActiveTab(t)} onReload={reloadHistory} />
		</div>
	);
}
