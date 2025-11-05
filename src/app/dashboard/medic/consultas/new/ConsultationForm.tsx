'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Stethoscope } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/app/adapters/client'; // lo dejé por si lo necesitas en otras partes

/* ------------------------- UI primitives (estilizados) ------------------------- */

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
	return (
		<label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
			{children}
		</label>
	);
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <div className={`rounded-2xl bg-white dark:bg-[#041f25] border border-slate-100 dark:border-slate-800 shadow-sm p-5 ${className}`}>{children}</div>;
}

function FieldShell({ children }: { children: React.ReactNode }) {
	return <div className="w-full">{children}</div>;
}

function IconInputWrapper({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
	return (
		<div className="relative rounded-lg bg-white/90 dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700">
			{icon ? <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div> : null}
			{children}
		</div>
	);
}

function TextInput({ id, label, value, onChange, placeholder, icon, error, type = 'text', hint }: any) {
	return (
		<FieldShell>
			<Label htmlFor={id}>{label}</Label>
			<IconInputWrapper icon={icon}>
				<input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`w-full block rounded-lg px-4 py-3 ${icon ? 'pl-12' : 'pl-4'} pr-4 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition`} />
			</IconInputWrapper>
			{hint && !error && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
			{error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
		</FieldShell>
	);
}

function TextareaInput({ id, label, value, onChange, placeholder, rows = 4, error, hint }: any) {
	return (
		<FieldShell>
			<Label htmlFor={id}>{label}</Label>
			<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-transparent shadow-sm">
				<textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full rounded-lg px-4 py-3 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
			</div>
			{hint && !error && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
			{error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
		</FieldShell>
	);
}

/* ------------------------- Patient searcher — reutilizo tu componente (sin cambios) ------------------------- */

type Patient = { id: string; firstName: string; lastName: string; identifier?: string };

function PatientSearcher({ onSelect }: { onSelect: (p: Patient) => void }) {
	const [term, setTerm] = useState('');
	const [suggestions, setSuggestions] = useState<Patient[]>([]);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const debounceRef = useRef<number | null>(null);

	useEffect(() => {
		if (!term) {
			setSuggestions([]);
			setOpen(false);
			return;
		}
		if (debounceRef.current) window.clearTimeout(debounceRef.current);
		debounceRef.current = window.setTimeout(async () => {
			try {
				setLoading(true);
				const res = await fetch(`/api/patients/search?identifier=${encodeURIComponent(term)}`);
				const data = await res.json();
				setSuggestions(data || []);
				setOpen(true);
			} catch (err) {
				console.error('search error', err);
				setSuggestions([]);
				setOpen(false);
			} finally {
				setLoading(false);
			}
		}, 300);
	}, [term]);

	return (
		<div className="w-full">
			<Label>Buscar paciente</Label>
			<div className="relative">
				<div className="flex items-center gap-2">
					<div className="flex-1">
						<input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Cédula, nombre o apellido..." aria-label="Buscar paciente" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 bg-white/95 dark:bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
					</div>
					<div className="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">{loading ? <Loader2 className="animate-spin text-indigo-600" size={18} /> : <Stethoscope size={16} className="text-indigo-600" />}</div>
				</div>

				{open && suggestions.length > 0 && (
					<div className="absolute z-40 left-0 right-0 mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-[#042434] shadow-xl overflow-hidden">
						<ul className="divide-y divide-gray-100 dark:divide-slate-800">
							{suggestions.map((p) => (
								<li
									key={p.id}
									role="option"
									tabIndex={0}
									onClick={() => {
										onSelect(p);
										setTerm('');
										setOpen(false);
									}}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											onSelect(p);
											setTerm('');
											setOpen(false);
										}
									}}
									className="px-4 py-3 hover:bg-indigo-50 dark:hover:bg-[#06323a] cursor-pointer transition flex items-center justify-between">
									<div>
										<div className="font-medium text-slate-800 dark:text-slate-100">
											{p.firstName} {p.lastName}
										</div>
										{p.identifier && <div className="text-xs text-slate-500 mt-0.5">{p.identifier}</div>}
									</div>
									<div className="text-xs text-slate-400">Seleccionar</div>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
}

/* ------------------------- Formulario principal — ahora usa /api/auth/met ------------------------- */

export default function ConsultationForm() {
	const router = useRouter();
	const [doctorId, setDoctorId] = useState<string | null>(null);
	const [organizationId, setOrganizationId] = useState<string | null>(null);
	const [organizationName, setOrganizationName] = useState<string | null>(null);
	const [patientId, setPatientId] = useState('');
	const [chiefComplaint, setChiefComplaint] = useState('');
	const [diagnosis, setDiagnosis] = useState('');
	const [notes, setNotes] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fetchingSession, setFetchingSession] = useState(true);

	useEffect(() => {
		async function fetchDoctorAndOrg() {
			try {
				setFetchingSession(true);
				// Llamada al endpoint server-side que implementaste
				const res = await fetch('/api/auth/met', { method: 'GET', credentials: 'include', cache: 'no-store' });
				if (!res.ok) {
					// manejar 401 / 404 / 500
					const body = await res.json().catch(() => ({}));
					console.warn('/api/auth/met error', res.status, body);
					setDoctorId(null);
					setOrganizationId(null);
					setOrganizationName(null);
					return;
				}
				const body = await res.json();
				const id = body?.id ?? null;
				const orgId = body?.organizationId ?? null;
				const orgName = body?.organizationName ?? null;

				setDoctorId(id);
				setOrganizationId(orgId);
				// Usamos el nombre de la organización que devuelva tu endpoint (si lo hace)
				if (orgName) setOrganizationName(orgName);
			} catch (err) {
				console.error('Error fetching doctor & org from /api/auth/met:', err);
				setDoctorId(null);
				setOrganizationId(null);
				setOrganizationName(null);
			} finally {
				setFetchingSession(false);
			}
		}
		fetchDoctorAndOrg();
	}, []);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		if (!doctorId) return setError('No se detectó la sesión del médico.');
		if (!patientId) return setError('Debe seleccionar un paciente.');
		if (!chiefComplaint) return setError('El motivo de consulta es obligatorio.');

		setLoading(true);
		try {
			const res = await fetch('/api/consultations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					patient_id: patientId,
					doctor_id: doctorId,
					organization_id: organizationId,
					chief_complaint: chiefComplaint,
					diagnosis,
					notes,
				}),
			});
			const data = await res.json().catch(() => ({}));
			setLoading(false);
			if (!res.ok) {
				console.error('Error creando consulta', res.status, data);
				return setError(data.error || 'Error al crear consulta.');
			}
			// redirigir a la consulta creada (ajusta según tu respuesta del servidor)
			router.push(`/dashboard/medic/consultas/${data?.data?.id || data?.id}`);
		} catch (err: any) {
			console.error(err);
			setError(err?.message ?? 'Error al crear consulta.');
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto grid gap-6 p-8 rounded-3xl bg-gradient-to-b from-white/80 to-white/60 dark:from-[#071322] dark:to-[#04101a] border border-slate-100 dark:border-slate-800 shadow-2xl">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Nueva Consulta Médica</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Registra la atención clínica del paciente de forma segura y rápida.</p>
				</div>
				<div className="text-right">
					<div className="text-xs text-slate-400">Estado</div>
					<div className="text-sm font-medium text-emerald-600">{fetchingSession ? 'Comprobando sesión...' : doctorId ? 'Sesión detectada' : 'Sesión no detectada'}</div>
				</div>
			</div>

			{/* Session / patient picker */}
			<Card>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
					<div className="md:col-span-2">
						<PatientSearcher onSelect={(p) => setPatientId(p.id)} />
					</div>

					<div className="flex flex-col gap-2">
						<Label>Paciente seleccionado</Label>
						<div className="min-h-[56px] flex items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-transparent text-sm text-slate-600 dark:text-slate-200">{patientId ? <span className="font-medium">{patientId}</span> : <span className="text-xs text-slate-400">Ninguno</span>}</div>
						{doctorId && (
							<div className="mt-2 text-xs text-slate-500">
								Médico: <span className="font-medium text-slate-800 dark:text-white">{doctorId}</span>
								{organizationName && (
									<span className="block text-xs text-slate-500 mt-1">
										Clínica: <span className="font-medium">{organizationName}</span>
									</span>
								)}
							</div>
						)}
					</div>
				</div>
			</Card>

			{/* Clinical fields */}
			<Card className="space-y-4">
				<div className="grid grid-cols-1 gap-4">
					<TextInput id="chiefComplaint" label="Motivo de consulta" value={chiefComplaint} onChange={setChiefComplaint} placeholder="Ej: dolor abdominal, cefalea..." icon={<Stethoscope size={16} />} />
					<TextareaInput id="diagnosis" label="Diagnóstico" value={diagnosis} onChange={setDiagnosis} placeholder="Diagnóstico (opcional)" rows={4} />
					<TextareaInput id="notes" label="Notas clínicas" value={notes} onChange={setNotes} placeholder="Observaciones, recomendaciones, plan" rows={4} />
				</div>
			</Card>

			{/* Actions */}
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<button type="submit" disabled={loading || !doctorId} className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-700 hover:to-teal-600 text-white rounded-2xl shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed" aria-disabled={loading || !doctorId}>
						{loading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={16} />}
						<span>{loading ? 'Guardando...' : 'Crear Consulta'}</span>
					</button>

					<button type="button" onClick={() => router.push('/dashboard/medic/consultas')} className="px-5 py-3 border rounded-2xl text-slate-700 dark:text-slate-200 border-gray-200 dark:border-gray-700 bg-white/80 hover:bg-gray-50 transition">
						Cancelar
					</button>
				</div>

				<div className="text-sm text-slate-500">
					<div className="hidden sm:block">Tu información se guarda en el historial del paciente.</div>
				</div>
			</div>

			{error && <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{error}</div>}
		</form>
	);
}
