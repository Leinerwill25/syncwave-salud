'use client';

import React, { useState } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ConsultationShape = {
	id: string;
	appointment_id?: string | null;
	patient_id: string;
	doctor_id: string;
	chief_complaint?: string | null;
	diagnosis?: string | null;
	notes?: string | null;
	vitals?: Record<string, any> | null;
	started_at?: string | null;
	ended_at?: string | null;
	created_at?: string;
};

/** Helper: convierte ISO a formato compatible con <input type="datetime-local"> */
function toLocalDateTime(val?: string | null) {
	if (!val) return '';
	try {
		const d = new Date(val);
		if (isNaN(d.getTime())) return '';
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		const hh = String(d.getHours()).padStart(2, '0');
		const min = String(d.getMinutes()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
	} catch {
		return '';
	}
}

/** Helper: validación numérica flexible */
function isNumericOrEmpty(s: string) {
	if (s === '' || s === null || s === undefined) return true;
	return !Number.isNaN(Number(String(s).replace(',', '.')));
}

export default function EditConsultationForm({ initial, patient, doctor }: { initial: ConsultationShape; patient?: any; doctor?: any }) {
	const router = useRouter();

	// Core fields
	const [chiefComplaint, setChiefComplaint] = useState(initial.chief_complaint ?? '');
	const [diagnosis, setDiagnosis] = useState(initial.diagnosis ?? '');
	const [notes, setNotes] = useState(initial.notes ?? '');

	// date/time
	const [startedAt, setStartedAt] = useState(initial.started_at ? toLocalDateTime(initial.started_at) : toLocalDateTime(initial.created_at));
	const [endedAt, setEndedAt] = useState(initial.ended_at ? toLocalDateTime(initial.ended_at) : '');

	// Vitals structured fields (init from initial.vitals if present)
	const initVitals = initial.vitals ?? {};
	const [weight, setWeight] = useState<string>(initVitals.weight ?? '');
	const [height, setHeight] = useState<string>(initVitals.height ?? '');
	const [temperature, setTemperature] = useState<string>(initVitals.temperature ?? '');
	const [bpSystolic, setBpSystolic] = useState<string>(initVitals.bp_systolic ?? '');
	const [bpDiastolic, setBpDiastolic] = useState<string>(initVitals.bp_diastolic ?? '');
	const [heartRate, setHeartRate] = useState<string>(initVitals.heart_rate ?? '');
	const [respiratoryRate, setRespiratoryRate] = useState<string>(initVitals.respiratory_rate ?? '');
	const [spo2, setSpo2] = useState<string>(initVitals.spo2 ?? '');
	const [glucose, setGlucose] = useState<string>(initVitals.glucose ?? '');
	const [vitalsNotes, setVitalsNotes] = useState<string>(initVitals.notes ?? '');

	// UI state
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	function buildVitalsObject() {
		const v: Record<string, any> = {};
		if (weight) v.weight = weight;
		if (height) v.height = height;
		if (temperature) v.temperature = temperature;
		if (bpSystolic) v.bp_systolic = bpSystolic;
		if (bpDiastolic) v.bp_diastolic = bpDiastolic;
		if (heartRate) v.heart_rate = heartRate;
		if (respiratoryRate) v.respiratory_rate = respiratoryRate;
		if (spo2) v.spo2 = spo2;
		if (glucose) v.glucose = glucose;
		if (vitalsNotes) v.notes = vitalsNotes;
		return Object.keys(v).length ? v : null;
	}

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		// Validate numeric fields
		const numericFields = [
			{ label: 'Peso', val: weight },
			{ label: 'Talla', val: height },
			{ label: 'Temperatura', val: temperature },
			{ label: 'PA sistólica', val: bpSystolic },
			{ label: 'PA diastólica', val: bpDiastolic },
			{ label: 'Pulso', val: heartRate },
			{ label: 'Respiratorio', val: respiratoryRate },
			{ label: 'SPO₂', val: spo2 },
			{ label: 'Glucosa', val: glucose },
		];

		for (const nf of numericFields) {
			if (!isNumericOrEmpty(nf.val)) {
				setError(`El campo "${nf.label}" debe ser numérico (o vacío).`);
				return;
			}
		}

		setLoading(true);

		try {
			const payload: any = {
				chief_complaint: chiefComplaint || null,
				diagnosis: diagnosis || null,
				notes: notes || null,
				vitals: buildVitalsObject(),
				started_at: startedAt || null,
				ended_at: endedAt || null,
			};

			const res = await fetch(`/api/consultations/${initial.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data?.error || data?.message || 'Error al guardar');
			}

			setSuccess('Consulta actualizada correctamente.');
			// Mostrar mensaje breve y redirigir
			setTimeout(() => {
				router.push(`/dashboard/medic/consultas/${initial.id}`);
			}, 700);
		} catch (err: any) {
			setError(err?.message ?? String(err));
			setLoading(false);
		}
	}

	async function handleDelete() {
		if (!confirm('¿Seguro que deseas eliminar (soft-delete) esta consulta?')) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/consultations/${initial.id}`, { method: 'DELETE' });
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || 'Error al eliminar');
			router.push('/dashboard/medic/consultas');
		} catch (err: any) {
			setError(err?.message ?? String(err));
			setLoading(false);
		}
	}

	/* -----------------
     Styling helpers
     ----------------- */
	const inputBase = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent transition';
	const inputDark = 'dark:bg-[#022b30] dark:border-[#07363a] dark:placeholder-slate-500 dark:text-slate-100 dark:focus:ring-2 dark:focus:ring-teal-600';

	const sectionCard = 'rounded-2xl border border-slate-100 bg-gradient-to-tr from-white to-slate-50 dark:from-[#04202b] dark:to-[#032026] p-4 shadow-sm';

	const labelClass = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1';

	return (
		<form onSubmit={handleSave} className="space-y-6">
			{/* Main card */}
			<div className={sectionCard}>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-4">
						<div>
							<label className={labelClass}>Motivo (chief_complaint)</label>
							<textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} rows={4} className={`${inputBase} ${inputDark} resize-none`} placeholder="Describa el motivo de consulta..." aria-label="Motivo de la consulta" />
						</div>

						<div>
							<label className={labelClass}>Diagnóstico</label>
							<textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={3} className={`${inputBase} ${inputDark} resize-none`} placeholder="Ingrese el diagnóstico clínico..." aria-label="Diagnóstico" />
						</div>

						<div>
							<label className={labelClass}>Notas</label>
							<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${inputBase} ${inputDark} resize-none`} placeholder="Notas / recomendaciones para el paciente..." aria-label="Notas" />
						</div>
					</div>

					<aside className="space-y-4">
						<div className="bg-teal-50 dark:bg-[#05464b] border border-teal-100 dark:border-[#075b61] p-3 rounded-lg shadow-inner">
							<div className="text-xs text-teal-800 dark:text-teal-200 font-semibold">Resumen rápido</div>
							<div className="mt-2 text-sm text-slate-700 dark:text-slate-100">
								<div>
									Consulta: <span className="font-mono text-xs text-slate-600 dark:text-slate-300 ml-1">{initial.id}</span>
								</div>
								<div className="mt-1">
									Creada: <span className="font-medium">{initial.created_at ? new Date(initial.created_at).toLocaleString() : '—'}</span>
								</div>
								{patient && (
									<div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
										Paciente: <span className="font-medium">{`${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() || '—'}</span>
									</div>
								)}
							</div>
						</div>

						<div className="p-3 rounded-lg border border-slate-100 dark:border-[#083033] bg-white dark:bg-[#022b2f]">
							<label className={labelClass}>Fecha / Hora inicio</label>
							<input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className={`${inputBase} ${inputDark}`} aria-label="Fecha y hora inicio" />
							<label className={`${labelClass} mt-3`}>Fecha / Hora fin</label>
							<input type="datetime-local" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} className={`${inputBase} ${inputDark}`} aria-label="Fecha y hora fin" />
						</div>
					</aside>
				</div>
			</div>

			{/* Vitals section */}
			<section className={sectionCard}>
				<div className="flex items-center justify-between mb-3">
					<div>
						<h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Signos Vitales</h3>
						<p className="text-xs text-slate-400">Rellena los campos que correspondan — valores numéricos</p>
					</div>
					<div className="text-xs text-slate-500">
						Última actualización: <span className="font-mono text-xs">{initial.created_at ? new Date(initial.created_at).toLocaleDateString() : '—'}</span>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
					{/* Peso */}
					<div>
						<label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Peso</label>
						<div className="flex items-center gap-2">
							<input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" min="0" aria-label="Peso en kg" />
							<span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 dark:bg-[#022f31] text-xs text-slate-600 dark:text-slate-300 border border-slate-100">kg</span>
						</div>
					</div>

					{/* Talla */}
					<div>
						<label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Talla</label>
						<div className="flex items-center gap-2">
							<input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" min="0" aria-label="Talla en cm" />
							<span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 dark:bg-[#022f31] text-xs text-slate-600 dark:text-slate-300 border border-slate-100">cm</span>
						</div>
					</div>

					{/* Temperatura */}
					<div>
						<label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Temperatura</label>
						<div className="flex items-center gap-2">
							<input value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36.8" className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" min="30" max="45" aria-label="Temperatura en °C" />
							<span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 dark:bg-[#022f31] text-xs text-slate-600 dark:text-slate-300 border border-slate-100">°C</span>
						</div>
					</div>

					{/* SPO2 */}
					<div>
						<label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">SPO₂</label>
						<input value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="98" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" max="100" aria-label="SPO2" />
					</div>

					{/* PA sistólica */}
					<div>
						<label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">PA (sistólica)</label>
						<input value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} placeholder="120" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" aria-label="Presión arterial sistólica" />
					</div>

					{/* PA diastólica */}
					<div>
						<label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">PA (diastólica)</label>
						<input value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} placeholder="80" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" aria-label="Presión arterial diastólica" />
					</div>

					{/* Pulso */}
					<div>
						<label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Pulso</label>
						<input value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder="72" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" aria-label="Pulso (latidos por minuto)" />
					</div>

					{/* Respiratorio */}
					<div>
						<label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Respiratorio</label>
						<input value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} placeholder="16" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" aria-label="Frecuencia respiratoria" />
					</div>

					{/* Glucosa */}
					<div className="md:col-span-2">
						<label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Glucosa (opcional)</label>
						<div className="flex items-center gap-2">
							<input value={glucose} onChange={(e) => setGlucose(e.target.value)} placeholder="110" className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" min="0" aria-label="Glucosa mg/dL" />
							<span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 dark:bg-[#022f31] text-xs text-slate-600 dark:text-slate-300 border border-slate-100">mg/dL</span>
						</div>
					</div>

					{/* Vitals notes */}
					<div className="md:col-span-2">
						<label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Notas rápidas (vitals)</label>
						<input value={vitalsNotes} onChange={(e) => setVitalsNotes(e.target.value)} placeholder="Observaciones: paciente afebril..." className={`${inputBase} ${inputDark}`} aria-label="Notas de signos vitales" />
					</div>
				</div>
			</section>

			{error && <div className="rounded-md bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}
			{success && <div className="rounded-md bg-emerald-50 text-emerald-700 p-3 text-sm">{success}</div>}

			<div className="flex items-center gap-3">
				<button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-teal-600 to-cyan-500 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50">
					{loading ? (
						<Loader2 className="animate-spin" />
					) : (
						<>
							<Save size={16} /> Guardar cambios
						</>
					)}
				</button>

				<button type="button" onClick={() => router.push(`/dashboard/medic/consultas/${initial.id}`)} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition dark:border-[#083033] dark:bg-[#032026] dark:text-slate-100">
					Cancelar
				</button>

				<button type="button" onClick={handleDelete} className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600 text-white font-medium shadow-sm hover:brightness-95 transition">
					<Trash2 size={14} /> Eliminar
				</button>
			</div>
		</form>
	);
}
