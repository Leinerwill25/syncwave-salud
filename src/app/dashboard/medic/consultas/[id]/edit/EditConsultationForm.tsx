'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

function isNumericOrEmpty(s: string | number | null | undefined) {
	if (s === '' || s === null || s === undefined) return true;
	return !Number.isNaN(Number(String(s).toString().replace(',', '.')));
}

export default function EditConsultationForm({ initial, patient, doctor }: { initial: ConsultationShape; patient?: any; doctor?: any }) {
	const router = useRouter();

	// Core
	const [chiefComplaint, setChiefComplaint] = useState(initial.chief_complaint ?? '');
	const [diagnosis, setDiagnosis] = useState(initial.diagnosis ?? '');
	const [notes, setNotes] = useState(initial.notes ?? '');
	const [startedAt, setStartedAt] = useState(initial.started_at ? toLocalDateTime(initial.started_at) : toLocalDateTime(initial.created_at));
	const [endedAt, setEndedAt] = useState(initial.ended_at ? toLocalDateTime(initial.ended_at) : '');

	// init grouped vitals from initial.vitals
	const initVitals = (initial.vitals ?? {}) as Record<string, any>;
	const initGeneral = initVitals.general ?? {};
	const initCardio = initVitals.cardiology ?? {};
	const initPulmo = initVitals.pulmonology ?? {};
	const initNeuro = initVitals.neurology ?? {};
	const initObst = initVitals.obstetrics ?? {};
	const initNutrition = initVitals.nutrition ?? {};
	const initDerma = initVitals.dermatology ?? {};
	const initPsych = initVitals.psychiatry ?? {};
	const initOrtho = initVitals.orthopedics ?? {};
	const initEnt = initVitals.ent ?? {};
	const initGyn = initVitals.gynecology ?? {};
	const initEndo = initVitals.endocrinology ?? {};
	const initOph = initVitals.ophthalmology ?? {};

	/* -------------------------
     General vitals
     ------------------------- */
	const [weight, setWeight] = useState<string>(initGeneral.weight ?? '');
	const [height, setHeight] = useState<string>(initGeneral.height ?? '');
	const [temperature, setTemperature] = useState<string>(initGeneral.temperature ?? '');
	const [bpSystolic, setBpSystolic] = useState<string>(initGeneral.bp_systolic ?? '');
	const [bpDiastolic, setBpDiastolic] = useState<string>(initGeneral.bp_diastolic ?? '');
	const [heartRate, setHeartRate] = useState<string>(initGeneral.heart_rate ?? '');
	const [respiratoryRate, setRespiratoryRate] = useState<string>(initGeneral.respiratory_rate ?? '');
	const [spo2, setSpo2] = useState<string>(initGeneral.spo2 ?? '');
	const [glucose, setGlucose] = useState<string>(initGeneral.glucose ?? '');
	const [vitalsNotes, setVitalsNotes] = useState<string>(initGeneral.notes ?? '');

	/* -------------------------
     Cardiology
     ------------------------- */
	const [ekgRhythm, setEkgRhythm] = useState<string>(initCardio.ekg_rhythm ?? '');
	const [bnp, setBnp] = useState<string>(initCardio.bnp ?? '');
	const [edema, setEdema] = useState<boolean>(!!initCardio.edema);
	const [chestPainScale, setChestPainScale] = useState<string>(initCardio.chest_pain_scale ?? '');

	/* -------------------------
     Pulmonology
     ------------------------- */
	const [fev1, setFev1] = useState<string>(initPulmo.fev1 ?? '');
	const [fvc, setFvc] = useState<string>(initPulmo.fvc ?? '');
	const [peakFlow, setPeakFlow] = useState<string>(initPulmo.peak_flow ?? '');
	const [wheezeNote, setWheezeNote] = useState<string>(initPulmo.wheeze ?? '');

	/* -------------------------
     Neurology
     ------------------------- */
	const [gcsTotal, setGcsTotal] = useState<string>(initNeuro.gcs_total ?? '');
	const [pupillaryReactivity, setPupillaryReactivity] = useState<string>(initNeuro.pupillary_reactivity ?? '');
	const [neuroNotes, setNeuroNotes] = useState<string>(initNeuro.notes ?? '');

	/* -------------------------
     Obstetrics
     ------------------------- */
	const [fundalHeight, setFundalHeight] = useState<string>(initObst.fundal_height_cm ?? '');
	const [fetalHr, setFetalHr] = useState<string>(initObst.fetal_heart_rate ?? '');
	const [gravida, setGravida] = useState<string>(initObst.gravida ?? '');
	const [para, setPara] = useState<string>(initObst.para ?? '');

	/* -------------------------
     Nutrition
     ------------------------- */
	const [waistCircumference, setWaistCircumference] = useState<string>(initNutrition.waist_cm ?? '');
	const [bmiOverride, setBmiOverride] = useState<string>(initNutrition.bmi_override ?? '');

	/* -------------------------
     Dermatology
     ------------------------- */
	const [lesionDesc, setLesionDesc] = useState<string>(initDerma.lesion_description ?? '');
	const [lesionSize, setLesionSize] = useState<string>(initDerma.lesion_size_cm ?? '');

	/* -------------------------
     Psychiatry
     ------------------------- */
	const [moodScale, setMoodScale] = useState<string>(initPsych.mood_scale ?? '');
	const [phq9, setPhq9] = useState<string>(initPsych.phq9 ?? '');

	/* -------------------------
     Orthopedics
     ------------------------- */
	const [romNotes, setRomNotes] = useState<string>(initOrtho.range_of_motion ?? '');
	const [limbStrength, setLimbStrength] = useState<string>(initOrtho.limb_strength ?? '');

	/* -------------------------
     ENT
     ------------------------- */
	const [hearingLeft, setHearingLeft] = useState<string>(initEnt.hearing_left_db ?? '');
	const [hearingRight, setHearingRight] = useState<string>(initEnt.hearing_right_db ?? '');
	const [otoscopyNotes, setOtoscopyNotes] = useState<string>(initEnt.otoscopy ?? '');

	/* -------------------------
     Ginecología (nueva)
     ------------------------- */
	const [lmp, setLmp] = useState<string>(initGyn.last_menstrual_period ?? ''); // fecha LMP ISO o texto
	const [contraceptiveUse, setContraceptiveUse] = useState<string>(initGyn.contraceptive ?? '');
	const [cervicalExamNotes, setCervicalExamNotes] = useState<string>(initGyn.cervical_exam ?? '');

	/* -------------------------
     Endocrinología (nueva)
     ------------------------- */
	const [tsh, setTsh] = useState<string>(initEndo.tsh ?? '');
	const [hba1c, setHba1c] = useState<string>(initEndo.hba1c ?? '');

	/* -------------------------
     Oftalmología (nueva)
     ------------------------- */
	const [visualAcuity, setVisualAcuity] = useState<string>(initOph.visual_acuity ?? '');
	const [iop, setIop] = useState<string>(initOph.iop ?? '');

	/* -------------------------
     UI
     ------------------------- */
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	/* computed BMI */
	const computedBMI = useMemo(() => {
		const w = Number(String(weight).replace(',', '.'));
		const h = Number(String(height).replace(',', '.'));
		if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return '';
		const meters = h / 100;
		const bmi = w / (meters * meters);
		return bmi ? bmi.toFixed(1) : '';
	}, [weight, height]);

	useEffect(() => {
		// placeholder behaviour kept intentionally simple
	}, [computedBMI, bmiOverride]);

	/* -------------------------
     Build vitals object
     ------------------------- */
	function buildVitalsObject() {
		const g: Record<string, any> = {};
		if (weight) g.weight = weight;
		if (height) g.height = height;
		if (temperature) g.temperature = temperature;
		if (bpSystolic) g.bp_systolic = bpSystolic;
		if (bpDiastolic) g.bp_diastolic = bpDiastolic;
		if (heartRate) g.heart_rate = heartRate;
		if (respiratoryRate) g.respiratory_rate = respiratoryRate;
		if (spo2) g.spo2 = spo2;
		if (glucose) g.glucose = glucose;
		if (vitalsNotes) g.notes = vitalsNotes;
		if (bmiOverride) g.bmi = bmiOverride;
		else if (computedBMI) g.bmi = computedBMI;

		const out: Record<string, any> = {};
		if (Object.keys(g).length) out.general = g;

		const cardio: Record<string, any> = {};
		if (ekgRhythm) cardio.ekg_rhythm = ekgRhythm;
		if (bnp) cardio.bnp = bnp;
		cardio.edema = !!edema;
		if (chestPainScale) cardio.chest_pain_scale = chestPainScale;
		if (Object.keys(cardio).length || cardio.edema) out.cardiology = cardio;

		const pulmo: Record<string, any> = {};
		if (fev1) pulmo.fev1 = fev1;
		if (fvc) pulmo.fvc = fvc;
		if (peakFlow) pulmo.peak_flow = peakFlow;
		if (wheezeNote) pulmo.wheeze = wheezeNote;
		if (Object.keys(pulmo).length) out.pulmonology = pulmo;

		const neuro: Record<string, any> = {};
		if (gcsTotal) neuro.gcs_total = gcsTotal;
		if (pupillaryReactivity) neuro.pupillary_reactivity = pupillaryReactivity;
		if (neuroNotes) neuro.notes = neuroNotes;
		if (Object.keys(neuro).length) out.neurology = neuro;

		const obst: Record<string, any> = {};
		if (fundalHeight) obst.fundal_height_cm = fundalHeight;
		if (fetalHr) obst.fetal_heart_rate = fetalHr;
		if (gravida) obst.gravida = gravida;
		if (para) obst.para = para;
		if (Object.keys(obst).length) out.obstetrics = obst;

		const nutr: Record<string, any> = {};
		if (waistCircumference) nutr.waist_cm = waistCircumference;
		if (bmiOverride) nutr.bmi_override = bmiOverride;
		if (Object.keys(nutr).length) out.nutrition = nutr;

		const derma: Record<string, any> = {};
		if (lesionDesc) derma.lesion_description = lesionDesc;
		if (lesionSize) derma.lesion_size_cm = lesionSize;
		if (Object.keys(derma).length) out.dermatology = derma;

		const psych: Record<string, any> = {};
		if (moodScale) psych.mood_scale = moodScale;
		if (phq9) psych.phq9 = phq9;
		if (Object.keys(psych).length) out.psychiatry = psych;

		const ortho: Record<string, any> = {};
		if (romNotes) ortho.range_of_motion = romNotes;
		if (limbStrength) ortho.limb_strength = limbStrength;
		if (Object.keys(ortho).length) out.orthopedics = ortho;

		const ent: Record<string, any> = {};
		if (hearingLeft) ent.hearing_left_db = hearingLeft;
		if (hearingRight) ent.hearing_right_db = hearingRight;
		if (otoscopyNotes) ent.otoscopy = otoscopyNotes;
		if (Object.keys(ent).length) out.ent = ent;

		const gyn: Record<string, any> = {};
		if (lmp) gyn.last_menstrual_period = lmp;
		if (contraceptiveUse) gyn.contraceptive = contraceptiveUse;
		if (cervicalExamNotes) gyn.cervical_exam = cervicalExamNotes;
		if (Object.keys(gyn).length) out.gynecology = gyn;

		const endo: Record<string, any> = {};
		if (tsh) endo.tsh = tsh;
		if (hba1c) endo.hba1c = hba1c;
		if (Object.keys(endo).length) out.endocrinology = endo;

		const oph: Record<string, any> = {};
		if (visualAcuity) oph.visual_acuity = visualAcuity;
		if (iop) oph.iop = iop;
		if (Object.keys(oph).length) out.ophthalmology = oph;

		return Object.keys(out).length ? out : null;
	}

	/* -------------------------
     Validation for required fields by specialty
     - Si hay contenido en la sección, validar que estén los campos mínimos
     ------------------------- */
	function validateRequiredFields(): string[] {
		const errors: string[] = [];
		const vitals = buildVitalsObject() ?? {};

		// map: specialty -> required fields (keys in the vitals object)
		const requiredMap: Record<string, string[]> = {
			cardiology: ['ekg_rhythm', 'bnp'],
			pulmonology: ['fev1', 'fvc'],
			neurology: ['gcs_total'],
			obstetrics: ['fundal_height_cm', 'fetal_heart_rate'],
			nutrition: ['waist_cm'],
			dermatology: ['lesion_description'],
			psychiatry: [], // optional, no strict required fields here
			orthopedics: ['limb_strength'],
			ent: ['hearing_left_db', 'hearing_right_db'],
			gynecology: ['last_menstrual_period'],
			endocrinology: ['tsh'],
			ophthalmology: ['visual_acuity'],
			general: ['weight', 'height', 'heart_rate', 'bp_systolic', 'bp_diastolic'],
		};

		// Helper: check if a specialty exists and has any non-empty keys
		for (const [section, reqs] of Object.entries(requiredMap)) {
			const sectKey = section === 'gynecology' ? 'gynecology' : section; // direct mapping
			const sectionObj = (vitals as any)[sectKey];
			if (!sectionObj) continue; // sección no presente -> no validar
			// if there is content, check required fields
			const hasAny = Object.values(sectionObj).some((v: any) => v !== '' && v !== null && v !== undefined && String(v).trim() !== '');
			if (!hasAny) continue;
			// check required ones
			const missing: string[] = [];
			for (const r of reqs) {
				// note: some keys in requiredMap were declared with more human keys (e.g. fundal_height_cm) - align with actual keys
				if (!(r in sectionObj) || sectionObj[r] === '' || sectionObj[r] === null || sectionObj[r] === undefined) {
					missing.push(r);
				}
			}
			if (missing.length) {
				// translate keys to etiquetas humanas (español) para mensajes claros
				const labelMap: Record<string, string> = {
					weight: 'Peso',
					height: 'Talla',
					heart_rate: 'Pulso',
					bp_systolic: 'PA sistólica',
					bp_diastolic: 'PA diastólica',
					ekg_rhythm: 'Ritmo ECG',
					bnp: 'BNP',
					fev1: 'FEV1',
					fvc: 'FVC',
					gcs_total: 'GCS total',
					fundal_height_cm: 'Altura uterina (cm)',
					fetal_heart_rate: 'FC fetal (bpm)',
					waist_cm: 'Circunferencia cintura (cm)',
					lesion_description: 'Descripción lesión',
					limb_strength: 'Fuerza (extremidad)',
					hearing_left_db: 'Audición izquierda (dB)',
					hearing_right_db: 'Audición derecha (dB)',
					last_menstrual_period: 'Fecha de última regla (LMP)',
					tsh: 'TSH',
					visual_acuity: 'Agudeza visual',
				};
				const prettyMissing = missing.map((m) => labelMap[m] ?? m);
				errors.push(`En ${section === 'gynecology' ? 'Ginecología' : section.charAt(0).toUpperCase() + section.slice(1)}, faltan: ${prettyMissing.join(', ')}.`);
			}
		}

		return errors;
	}

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		// First: validate required fields by specialty
		const missing = validateRequiredFields();
		if (missing.length) {
			setError(`Revise los campos obligatorios por sección:\n• ${missing.join('\n• ')}`);
			return;
		}

		// aggregate numeric fields to validate (list extended for new specialties)
		const numericChecks: Array<{ label: string; val: string | number | null | undefined }> = [
			{ label: 'Peso', val: weight },
			{ label: 'Talla', val: height },
			{ label: 'Temperatura', val: temperature },
			{ label: 'PA sistólica', val: bpSystolic },
			{ label: 'PA diastólica', val: bpDiastolic },
			{ label: 'Pulso', val: heartRate },
			{ label: 'Frecuencia respiratoria', val: respiratoryRate },
			{ label: 'SPO₂', val: spo2 },
			{ label: 'Glucosa', val: glucose },
			// cardio
			{ label: 'BNP', val: bnp },
			{ label: 'Escala dolor torácico', val: chestPainScale },
			// pulmo
			{ label: 'FEV1', val: fev1 },
			{ label: 'FVC', val: fvc },
			{ label: 'Peak Flow', val: peakFlow },
			// neuro
			{ label: 'GCS total', val: gcsTotal },
			// obstetric
			{ label: 'Altura uterina (cm)', val: fundalHeight },
			{ label: 'FC fetal (bpm)', val: fetalHr },
			// nutrition
			{ label: 'Circunferencia cintura (cm)', val: waistCircumference },
			{ label: 'BMI override', val: bmiOverride },
			// derma
			{ label: 'Tamaño lesión (cm)', val: lesionSize },
			// psychiatry
			{ label: 'PHQ-9', val: phq9 },
			// ortho/ent
			{ label: 'Fuerza extremidad', val: limbStrength },
			{ label: 'Audición izquierda (dB)', val: hearingLeft },
			{ label: 'Audición derecha (dB)', val: hearingRight },
			// endocrinology
			{ label: 'TSH', val: tsh },
			{ label: 'HbA1c', val: hba1c },
			// ophthalmology
			{ label: 'IOP', val: iop },
		];

		for (const nf of numericChecks) {
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
							<label className={labelClass}>Motivo (motivo de consulta)</label>
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
								{doctor && (
									<div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
										Médico: <span className="font-medium">{doctor.name ?? doctor.email ?? '—'}</span>
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

			{/* Vitals - Generales */}
			<section className={sectionCard}>
				<div className="flex items-center justify-between mb-3">
					<div>
						<h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Signos Vitales — Generales</h3>
						<p className="text-xs text-slate-400">Campos básicos compartidos por la mayoría de especialistas</p>
					</div>
					<div className="text-xs text-slate-500">
						Última actualización: <span className="font-mono text-xs">{initial.created_at ? new Date(initial.created_at).toLocaleDateString() : '—'}</span>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
					{/* Peso */}
					<div>
						<label className={labelClass}>Peso</label>
						<div className="flex items-center gap-2">
							<input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" min="0" aria-label="Peso en kg" />
							<span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 dark:bg-[#022f31] text-xs text-slate-600 dark:text-slate-300 border border-slate-100">kg</span>
						</div>
					</div>

					{/* Talla */}
					<div>
						<label className={labelClass}>Talla</label>
						<div className="flex items-center gap-2">
							<input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" min="0" aria-label="Talla en cm" />
							<span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 dark:bg-[#022f31] text-xs text-slate-600 dark:text-slate-300 border border-slate-100">cm</span>
						</div>
					</div>

					{/* BMI */}
					<div>
						<label className={labelClass}>IMC (BMI)</label>
						<div className="flex items-center gap-2">
							<input value={bmiOverride || computedBMI} onChange={(e) => setBmiOverride(e.target.value)} placeholder={computedBMI || '—'} className={`${inputBase} ${inputDark}`} type="text" aria-label="IMC (BMI)" />
							<span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 dark:bg-[#022f31] text-xs text-slate-600 dark:text-slate-300 border border-slate-100">kg/m²</span>
						</div>
						<div className="text-xs text-slate-400 mt-1">IMC calculado automáticamente desde peso/talla (puedes sobrescribirlo).</div>
					</div>

					{/* Temperatura */}
					<div>
						<label className={labelClass}>Temperatura</label>
						<div className="flex items-center gap-2">
							<input value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36.8" className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" min="30" max="45" aria-label="Temperatura en °C" />
							<span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 dark:bg-[#022f31] text-xs text-slate-600 dark:text-slate-300 border border-slate-100">°C</span>
						</div>
					</div>

					{/* SPO2 */}
					<div>
						<label className={labelClass}>SPO₂</label>
						<input value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="98" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" max="100" aria-label="SPO2" />
					</div>

					{/* PA sistólica */}
					<div>
						<label className={labelClass}>PA (sistólica)</label>
						<input value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} placeholder="120" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" aria-label="Presión arterial sistólica" />
					</div>

					{/* PA diastólica */}
					<div>
						<label className={labelClass}>PA (diastólica)</label>
						<input value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} placeholder="80" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" aria-label="Presión arterial diastólica" />
					</div>

					{/* Pulso */}
					<div>
						<label className={labelClass}>Pulso</label>
						<input value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder="72" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" aria-label="Pulso (latidos por minuto)" />
					</div>

					{/* Respiratorio */}
					<div>
						<label className={labelClass}>Respiratorio</label>
						<input value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} placeholder="16" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" aria-label="Frecuencia respiratoria" />
					</div>

					{/* Glucosa */}
					<div className="md:col-span-2">
						<label className={labelClass}>Glucosa (opcional)</label>
						<div className="flex items-center gap-2">
							<input value={glucose} onChange={(e) => setGlucose(e.target.value)} placeholder="110" className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" min="0" aria-label="Glucosa mg/dL" />
							<span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 dark:bg-[#022f31] text-xs text-slate-600 dark:text-slate-300 border border-slate-100">mg/dL</span>
						</div>
					</div>

					{/* Vitals notes */}
					<div className="md:col-span-2">
						<label className={labelClass}>Notas rápidas (vitals)</label>
						<input value={vitalsNotes} onChange={(e) => setVitalsNotes(e.target.value)} placeholder="Observaciones: paciente afebril..." className={`${inputBase} ${inputDark}`} aria-label="Notas de signos vitales" />
					</div>
				</div>
			</section>

			{/* Specialist sections - collapsible details */}
			<section className={sectionCard}>
				<h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Secciones por especialidad</h3>

				{/* Cardiology */}
				<details className="mb-3" open>
					<summary className="cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#022b31] text-sm font-medium">Cardiología</summary>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className={labelClass}>Ritmo ECG</label>
							<input value={ekgRhythm} onChange={(e) => setEkgRhythm(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Ritmo sinusal..." aria-label="Ritmo ECG" />
						</div>
						<div>
							<label className={labelClass}>BNP (pg/mL)</label>
							<input value={bnp} onChange={(e) => setBnp(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" aria-label="BNP" />
						</div>
						<div>
							<label className={labelClass}>Edema</label>
							<div className="flex items-center gap-3">
								<label className="inline-flex items-center gap-2 text-sm">
									<input type="checkbox" checked={edema} onChange={(e) => setEdema(e.target.checked)} className="form-checkbox" /> Presente
								</label>
							</div>
						</div>
						<div>
							<label className={labelClass}>Escala dolor torácico (0-10)</label>
							<input value={chestPainScale} onChange={(e) => setChestPainScale(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" min="0" max="10" aria-label="Escala dolor torácico" />
						</div>
					</div>
				</details>

				{/* Pulmonology */}
				<details className="mb-3">
					<summary className="cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#022b31] text-sm font-medium">Neumología</summary>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className={labelClass}>FEV1 (L)</label>
							<input value={fev1} onChange={(e) => setFev1(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" aria-label="FEV1" />
						</div>
						<div>
							<label className={labelClass}>FVC (L)</label>
							<input value={fvc} onChange={(e) => setFvc(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" aria-label="FVC" />
						</div>
						<div>
							<label className={labelClass}>Peak Flow (L/min)</label>
							<input value={peakFlow} onChange={(e) => setPeakFlow(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" aria-label="Peak Flow" />
						</div>
						<div className="md:col-span-3">
							<label className={labelClass}>Observación / sibilancias</label>
							<input value={wheezeNote} onChange={(e) => setWheezeNote(e.target.value)} className={`${inputBase} ${inputDark}`} aria-label="Observación neumológica" />
						</div>
					</div>
				</details>

				{/* Neurology */}
				<details className="mb-3">
					<summary className="cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#022b31] text-sm font-medium">Neurología</summary>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className={labelClass}>GCS total</label>
							<input value={gcsTotal} onChange={(e) => setGcsTotal(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" min="3" max="15" aria-label="GCS total" />
						</div>
						<div>
							<label className={labelClass}>Reactividad pupilar</label>
							<input value={pupillaryReactivity} onChange={(e) => setPupillaryReactivity(e.target.value)} className={`${inputBase} ${inputDark}`} aria-label="Reactividad pupilar" />
						</div>
						<div className="md:col-span-3">
							<label className={labelClass}>Notas neurológicas</label>
							<input value={neuroNotes} onChange={(e) => setNeuroNotes(e.target.value)} className={`${inputBase} ${inputDark}`} aria-label="Notas neurológicas" />
						</div>
					</div>
				</details>

				{/* Obstetrics */}
				<details className="mb-3">
					<summary className="cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#022b31] text-sm font-medium">Obstetricia</summary>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<label className={labelClass}>Altura uterina (cm)</label>
							<input value={fundalHeight} onChange={(e) => setFundalHeight(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" aria-label="Altura uterina" />
						</div>
						<div>
							<label className={labelClass}>FC fetal (bpm)</label>
							<input value={fetalHr} onChange={(e) => setFetalHr(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" aria-label="FC fetal" />
						</div>
						<div>
							<label className={labelClass}>Gravida</label>
							<input value={gravida} onChange={(e) => setGravida(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" aria-label="Gravida" />
						</div>
						<div>
							<label className={labelClass}>Para</label>
							<input value={para} onChange={(e) => setPara(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" aria-label="Para" />
						</div>
					</div>
				</details>

				{/* Nutrition */}
				<details className="mb-3">
					<summary className="cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#022b31] text-sm font-medium">Nutrición</summary>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className={labelClass}>Circunferencia cintura (cm)</label>
							<input value={waistCircumference} onChange={(e) => setWaistCircumference(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" aria-label="Circunferencia cintura" />
						</div>
						<div>
							<label className={labelClass}>IMC (override)</label>
							<input value={bmiOverride} onChange={(e) => setBmiOverride(e.target.value)} placeholder={computedBMI || ''} className={`${inputBase} ${inputDark}`} aria-label="IMC override" />
						</div>
						<div className="text-xs text-slate-400 mt-2">IMC calculado: {computedBMI || '—'}</div>
					</div>
				</details>

				{/* Dermatology */}
				<details className="mb-3">
					<summary className="cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#022b31] text-sm font-medium">Dermatología</summary>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="md:col-span-2">
							<label className={labelClass}>Descripción lesión</label>
							<input value={lesionDesc} onChange={(e) => setLesionDesc(e.target.value)} className={`${inputBase} ${inputDark}`} aria-label="Descripción lesión" />
						</div>
						<div>
							<label className={labelClass}>Tamaño lesión (cm)</label>
							<input value={lesionSize} onChange={(e) => setLesionSize(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" aria-label="Tamaño lesión" />
						</div>
					</div>
				</details>

				{/* Psychiatry */}
				<details className="mb-3">
					<summary className="cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#022b31] text-sm font-medium">Psiquiatría</summary>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className={labelClass}>Escala de ánimo</label>
							<input value={moodScale} onChange={(e) => setMoodScale(e.target.value)} className={`${inputBase} ${inputDark}`} aria-label="Escala de ánimo" />
						</div>
						<div>
							<label className={labelClass}>PHQ-9</label>
							<input value={phq9} onChange={(e) => setPhq9(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" aria-label="PHQ-9" />
						</div>
						<div className="md:col-span-3 text-xs text-slate-400">Escalas breves para triage — usar con cuestionarios completos cuando aplique.</div>
					</div>
				</details>

				{/* Orthopedics */}
				<details className="mb-3">
					<summary className="cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#022b31] text-sm font-medium">Ortopedia</summary>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="md:col-span-2">
							<label className={labelClass}>Rango de movimiento (notas)</label>
							<input value={romNotes} onChange={(e) => setRomNotes(e.target.value)} className={`${inputBase} ${inputDark}`} aria-label="Rango de movimiento" />
						</div>
						<div>
							<label className={labelClass}>Fuerza (0-5)</label>
							<input value={limbStrength} onChange={(e) => setLimbStrength(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" min="0" max="5" aria-label="Fuerza" />
						</div>
					</div>
				</details>

				{/* ENT */}
				<details className="mb-3">
					<summary className="cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#022b31] text-sm font-medium">ORL / Otorrino</summary>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className={labelClass}>Audición izquierda (dB)</label>
							<input value={hearingLeft} onChange={(e) => setHearingLeft(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" aria-label="Audición izquierda" />
						</div>
						<div>
							<label className={labelClass}>Audición derecha (dB)</label>
							<input value={hearingRight} onChange={(e) => setHearingRight(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" aria-label="Audición derecha" />
						</div>
						<div className="md:col-span-3">
							<label className={labelClass}>Otoscopy / Observaciones</label>
							<input value={otoscopyNotes} onChange={(e) => setOtoscopyNotes(e.target.value)} className={`${inputBase} ${inputDark}`} aria-label="Otoscopy notes" />
						</div>
					</div>
				</details>

				{/* Ginecología (nueva) */}
				<details className="mb-3">
					<summary className="cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#022b31] text-sm font-medium">Ginecología</summary>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className={labelClass}>Fecha última regla (LMP)</label>
							<input value={lmp} onChange={(e) => setLmp(e.target.value)} className={`${inputBase} ${inputDark}`} type="date" aria-label="Fecha última regla" />
						</div>
						<div>
							<label className={labelClass}>Método anticonceptivo</label>
							<input value={contraceptiveUse} onChange={(e) => setContraceptiveUse(e.target.value)} className={`${inputBase} ${inputDark}`} aria-label="Anticonceptivo" />
						</div>
						<div className="md:col-span-3">
							<label className={labelClass}>Examen cervical / Observaciones</label>
							<input value={cervicalExamNotes} onChange={(e) => setCervicalExamNotes(e.target.value)} className={`${inputBase} ${inputDark}`} aria-label="Examen cervical" />
						</div>
					</div>
				</details>

				{/* Endocrinology (nueva) */}
				<details className="mb-3">
					<summary className="cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#022b31] text-sm font-medium">Endocrinología</summary>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className={labelClass}>TSH (mIU/L)</label>
							<input value={tsh} onChange={(e) => setTsh(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" aria-label="TSH" />
						</div>
						<div>
							<label className={labelClass}>HbA1c (%)</label>
							<input value={hba1c} onChange={(e) => setHba1c(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" aria-label="HbA1c" />
						</div>
						<div className="md:col-span-3 text-xs text-slate-400">Valores de laboratorio relevantes para manejo endocrinológico.</div>
					</div>
				</details>

				{/* Ophthalmology (nueva) */}
				<details className="mb-3">
					<summary className="cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#022b31] text-sm font-medium">Oftalmología</summary>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className={labelClass}>Agudeza visual (p.ej. 20/20)</label>
							<input value={visualAcuity} onChange={(e) => setVisualAcuity(e.target.value)} className={`${inputBase} ${inputDark}`} aria-label="Agudeza visual" />
						</div>
						<div>
							<label className={labelClass}>Presión intraocular (mmHg)</label>
							<input value={iop} onChange={(e) => setIop(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" aria-label="IOP" />
						</div>
						<div className="md:col-span-3 text-xs text-slate-400">Registrar agudeza y presión intraocular según examen.</div>
					</div>
				</details>
			</section>

			{error && <div className="rounded-md whitespace-pre-line bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}
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
