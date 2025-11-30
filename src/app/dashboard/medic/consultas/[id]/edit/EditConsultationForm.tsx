'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Trash2, FileText, Download, ChevronDown, ChevronUp, Activity, ClipboardList, Stethoscope, FileCheck } from 'lucide-react';
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

	// Report generation
	const [reportContent, setReportContent] = useState('');
	const [generatingReport, setGeneratingReport] = useState(false);
	const [reportError, setReportError] = useState<string | null>(null);
	const [reportSuccess, setReportSuccess] = useState<string | null>(null);
	const [reportUrl, setReportUrl] = useState<string | null>((initial as any).report_url || null);

	// UI State
	const [activeTab, setActiveTab] = useState<'main' | 'vitals' | 'specialty' | 'report'>('main');
	const [expandedSpecialties, setExpandedSpecialties] = useState<Set<string>>(new Set(['general']));

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
     Ginecología
     ------------------------- */
	const [lmp, setLmp] = useState<string>(initGyn.last_menstrual_period ?? '');
	const [contraceptiveUse, setContraceptiveUse] = useState<string>(initGyn.contraceptive ?? '');
	const [cervicalExamNotes, setCervicalExamNotes] = useState<string>(initGyn.cervical_exam ?? '');

	/* -------------------------
     Endocrinología
     ------------------------- */
	const [tsh, setTsh] = useState<string>(initEndo.tsh ?? '');
	const [hba1c, setHba1c] = useState<string>(initEndo.hba1c ?? '');

	/* -------------------------
     Oftalmología
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
     ------------------------- */
	function validateRequiredFields(): string[] {
		const errors: string[] = [];
		const vitals = buildVitalsObject() ?? {};

		const requiredMap: Record<string, string[]> = {
			cardiology: ['ekg_rhythm', 'bnp'],
			pulmonology: ['fev1', 'fvc'],
			neurology: ['gcs_total'],
			obstetrics: ['fundal_height_cm', 'fetal_heart_rate'],
			nutrition: ['waist_cm'],
			dermatology: ['lesion_description'],
			psychiatry: [],
			orthopedics: ['limb_strength'],
			ent: ['hearing_left_db', 'hearing_right_db'],
			gynecology: ['last_menstrual_period'],
			endocrinology: ['tsh'],
			ophthalmology: ['visual_acuity'],
			general: ['weight', 'height', 'heart_rate', 'bp_systolic', 'bp_diastolic'],
		};

		for (const [section, reqs] of Object.entries(requiredMap)) {
			const sectKey = section === 'gynecology' ? 'gynecology' : section;
			const sectionObj = (vitals as any)[sectKey];
			if (!sectionObj) continue;
			const hasAny = Object.values(sectionObj).some((v: any) => v !== '' && v !== null && v !== undefined && String(v).trim() !== '');
			if (!hasAny) continue;
			const missing: string[] = [];
			for (const r of reqs) {
				if (!(r in sectionObj) || sectionObj[r] === '' || sectionObj[r] === null || sectionObj[r] === undefined) {
					missing.push(r);
				}
			}
			if (missing.length) {
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

		const missing = validateRequiredFields();
		if (missing.length) {
			setError(`Revise los campos obligatorios por sección:\n• ${missing.join('\n• ')}`);
			return;
		}

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
			{ label: 'BNP', val: bnp },
			{ label: 'Escala dolor torácico', val: chestPainScale },
			{ label: 'FEV1', val: fev1 },
			{ label: 'FVC', val: fvc },
			{ label: 'Peak Flow', val: peakFlow },
			{ label: 'GCS total', val: gcsTotal },
			{ label: 'Altura uterina (cm)', val: fundalHeight },
			{ label: 'FC fetal (bpm)', val: fetalHr },
			{ label: 'Circunferencia cintura (cm)', val: waistCircumference },
			{ label: 'BMI override', val: bmiOverride },
			{ label: 'Tamaño lesión (cm)', val: lesionSize },
			{ label: 'PHQ-9', val: phq9 },
			{ label: 'Fuerza extremidad', val: limbStrength },
			{ label: 'Audición izquierda (dB)', val: hearingLeft },
			{ label: 'Audición derecha (dB)', val: hearingRight },
			{ label: 'TSH', val: tsh },
			{ label: 'HbA1c', val: hba1c },
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

	async function handleGenerateReport() {
		if (!reportContent.trim()) {
			setReportError('Por favor, escribe el contenido del informe');
			return;
		}

		setGeneratingReport(true);
		setReportError(null);
		setReportSuccess(null);

		try {
			const res = await fetch(`/api/consultations/${initial.id}/generate-report`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: reportContent }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al generar informe');
			}

			setReportSuccess('Informe generado exitosamente');
			setReportUrl(data.report_url);
		} catch (err: any) {
			setReportError(err?.message ?? String(err));
		} finally {
			setGeneratingReport(false);
		}
	}

	const toggleSpecialty = (specialty: string) => {
		setExpandedSpecialties((prev) => {
			const next = new Set(prev);
			if (next.has(specialty)) {
				next.delete(specialty);
			} else {
				next.add(specialty);
			}
			return next;
		});
	};

	/* -----------------
     Styling helpers
     ----------------- */
	const inputBase = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition';
	const inputDark = 'dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-500 dark:text-slate-100';
	const labelClass = 'block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2';
	const sectionCard = 'bg-white rounded-xl border border-slate-200 shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700';

	const tabs = [
		{ id: 'main', label: 'Información Principal', icon: ClipboardList },
		{ id: 'vitals', label: 'Signos Vitales', icon: Activity },
		{ id: 'specialty', label: 'Especialidades', icon: Stethoscope },
		{ id: 'report', label: 'Informe Médico', icon: FileCheck },
	];

	return (
		<div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
			<form onSubmit={handleSave} className="max-w-7xl mx-auto">
				{/* Tabs Navigation */}
				<div className="bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700 sticky top-0 z-10">
					<div className="flex overflow-x-auto scrollbar-hide">
						{tabs.map((tab) => {
							const Icon = tab.icon;
							const isActive = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveTab(tab.id as any)}
									className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
										isActive
											? 'border-teal-600 text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-400'
											: 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700/50'
									}`}
								>
									<Icon size={18} />
									{tab.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Tab Content */}
				<div className="p-6 space-y-6">
					{/* Main Information Tab */}
					{activeTab === 'main' && (
						<div className="space-y-6">
							<div className={sectionCard}>
								<h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
									<ClipboardList size={20} />
									Información de la Consulta
								</h2>
								
								<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
									<div className="lg:col-span-2 space-y-6">
										<div>
											<label className={labelClass}>Motivo de Consulta</label>
											<textarea
												value={chiefComplaint}
												onChange={(e) => setChiefComplaint(e.target.value)}
												rows={5}
												className={`${inputBase} ${inputDark} resize-none`}
												placeholder="Describa el motivo de consulta del paciente..."
											/>
										</div>

										<div>
											<label className={labelClass}>Diagnóstico</label>
											<textarea
												value={diagnosis}
												onChange={(e) => setDiagnosis(e.target.value)}
												rows={4}
												className={`${inputBase} ${inputDark} resize-none`}
												placeholder="Ingrese el diagnóstico clínico..."
											/>
										</div>

										<div>
											<label className={labelClass}>Notas y Recomendaciones</label>
											<textarea
												value={notes}
												onChange={(e) => setNotes(e.target.value)}
												rows={4}
												className={`${inputBase} ${inputDark} resize-none`}
												placeholder="Notas adicionales, recomendaciones para el paciente..."
											/>
										</div>
									</div>

									<aside className="space-y-4">
										<div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800 p-4 rounded-xl">
											<h3 className="text-sm font-bold text-teal-900 dark:text-teal-100 mb-3">Información de Tiempo</h3>
											<div className="space-y-4">
												<div>
													<label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Fecha / Hora Inicio</label>
													<input
														type="datetime-local"
														value={startedAt}
														onChange={(e) => setStartedAt(e.target.value)}
														className={`${inputBase} ${inputDark}`}
													/>
												</div>
												<div>
													<label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Fecha / Hora Fin</label>
													<input
														type="datetime-local"
														value={endedAt}
														onChange={(e) => setEndedAt(e.target.value)}
														className={`${inputBase} ${inputDark}`}
													/>
												</div>
											</div>
										</div>

										{patient && (
											<div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-4 rounded-xl">
												<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Paciente</h3>
												<p className="text-sm text-slate-700 dark:text-slate-300">
													{patient.firstName} {patient.lastName}
												</p>
												{patient.identifier && (
													<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ID: {patient.identifier}</p>
												)}
											</div>
										)}
									</aside>
								</div>
							</div>
						</div>
					)}

					{/* Vitals Tab */}
					{activeTab === 'vitals' && (
						<div className={sectionCard}>
							<h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
								<Activity size={20} />
								Signos Vitales Generales
							</h2>

							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
								<div>
									<label className={labelClass}>Peso (kg)</label>
									<div className="flex items-center gap-2">
										<input
											value={weight}
											onChange={(e) => setWeight(e.target.value)}
											placeholder="70"
											className={`${inputBase} ${inputDark}`}
											type="number"
											inputMode="decimal"
											step="0.1"
											min="0"
										/>
										<span className="text-xs text-slate-500 font-medium">kg</span>
									</div>
								</div>

								<div>
									<label className={labelClass}>Talla (cm)</label>
									<div className="flex items-center gap-2">
										<input
											value={height}
											onChange={(e) => setHeight(e.target.value)}
											placeholder="175"
											className={`${inputBase} ${inputDark}`}
											type="number"
											inputMode="decimal"
											step="0.1"
											min="0"
										/>
										<span className="text-xs text-slate-500 font-medium">cm</span>
									</div>
								</div>

								<div>
									<label className={labelClass}>IMC (BMI)</label>
									<div className="flex items-center gap-2">
										<input
											value={bmiOverride || computedBMI}
											onChange={(e) => setBmiOverride(e.target.value)}
											placeholder={computedBMI || '—'}
											className={`${inputBase} ${inputDark}`}
											type="text"
										/>
										<span className="text-xs text-slate-500 font-medium">kg/m²</span>
									</div>
									<p className="text-xs text-slate-400 mt-1">Calculado automáticamente</p>
								</div>

								<div>
									<label className={labelClass}>Temperatura (°C)</label>
									<div className="flex items-center gap-2">
										<input
											value={temperature}
											onChange={(e) => setTemperature(e.target.value)}
											placeholder="36.8"
											className={`${inputBase} ${inputDark}`}
											type="number"
											inputMode="decimal"
											step="0.1"
											min="30"
											max="45"
										/>
										<span className="text-xs text-slate-500 font-medium">°C</span>
									</div>
								</div>

								<div>
									<label className={labelClass}>PA Sistólica</label>
									<input
										value={bpSystolic}
										onChange={(e) => setBpSystolic(e.target.value)}
										placeholder="120"
										className={`${inputBase} ${inputDark}`}
										type="number"
										inputMode="numeric"
										step="1"
										min="0"
									/>
								</div>

								<div>
									<label className={labelClass}>PA Diastólica</label>
									<input
										value={bpDiastolic}
										onChange={(e) => setBpDiastolic(e.target.value)}
										placeholder="80"
										className={`${inputBase} ${inputDark}`}
										type="number"
										inputMode="numeric"
										step="1"
										min="0"
									/>
								</div>

								<div>
									<label className={labelClass}>Pulso (bpm)</label>
									<input
										value={heartRate}
										onChange={(e) => setHeartRate(e.target.value)}
										placeholder="72"
										className={`${inputBase} ${inputDark}`}
										type="number"
										inputMode="numeric"
										step="1"
										min="0"
									/>
								</div>

								<div>
									<label className={labelClass}>Frecuencia Respiratoria</label>
									<input
										value={respiratoryRate}
										onChange={(e) => setRespiratoryRate(e.target.value)}
										placeholder="16"
										className={`${inputBase} ${inputDark}`}
										type="number"
										inputMode="numeric"
										step="1"
										min="0"
									/>
								</div>

								<div>
									<label className={labelClass}>SPO₂ (%)</label>
									<input
										value={spo2}
										onChange={(e) => setSpo2(e.target.value)}
										placeholder="98"
										className={`${inputBase} ${inputDark}`}
										type="number"
										inputMode="numeric"
										step="1"
										min="0"
										max="100"
									/>
								</div>

								<div className="sm:col-span-2">
									<label className={labelClass}>Glucosa (mg/dL)</label>
									<div className="flex items-center gap-2">
										<input
											value={glucose}
											onChange={(e) => setGlucose(e.target.value)}
											placeholder="110"
											className={`${inputBase} ${inputDark}`}
											type="number"
											inputMode="decimal"
											step="0.1"
											min="0"
										/>
										<span className="text-xs text-slate-500 font-medium">mg/dL</span>
									</div>
								</div>

								<div className="sm:col-span-2 lg:col-span-4">
									<label className={labelClass}>Notas de Signos Vitales</label>
									<input
										value={vitalsNotes}
										onChange={(e) => setVitalsNotes(e.target.value)}
										placeholder="Observaciones adicionales sobre los signos vitales..."
										className={`${inputBase} ${inputDark}`}
									/>
								</div>
							</div>
						</div>
					)}

					{/* Specialty Vitals Tab */}
					{activeTab === 'specialty' && (
						<div className="space-y-4">
							<div className={sectionCard}>
								<h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
									<Stethoscope size={20} />
									Signos Vitales por Especialidad
								</h2>
								<p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
									Expande las secciones relevantes para tu especialidad y completa los campos necesarios.
								</p>

								{/* Cardiology */}
								<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
									<button
										type="button"
										onClick={() => toggleSpecialty('cardiology')}
										className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg"
									>
										<span className="font-semibold text-slate-900 dark:text-slate-100">Cardiología</span>
										{expandedSpecialties.has('cardiology') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
									</button>
									{expandedSpecialties.has('cardiology') && (
										<div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<label className={labelClass}>Ritmo ECG</label>
												<input value={ekgRhythm} onChange={(e) => setEkgRhythm(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Ritmo sinusal..." />
											</div>
											<div>
												<label className={labelClass}>BNP (pg/mL)</label>
												<input value={bnp} onChange={(e) => setBnp(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
											</div>
											<div>
												<label className={labelClass}>Edema</label>
												<div className="flex items-center gap-3 mt-2">
													<label className="inline-flex items-center gap-2 text-sm">
														<input type="checkbox" checked={edema} onChange={(e) => setEdema(e.target.checked)} className="form-checkbox" /> Presente
													</label>
												</div>
											</div>
											<div>
												<label className={labelClass}>Escala dolor torácico (0-10)</label>
												<input value={chestPainScale} onChange={(e) => setChestPainScale(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" min="0" max="10" />
											</div>
										</div>
									)}
								</div>

								{/* Continue with other specialties in similar format... */}
								{/* For brevity, I'll add a few more key ones */}
								
								{/* Pulmonology */}
								<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
									<button
										type="button"
										onClick={() => toggleSpecialty('pulmonology')}
										className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg"
									>
										<span className="font-semibold text-slate-900 dark:text-slate-100">Neumología</span>
										{expandedSpecialties.has('pulmonology') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
									</button>
									{expandedSpecialties.has('pulmonology') && (
										<div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
											<div>
												<label className={labelClass}>FEV1 (L)</label>
												<input value={fev1} onChange={(e) => setFev1(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
											</div>
											<div>
												<label className={labelClass}>FVC (L)</label>
												<input value={fvc} onChange={(e) => setFvc(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
											</div>
											<div>
												<label className={labelClass}>Peak Flow (L/min)</label>
												<input value={peakFlow} onChange={(e) => setPeakFlow(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
											</div>
											<div className="md:col-span-3">
												<label className={labelClass}>Observación / Sibilancias</label>
												<input value={wheezeNote} onChange={(e) => setWheezeNote(e.target.value)} className={`${inputBase} ${inputDark}`} />
											</div>
										</div>
									)}
								</div>

								{/* Neurology */}
								<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
									<button
										type="button"
										onClick={() => toggleSpecialty('neurology')}
										className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg"
									>
										<span className="font-semibold text-slate-900 dark:text-slate-100">Neurología</span>
										{expandedSpecialties.has('neurology') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
									</button>
									{expandedSpecialties.has('neurology') && (
										<div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
											<div>
												<label className={labelClass}>GCS Total</label>
												<input value={gcsTotal} onChange={(e) => setGcsTotal(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" min="3" max="15" />
											</div>
											<div>
												<label className={labelClass}>Reactividad Pupilar</label>
												<input value={pupillaryReactivity} onChange={(e) => setPupillaryReactivity(e.target.value)} className={`${inputBase} ${inputDark}`} />
											</div>
											<div className="md:col-span-3">
												<label className={labelClass}>Notas Neurológicas</label>
												<input value={neuroNotes} onChange={(e) => setNeuroNotes(e.target.value)} className={`${inputBase} ${inputDark}`} />
											</div>
										</div>
									)}
								</div>

								{/* Obstetrics */}
								<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
									<button
										type="button"
										onClick={() => toggleSpecialty('obstetrics')}
										className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg"
									>
										<span className="font-semibold text-slate-900 dark:text-slate-100">Obstetricia</span>
										{expandedSpecialties.has('obstetrics') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
									</button>
									{expandedSpecialties.has('obstetrics') && (
										<div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-4 gap-4">
											<div>
												<label className={labelClass}>Altura Uterina (cm)</label>
												<input value={fundalHeight} onChange={(e) => setFundalHeight(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
											</div>
											<div>
												<label className={labelClass}>FC Fetal (bpm)</label>
												<input value={fetalHr} onChange={(e) => setFetalHr(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" />
											</div>
											<div>
												<label className={labelClass}>Gravida</label>
												<input value={gravida} onChange={(e) => setGravida(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" />
											</div>
											<div>
												<label className={labelClass}>Para</label>
												<input value={para} onChange={(e) => setPara(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" />
											</div>
										</div>
									)}
								</div>

								{/* Nutrition */}
								<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
									<button
										type="button"
										onClick={() => toggleSpecialty('nutrition')}
										className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg"
									>
										<span className="font-semibold text-slate-900 dark:text-slate-100">Nutrición</span>
										{expandedSpecialties.has('nutrition') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
									</button>
									{expandedSpecialties.has('nutrition') && (
										<div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
											<div>
												<label className={labelClass}>Circunferencia Cintura (cm)</label>
												<input value={waistCircumference} onChange={(e) => setWaistCircumference(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
											</div>
											<div>
												<label className={labelClass}>IMC (Override)</label>
												<input value={bmiOverride} onChange={(e) => setBmiOverride(e.target.value)} placeholder={computedBMI || ''} className={`${inputBase} ${inputDark}`} />
											</div>
										</div>
									)}
								</div>

								{/* Dermatology */}
								<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
									<button
										type="button"
										onClick={() => toggleSpecialty('dermatology')}
										className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg"
									>
										<span className="font-semibold text-slate-900 dark:text-slate-100">Dermatología</span>
										{expandedSpecialties.has('dermatology') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
									</button>
									{expandedSpecialties.has('dermatology') && (
										<div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
											<div className="md:col-span-2">
												<label className={labelClass}>Descripción Lesión</label>
												<input value={lesionDesc} onChange={(e) => setLesionDesc(e.target.value)} className={`${inputBase} ${inputDark}`} />
											</div>
											<div>
												<label className={labelClass}>Tamaño Lesión (cm)</label>
												<input value={lesionSize} onChange={(e) => setLesionSize(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
											</div>
										</div>
									)}
								</div>

								{/* Psychiatry */}
								<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
									<button
										type="button"
										onClick={() => toggleSpecialty('psychiatry')}
										className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg"
									>
										<span className="font-semibold text-slate-900 dark:text-slate-100">Psiquiatría</span>
										{expandedSpecialties.has('psychiatry') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
									</button>
									{expandedSpecialties.has('psychiatry') && (
										<div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
											<div>
												<label className={labelClass}>Escala de Ánimo</label>
												<input value={moodScale} onChange={(e) => setMoodScale(e.target.value)} className={`${inputBase} ${inputDark}`} />
											</div>
											<div>
												<label className={labelClass}>PHQ-9</label>
												<input value={phq9} onChange={(e) => setPhq9(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" />
											</div>
										</div>
									)}
								</div>

								{/* Orthopedics */}
								<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
									<button
										type="button"
										onClick={() => toggleSpecialty('orthopedics')}
										className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg"
									>
										<span className="font-semibold text-slate-900 dark:text-slate-100">Ortopedia</span>
										{expandedSpecialties.has('orthopedics') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
									</button>
									{expandedSpecialties.has('orthopedics') && (
										<div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
											<div className="md:col-span-2">
												<label className={labelClass}>Rango de Movimiento (Notas)</label>
												<input value={romNotes} onChange={(e) => setRomNotes(e.target.value)} className={`${inputBase} ${inputDark}`} />
											</div>
											<div>
												<label className={labelClass}>Fuerza (0-5)</label>
												<input value={limbStrength} onChange={(e) => setLimbStrength(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" min="0" max="5" />
											</div>
										</div>
									)}
								</div>

								{/* ENT */}
								<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
									<button
										type="button"
										onClick={() => toggleSpecialty('ent')}
										className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg"
									>
										<span className="font-semibold text-slate-900 dark:text-slate-100">ORL / Otorrino</span>
										{expandedSpecialties.has('ent') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
									</button>
									{expandedSpecialties.has('ent') && (
										<div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
											<div>
												<label className={labelClass}>Audición Izquierda (dB)</label>
												<input value={hearingLeft} onChange={(e) => setHearingLeft(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" />
											</div>
											<div>
												<label className={labelClass}>Audición Derecha (dB)</label>
												<input value={hearingRight} onChange={(e) => setHearingRight(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" />
											</div>
											<div className="md:col-span-3">
												<label className={labelClass}>Otoscopía / Observaciones</label>
												<input value={otoscopyNotes} onChange={(e) => setOtoscopyNotes(e.target.value)} className={`${inputBase} ${inputDark}`} />
											</div>
										</div>
									)}
								</div>

								{/* Gynecology */}
								<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
									<button
										type="button"
										onClick={() => toggleSpecialty('gynecology')}
										className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg"
									>
										<span className="font-semibold text-slate-900 dark:text-slate-100">Ginecología</span>
										{expandedSpecialties.has('gynecology') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
									</button>
									{expandedSpecialties.has('gynecology') && (
										<div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
											<div>
												<label className={labelClass}>Fecha Última Regla (LMP)</label>
												<input value={lmp} onChange={(e) => setLmp(e.target.value)} className={`${inputBase} ${inputDark}`} type="date" />
											</div>
											<div>
												<label className={labelClass}>Método Anticonceptivo</label>
												<input value={contraceptiveUse} onChange={(e) => setContraceptiveUse(e.target.value)} className={`${inputBase} ${inputDark}`} />
											</div>
											<div className="md:col-span-3">
												<label className={labelClass}>Examen Cervical / Observaciones</label>
												<input value={cervicalExamNotes} onChange={(e) => setCervicalExamNotes(e.target.value)} className={`${inputBase} ${inputDark}`} />
											</div>
										</div>
									)}
								</div>

								{/* Endocrinology */}
								<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
									<button
										type="button"
										onClick={() => toggleSpecialty('endocrinology')}
										className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg"
									>
										<span className="font-semibold text-slate-900 dark:text-slate-100">Endocrinología</span>
										{expandedSpecialties.has('endocrinology') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
									</button>
									{expandedSpecialties.has('endocrinology') && (
										<div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
											<div>
												<label className={labelClass}>TSH (mIU/L)</label>
												<input value={tsh} onChange={(e) => setTsh(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
											</div>
											<div>
												<label className={labelClass}>HbA1c (%)</label>
												<input value={hba1c} onChange={(e) => setHba1c(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" />
											</div>
										</div>
									)}
								</div>

								{/* Ophthalmology */}
								<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
									<button
										type="button"
										onClick={() => toggleSpecialty('ophthalmology')}
										className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg"
									>
										<span className="font-semibold text-slate-900 dark:text-slate-100">Oftalmología</span>
										{expandedSpecialties.has('ophthalmology') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
									</button>
									{expandedSpecialties.has('ophthalmology') && (
										<div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
											<div>
												<label className={labelClass}>Agudeza Visual (p.ej. 20/20)</label>
												<input value={visualAcuity} onChange={(e) => setVisualAcuity(e.target.value)} className={`${inputBase} ${inputDark}`} />
											</div>
											<div>
												<label className={labelClass}>Presión Intraocular (mmHg)</label>
												<input value={iop} onChange={(e) => setIop(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Report Generation Tab */}
					{activeTab === 'report' && (
						<div className={sectionCard}>
							<div className="flex items-center justify-between mb-6">
								<h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
									<FileCheck size={20} />
									Generar Informe Médico
								</h2>
								{reportUrl && (
									<a
										href={reportUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
									>
										<Download size={16} />
										Descargar Informe
									</a>
								)}
							</div>

							<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
								<p className="text-sm text-blue-800 dark:text-blue-200">
									<strong>Instrucciones:</strong> Escribe el contenido del informe médico que se insertará en tu plantilla. 
									El contenido se insertará en el marcador <code className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded font-mono text-xs">{"{{contenido}}"}</code> de tu plantilla.
								</p>
							</div>

							<div className="space-y-4">
								<div>
									<label className={labelClass}>Contenido del Informe</label>
									<textarea
										value={reportContent}
										onChange={(e) => setReportContent(e.target.value)}
										rows={16}
										className={`${inputBase} ${inputDark} resize-none font-mono text-sm`}
										placeholder="Escribe aquí el contenido completo del informe médico. Este texto se insertará automáticamente en tu plantilla de informe..."
									/>
								</div>

								{reportError && (
									<div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 text-sm">
										{reportError}
									</div>
								)}

								{reportSuccess && (
									<div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-4 text-sm">
										{reportSuccess}
									</div>
								)}

								<button
									type="button"
									onClick={handleGenerateReport}
									disabled={generatingReport || !reportContent.trim()}
									className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
								>
									{generatingReport ? (
										<>
											<Loader2 className="w-5 h-5 animate-spin" />
											Generando Informe...
										</>
									) : (
										<>
											<FileText size={18} />
											Generar Informe
										</>
									)}
								</button>
							</div>
						</div>
					)}

					{/* Error and Success Messages */}
					{error && (
						<div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 whitespace-pre-line text-sm">
							{error}
						</div>
					)}
					{success && (
						<div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-4 text-sm">
							{success}
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
						<div className="flex items-center gap-3">
							<button
								type="submit"
								disabled={loading}
								className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50"
							>
								{loading ? (
									<>
										<Loader2 className="w-5 h-5 animate-spin" />
										Guardando...
									</>
								) : (
									<>
										<Save size={18} />
										Guardar Cambios
									</>
								)}
							</button>

							<button
								type="button"
								onClick={() => router.push(`/dashboard/medic/consultas/${initial.id}`)}
								className="px-5 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
							>
								Cancelar
							</button>
						</div>

						<button
							type="button"
							onClick={handleDelete}
							className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-rose-600 text-white font-medium shadow-lg hover:bg-rose-700 hover:shadow-xl transition-all"
						>
							<Trash2 size={16} />
							Eliminar
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
