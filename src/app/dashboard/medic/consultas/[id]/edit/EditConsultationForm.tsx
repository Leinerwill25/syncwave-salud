'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Trash2, FileText, Download, ChevronDown, ChevronUp, Activity, ClipboardList, Stethoscope, FileCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ICD11Search from '@/components/ICD11Search';

type ConsultationShape = {
	id: string;
	appointment_id?: string | null;
	patient_id: string;
	doctor_id: string;
	chief_complaint?: string | null;
	diagnosis?: string | null;
	icd11_code?: string | null;
	icd11_title?: string | null;
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

export default function EditConsultationForm({ initial, patient, doctor, doctorSpecialty }: { initial: ConsultationShape; patient?: any; doctor?: any; doctorSpecialty?: string | null }) {
	const router = useRouter();

	// Función para mapear el nombre de la especialidad al código interno
	// Las especialidades vienen en español desde la base de datos (ej: "Ginecología", "Medicina General")
	const mapSpecialtyNameToCode = (specialtyName: string | null | undefined): string | null => {
		if (!specialtyName) {
			console.log('[EditConsultationForm] No hay especialidad del doctor');
			return null;
		}

		// Función auxiliar para normalizar texto (eliminar acentos, espacios extra, convertir a minúsculas)
		const normalizeText = (text: string): string => {
			return text
				.toLowerCase()
				.trim()
				.replace(/\s+/g, ' ') // Reemplazar múltiples espacios con uno solo
				.normalize('NFD') // Descomponer caracteres acentuados
				.replace(/[\u0300-\u036f]/g, ''); // Eliminar diacríticos
		};

		const normalized = normalizeText(specialtyName);
		console.log('[EditConsultationForm] Especialidad original:', specialtyName);
		console.log('[EditConsultationForm] Especialidad normalizada:', normalized);

		// Mapeo de nombres comunes de especialidades en español a códigos internos
		// Las claves están normalizadas (sin tildes, minúsculas) para comparación flexible
		const specialtyMap: Record<string, string | null> = {
			// Ginecología (todas las variaciones normalizadas apuntan a 'gynecology')
			ginecologia: 'gynecology',
			ginecologo: 'gynecology',
			ginecologa: 'gynecology',
			// Cardiología
			cardiologia: 'cardiology',
			cardiologo: 'cardiology',
			cardiologa: 'cardiology',
			// Neumología
			neumologia: 'pulmonology',
			neumologo: 'pulmonology',
			neumologa: 'pulmonology',
			// Neurología
			neurologia: 'neurology',
			neurologo: 'neurology',
			neurologa: 'neurology',
			// Obstetricia
			obstetricia: 'obstetrics',
			obstetra: 'obstetrics',
			obstetrica: 'obstetrics',
			// Nutrición
			nutricion: 'nutrition',
			nutricionista: 'nutrition',
			// Dermatología
			dermatologia: 'dermatology',
			dermatologo: 'dermatology',
			dermatologa: 'dermatology',
			// Psiquiatría
			psiquiatria: 'psychiatry',
			psiquiatra: 'psychiatry',
			// Ortopedia
			ortopedia: 'orthopedics',
			ortopedica: 'orthopedics',
			ortopedico: 'orthopedics',
			// ORL / Otorrino
			orl: 'ent',
			otorrino: 'ent',
			otorrinolaringologia: 'ent',
			otorrinolaringologo: 'ent',
			otorrinolaringologa: 'ent',
			// Endocrinología
			endocrinologia: 'endocrinology',
			endocrinologo: 'endocrinology',
			endocrinologa: 'endocrinology',
			// Oftalmología
			oftalmologia: 'ophthalmology',
			oftalmologo: 'ophthalmology',
			oftalmologa: 'ophthalmology',
			// Medicina General (no tiene código interno, se mostrarán todas las especialidades)
			'medicina general': null,
		};

		// Normalizar todas las claves del mapa para comparación
		const normalizedMap: Record<string, string | null> = {};
		for (const [key, value] of Object.entries(specialtyMap)) {
			normalizedMap[normalizeText(key)] = value;
		}

		// Buscar coincidencia exacta primero
		const exactMatch = normalizedMap[normalized];
		if (exactMatch !== undefined) {
			console.log('[EditConsultationForm] Coincidencia exacta encontrada:', normalized, '->', exactMatch);
			return exactMatch; // Puede ser string o null
		}

		// Buscar coincidencia parcial (el nombre contiene la clave o viceversa)
		// Priorizar coincidencias más largas para evitar falsos positivos
		const matches: Array<{ key: string; value: string | null; length: number }> = [];
		for (const [key, value] of Object.entries(normalizedMap)) {
			if (normalized.includes(key) || key.includes(normalized)) {
				matches.push({ key, value, length: key.length });
			}
		}

		if (matches.length > 0) {
			// Ordenar por longitud descendente para priorizar coincidencias más específicas
			matches.sort((a, b) => b.length - a.length);
			const bestMatch = matches[0];
			console.log('[EditConsultationForm] Coincidencia parcial encontrada:', bestMatch.key, '->', bestMatch.value);
			return bestMatch.value;
		}

		// Si no se encuentra coincidencia, retornar null (se mostrarán todas las especialidades)
		console.warn('[EditConsultationForm] No se encontró coincidencia para:', normalized);
		console.log('[EditConsultationForm] Claves disponibles en el mapa normalizado:', Object.keys(normalizedMap));
		return null;
	};

	// Obtener el código de especialidad del doctor
	const doctorSpecialtyCode = mapSpecialtyNameToCode(doctorSpecialty);

	// Log para debugging
	console.log('[EditConsultationForm] Especialidad del doctor:', doctorSpecialty);
	console.log('[EditConsultationForm] Código de especialidad mapeado:', doctorSpecialtyCode);

	// Función para verificar si una especialidad debe mostrarse
	const shouldShowSpecialty = (specialtyCode: string): boolean => {
		// Si no hay especialidad del doctor, mostrar todas
		if (!doctorSpecialtyCode) {
			console.log(`[EditConsultationForm] shouldShowSpecialty(${specialtyCode}): true (sin especialidad del doctor)`);
			return true;
		}
		// Si hay especialidad del doctor, solo mostrar esa
		const shouldShow = specialtyCode === doctorSpecialtyCode;
		console.log(`[EditConsultationForm] shouldShowSpecialty(${specialtyCode}): ${shouldShow} (doctorSpecialtyCode: ${doctorSpecialtyCode})`);
		return shouldShow;
	};

	// Core
	const [chiefComplaint, setChiefComplaint] = useState(initial.chief_complaint ?? '');
	const [diagnosis, setDiagnosis] = useState(initial.diagnosis ?? '');
	const [icd11Code, setIcd11Code] = useState<string>(initial.icd11_code ?? '');
	const [icd11Title, setIcd11Title] = useState<string>(initial.icd11_title ?? '');
	const [notes, setNotes] = useState(initial.notes ?? '');
	const [startedAt, setStartedAt] = useState(initial.started_at ? toLocalDateTime(initial.started_at) : toLocalDateTime(initial.created_at));
	const [endedAt, setEndedAt] = useState(initial.ended_at ? toLocalDateTime(initial.ended_at) : '');

	// Información General del Paciente
	const [patientFirstName, setPatientFirstName] = useState('');
	const [patientLastName, setPatientLastName] = useState('');
	const [patientIdentifier, setPatientIdentifier] = useState('');
	const [patientDob, setPatientDob] = useState('');
	const [patientAge, setPatientAge] = useState<number | null>(null);
	const [patientPhone, setPatientPhone] = useState('');
	const [patientAddress, setPatientAddress] = useState('');
	const [patientProfession, setPatientProfession] = useState('');
	const [patientBloodType, setPatientBloodType] = useState('');
	const [patientAllergies, setPatientAllergies] = useState('');
	const [patientChronicConditions, setPatientChronicConditions] = useState('');
	const [patientCurrentMedications, setPatientCurrentMedications] = useState('');
	const [patientFamilyHistory, setPatientFamilyHistory] = useState('');

	// Report generation
	const [reportContent, setReportContent] = useState('');
	const [generatingReport, setGeneratingReport] = useState(false);
	const [reportError, setReportError] = useState<string | null>(null);
	const [reportSuccess, setReportSuccess] = useState<string | null>(null);
	const [reportUrl, setReportUrl] = useState<string | null>((initial as any).report_url || null);
	const [fontFamily, setFontFamily] = useState<string>('Arial');
	const [savingFont, setSavingFont] = useState(false);

	// Fuentes profesionales disponibles (no similares a Times New Roman)
	const availableFonts = [
		{ value: 'Arial', label: 'Arial' },
		{ value: 'Calibri', label: 'Calibri' },
		{ value: 'Georgia', label: 'Georgia' },
		{ value: 'Cambria', label: 'Cambria' },
		{ value: 'Garamond', label: 'Garamond' },
	];

	// UI State
	const [activeTab, setActiveTab] = useState<'main' | 'vitals' | 'specialty' | 'report'>('main');
	const [showColposcopySection, setShowColposcopySection] = useState(false);

	// init grouped vitals from initial.vitals
	const initVitals = (initial.vitals ?? {}) as Record<string, any>;

	// Inicializar expandedSpecialties con la especialidad del doctor
	// Solo expandir automáticamente la especialidad del doctor y 'general'
	// Las demás especialidades solo se validarán si el usuario las expande manualmente
	const initialExpandedSpecialties = useMemo(() => {
		const specialties = new Set<string>(['general']);

		// Solo agregar la especialidad del doctor si existe
		if (doctorSpecialtyCode) {
			specialties.add(doctorSpecialtyCode);
		}

		return specialties;
	}, [doctorSpecialtyCode]);

	const [expandedSpecialties, setExpandedSpecialties] = useState<Set<string>>(initialExpandedSpecialties);

	// Función para calcular la edad a partir de la fecha de nacimiento
	const calculateAge = (dob: string | Date | null | undefined): number | null => {
		if (!dob) return null;
		try {
			const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
			if (isNaN(birthDate.getTime())) return null;
			const today = new Date();
			let age = today.getFullYear() - birthDate.getFullYear();
			const monthDiff = today.getMonth() - birthDate.getMonth();
			if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
				age--;
			}
			return age;
		} catch {
			return null;
		}
	};

	// Función para convertir fecha a formato input date (YYYY-MM-DD)
	const toDateInput = (date: string | Date | null | undefined): string => {
		if (!date) return '';
		try {
			const d = typeof date === 'string' ? new Date(date) : date;
			if (isNaN(d.getTime())) return '';
			const yyyy = d.getFullYear();
			const mm = String(d.getMonth() + 1).padStart(2, '0');
			const dd = String(d.getDate()).padStart(2, '0');
			return `${yyyy}-${mm}-${dd}`;
		} catch {
			return '';
		}
	};

	// Cargar datos del paciente cuando cambie el prop
	useEffect(() => {
		if (!patient) return;

		const isUnregistered = (patient as any).isUnregistered;

		if (isUnregistered) {
			// Paciente no registrado
			setPatientFirstName(patient.firstName || patient.first_name || '');
			setPatientLastName(patient.lastName || patient.last_name || '');
			setPatientIdentifier(patient.identification || patient.identifier || '');
			const dob = patient.birth_date || patient.dob;
			setPatientDob(toDateInput(dob));
			setPatientAge(calculateAge(dob));
			setPatientPhone(patient.phone || '');
			setPatientAddress(patient.address || '');
			setPatientProfession(patient.profession || '');
			setPatientAllergies(patient.allergies || '');
			setPatientChronicConditions(patient.chronicConditions || patient.chronic_conditions || '');
			setPatientCurrentMedications(patient.currentMedication || patient.current_medication || '');
			setPatientFamilyHistory(patient.familyHistory || patient.family_history || '');
		} else {
			// Paciente registrado
			setPatientFirstName(patient.firstName || '');
			setPatientLastName(patient.lastName || '');
			setPatientIdentifier(patient.identifier || '');
			setPatientDob(toDateInput(patient.dob));
			setPatientAge(calculateAge(patient.dob));
			setPatientPhone(patient.phone || '');
			setPatientAddress(patient.address || '');
			setPatientProfession(patient.profession || '');
			setPatientBloodType(patient.bloodType || patient.blood_type || '');
			setPatientAllergies(patient.allergies || '');
			setPatientChronicConditions(patient.chronicConditions || '');
			setPatientCurrentMedications(patient.currentMedications || '');
		}
	}, [patient]);

	// Actualizar edad cuando cambie la fecha de nacimiento
	useEffect(() => {
		if (patientDob) {
			const age = calculateAge(patientDob);
			setPatientAge(age);
		} else {
			setPatientAge(null);
		}
	}, [patientDob]);
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
	const [gynDiagnosis, setGynDiagnosis] = useState<string>(initGyn.diagnosis ?? '');
	const [cervicalExamNotes, setCervicalExamNotes] = useState<string>(initGyn.cervical_exam ?? '');

	// Campos adicionales de la plantilla de ginecología
	const [currentIllnessHistory, setCurrentIllnessHistory] = useState<string>(initGyn.current_illness_history ?? '');
	const [allergies, setAllergies] = useState<string>(initGyn.allergies ?? 'NIEGA');
	const [surgicalHistory, setSurgicalHistory] = useState<string>(initGyn.surgical_history ?? 'NIEGA');
	const [familyHistoryMother, setFamilyHistoryMother] = useState<string>(initGyn.family_history_mother ?? 'VIVA SANA');
	const [familyHistoryFather, setFamilyHistoryFather] = useState<string>(initGyn.family_history_father ?? 'VIVO SANO');
	const [familyHistoryBreastCancer, setFamilyHistoryBreastCancer] = useState<string>(initGyn.family_history_breast_cancer ?? 'NIEGA');
	const [its, setIts] = useState<string>(initGyn.its ?? 'NIEGA');
	const [menstruationType, setMenstruationType] = useState<string>(initGyn.menstruation_type ?? 'REGULARES');
	const [menstruationPattern, setMenstruationPattern] = useState<string>(initGyn.menstruation_pattern ?? '');
	const [dysmenorrhea, setDysmenorrhea] = useState<string>(initGyn.dysmenorrhea ?? 'NO');
	const [firstSexualRelation, setFirstSexualRelation] = useState<string>(initGyn.first_sexual_relation ?? '');
	const [sexualPartners, setSexualPartners] = useState<string>(initGyn.sexual_partners ?? '');
	const [generalConditions, setGeneralConditions] = useState<string>(initGyn.general_conditions ?? 'ESTABLES');
	const [breastSize, setBreastSize] = useState<string>(initGyn.breast_size ?? 'MEDIANO TAMAÑO');
	const [breastSymmetry, setBreastSymmetry] = useState<string>(initGyn.breast_symmetry ?? 'ASIMÉTRICAS');
	const [breastCap, setBreastCap] = useState<string>(initGyn.breast_cap ?? 'SIN ALTERACIONES');
	const [breastSecretion, setBreastSecretion] = useState<string>(initGyn.breast_secretion ?? 'NO SE EVIDENCIA SALIDA DE SECRECIÓN');
	const [axillaryFossae, setAxillaryFossae] = useState<string>(initGyn.axillary_fossae ?? 'LIBRES');
	const [abdomen, setAbdomen] = useState<string>(initGyn.abdomen ?? 'BLANDO, DEPRIMIBLE NO DOLOROSO A LA PALPACIÓN');
	const [externalGenitals, setExternalGenitals] = useState<string>(initGyn.external_genitals ?? 'NORMOCONFIGURADOS');
	const [vaginalDischarge, setVaginalDischarge] = useState<string>(initGyn.vaginal_discharge ?? 'sin secreciones');
	const [speculumCervix, setSpeculumCervix] = useState<string>(initGyn.speculum_cervix ?? 'CUELLO MACROSCÓPICAMENTE SANO');
	const [tactCervix, setTactCervix] = useState<string>(initGyn.tact_cervix ?? 'CUELLO RENITENTE NO DOLOROSO A LA MOVILIZACIÓN');
	const [fundusSacs, setFundusSacs] = useState<string>(initGyn.fundus_sacs ?? 'LIBRES');
	const [adnexa, setAdnexa] = useState<string>(initGyn.adnexa ?? 'NO PALPABLES');
	const [hinselmannTest, setHinselmannTest] = useState<string>(initGyn.hinselmann_test ?? 'NEGATIVO');
	const [schillerTest, setSchillerTest] = useState<string>(initGyn.schiller_test ?? 'NEGATIVO');
	const [uterusDimensions, setUterusDimensions] = useState<string>(initGyn.uterus_dimensions ?? '');
	const [endometrialInterface, setEndometrialInterface] = useState<string>(initGyn.endometrial_interface ?? '');
	const [endometrialInterfaceType, setEndometrialInterfaceType] = useState<string>(initGyn.endometrial_interface_type ?? '');
	const [endometrialInterfacePhase, setEndometrialInterfacePhase] = useState<string>(initGyn.endometrial_interface_phase ?? '');
	const [leftOvaryDimensions, setLeftOvaryDimensions] = useState<string>(initGyn.left_ovary_dimensions ?? '');
	const [rightOvaryDimensions, setRightOvaryDimensions] = useState<string>(initGyn.right_ovary_dimensions ?? '');
	const [fundusFluid, setFundusFluid] = useState<string>(initGyn.fundus_fluid ?? 'NO SE EVIDENCIA LÍQUIDO EN FONDO DE SACO');
	const [ho, setHo] = useState<string>(initGyn.ho ?? '');

	/* -------------------------
     Colposcopia - Estados
     ------------------------- */
	const initColposcopy = initGyn.colposcopy ?? {};
	const [colposcopyAcetic5, setColposcopyAcetic5] = useState<string>(initColposcopy.acetic_5 ?? 'SATISFACTORIO');
	const [colposcopyEctocervix, setColposcopyEctocervix] = useState<string>(initColposcopy.ectocervix ?? '');
	const [colposcopyType, setColposcopyType] = useState<string>(initColposcopy.type ?? 'ALTERADA');
	const [colposcopyExtension, setColposcopyExtension] = useState<string>(initColposcopy.extension ?? '');
	const [colposcopyDescription, setColposcopyDescription] = useState<string>(initColposcopy.description ?? '');
	const [colposcopyLocation, setColposcopyLocation] = useState<string>(initColposcopy.location ?? '');
	const [colposcopyAcetowhite, setColposcopyAcetowhite] = useState<string>(initColposcopy.acetowhite ?? 'Negativo');
	const [colposcopyAcetowhiteDetails, setColposcopyAcetowhiteDetails] = useState<string>(initColposcopy.acetowhite_details ?? '');
	const [colposcopyMosaic, setColposcopyMosaic] = useState<string>(initColposcopy.mosaic ?? 'No');
	const [colposcopyPunctation, setColposcopyPunctation] = useState<string>(initColposcopy.punctation ?? 'No');
	const [colposcopyAtypicalVessels, setColposcopyAtypicalVessels] = useState<string>(initColposcopy.atypical_vessels ?? 'No');
	const [colposcopyInvasiveCarcinoma, setColposcopyInvasiveCarcinoma] = useState<string>(initColposcopy.invasive_carcinoma ?? 'No');
	const [colposcopyBorders, setColposcopyBorders] = useState<string>(initColposcopy.borders ?? 'No');
	const [colposcopySituation, setColposcopySituation] = useState<string>(initColposcopy.situation ?? 'No');
	const [colposcopyElevation, setColposcopyElevation] = useState<string>(initColposcopy.elevation ?? 'No');
	const [colposcopyBiopsy, setColposcopyBiopsy] = useState<string>(initColposcopy.biopsy ?? 'No');
	const [colposcopyBiopsyLocation, setColposcopyBiopsyLocation] = useState<string>(initColposcopy.biopsy_location ?? '');
	const [colposcopyLugol, setColposcopyLugol] = useState<string>(initColposcopy.lugol ?? '');

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

	// Sincronizar diagnóstico con CIE-11 cuando se carga la consulta
	useEffect(() => {
		if (icd11Code && icd11Title && !diagnosis) {
			// Si hay CIE-11 pero no hay diagnóstico, establecer el diagnóstico con el CIE-11
			setDiagnosis(`${icd11Code} - ${icd11Title}`);
		} else if (icd11Code && icd11Title && diagnosis && !diagnosis.includes(icd11Code)) {
			// Si hay CIE-11 y diagnóstico pero no coinciden, actualizar el diagnóstico
			setDiagnosis(`${icd11Code} - ${icd11Title}`);
		}
	}, [icd11Code, icd11Title]); // Solo ejecutar cuando cambie el CIE-11

	// Cargar contenido generado automáticamente y fuente cuando se abre la pestaña de informe
	useEffect(() => {
		if (activeTab === 'report') {
			// Cargar contenido generado automáticamente
			if (!reportContent.trim()) {
				const loadGeneratedContent = async () => {
					try {
						const res = await fetch(`/api/consultations/${initial.id}/generate-report-content`, {
							credentials: 'include',
						});
						const data = await res.json();
						if (res.ok && data.content) {
							setReportContent(data.content);
						}
					} catch (err) {
						// Silenciar errores, el usuario puede escribir manualmente
						console.warn('No se pudo cargar contenido generado automáticamente:', err);
					}
				};
				loadGeneratedContent();
			}

			// Cargar fuente seleccionada
			const loadFontFamily = async () => {
				try {
					const res = await fetch('/api/medic/report-template', {
						credentials: 'include',
					});
					const data = await res.json();
					if (res.ok && data.font_family) {
						setFontFamily(data.font_family);
					}
				} catch (err) {
					console.warn('No se pudo cargar la fuente seleccionada:', err);
				}
			};
			loadFontFamily();
		}
	}, [activeTab, initial.id]);

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
		// LMP es obligatorio si hay datos de ginecología, así que siempre lo incluimos
		gyn.last_menstrual_period = lmp || '';
		if (contraceptiveUse) gyn.contraceptive = contraceptiveUse;
		// gynDiagnosis removido - ahora se usa solo el diagnóstico CIE-11
		if (cervicalExamNotes) gyn.cervical_exam = cervicalExamNotes;
		if (currentIllnessHistory) gyn.current_illness_history = currentIllnessHistory;
		if (allergies) gyn.allergies = allergies;
		if (surgicalHistory) gyn.surgical_history = surgicalHistory;
		if (familyHistoryMother) gyn.family_history_mother = familyHistoryMother;
		if (familyHistoryFather) gyn.family_history_father = familyHistoryFather;
		if (familyHistoryBreastCancer) gyn.family_history_breast_cancer = familyHistoryBreastCancer;
		if (its) gyn.its = its;
		if (menstruationType) gyn.menstruation_type = menstruationType;
		if (menstruationPattern) gyn.menstruation_pattern = menstruationPattern;
		if (dysmenorrhea) gyn.dysmenorrhea = dysmenorrhea;
		if (firstSexualRelation) gyn.first_sexual_relation = firstSexualRelation;
		if (sexualPartners) gyn.sexual_partners = sexualPartners;
		if (generalConditions) gyn.general_conditions = generalConditions;
		if (breastSize) gyn.breast_size = breastSize;
		if (breastSymmetry) gyn.breast_symmetry = breastSymmetry;
		if (breastCap) gyn.breast_cap = breastCap;
		if (breastSecretion) gyn.breast_secretion = breastSecretion;
		if (axillaryFossae) gyn.axillary_fossae = axillaryFossae;
		if (abdomen) gyn.abdomen = abdomen;
		if (externalGenitals) gyn.external_genitals = externalGenitals;
		if (vaginalDischarge) gyn.vaginal_discharge = vaginalDischarge;
		if (speculumCervix) gyn.speculum_cervix = speculumCervix;
		if (tactCervix) gyn.tact_cervix = tactCervix;
		if (fundusSacs) gyn.fundus_sacs = fundusSacs;
		if (adnexa) gyn.adnexa = adnexa;
		if (hinselmannTest) gyn.hinselmann_test = hinselmannTest;
		if (schillerTest) gyn.schiller_test = schillerTest;
		if (uterusDimensions) gyn.uterus_dimensions = uterusDimensions;
		if (endometrialInterface) gyn.endometrial_interface = endometrialInterface;
		if (endometrialInterfaceType) gyn.endometrial_interface_type = endometrialInterfaceType;
		if (endometrialInterfacePhase) gyn.endometrial_interface_phase = endometrialInterfacePhase;
		if (leftOvaryDimensions) gyn.left_ovary_dimensions = leftOvaryDimensions;
		if (rightOvaryDimensions) gyn.right_ovary_dimensions = rightOvaryDimensions;
		if (fundusFluid) gyn.fundus_fluid = fundusFluid;
		if (ho) gyn.ho = ho;

		// Datos de colposcopia
		const colposcopy: Record<string, any> = {};
		if (colposcopyAcetic5) colposcopy.acetic_5 = colposcopyAcetic5;
		if (colposcopyEctocervix) colposcopy.ectocervix = colposcopyEctocervix;
		if (colposcopyType) colposcopy.type = colposcopyType;
		if (colposcopyExtension) colposcopy.extension = colposcopyExtension;
		if (colposcopyDescription) colposcopy.description = colposcopyDescription;
		if (colposcopyLocation) colposcopy.location = colposcopyLocation;
		if (colposcopyAcetowhite) colposcopy.acetowhite = colposcopyAcetowhite;
		if (colposcopyAcetowhiteDetails) colposcopy.acetowhite_details = colposcopyAcetowhiteDetails;
		if (colposcopyMosaic) colposcopy.mosaic = colposcopyMosaic;
		if (colposcopyPunctation) colposcopy.punctation = colposcopyPunctation;
		if (colposcopyAtypicalVessels) colposcopy.atypical_vessels = colposcopyAtypicalVessels;
		if (colposcopyInvasiveCarcinoma) colposcopy.invasive_carcinoma = colposcopyInvasiveCarcinoma;
		if (colposcopyBorders) colposcopy.borders = colposcopyBorders;
		if (colposcopySituation) colposcopy.situation = colposcopySituation;
		if (colposcopyElevation) colposcopy.elevation = colposcopyElevation;
		if (colposcopyBiopsy) colposcopy.biopsy = colposcopyBiopsy;
		if (colposcopyBiopsyLocation) colposcopy.biopsy_location = colposcopyBiopsyLocation;
		if (colposcopyLugol) colposcopy.lugol = colposcopyLugol;
		if (Object.keys(colposcopy).length) gyn.colposcopy = colposcopy;

		// Solo agregar ginecología si hay al menos un campo con datos (además del LMP que siempre está)
		const hasGynData = Object.keys(gyn).some((key) => key !== 'last_menstrual_period' && gyn[key] !== '' && gyn[key] !== null && gyn[key] !== undefined);
		if (hasGynData || lmp) out.gynecology = gyn;

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

		// Solo validar especialidades que están expandidas/activas
		for (const [section, reqs] of Object.entries(requiredMap)) {
			const sectKey = section === 'gynecology' ? 'gynecology' : section;

			// Si la especialidad no está expandida, no validarla
			if (!expandedSpecialties.has(sectKey)) {
				continue;
			}

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
		setError(null);
		setSuccess(null);

		try {
			const payload: any = {
				chief_complaint: chiefComplaint || null,
				diagnosis: diagnosis || null,
				icd11_code: icd11Code || null,
				icd11_title: icd11Title || null,
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

			// Actualizar información del paciente si existe
			if (patient) {
				const isUnregistered = (patient as any).isUnregistered;
				const patientUpdatePayload: any = {
					firstName: patientFirstName || null,
					lastName: patientLastName || null,
					identifier: patientIdentifier || null,
					phone: patientPhone || null,
					address: patientAddress || null,
					profession: patientProfession || null,
				};

				// Agregar fecha de nacimiento si está presente
				if (patientDob) {
					if (isUnregistered) {
						patientUpdatePayload.birth_date = patientDob;
					} else {
						patientUpdatePayload.dob = new Date(patientDob).toISOString();
					}
				}

				// Para pacientes registrados, incluir campos adicionales
				if (!isUnregistered) {
					patientUpdatePayload.blood_type = patientBloodType || null;
					patientUpdatePayload.allergies = patientAllergies || null;
					patientUpdatePayload.chronic_conditions = patientChronicConditions || null;
					patientUpdatePayload.current_medication = patientCurrentMedications || null;
				} else {
					// Para pacientes no registrados
					patientUpdatePayload.allergies = patientAllergies || null;
					patientUpdatePayload.chronic_conditions = patientChronicConditions || null;
					patientUpdatePayload.current_medication = patientCurrentMedications || null;
					patientUpdatePayload.family_history = patientFamilyHistory || null;
				}

				// Remover campos undefined
				Object.keys(patientUpdatePayload).forEach((key) => {
					if (patientUpdatePayload[key] === undefined) {
						delete patientUpdatePayload[key];
					}
				});

				const tableName = isUnregistered ? 'unregisteredpatients' : 'Patient';
				const patientId = patient.id;

				// Mapear nombres de campos para unregisteredpatients
				if (isUnregistered) {
					const mappedPayload: any = {};
					if (patientUpdatePayload.firstName !== undefined) mappedPayload.first_name = patientUpdatePayload.firstName;
					if (patientUpdatePayload.lastName !== undefined) mappedPayload.last_name = patientUpdatePayload.lastName;
					if (patientUpdatePayload.identifier !== undefined) mappedPayload.identification = patientUpdatePayload.identifier;
					if (patientUpdatePayload.birth_date !== undefined) mappedPayload.birth_date = patientUpdatePayload.birth_date;
					if (patientUpdatePayload.phone !== undefined) mappedPayload.phone = patientUpdatePayload.phone;
					if (patientUpdatePayload.address !== undefined) mappedPayload.address = patientUpdatePayload.address;
					if (patientUpdatePayload.profession !== undefined) mappedPayload.profession = patientUpdatePayload.profession;
					if (patientUpdatePayload.allergies !== undefined) mappedPayload.allergies = patientUpdatePayload.allergies;
					if (patientUpdatePayload.chronic_conditions !== undefined) mappedPayload.chronic_conditions = patientUpdatePayload.chronic_conditions;
					if (patientUpdatePayload.current_medication !== undefined) mappedPayload.current_medication = patientUpdatePayload.current_medication;
					if (patientUpdatePayload.family_history !== undefined) mappedPayload.family_history = patientUpdatePayload.family_history;
					Object.assign(patientUpdatePayload, mappedPayload);
					delete patientUpdatePayload.firstName;
					delete patientUpdatePayload.lastName;
					delete patientUpdatePayload.identifier;
					delete patientUpdatePayload.dob;
				}

				const patientRes = await fetch(`/api/consultations/${initial.id}/patient`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						patient_id: patientId,
						is_unregistered: isUnregistered,
						...patientUpdatePayload,
					}),
				});

				const patientData = await patientRes.json().catch(() => ({}));
				if (!patientRes.ok) {
					console.warn('Error al actualizar datos del paciente:', patientData?.error || patientData?.message);
					// No lanzar error, solo mostrar advertencia ya que la consulta se guardó correctamente
				}
			}

			setSuccess('Consulta actualizada correctamente.');
			setLoading(false); // Resetear loading después del éxito

			// Cambiar a la sección de "informe médico" después de guardar
			setTimeout(() => {
				setActiveTab('report');
				// Scroll suave hacia la parte superior de la sección de informe
				const reportTab = document.querySelector('[data-tab="report"]');
				if (reportTab) {
					reportTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}
			}, 300);
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
		{ id: 'main', label: 'Información General', icon: ClipboardList },
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
								<button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${isActive ? 'border-teal-600 text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-400' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700/50'}`}>
									<Icon size={18} />
									{tab.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Tab Content */}
				<div className="p-6 space-y-6">
					{/* Main Information Tab - Información General */}
					{activeTab === 'main' && (
						<div className="space-y-6">
							<div className={sectionCard}>
								<h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
									<ClipboardList size={20} />
									Información General del Paciente
								</h2>

								<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
									{/* Motivo de Consulta */}
									<div className="lg:col-span-2">
										<label className={labelClass}>Motivo de Consulta</label>
										<textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} rows={5} className={`${inputBase} ${inputDark} resize-none`} placeholder="Describa el motivo de consulta del paciente..." />
									</div>

									{/* Nombre */}
									<div>
										<label className={labelClass}>Nombre</label>
										<input type="text" value={patientFirstName} onChange={(e) => setPatientFirstName(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Nombre del paciente" />
									</div>

									{/* Apellido */}
									<div>
										<label className={labelClass}>Apellido</label>
										<input type="text" value={patientLastName} onChange={(e) => setPatientLastName(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Apellido del paciente" />
									</div>

									{/* Cédula */}
									<div>
										<label className={labelClass}>Cédula</label>
										<input type="text" value={patientIdentifier} onChange={(e) => setPatientIdentifier(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Número de cédula" />
									</div>

									{/* Fecha de Nacimiento y Edad */}
									<div>
										<label className={labelClass}>Fecha de Nacimiento</label>
										<div className="flex items-center gap-2">
											<input type="date" value={patientDob} onChange={(e) => setPatientDob(e.target.value)} className={`${inputBase} ${inputDark} flex-1`} />
											{patientAge !== null && (
												<div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600">
													<span className="text-sm font-medium text-slate-700 dark:text-slate-300">Edad:</span>
													<span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{patientAge} años</span>
												</div>
											)}
										</div>
									</div>

									{/* Número de Contacto */}
									<div>
										<label className={labelClass}>Número de Contacto</label>
										<input type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Teléfono o celular" />
									</div>

									{/* Dirección */}
									<div className="lg:col-span-2">
										<label className={labelClass}>Dirección</label>
										<textarea value={patientAddress} onChange={(e) => setPatientAddress(e.target.value)} rows={3} className={`${inputBase} ${inputDark} resize-none`} placeholder="Dirección completa del paciente" />
									</div>

									{/* Profesión */}
									<div>
										<label className={labelClass}>Profesión</label>
										<input type="text" value={patientProfession} onChange={(e) => setPatientProfession(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Profesión u ocupación" />
									</div>

									{/* Tipo de Sangre */}
									<div>
										<label className={labelClass}>Tipo de Sangre</label>
										<select value={patientBloodType} onChange={(e) => setPatientBloodType(e.target.value)} className={`${inputBase} ${inputDark}`}>
											<option value="">Seleccionar tipo de sangre</option>
											<option value="A+">A+</option>
											<option value="A-">A-</option>
											<option value="B+">B+</option>
											<option value="B-">B-</option>
											<option value="AB+">AB+</option>
											<option value="AB-">AB-</option>
											<option value="O+">O+</option>
											<option value="O-">O-</option>
										</select>
									</div>

									{/* Alergias */}
									<div className="lg:col-span-2">
										<label className={labelClass}>Alergias</label>
										<textarea value={patientAllergies} onChange={(e) => setPatientAllergies(e.target.value)} rows={3} className={`${inputBase} ${inputDark} resize-none`} placeholder="Lista de alergias conocidas (medicamentos, alimentos, etc.)" />
									</div>

									{/* Condiciones Crónicas */}
									<div className="lg:col-span-2">
										<label className={labelClass}>Condiciones Crónicas</label>
										<textarea value={patientChronicConditions} onChange={(e) => setPatientChronicConditions(e.target.value)} rows={3} className={`${inputBase} ${inputDark} resize-none`} placeholder="Enfermedades o condiciones crónicas del paciente" />
									</div>

									{/* Medicamentos Actuales */}
									<div className="lg:col-span-2">
										<label className={labelClass}>Medicamentos Actuales</label>
										<textarea value={patientCurrentMedications} onChange={(e) => setPatientCurrentMedications(e.target.value)} rows={3} className={`${inputBase} ${inputDark} resize-none`} placeholder="Medicamentos que el paciente está tomando actualmente" />
									</div>

									{/* Historia Familiar (solo para pacientes no registrados) */}
									{(patient as any)?.isUnregistered && (
										<div className="lg:col-span-2">
											<label className={labelClass}>Historia Familiar</label>
											<textarea value={patientFamilyHistory} onChange={(e) => setPatientFamilyHistory(e.target.value)} rows={3} className={`${inputBase} ${inputDark} resize-none`} placeholder="Antecedentes familiares de enfermedades relevantes" />
										</div>
									)}
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
										<input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" min="0" />
										<span className="text-xs text-slate-500 font-medium">kg</span>
									</div>
								</div>

								<div>
									<label className={labelClass}>Talla (cm)</label>
									<div className="flex items-center gap-2">
										<input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" min="0" />
										<span className="text-xs text-slate-500 font-medium">cm</span>
									</div>
								</div>

								<div>
									<label className={labelClass}>IMC (BMI)</label>
									<div className="flex items-center gap-2">
										<input value={bmiOverride || computedBMI} onChange={(e) => setBmiOverride(e.target.value)} placeholder={computedBMI || '—'} className={`${inputBase} ${inputDark}`} type="text" />
										<span className="text-xs text-slate-500 font-medium">kg/m²</span>
									</div>
									<p className="text-xs text-slate-400 mt-1">Calculado automáticamente</p>
								</div>

								<div>
									<label className={labelClass}>Temperatura (°C)</label>
									<div className="flex items-center gap-2">
										<input value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36.8" className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" min="30" max="45" />
										<span className="text-xs text-slate-500 font-medium">°C</span>
									</div>
								</div>

								<div>
									<label className={labelClass}>PA Sistólica</label>
									<input value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} placeholder="120" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" />
								</div>

								<div>
									<label className={labelClass}>PA Diastólica</label>
									<input value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} placeholder="80" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" />
								</div>

								<div>
									<label className={labelClass}>Pulso (bpm)</label>
									<input value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder="72" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" />
								</div>

								<div>
									<label className={labelClass}>Frecuencia Respiratoria</label>
									<input value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} placeholder="16" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" />
								</div>

								<div>
									<label className={labelClass}>SPO₂ (%)</label>
									<input value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="98" className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" step="1" min="0" max="100" />
								</div>

								<div className="sm:col-span-2">
									<label className={labelClass}>Glucosa (mg/dL)</label>
									<div className="flex items-center gap-2">
										<input value={glucose} onChange={(e) => setGlucose(e.target.value)} placeholder="110" className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" min="0" />
										<span className="text-xs text-slate-500 font-medium">mg/dL</span>
									</div>
								</div>

								<div className="sm:col-span-2 lg:col-span-4">
									<label className={labelClass}>Notas de Signos Vitales</label>
									<input value={vitalsNotes} onChange={(e) => setVitalsNotes(e.target.value)} placeholder="Observaciones adicionales sobre los signos vitales..." className={`${inputBase} ${inputDark}`} />
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
								<p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Expande las secciones relevantes para tu especialidad y completa los campos necesarios.</p>

								{/* Cardiology */}
								{shouldShowSpecialty('cardiology') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										<button type="button" onClick={() => toggleSpecialty('cardiology')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
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
								)}

								{/* Pulmonology */}
								{shouldShowSpecialty('pulmonology') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										<button type="button" onClick={() => toggleSpecialty('pulmonology')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
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
								)}

								{/* Neurology */}
								{shouldShowSpecialty('neurology') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										<button type="button" onClick={() => toggleSpecialty('neurology')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
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
								)}

								{/* Obstetrics */}
								{shouldShowSpecialty('obstetrics') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										<button type="button" onClick={() => toggleSpecialty('obstetrics')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
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
								)}

								{/* Nutrition */}
								{shouldShowSpecialty('nutrition') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										<button type="button" onClick={() => toggleSpecialty('nutrition')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
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
								)}

								{/* Dermatology */}
								{shouldShowSpecialty('dermatology') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										<button type="button" onClick={() => toggleSpecialty('dermatology')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
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
								)}

								{/* Psychiatry */}
								{shouldShowSpecialty('psychiatry') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										<button type="button" onClick={() => toggleSpecialty('psychiatry')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
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
								)}

								{/* Orthopedics */}
								{shouldShowSpecialty('orthopedics') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										<button type="button" onClick={() => toggleSpecialty('orthopedics')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
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
								)}

								{/* ENT */}
								{shouldShowSpecialty('ent') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										<button type="button" onClick={() => toggleSpecialty('ent')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
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
								)}

								{/* Gynecology */}
								{shouldShowSpecialty('gynecology') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										<button type="button" onClick={() => toggleSpecialty('gynecology')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
											<span className="font-semibold text-slate-900 dark:text-slate-100">Ginecología</span>
											{expandedSpecialties.has('gynecology') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
										</button>
										{expandedSpecialties.has('gynecology') && (
											<div className="p-4 pt-0 space-y-6">
												{/* Historia de la enfermedad actual */}
												<div>
													<label className={labelClass}>Historia de la enfermedad actual</label>
													<textarea value={currentIllnessHistory} onChange={(e) => setCurrentIllnessHistory(e.target.value)} className={`${inputBase} ${inputDark}`} rows={3} placeholder="Describir la historia de la enfermedad actual" />
												</div>

												{/* Antecedentes Médicos */}
												<div className="border-t border-slate-200 dark:border-slate-700 pt-4">
													<h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Antecedentes Médicos</h4>
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<label className={labelClass}>Alérgicos</label>
															<input value={allergies} onChange={(e) => setAllergies(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="NIEGA o especificar" />
														</div>
														<div>
															<label className={labelClass}>Quirúrgicos</label>
															<input value={surgicalHistory} onChange={(e) => setSurgicalHistory(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="NIEGA o especificar" />
														</div>
													</div>
												</div>

												{/* Antecedentes Familiares */}
												<div className="border-t border-slate-200 dark:border-slate-700 pt-4">
													<h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Antecedentes Familiares</h4>
													<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
														<div>
															<label className={labelClass}>Madre</label>
															<input value={familyHistoryMother} onChange={(e) => setFamilyHistoryMother(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="VIVA SANA o especificar" />
														</div>
														<div>
															<label className={labelClass}>Padre</label>
															<input value={familyHistoryFather} onChange={(e) => setFamilyHistoryFather(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="VIVO SANO o especificar" />
														</div>
														<div>
															<label className={labelClass}>Antecedentes de Cáncer de Mama</label>
															<input value={familyHistoryBreastCancer} onChange={(e) => setFamilyHistoryBreastCancer(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="NIEGA o especificar" />
														</div>
													</div>
												</div>

												{/* Antecedentes Ginecológicos */}
												<div className="border-t border-slate-200 dark:border-slate-700 pt-4">
													<h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Antecedentes Ginecológicos</h4>
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<label className={labelClass}>ITS</label>
															<input value={its} onChange={(e) => setIts(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="NIEGA o especificar" />
														</div>
														<div>
															<label className={labelClass}>Menstruaciones</label>
															<input value={menstruationType} onChange={(e) => setMenstruationType(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="REGULARES o IRREGULARES" />
														</div>
														<div>
															<label className={labelClass}>Tipo de Menstruación (ej: 5/28)</label>
															<input value={menstruationPattern} onChange={(e) => setMenstruationPattern(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="5/28" />
														</div>
														<div>
															<label className={labelClass}>Dismenorreica</label>
															<select value={dysmenorrhea} onChange={(e) => setDysmenorrhea(e.target.value)} className={`${inputBase} ${inputDark}`}>
																<option value="NO">NO</option>
																<option value="SÍ">SÍ</option>
															</select>
														</div>
														<div>
															<label className={labelClass}>PRS (Primera Relación Sexual)</label>
															<input value={firstSexualRelation} onChange={(e) => setFirstSexualRelation(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Edad o fecha" />
														</div>
														<div>
															<label className={labelClass}>PS (Parejas Sexuales)</label>
															<input value={sexualPartners} onChange={(e) => setSexualPartners(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Número" />
														</div>
														<div>
															<label className={labelClass}>Fecha Última Regla (LMP)</label>
															<input value={lmp} onChange={(e) => setLmp(e.target.value)} className={`${inputBase} ${inputDark}`} type="text" placeholder="Ej: 2024-01-15 o Fecha Incierta" />
														</div>
														<div>
															<label className={labelClass}>Método Anticonceptivo</label>
															<input value={contraceptiveUse} onChange={(e) => setContraceptiveUse(e.target.value)} className={`${inputBase} ${inputDark}`} />
														</div>
														<div>
															<label className={labelClass}>Historia obstétrica (HO)</label>
															<input value={ho} onChange={(e) => setHo(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="NIEGA o especificar" />
														</div>
													</div>
												</div>

												{/* Examen Físico */}
												<div className="border-t border-slate-200 dark:border-slate-700 pt-4">
													<h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Examen Físico</h4>
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<label className={labelClass}>Condiciones Generales</label>
															<input value={generalConditions} onChange={(e) => setGeneralConditions(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="ESTABLES" />
														</div>
														<div>
															<label className={labelClass}>Mamas - Tamaño</label>
															<input value={breastSize} onChange={(e) => setBreastSize(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="MEDIANO TAMAÑO" />
														</div>
														<div>
															<label className={labelClass}>Mamas - Simetría</label>
															<input value={breastSymmetry} onChange={(e) => setBreastSymmetry(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="ASIMÉTRICAS" />
														</div>
														<div>
															<label className={labelClass}>Mamas - CAP</label>
															<input value={breastCap} onChange={(e) => setBreastCap(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="SIN ALTERACIONES" />
														</div>
														<div>
															<label className={labelClass}>Mamas - Secreción</label>
															<input value={breastSecretion} onChange={(e) => setBreastSecretion(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="NO SE EVIDENCIA SALIDA DE SECRECIÓN" />
														</div>
														<div>
															<label className={labelClass}>Fosas Axilares y Supraclaviculares</label>
															<input value={axillaryFossae} onChange={(e) => setAxillaryFossae(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="LIBRES" />
														</div>
														<div>
															<label className={labelClass}>Abdomen</label>
															<input value={abdomen} onChange={(e) => setAbdomen(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="BLANDO, DEPRIMIBLE NO DOLOROSO A LA PALPACIÓN" />
														</div>
														<div>
															<label className={labelClass}>Genitales Externos</label>
															<input value={externalGenitals} onChange={(e) => setExternalGenitals(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="NORMOCONFIGURADOS" />
														</div>
														<div>
															<label className={labelClass}>Flujo Vaginal</label>
															<input value={vaginalDischarge} onChange={(e) => setVaginalDischarge(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="sin secreciones" />
														</div>
														<div>
															<label className={labelClass}>Especuloscopio - Cuello</label>
															<input value={speculumCervix} onChange={(e) => setSpeculumCervix(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="CUELLO MACROSCÓPICAMENTE SANO" />
														</div>
														<div>
															<label className={labelClass}>Tacto - Cuello</label>
															<input value={tactCervix} onChange={(e) => setTactCervix(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="CUELLO RENITENTE NO DOLOROSO A LA MOVILIZACIÓN" />
														</div>
														<div>
															<label className={labelClass}>Fondo de Sacos</label>
															<input value={fundusSacs} onChange={(e) => setFundusSacs(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="LIBRES" />
														</div>
														<div>
															<label className={labelClass}>Anexos</label>
															<input value={adnexa} onChange={(e) => setAdnexa(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="NO PALPABLES" />
														</div>
													</div>
												</div>

												{/* Ecografía Transvaginal */}
												<div className="border-t border-slate-200 dark:border-slate-700 pt-4">
													<h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Ecografía Transvaginal</h4>
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<label className={labelClass}>Útero - Dimensiones (ej: 74X34X50 MM)</label>
															<input value={uterusDimensions} onChange={(e) => setUterusDimensions(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="74X34X50 MM" />
														</div>
														<div>
															<label className={labelClass}>Interfase Endometrial (mm)</label>
															<input value={endometrialInterface} onChange={(e) => setEndometrialInterface(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="7 MM" type="number" step="0.1" />
														</div>
														<div>
															<label className={labelClass}>Tipo de Interfase Endometrial</label>
															<select value={endometrialInterfaceType} onChange={(e) => setEndometrialInterfaceType(e.target.value)} className={`${inputBase} ${inputDark}`}>
																<option value="">Seleccionar...</option>
																<option value="proliferativo">proliferativo</option>
																<option value="secretor">secretor</option>
																<option value="trilaminar">trilaminar</option>
																<option value="lineal">lineal</option>
															</select>
														</div>
														<div>
															<label className={labelClass}>Ecografía transvaginal interfase endometrial</label>
															<select value={endometrialInterfacePhase} onChange={(e) => setEndometrialInterfacePhase(e.target.value)} className={`${inputBase} ${inputDark}`}>
																<option value="">Seleccionar...</option>
																<option value="Menstrual: Día 1 - 4">Menstrual: Día 1 - 4</option>
																<option value="Proliferativa Temprana: Día 5 - 13">Proliferativa Temprana: Día 5 - 13</option>
																<option value="Proliferativa Tardía: Día 14 - 16">Proliferativa Tardía: Día 14 - 16</option>
																<option value="Secretora: Día 16 - 28">Secretora: Día 16 - 28</option>
															</select>
														</div>
														<div>
															<label className={labelClass}>Ovario Izquierdo - Dimensiones (ej: 23X17X29 MM)</label>
															<input value={leftOvaryDimensions} onChange={(e) => setLeftOvaryDimensions(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="23X17X29 MM" />
														</div>
														<div>
															<label className={labelClass}>Ovario Derecho - Dimensiones (ej: 26X19X20 MM)</label>
															<input value={rightOvaryDimensions} onChange={(e) => setRightOvaryDimensions(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="26X19X20 MM" />
														</div>
														<div>
															<label className={labelClass}>Líquido en Fondo de Saco</label>
															<input value={fundusFluid} onChange={(e) => setFundusFluid(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="NO SE EVIDENCIA LÍQUIDO EN FONDO DE SACO" />
														</div>
													</div>
												</div>

												{/* Diagnóstico con CIE-11 */}
												<div className="border-t border-slate-200 dark:border-slate-700 pt-4">
													<label className={labelClass}>Diagnóstico (CIE-11)</label>
													<ICD11Search
														onSelect={(code) => {
															setIcd11Code(code.code);
															setIcd11Title(code.title);
															// Guardar el código y título del CIE-11 como diagnóstico
															setDiagnosis(`${code.code} - ${code.title}`);
														}}
														selectedCode={icd11Code && icd11Title ? { code: icd11Code, title: icd11Title } : null}
														placeholder="Buscar código CIE-11 (ej: diabetes, hipertensión...)"
														className="mb-3"
													/>
													{icd11Code && icd11Title && (
														<p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
															<strong>Código CIE-11 seleccionado:</strong> {icd11Code} - {icd11Title}
														</p>
													)}
												</div>

												{/* Observaciones Adicionales */}
												<div className="border-t border-slate-200 dark:border-slate-700 pt-4">
													<label className={labelClass}>Observaciones Adicionales</label>
													<textarea value={cervicalExamNotes} onChange={(e) => setCervicalExamNotes(e.target.value)} className={`${inputBase} ${inputDark}`} rows={3} placeholder="Observaciones adicionales del examen cervical" />
												</div>

												{/* Botón para mostrar formulario de Colposcopia */}
												<div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex justify-end">
													<button type="button" onClick={() => setShowColposcopySection(!showColposcopySection)} className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2">
														{showColposcopySection ? 'Ocultar' : 'Siguiente'} - Colposcopia
														{showColposcopySection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
													</button>
												</div>

												{/* Sección de Colposcopia */}
												{showColposcopySection && (
													<div className="border-t-2 border-teal-500 dark:border-teal-400 pt-6 mt-6">
														{/* Header de la Sección */}
														<div className="mb-6">
															<h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
																<div className="w-1 h-6 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full"></div>
																Informe Colposcópico
															</h3>
															<p className="text-sm text-slate-600 dark:text-slate-400 ml-3">Complete todos los campos del examen colposcópico según los hallazgos observados</p>
														</div>

														<div className="space-y-8">
															{/* Sección 1: Información General y Preparación */}
															<div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/30 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
																<h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
																	<div className="w-2 h-2 bg-teal-500 rounded-full"></div>
																	Información General
																</h4>
																<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																	<div>
																		<label className={labelClass}>Colposcopia Acetico 5%</label>
																		<select value={colposcopyAcetic5} onChange={(e) => setColposcopyAcetic5(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="SATISFACTORIO">SATISFACTORIO</option>
																			<option value="NO SATISFACTORIO">NO SATISFACTORIO</option>
																			<option value="NORMAL">NORMAL</option>
																		</select>
																	</div>
																	<div>
																		<label className={labelClass}>I. localizada en ectocérvix, totalmente visible</label>
																		<select value={colposcopyEctocervix} onChange={(e) => setColposcopyEctocervix(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="">Seleccionar...</option>
																			<option value="I. localizada en ectocérvix, totalmente visible.">I. localizada en ectocérvix, totalmente visible.</option>
																			<option value="II. Con un componente endocervical totalmente visible.">II. Con un componente endocervical totalmente visible.</option>
																			<option value="III. Sin evidencia de lesiones">III. Sin evidencia de lesiones</option>
																		</select>
																	</div>
																</div>
															</div>

															{/* Sección 2: Resultado de la Colposcopia */}
															<div className="bg-gradient-to-br from-blue-50 to-cyan-50/50 dark:from-blue-900/20 dark:to-cyan-900/10 rounded-xl p-6 border border-blue-200 dark:border-blue-800 shadow-sm">
																<h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
																	<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
																	Resultado de la Colposcopia
																</h4>
																<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																	<div>
																		<label className={labelClass}>COLPOSCOPIA</label>
																		<select
																			value={colposcopyType}
																			onChange={(e) => {
																				setColposcopyType(e.target.value);
																				if (e.target.value === 'NORMAL') {
																					setColposcopyExtension('');
																				}
																			}}
																			className={`${inputBase} ${inputDark}`}>
																			<option value="ALTERADA">ALTERADA</option>
																			<option value="NORMAL">NORMAL</option>
																		</select>
																	</div>
																	{colposcopyType === 'ALTERADA' && (
																		<div>
																			<label className={labelClass}>EXTENSIÓN</label>
																			<select value={colposcopyExtension} onChange={(e) => setColposcopyExtension(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar extensión</option>
																				<option value="Extensión < 25%">Extensión &lt; 25%</option>
																				<option value="Extensión 25-50%">Extensión 25-50%</option>
																				<option value="Extensión 50-75%">Extensión 50-75%</option>
																				<option value="Extensión > 75%">Extensión &gt; 75%</option>
																			</select>
																		</div>
																	)}
																</div>
																<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
																	<div>
																		<label className={labelClass}>Descripción</label>
																		<select value={colposcopyDescription} onChange={(e) => setColposcopyDescription(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="">Seleccionar descripción</option>
																			<option value="NORMAL">NORMAL</option>
																			<option value="CAMBIOS MENORES">CAMBIOS MENORES</option>
																			<option value="CAMBIOS MAYORES">CAMBIOS MAYORES</option>
																		</select>
																	</div>
																	<div>
																		<label className={labelClass}>Localización</label>
																		<input value={colposcopyLocation} onChange={(e) => setColposcopyLocation(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Especificar localización..." />
																	</div>
																</div>
															</div>

															{/* Sección 3: Hallazgos del Epitelio Acetoblanco */}
															<div className="bg-gradient-to-br from-purple-50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/10 rounded-xl p-6 border border-purple-200 dark:border-purple-800 shadow-sm">
																<h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
																	<div className="w-2 h-2 bg-purple-500 rounded-full"></div>
																	Epitelio Acetoblanco
																</h4>
																<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																	<div>
																		<label className={labelClass}>Epitelio acetoblanco</label>
																		<select value={colposcopyAcetowhite} onChange={(e) => setColposcopyAcetowhite(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="Negativo">Negativo</option>
																			<option value="Tenue">Tenue</option>
																			<option value="Denso">Denso</option>
																		</select>
																	</div>
																	<div>
																		<label className={labelClass}>Detalles del Epitelio Acetoblanco</label>
																		<select value={colposcopyAcetowhiteDetails} onChange={(e) => setColposcopyAcetowhiteDetails(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="">Seleccionar opción</option>
																			<option value="Que aparece rápido y desaparece lento, blanco ostraceo">Que aparece rápido y desaparece lento, blanco ostraceo</option>
																			<option value="Cambió acetoblanco débil que aparece TARDE y desaparece pronto">Cambió acetoblanco débil que aparece TARDE y desaparece pronto</option>
																			<option value="Glandular acetoblanco denso sobre epitelio columnar">Glandular acetoblanco denso sobre epitelio columnar</option>
																			<option value="Imagen de blanco sobre blanco, borde interno">Imagen de blanco sobre blanco, borde interno</option>
																			<option value="SIN CAMBIOS ACENTOBLANCO">SIN CAMBIOS ACENTOBLANCO</option>
																		</select>
																	</div>
																</div>
															</div>

															{/* Sección 4: Patrones de Vascularización */}
															<div className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/10 rounded-xl p-6 border border-amber-200 dark:border-amber-800 shadow-sm">
																<h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
																	<div className="w-2 h-2 bg-amber-500 rounded-full"></div>
																	Patrones
																</h4>
																<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
																	<div>
																		<label className={labelClass}>MOSAICO</label>
																		<select value={colposcopyMosaic} onChange={(e) => setColposcopyMosaic(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="No">No</option>
																			<option value="Fino">Fino</option>
																			<option value="Grueso">Grueso</option>
																			<option value="Mosaico ancho con losetas de distintos tamaños">Mosaico ancho con losetas de distintos tamaños</option>
																		</select>
																	</div>
																	<div>
																		<label className={labelClass}>PUNTEADO</label>
																		<select value={colposcopyPunctation} onChange={(e) => setColposcopyPunctation(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="No">No</option>
																			<option value="Fino">Fino</option>
																			<option value="Grueso">Grueso</option>
																		</select>
																	</div>
																	<div>
																		<label className={labelClass}>VASOS ATÍPICOS</label>
																		<select value={colposcopyAtypicalVessels} onChange={(e) => setColposcopyAtypicalVessels(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="No">No</option>
																			<option value="Stops">Stops</option>
																			<option value="Horquilla">Horquilla</option>
																			<option value="Brusco cambio">Brusco cambio</option>
																			<option value="Vasos de distintos calibres">Vasos de distintos calibres</option>
																			<option value="Dilataciones">Dilataciones</option>
																		</select>
																	</div>
																</div>
															</div>

															{/* Sección 5: Características de la Lesión */}
															<div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/10 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800 shadow-sm">
																<h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
																	<div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
																	Características de la Lesión
																</h4>
																<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
																	<div>
																		<label className={labelClass}>Sugestiva de carcinoma invasivo</label>
																		<select value={colposcopyInvasiveCarcinoma} onChange={(e) => setColposcopyInvasiveCarcinoma(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="No">No</option>
																			<option value="Ulceración">Ulceración</option>
																			<option value="Otros">Otros</option>
																		</select>
																	</div>
																	<div>
																		<label className={labelClass}>BORDES</label>
																		<select value={colposcopyBorders} onChange={(e) => setColposcopyBorders(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="No">No</option>
																			<option value="Irregular">Irregular</option>
																			<option value="Regular">Regular</option>
																		</select>
																	</div>
																	<div>
																		<label className={labelClass}>SITUACIÓN</label>
																		<select value={colposcopySituation} onChange={(e) => setColposcopySituation(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="No">No</option>
																			<option value="Central">Central</option>
																			<option value="Periférica">Periférica</option>
																		</select>
																	</div>
																	<div>
																		<label className={labelClass}>ELEVACIÓN</label>
																		<select value={colposcopyElevation} onChange={(e) => setColposcopyElevation(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="No">No</option>
																			<option value="Plano">Plano</option>
																			<option value="Sobrelevado">Sobrelevado</option>
																		</select>
																	</div>
																</div>
															</div>

															{/* Sección 6: Pruebas Complementarias y Biopsia */}
															<div className="bg-gradient-to-br from-indigo-50 to-violet-50/50 dark:from-indigo-900/20 dark:to-violet-900/10 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800 shadow-sm">
																<h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
																	<div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
																	Pruebas Complementarias y Biopsia
																</h4>
																<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
																	<div className="space-y-4">
																		<div>
																			<label className={labelClass}>Test de Hinselmann</label>
																			<select value={hinselmannTest} onChange={(e) => setHinselmannTest(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="NEGATIVO">NEGATIVO</option>
																				<option value="POSITIVO">POSITIVO</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>LUGOL (Test Schiller)</label>
																			<select value={colposcopyLugol} onChange={(e) => setColposcopyLugol(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar opción</option>
																				<option value="IODOPOSITIVO">IODOPOSITIVO</option>
																				<option value="IODO PARCIALMENTE NEGATIVO (positividad débil, parcialmente moteado)">IODO PARCIALMENTE NEGATIVO (positividad débil, parcialmente moteado)</option>
																				<option value="IODONEGATIVO (amarillo mostaza sobre epitelio acetoblanco)">IODONEGATIVO (amarillo mostaza sobre epitelio acetoblanco)</option>
																				<option value="NO">NO</option>
																			</select>
																		</div>
																	</div>
																	<div className="space-y-4">
																		<div>
																			<label className={labelClass}>TOMA DE BIOPSIA</label>
																			<select value={colposcopyBiopsy} onChange={(e) => setColposcopyBiopsy(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="No">No</option>
																				<option value="Si">Si</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>LOCALIZACIÓN (Biopsia)</label>
																			<input value={colposcopyBiopsyLocation} onChange={(e) => setColposcopyBiopsyLocation(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Especificar localización de la biopsia..." disabled={colposcopyBiopsy === 'No'} />
																		</div>
																	</div>
																</div>
															</div>
														</div>
													</div>
												)}
											</div>
										)}
									</div>
								)}

								{/* Endocrinology */}
								{shouldShowSpecialty('endocrinology') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										<button type="button" onClick={() => toggleSpecialty('endocrinology')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
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
								)}

								{/* Ophthalmology */}
								{shouldShowSpecialty('ophthalmology') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										<button type="button" onClick={() => toggleSpecialty('ophthalmology')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
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
								)}
							</div>
						</div>
					)}

					{/* Report Generation Tab */}
					{activeTab === 'report' && (
						<div className={sectionCard} data-tab="report">
							<div className="flex items-center justify-between mb-6">
								<h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
									<FileCheck size={20} />
									Generar Informe Médico
								</h2>
								{reportUrl && (
									<a href={reportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
										<Download size={16} />
										Descargar Informe
									</a>
								)}
							</div>

							<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
								<p className="text-sm text-blue-800 dark:text-blue-200">
									<strong>Instrucciones:</strong> El contenido del informe se genera automáticamente desde la plantilla de texto configurada. Puedes revisar y editar el contenido antes de generar el informe. El contenido se insertará en el marcador <code className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded font-mono text-xs">{'{{contenido}}'}</code> de tu plantilla Word.
								</p>
							</div>

							<div className="space-y-4">
								{/* Selector de Fuente */}
								<div>
									<label className={labelClass}>Fuente del Informe</label>
									<div className="flex items-center gap-3">
										<select
											value={fontFamily}
											onChange={async (e) => {
												const newFont = e.target.value;
												const previousFont = fontFamily; // Guardar valor anterior
												setFontFamily(newFont);
												setSavingFont(true);
												setReportError(null);
												setReportSuccess(null);

												try {
													const res = await fetch('/api/medic/report-template', {
														method: 'PUT',
														credentials: 'include',
														headers: {
															'Content-Type': 'application/json',
														},
														body: JSON.stringify({ font_family: newFont }),
													});

													const data = await res.json();
													if (res.ok) {
														setReportSuccess(`Fuente cambiada a ${newFont}. Se aplicará al generar el informe.`);
													} else {
														setReportError(data.error || 'Error al guardar la fuente');
														// Revertir al valor anterior
														setFontFamily(previousFont);
													}
												} catch (err: any) {
													setReportError(err.message || 'Error al guardar la fuente');
													// Revertir al valor anterior
													setFontFamily(previousFont);
												} finally {
													setSavingFont(false);
												}
											}}
											disabled={savingFont}
											className={`${inputBase} ${inputDark} flex-1`}
											style={{ fontFamily: fontFamily }}>
											{availableFonts.map((font) => (
												<option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
													{font.label}
												</option>
											))}
										</select>
										{savingFont && <Loader2 className="w-5 h-5 animate-spin text-slate-500" />}
									</div>
									<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">La fuente seleccionada se aplicará automáticamente al generar el informe.</p>
								</div>

								<div className="flex items-center justify-between">
									<label className={labelClass}>Contenido del Informe</label>
									<button
										type="button"
										onClick={async () => {
											try {
												const res = await fetch(`/api/consultations/${initial.id}/generate-report-content`, {
													credentials: 'include',
												});
												const data = await res.json();
												if (res.ok && data.content) {
													setReportContent(data.content);
													setReportSuccess('Contenido generado automáticamente desde la plantilla');
												} else {
													setReportError(data.error || 'Error al generar contenido automáticamente');
												}
											} catch (err: any) {
												setReportError(err.message || 'Error al generar contenido automáticamente');
											}
										}}
										className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
										🔄 Generar Automáticamente
									</button>
								</div>
								<textarea value={reportContent} onChange={(e) => setReportContent(e.target.value)} rows={16} className={`${inputBase} ${inputDark} resize-none font-mono text-sm`} placeholder="El contenido se generará automáticamente desde la plantilla de texto. Haz clic en 'Generar Automáticamente' o escribe el contenido manualmente..." />

								{reportError && <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 text-sm">{reportError}</div>}

								{reportSuccess && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-4 text-sm">{reportSuccess}</div>}

								<button type="button" onClick={handleGenerateReport} disabled={generatingReport || !reportContent.trim()} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
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
					{error && <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 whitespace-pre-line text-sm">{error}</div>}
					{success && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-4 text-sm">{success}</div>}

					{/* Action Buttons */}
					<div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
						<div className="flex items-center gap-3">
							<button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50">
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

							<button type="button" onClick={() => router.push(`/dashboard/medic/consultas/${initial.id}`)} className="px-5 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium">
								Cancelar
							</button>
						</div>

						<button type="button" onClick={handleDelete} className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-rose-600 text-white font-medium shadow-lg hover:bg-rose-700 hover:shadow-xl transition-all">
							<Trash2 size={16} />
							Eliminar
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
