// src/components/PatientsGrid.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, FileText } from 'lucide-react';

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
};

export type Consultation = {
	id: string;
	date?: string;
	createdAt?: string;
	reason?: string;
	presentingComplaint?: string;
	doctor?: string;
	diagnosis?: string;
	notes?: string;
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
	summary: {
		consultationsCount: number;
		prescriptionsCount: number;
		labResultsCount: number;
		billingsCount: number;
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
						Cédula: {patient.identifier ?? '—'} • Género: {patient.gender ?? '—'} • Teléfono: {patient.phone ?? '—'}
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
		<button id={id} onClick={onClick} className={`px-3 py-1.5 rounded-xl text-sm font-medium ${active ? 'bg-linear-to-br from-sky-400 to-indigo-400 text-white shadow' : 'bg-white text-gray-600 border border-gray-200'}`} aria-pressed={active}>
			{label}
		</button>
	);
}

function MetaCard({ title, value, color }: { title: string; value: string; color?: 'blue' | 'green' | 'yellow' | 'purple' }) {
	const colors = {
		blue: 'bg-blue-100 text-blue-800 border-blue-200',
		green: 'bg-green-100 text-green-800 border-green-200',
		yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
		purple: 'bg-purple-100 text-purple-800 border-purple-200',
	} as const;
	const selected = colors[color ?? 'blue'];
	return (
		<div className={`p-3 rounded-lg border ${selected} bg-opacity-50`}>
			<div className="text-xs font-medium">{title}</div>
			<div className="text-2xl font-semibold">{value}</div>
		</div>
	);
}

/* ---------------------- Card renderers por tipo ---------------------- */

function PrescriptionCard({ item }: { item: Prescription }) {
	const meds = item.medications ?? item.meds ?? [];
	return (
		<div className="p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
			<div className="flex items-start justify-between">
				<div>
					<div className="text-sm font-semibold text-gray-800">Receta • {item.id}</div>
					<div className="text-xs text-gray-500">Emitida: {formatDateTime(item.createdAt ?? item.date)}</div>
				</div>
				<div className="text-xs text-gray-500">{item.doctor ?? 'Médico desconocido'}</div>
			</div>

			<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
				<div>
					<div className="text-xs text-gray-400">Medicamentos</div>
					<ul className="mt-1 list-disc list-inside text-gray-700">
						{meds.length ? (
							meds.map((m, i) => (
								<li key={i}>
									{m.name} {m.dose ? `— ${m.dose}` : ''}
								</li>
							))
						) : (
							<li className="text-gray-500">Sin medicamentos listados</li>
						)}
					</ul>
				</div>

				<div>
					<div className="text-xs text-gray-400">Notas / Instrucciones</div>
					<div className="mt-1 text-sm text-gray-700">{truncate(item.notes ?? item.instructions ?? '', 220)}</div>
				</div>
			</div>
		</div>
	);
}

function LabResultCard({ item }: { item: LabResult }) {
	return (
		<div className="p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
			<div className="flex items-center justify-between">
				<div>
					<div className="text-sm font-semibold text-gray-800">{item.testName ?? item.name ?? 'Resultado de laboratorio'}</div>
					<div className="text-xs text-gray-500">Fecha: {formatDateTime(item.date ?? item.collectedAt)}</div>
				</div>
				<div className="text-sm font-medium text-gray-800">
					<div>
						{item.result ?? '—'} {item.unit ?? ''}
					</div>
					<div className="text-xs text-gray-400">{item.status ?? ''}</div>
				</div>
			</div>

			{item.comment && <div className="mt-3 text-sm text-gray-700">{truncate(item.comment, 200)}</div>}

			{item.referenceRange && <div className="mt-3 text-xs text-gray-500">Rango de referencia: {item.referenceRange}</div>}
		</div>
	);
}

function ConsultationCard({ item }: { item: Consultation }) {
	return (
		<div className="p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
			<div className="flex items-start justify-between">
				<div>
					<div className="text-sm font-semibold text-gray-800">Consulta • {item.id}</div>
					<div className="text-xs text-gray-500">Fecha: {formatDateTime(item.date ?? item.createdAt)}</div>
				</div>
				<div className="text-xs text-gray-500">{item.doctor ?? '—'}</div>
			</div>

			<div className="mt-3 text-sm text-gray-700">
				<div className="text-xs text-gray-400">Motivo</div>
				<div className="mt-1">{truncate(item.reason ?? item.presentingComplaint ?? '', 200)}</div>
			</div>

			{item.diagnosis && (
				<div className="mt-3 text-sm text-gray-700">
					<div className="text-xs text-gray-400">Diagnóstico</div>
					<div className="mt-1">{item.diagnosis}</div>
				</div>
			)}

			{item.notes && (
				<div className="mt-3 text-sm text-gray-700">
					<div className="text-xs text-gray-400">Notas</div>
					<div className="mt-1">{truncate(item.notes, 220)}</div>
				</div>
			)}
		</div>
	);
}

function BillingCard({ item }: { item: Billing }) {
	return (
		<div className="p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
			<div className="flex items-start justify-between">
				<div>
					<div className="text-sm font-semibold text-gray-800">Factura • {item.id}</div>
					<div className="text-xs text-gray-500">Fecha: {formatDateTime(item.date ?? item.createdAt)}</div>
				</div>
				<div className="text-right">
					<div className="text-sm font-bold">{formatCurrency(item.total ?? item.amount)}</div>
					<div className="text-xs text-gray-500">{item.status ?? '—'}</div>
				</div>
			</div>

			{Array.isArray(item.items) && item.items.length > 0 && (
				<div className="mt-3 text-sm text-gray-700">
					<div className="text-xs text-gray-400">Detalles</div>
					<ul className="mt-1 list-disc list-inside">
						{item.items.map((it, idx) => (
							<li key={idx}>
								{it.name ?? it.desc} — {formatCurrency(it.price ?? it.amount)}
							</li>
						))}
					</ul>
				</div>
			)}

			{item.note && <div className="mt-3 text-sm text-gray-700">{truncate(item.note, 200)}</div>}
		</div>
	);
}

function GenericCard({ item }: { item: Record<string, unknown> }) {
	const keys = Object.keys(item ?? {});

	return (
		<div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
			{/* Encabezado */}
			<div className="flex items-center justify-between">
				<h4 className="text-base font-semibold text-gray-800 tracking-tight">{(item as any).title ?? (item as any).id ?? 'Registro'}</h4>
				<span className="text-xs text-gray-400 font-medium uppercase bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">Detalle</span>
			</div>

			{/* Contenido principal */}
			<div className="mt-3 space-y-2">
				{keys.slice(0, 6).map((k) => (
					<div key={k} className="flex justify-between items-start text-sm border-b border-gray-100 pb-1 last:border-0">
						<span className="text-gray-600 font-medium capitalize">{k.replace(/_/g, ' ')}</span>
						<span className="text-gray-800 text-right max-w-[60%] truncate">{String((item as any)[k]) || '—'}</span>
					</div>
				))}
			</div>

			{/* Pie de card (sutil efecto visual) */}
			<div className="absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-sky-500 via-indigo-500 to-sky-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
		</div>
	);
}

/* ---------------------- Type guards ---------------------- */

function isPrescription(item: HistoryItem): item is Prescription {
	return !!(item as Prescription).medications || !!(item as Prescription).meds || typeof (item as Prescription).doctor === 'string';
}

function isLabResult(item: HistoryItem): item is LabResult {
	return !!(item as LabResult).testName || (item as LabResult).result !== undefined || !!(item as LabResult).referenceRange;
}

function isConsultation(item: HistoryItem): item is Consultation {
	return !!(item as Consultation).reason || !!(item as Consultation).diagnosis;
}

function isBilling(item: HistoryItem): item is Billing {
	return (item as Billing).total !== undefined || (item as Billing).items !== undefined || (item as Billing).status !== undefined;
}

/* ---------------------- HistoryTab: decide renderer and layout ---------------------- */

function HistoryTab({ data, emptyText }: { data: HistoryItem[]; emptyText: string }) {
	if (!data || data.length === 0) return <div className="text-sm text-gray-500">{emptyText}</div>;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
			{data.map((raw, idx) => {
				// Usar guards para renderizar
				if (isPrescription(raw)) return <PrescriptionCard key={(raw as Prescription).id ?? idx} item={raw} />;
				if (isLabResult(raw)) return <LabResultCard key={(raw as LabResult).id ?? idx} item={raw} />;
				if (isConsultation(raw)) return <ConsultationCard key={(raw as Consultation).id ?? idx} item={raw} />;
				if (isBilling(raw)) return <BillingCard key={(raw as Billing).id ?? idx} item={raw} />;
				// fallback: mostrar campos principales
				return <GenericCard key={(raw as any).id ?? idx} item={raw as Record<string, unknown>} />;
			})}
		</div>
	);
}

/* ---------------------- Modal and helpers ---------------------- */

function HistoryModal({ open, onClose, loading, history, activeTab, setActiveTab }: { open: boolean; onClose: () => void; loading: boolean; history?: PatientHistory | null; activeTab: 'overview' | 'prescriptions' | 'labs' | 'consultations' | 'billing'; setActiveTab: (t: 'overview' | 'prescriptions' | 'labs' | 'consultations' | 'billing') => void }) {
	if (!open) return null;
	return (
		<div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/20" onClick={onClose} />
			<div className="relative max-w-5xl w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h3 className="text-lg font-semibold text-gray-900">Historial del paciente</h3>
					<button onClick={onClose} className="text-gray-600 px-2 py-1" aria-label="Cerrar historial">
						Cerrar ✕
					</button>
				</div>

				<div className="p-4">
					<div className="flex gap-2 mb-4 flex-wrap">
						<Tab label="Resumen" id="overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
						<Tab label={`Recetas (${history?.summary?.prescriptionsCount ?? '—'})`} id="presc" active={activeTab === 'prescriptions'} onClick={() => setActiveTab('prescriptions')} />
						<Tab label={`Labs (${history?.summary?.labResultsCount ?? '—'})`} id="labs" active={activeTab === 'labs'} onClick={() => setActiveTab('labs')} />
						<Tab label={`Consultas (${history?.summary?.consultationsCount ?? '—'})`} id="consult" active={activeTab === 'consultations'} onClick={() => setActiveTab('consultations')} />
						<Tab label={`Facturación (${history?.summary?.billingsCount ?? '—'})`} id="billing" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
					</div>

					<div className="max-h-[60vh] overflow-auto">
						{loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
						{!loading && !history && <div className="text-center py-20 text-gray-500">No se encontró historial para este paciente.</div>}
						{!loading && history && (
							<div>
								{activeTab === 'overview' && (
									<div className="space-y-3">
										<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
											<MetaCard title="Consultas" value={`${history.summary.consultationsCount}`} color="blue" />
											<MetaCard title="Recetas" value={`${history.summary.prescriptionsCount}`} color="green" />
											<MetaCard title="Lab Results" value={`${history.summary.labResultsCount}`} color="yellow" />
											<MetaCard title="Facturas" value={`${history.summary.billingsCount}`} color="purple" />
										</div>

										<div className="mt-4">
											<h4 className="text-sm font-semibold text-gray-700 mb-2">Clínicas visitadas</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
												{history.organizations.length ? (
													history.organizations.map((org) => (
														<div key={org.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
															<div className="text-sm text-gray-800 font-medium">Org ID: {org.id}</div>
															<div className="text-xs text-gray-500">Última actividad: {formatDate(org.lastSeenAt)}</div>
															<div className="text-xs text-gray-400 mt-1">Tipos: {org.types.join(', ')}</div>
														</div>
													))
												) : (
													<div className="text-sm text-gray-500">Sin registros en otras clínicas.</div>
												)}
											</div>
										</div>
									</div>
								)}

								{activeTab === 'prescriptions' && <HistoryTab data={history.prescriptions} emptyText="No hay recetas registradas." />}
								{activeTab === 'labs' && <HistoryTab data={history.lab_results} emptyText="No hay resultados de laboratorio." />}
								{activeTab === 'consultations' && <HistoryTab data={history.consultations} emptyText="No hay consultas registradas." />}
								{activeTab === 'billing' && <HistoryTab data={history.facturacion} emptyText="No hay facturación registrada." />}
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
	const [modalActiveTab, setModalActiveTab] = useState<'overview' | 'prescriptions' | 'labs' | 'consultations' | 'billing'>('overview');
	const [loadingHistory, setLoadingHistory] = useState(false);

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

			const res = await fetch(url.toString());
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
			setModalOpen(true);
			setModalActiveTab(tab);
			setLoadingHistory(true);
			setModalHistory(null);

			const url = new URL('/api/patients', location.origin);
			url.searchParams.set('historyFor', patientId);

			const res = await fetch(url.toString());
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

	const onLoadReports = (id: string) => loadHistory(id, 'prescriptions');
	const onViewHistory = (id: string) => loadHistory(id, 'overview');

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
			<HistoryModal open={modalOpen} onClose={() => setModalOpen(false)} loading={loadingHistory} history={modalHistory} activeTab={modalActiveTab} setActiveTab={(t) => setModalActiveTab(t)} />
		</div>
	);
}
