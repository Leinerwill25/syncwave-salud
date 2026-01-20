'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Trash2, FileText, Download, ChevronDown, ChevronUp, Activity, ClipboardList, Stethoscope, FileCheck, Image, X, Upload, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ICD11Search from '@/components/ICD11Search';
import { useOptimisticSave } from '@/lib/optimistic-save';
import { useDebouncedSave } from '@/lib/debounced-save';
import { useLiteMode } from '@/contexts/LiteModeContext';
import DoctorPrivateNotesModal from '@/components/medic/DoctorPrivateNotesModal';
import AudioRecorderButton from '@/components/medic/AudioRecorderButton';

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

export default function EditConsultationForm({ initial, patient, doctor, doctorSpecialties, isSimpleConsulta = false, hasEcografiaTransvaginal = false, isOnlyVideoColposcopia = false, hasColposcopia = false, hasConsultaInService = false }: { initial: ConsultationShape; patient?: any; doctor?: any; doctorSpecialties?: string[]; isSimpleConsulta?: boolean; hasEcografiaTransvaginal?: boolean; isOnlyVideoColposcopia?: boolean; hasColposcopia?: boolean; hasConsultaInService?: boolean }) {
	const router = useRouter();
	const { saveOptimistically } = useOptimisticSave();
	const { isLiteMode } = useLiteMode();
	const [showPrivateNotesModal, setShowPrivateNotesModal] = useState(false);

	// Función auxiliar para normalizar texto (eliminar acentos, espacios extra, convertir a minúsculas)
	const normalizeText = (text: string): string => {
		return text
			.toLowerCase()
			.trim()
			.replace(/\s+/g, ' ') // Reemplazar múltiples espacios con uno solo
			.normalize('NFD') // Descomponer caracteres acentuados
			.replace(/[\u0300-\u036f]/g, ''); // Eliminar diacríticos
	};

	// Función para mapear el nombre de la especialidad al código interno
	// Las especialidades vienen en español desde la base de datos (ej: "Ginecología", "Medicina General")
	const mapSpecialtyNameToCode = (specialtyName: string): string | null => {
		if (!specialtyName || typeof specialtyName !== 'string') {
			return null;
		}

		const normalized = normalizeText(specialtyName);

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
			return bestMatch.value;
		}

		// Si no se encuentra coincidencia, retornar null
		return null;
	};

	// Mapear todas las especialidades guardadas a sus códigos internos
	const allowedSpecialtyCodes = useMemo(() => {
		if (!doctorSpecialties || doctorSpecialties.length === 0) {
			// Si no hay especialidades guardadas, mostrar todas
			return null;
		}
		
		const codes: (string | null)[] = doctorSpecialties
			.map((specialty) => mapSpecialtyNameToCode(specialty))
			.filter((code): code is string => code !== null);
		
		return codes.length > 0 ? codes : null;
	}, [doctorSpecialties]);

	// Función para verificar si una especialidad debe mostrarse
	const shouldShowSpecialty = (specialtyCode: string): boolean => {
		// Si no hay especialidades guardadas, mostrar todas
		if (!allowedSpecialtyCodes) {
			return true;
		}
		// Si hay especialidades guardadas, solo mostrar las que están en la lista
		return allowedSpecialtyCodes.includes(specialtyCode);
	};

	// Verificar si el doctor tiene Obstetricia guardada
	const hasObstetrics = useMemo(() => {
		return allowedSpecialtyCodes?.includes('obstetrics') || false;
	}, [allowedSpecialtyCodes]);

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
	const [savingReport, setSavingReport] = useState(false);
	const [reportError, setReportError] = useState<string | null>(null);
	const [reportSuccess, setReportSuccess] = useState<string | null>(null);
	const [reportUrl, setReportUrl] = useState<string | null>((initial as any).report_url || null);
	const [fontFamily, setFontFamily] = useState<string>('Arial');
	const [selectedReportType, setSelectedReportType] = useState<'gynecology' | 'first_trimester' | 'second_third_trimester'>('gynecology');

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
	
	// Determinar si es ginecología
	const isGynecology = useMemo(() => {
		if (!doctorSpecialties || doctorSpecialties.length === 0) return false;
		const normalizedSpecialties = doctorSpecialties.map(s => normalizeText(s));
		const result = normalizedSpecialties.some(s => 
			s.includes('ginecolog') || s === 'gynecology'
		);
		console.log('[EditConsultationForm] isGynecology:', result, 'specialties:', doctorSpecialties);
		return result;
	}, [doctorSpecialties]);
	
	// Determinar si debe mostrar automáticamente la sección de colposcopia
	// Reglas:
	// 1. Si el servicio incluye "colposcopia" → SIEMPRE mostrar (incluso si es combo con consulta)
	// 2. Si es ginecología Y NO tiene "consulta" en el servicio → mostrar colposcopia
	// 3. Si es un servicio individual y es "consulta" → NO mostrar colposcopia
	const shouldAutoShowColposcopy = useMemo(() => {
		// Prioridad 1: Si tiene colposcopia, siempre mostrar (incluso en combos con consulta)
		if (hasColposcopia) {
			console.log('[EditConsultationForm] shouldAutoShowColposcopy: true (tiene colposcopia)');
			return true;
		}
		// Prioridad 2: Si es ginecología y no tiene consulta, mostrar
		if (isGynecology && !hasConsultaInService) {
			console.log('[EditConsultationForm] shouldAutoShowColposcopy: true (ginecología sin consulta)');
			return true;
		}
		// No mostrar en otros casos
		console.log('[EditConsultationForm] shouldAutoShowColposcopy: false', {
			isGynecology,
			hasConsultaInService,
			hasColposcopia
		});
		return false;
	}, [isGynecology, hasConsultaInService, hasColposcopia]);
	
	// Determinar si solo debe mostrar colposcopia (ocultar otros formularios de ginecología)
	const shouldOnlyShowColposcopy = useMemo(() => {
		return hasColposcopia && !hasConsultaInService && !hasEcografiaTransvaginal;
	}, [hasColposcopia, hasConsultaInService, hasEcografiaTransvaginal]);
	
	const [showColposcopySection, setShowColposcopySection] = useState(shouldAutoShowColposcopy);
	
	// Actualizar showColposcopySection cuando cambien las condiciones
	useEffect(() => {
		if (shouldAutoShowColposcopy && !showColposcopySection) {
			setShowColposcopySection(true);
		}
	}, [shouldAutoShowColposcopy]);

	// init grouped vitals from initial.vitals
	const initVitals = (initial.vitals ?? {}) as Record<string, any>;

	// Inicializar expandedSpecialties - SOLO 'general' por defecto (todas las especialidades minimizadas)
	// EXCEPTO si es ginecología y debe mostrar colposcopia automáticamente
	const initialExpandedSpecialties = useMemo(() => {
		const specialties = new Set<string>(['general']);
		// Si debe mostrar colposcopia automáticamente, expandir ginecología
		if (shouldAutoShowColposcopy && isGynecology) {
			specialties.add('gynecology');
			console.log('[EditConsultationForm] Expandiendo ginecología automáticamente');
		}
		return specialties;
	}, [shouldAutoShowColposcopy, isGynecology]);

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
	// Selector de tipo de informe
	const [obstetricReportType, setObstetricReportType] = useState<string>(initObst.report_type ?? 'gynecology');
	
	// Campos comunes antiguos (para compatibilidad)
	const [fundalHeight, setFundalHeight] = useState<string>(initObst.fundal_height_cm ?? '');
	const [fetalHr, setFetalHr] = useState<string>(initObst.fetal_heart_rate ?? '');
	const [gravida, setGravida] = useState<string>(initObst.gravida ?? '');
	const [para, setPara] = useState<string>(initObst.para ?? '');

	// === PRIMER TRIMESTRE ===
	// Datos de la Paciente
	const [edadGestacional, setEdadGestacional] = useState<string>(initObst.first_trimester?.edad_gestacional ?? '');
	const [fur, setFur] = useState<string>(initObst.first_trimester?.fur ?? '');
	const [fpp, setFpp] = useState<string>(initObst.first_trimester?.fpp ?? '');
	const [gestas, setGestas] = useState<string>(initObst.first_trimester?.gestas ?? '');
	const [paras, setParas] = useState<string>(initObst.first_trimester?.paras ?? '');
	const [cesareas, setCesareas] = useState<string>(initObst.first_trimester?.cesareas ?? '');
	const [abortors, setAbortors] = useState<string>(initObst.first_trimester?.abortors ?? '');
	const [otros, setOtros] = useState<string>(initObst.first_trimester?.otros ?? '');
	const [motivoConsulta, setMotivoConsulta] = useState<string>(initObst.first_trimester?.motivo_consulta ?? 'Captación de embarazo');
	const [referencia, setReferencia] = useState<string>(initObst.first_trimester?.referencia ?? '');

	// Datos Obstétricos del 1er Trimestre
	const [posicion, setPosicion] = useState<string>(initObst.first_trimester?.posicion ?? '');
	const [superficie, setSuperficie] = useState<string>(initObst.first_trimester?.superficie ?? 'Regular');
	const [miometrio, setMiometrio] = useState<string>(initObst.first_trimester?.miometrio ?? 'HOMOGENEO');
	const [endometrio, setEndometrio] = useState<string>(initObst.first_trimester?.endometrio ?? 'Ocupado Por Saco Gestacional.');
	const [ovarioDerecho, setOvarioDerecho] = useState<string>(initObst.first_trimester?.ovario_derecho ?? 'Normal');
	const [ovarioIzquierdo, setOvarioIzquierdo] = useState<string>(initObst.first_trimester?.ovario_izquierdo ?? 'Normal');
	const [anexosEcopatron, setAnexosEcopatron] = useState<string>(initObst.first_trimester?.anexos_ecopatron ?? 'Normal');
	const [fondoDeSaco, setFondoDeSaco] = useState<string>(initObst.first_trimester?.fondo_de_saco ?? 'Libre');
	const [cuerpoLuteo, setCuerpoLuteo] = useState<string>(initObst.first_trimester?.cuerpo_luteo ?? '');

	// Saco Gestacional
	const [gestacion, setGestacion] = useState<string>(initObst.first_trimester?.gestacion ?? '');
	const [localizacion, setLocalizacion] = useState<string>(initObst.first_trimester?.localizacion ?? '');
	const [vesicula, setVesicula] = useState<string>(initObst.first_trimester?.vesicula ?? '');
	const [cavidadExocelomica, setCavidadExocelomica] = useState<string>(initObst.first_trimester?.cavidad_exocelomica ?? '');

	// Embrión
	const [embrionVisto, setEmbrionVisto] = useState<string>(initObst.first_trimester?.embrion_visto ?? '');
	const [ecoanatomia, setEcoanatomia] = useState<string>(initObst.first_trimester?.ecoanatomia ?? '');
	const [lcr, setLcr] = useState<string>(initObst.first_trimester?.lcr ?? '');
	const [acordeA, setAcordeA] = useState<string>(initObst.first_trimester?.acorde_a ?? '');
	const [actividadCardiaca, setActividadCardiaca] = useState<string>(initObst.first_trimester?.actividad_cardiaca ?? '');
	const [movimientosEmbrionarios, setMovimientosEmbrionarios] = useState<string>(initObst.first_trimester?.movimientos_embrionarios ?? '');

	// Conclusiones (con numeración automática)
	const [conclusiones, setConclusiones] = useState<string>(initObst.first_trimester?.conclusiones ?? '');

	// === SEGUNDO Y TERCER TRIMESTRE ===
	const initSecond = initObst.second_third_trimester ?? {};
	// Primera sección: Datos de la Paciente
	const [edadGestacional_t2, setEdadGestacional_t2] = useState<string>(initSecond.edad_gestacional ?? '');
	const [fur_t2, setFur_t2] = useState<string>(initSecond.fur ?? '');
	const [fpp_t2, setFpp_t2] = useState<string>(initSecond.fpp ?? '');
	const [gestas_t2, setGestas_t2] = useState<string>(initSecond.gestas ?? '');
	const [paras_t2, setParas_t2] = useState<string>(initSecond.paras ?? '');
	const [cesareas_t2, setCesareas_t2] = useState<string>(initSecond.cesareas ?? '');
	const [abortos_t2, setAbortos_t2] = useState<string>(initSecond.abortos ?? '');
	const [otros_t2, setOtros_t2] = useState<string>(initSecond.otros ?? '');
	const [motivoConsulta_t2, setMotivoConsulta_t2] = useState<string>(initSecond.motivo_consulta ?? '');
	const [referencia_t2, setReferencia_t2] = useState<string>(initSecond.referencia ?? '');
	// Segunda sección: Datos Obstétricos
	const [numFetos, setNumFetos] = useState<string>(initSecond.num_fetos ?? '01');
	const [actividadCardiaca_t2, setActividadCardiaca_t2] = useState<string>(initSecond.actividad_cardiaca ?? '');
	const [situacion_t2, setSituacion_t2] = useState<string>(initSecond.situacion ?? '');
	const [presentacion_t2, setPresentacion_t2] = useState<string>(initSecond.presentacion ?? '');
	const [dorso_t2, setDorso_t2] = useState<string>(initSecond.dorso ?? '');
	// Tercera sección: Datos Biométricos
	const [dbp, setDbp] = useState<string>(initSecond.dbp ?? '');
	const [cc, setCc] = useState<string>(initSecond.cc ?? '');
	const [ca, setCa] = useState<string>(initSecond.ca ?? '');
	const [lf, setLf] = useState<string>(initSecond.lf ?? '');
	const [pesoEstimadoFetal, setPesoEstimadoFetal] = useState<string>(initSecond.peso_estimado_fetal ?? '');
	const [para_t2, setPara_t2] = useState<string>(initSecond.para ?? '');
	// Cuarta sección: Datos Placenta Foliculares
	const [placenta_t2, setPlacenta_t2] = useState<string>(initSecond.placenta ?? '');
	const [ubi_t2, setUbi_t2] = useState<string>(initSecond.ubi ?? '');
	const [insercion_t2, setInsercion_t2] = useState<string>(initSecond.insercion ?? '');
	const [grado_t2, setGrado_t2] = useState<string>(initSecond.grado ?? 'I/III');
	const [cordonUmbilical_t2, setCordonUmbilical_t2] = useState<string>(initSecond.cordon_umbilical ?? '');
	const [liquAmniotico_t2, setLiquAmniotico_t2] = useState<string>(initSecond.liqu_amniotico ?? '');
	const [p_t2, setP_t2] = useState<string>(initSecond.p ?? '');
	const [ila_t2, setIla_t2] = useState<string>(initSecond.ila ?? '');
	// Quinta sección: Datos Anatomofuncionales
	const [craneo_t2, setCraneo_t2] = useState<string>(initSecond.craneo ?? '');
	const [corazon_t2, setCorazon_t2] = useState<string>(initSecond.corazon ?? '');
	const [fcf, setFcf] = useState<string>(initSecond.fcf ?? '');
	const [pulmones_t2, setPulmones_t2] = useState<string>(initSecond.pulmones ?? '');
	const [situsVisceral_t2, setSitusVisceral_t2] = useState<string>(initSecond.situs_visceral ?? '');
	const [intestino_t2, setIntestino_t2] = useState<string>(initSecond.intestino ?? '');
	const [vejiga_t2, setVejiga_t2] = useState<string>(initSecond.vejiga ?? '');
	const [vejigaExtra_t2, setVejigaExtra_t2] = useState<string>(initSecond.vejiga_extra ?? '');
	const [estomago_t2, setEstomago_t2] = useState<string>(initSecond.estomago ?? '');
	const [estomagoExtra_t2, setEstomagoExtra_t2] = useState<string>(initSecond.estomago_extra ?? '');
	const [rinones_t2, setRinones_t2] = useState<string>(initSecond.rinones ?? '');
	const [rinonesExtra_t2, setRinonesExtra_t2] = useState<string>(initSecond.rinones_extra ?? '');
	const [genitales_t2, setGenitales_t2] = useState<string>(initSecond.genitales ?? '');
	const [miembrosSuperiores_t2, setMiembrosSuperiores_t2] = useState<string>(initSecond.miembros_superiores ?? '');
	const [manos_t2, setManos_t2] = useState<string>(initSecond.manos ?? '');
	const [miembrosInferiores_t2, setMiembrosInferiores_t2] = useState<string>(initSecond.miembros_inferiores ?? '');
	const [pies_t2, setPies_t2] = useState<string>(initSecond.pies ?? '');
	const [conclusiones_t2, setConclusiones_t2] = useState<string>(initSecond.conclusiones ?? '');

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
	const [colposcopyImage, setColposcopyImage] = useState<string>(initColposcopy.colposcopy_image ?? '');
	const [colposcopyAdditionalDetails, setColposcopyAdditionalDetails] = useState<string>(initColposcopy.additional_details ?? '');
	const [uploadingColposcopyImage, setUploadingColposcopyImage] = useState(false);

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

	// Cargar contenido generado automáticamente y fuente cuando se abre la pestaña de informe o cambia el tipo
	useEffect(() => {
		if (activeTab === 'report') {
			const loadGeneratedContent = async () => {
				try {
					// Determinar el tipo de informe
					const vitals = initial.vitals || {};
					const obst = vitals.obstetrics || {};
					const reportType = obst.report_type || selectedReportType;
					
					const res = await fetch(`/api/consultations/${initial.id}/generate-report-content?report_type=${reportType}`, {
						credentials: 'include',
					});
					const data = await res.json();
					if (res.ok && data.content) {
						setReportContent(data.content);
						if (data.font_family) {
							setFontFamily(data.font_family);
						}
						setReportError(null);
					} else {
						// Si hay error, mostrar mensaje pero no bloquear
						if (data.error) {
							setReportError(data.error);
						}
					}
				} catch (err) {
					// Silenciar errores, el usuario puede escribir manualmente
					console.warn('No se pudo cargar contenido generado automáticamente:', err);
				}
			};
			loadGeneratedContent();
		}
	}, [activeTab, initial.id, selectedReportType]);

	/* -------------------------
     Helper: Detectar si hay datos reales de ginecología (no solo valores predeterminados)
     ------------------------- */
	function hasRealGynecologyData(): boolean {
		// Valores predeterminados comunes en el formulario de ginecología
		const defaultValues = new Set([
			'NIEGA', 'VIVA SANA', 'VIVO SANO', 'REGULARES', 'NO', 'ESTABLES',
			'MEDIANO TAMAÑO', 'ASIMÉTRICAS', 'SIN ALTERACIONES',
			'NO SE EVIDENCIA SALIDA DE SECRECIÓN', 'LIBRES',
			'BLANDO, DEPRIMIBLE NO DOLOROSO A LA PALPACIÓN', 'NORMOCONFIGURADOS',
			'sin secreciones', 'CUELLO MACROSCÓPICAMENTE SANO',
			'CUELLO RENITENTE NO DOLOROSO A LA MOVILIZACIÓN', 'NO PALPABLES',
			'NEGATIVO', 'SATISFACTORIO', 'ALTERADA', 'Negativo', 'No',
			'NO SE EVIDENCIA LÍQUIDO EN FONDO DE SACO', ''
		]);

		// Campos que se consideran "reales" si tienen valor (incluso si es predeterminado)
		// porque son campos que el usuario debe llenar explícitamente
		const importantFields = [
			lmp, // Last menstrual period - importante
			cervicalExamNotes, // Notas del examen cervical
			currentIllnessHistory, // Historia de enfermedad actual
			contraceptiveUse, // Uso de anticonceptivos
			menstruationPattern, // Patrón de menstruación
			firstSexualRelation, // Primera relación sexual
			sexualPartners, // Parejas sexuales
			uterusDimensions, // Dimensiones del útero
			endometrialInterface, // Interfaz endometrial
			endometrialInterfaceType, // Tipo de interfaz endometrial
			endometrialInterfacePhase, // Fase de interfaz endometrial
			leftOvaryDimensions, // Dimensiones ovario izquierdo
			rightOvaryDimensions, // Dimensiones ovario derecho
			ho, // HO
			colposcopyEctocervix, // Ectocérvix en colposcopia
			colposcopyExtension, // Extensión en colposcopia
			colposcopyDescription, // Descripción en colposcopia
			colposcopyLocation, // Ubicación en colposcopia
			colposcopyAcetowhiteDetails, // Detalles de acetoblanqueamiento
			colposcopyBiopsyLocation, // Ubicación de biopsia
			colposcopyImage, // Imagen de colposcopia
			colposcopyAdditionalDetails, // Detalles adicionales
		];

		// Si algún campo importante tiene valor, considerar que hay datos reales
		if (importantFields.some(field => field && field.trim() !== '')) {
			return true;
		}

		// Verificar campos que pueden tener valores predeterminados pero que el usuario puede haber modificado
		const checkableFields = [
			{ value: allergies, default: 'NIEGA' },
			{ value: surgicalHistory, default: 'NIEGA' },
			{ value: familyHistoryMother, default: 'VIVA SANA' },
			{ value: familyHistoryFather, default: 'VIVO SANO' },
			{ value: familyHistoryBreastCancer, default: 'NIEGA' },
			{ value: its, default: 'NIEGA' },
			{ value: menstruationType, default: 'REGULARES' },
			{ value: dysmenorrhea, default: 'NO' },
			{ value: generalConditions, default: 'ESTABLES' },
			{ value: breastSize, default: 'MEDIANO TAMAÑO' },
			{ value: breastSymmetry, default: 'ASIMÉTRICAS' },
			{ value: breastCap, default: 'SIN ALTERACIONES' },
			{ value: breastSecretion, default: 'NO SE EVIDENCIA SALIDA DE SECRECIÓN' },
			{ value: axillaryFossae, default: 'LIBRES' },
			{ value: abdomen, default: 'BLANDO, DEPRIMIBLE NO DOLOROSO A LA PALPACIÓN' },
			{ value: externalGenitals, default: 'NORMOCONFIGURADOS' },
			{ value: vaginalDischarge, default: 'sin secreciones' },
			{ value: speculumCervix, default: 'CUELLO MACROSCÓPICAMENTE SANO' },
			{ value: tactCervix, default: 'CUELLO RENITENTE NO DOLOROSO A LA MOVILIZACIÓN' },
			{ value: fundusSacs, default: 'LIBRES' },
			{ value: adnexa, default: 'NO PALPABLES' },
			{ value: hinselmannTest, default: 'NEGATIVO' },
			{ value: schillerTest, default: 'NEGATIVO' },
			{ value: fundusFluid, default: 'NO SE EVIDENCIA LÍQUIDO EN FONDO DE SACO' },
			{ value: colposcopyAcetic5, default: 'SATISFACTORIO' },
			{ value: colposcopyType, default: 'ALTERADA' },
			{ value: colposcopyAcetowhite, default: 'Negativo' },
			{ value: colposcopyMosaic, default: 'No' },
			{ value: colposcopyPunctation, default: 'No' },
			{ value: colposcopyAtypicalVessels, default: 'No' },
			{ value: colposcopyInvasiveCarcinoma, default: 'No' },
			{ value: colposcopyBorders, default: 'No' },
			{ value: colposcopySituation, default: 'No' },
			{ value: colposcopyElevation, default: 'No' },
			{ value: colposcopyBiopsy, default: 'No' },
			{ value: colposcopyLugol, default: '' },
		];

		// Si algún campo tiene un valor diferente al predeterminado, hay datos reales
		for (const field of checkableFields) {
			if (field.value && field.value.trim() !== '' && field.value !== field.default) {
				return true;
			}
		}

		// Si no hay datos reales, retornar false
		return false;
	}

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

		// Solo incluir especialidades si corresponden a las especialidades permitidas del doctor
		// Si no hay especialidades del doctor, no incluir ninguna especialidad (solo general)
		if (!allowedSpecialtyCodes || allowedSpecialtyCodes.length === 0) {
			return Object.keys(out).length ? out : null;
		}

		// Cardiology - solo si la especialidad está permitida Y está expandida (activa)
		if (allowedSpecialtyCodes.includes('cardiology') && expandedSpecialties.has('cardiology')) {
			const cardio: Record<string, any> = {};
			if (ekgRhythm) cardio.ekg_rhythm = ekgRhythm;
			if (bnp) cardio.bnp = bnp;
			if (edema !== null && edema !== undefined) cardio.edema = !!edema;
			if (chestPainScale) cardio.chest_pain_scale = chestPainScale;
			if (Object.keys(cardio).length) out.cardiology = cardio;
		}

		// Pulmonology - solo si la especialidad está permitida Y está expandida (activa)
		if (allowedSpecialtyCodes.includes('pulmonology') && expandedSpecialties.has('pulmonology')) {
			const pulmo: Record<string, any> = {};
			if (fev1) pulmo.fev1 = fev1;
			if (fvc) pulmo.fvc = fvc;
			if (peakFlow) pulmo.peak_flow = peakFlow;
			if (wheezeNote) pulmo.wheeze = wheezeNote;
			if (Object.keys(pulmo).length) out.pulmonology = pulmo;
		}

		// Neurology - solo si la especialidad está permitida Y está expandida (activa)
		if (allowedSpecialtyCodes.includes('neurology') && expandedSpecialties.has('neurology')) {
			const neuro: Record<string, any> = {};
			if (gcsTotal) neuro.gcs_total = gcsTotal;
			if (pupillaryReactivity) neuro.pupillary_reactivity = pupillaryReactivity;
			if (neuroNotes) neuro.notes = neuroNotes;
			if (Object.keys(neuro).length) out.neurology = neuro;
		}

		// Obstetrics - solo si la especialidad está permitida, está expandida (activa) Y se está usando
		// Solo guardar si el report_type es de obstetricia (first_trimester o second_third_trimester)
		if (allowedSpecialtyCodes.includes('obstetrics') && 
			expandedSpecialties.has('obstetrics') &&
			(obstetricReportType === 'first_trimester' || obstetricReportType === 'second_third_trimester')) {
			const obst: Record<string, any> = {
				report_type: obstetricReportType,
			};

			// Campos antiguos (para compatibilidad) - solo si hay datos
			if (fundalHeight) obst.fundal_height_cm = fundalHeight;
			if (fetalHr) obst.fetal_heart_rate = fetalHr;
			if (gravida) obst.gravida = gravida;
			if (para) obst.para = para;

			// Primer Trimestre - guardar SOLO si está seleccionado
			if (obstetricReportType === 'first_trimester') {
				const firstTrim: Record<string, any> = {};
				if (edadGestacional) firstTrim.edad_gestacional = edadGestacional;
				if (fur) firstTrim.fur = fur;
				if (fpp) firstTrim.fpp = fpp;
				if (gestas) firstTrim.gestas = gestas;
				if (paras) firstTrim.paras = paras;
				if (cesareas) firstTrim.cesareas = cesareas;
				if (abortors) firstTrim.abortors = abortors;
				if (otros) firstTrim.otros = otros;
				if (motivoConsulta) firstTrim.motivo_consulta = motivoConsulta;
				if (referencia) firstTrim.referencia = referencia;
				if (posicion) firstTrim.posicion = posicion;
				if (superficie) firstTrim.superficie = superficie;
				if (miometrio) firstTrim.miometrio = miometrio;
				if (endometrio) firstTrim.endometrio = endometrio;
				if (ovarioDerecho) firstTrim.ovario_derecho = ovarioDerecho;
				if (ovarioIzquierdo) firstTrim.ovario_izquierdo = ovarioIzquierdo;
				if (anexosEcopatron) firstTrim.anexos_ecopatron = anexosEcopatron;
				if (fondoDeSaco) firstTrim.fondo_de_saco = fondoDeSaco;
				if (cuerpoLuteo) firstTrim.cuerpo_luteo = cuerpoLuteo;
				if (gestacion) firstTrim.gestacion = gestacion;
				if (localizacion) firstTrim.localizacion = localizacion;
				if (vesicula) firstTrim.vesicula = vesicula;
				if (cavidadExocelomica) firstTrim.cavidad_exocelomica = cavidadExocelomica;
				if (embrionVisto) firstTrim.embrion_visto = embrionVisto;
				if (ecoanatomia) firstTrim.ecoanatomia = ecoanatomia;
				if (lcr) firstTrim.lcr = lcr;
				if (acordeA) firstTrim.acorde_a = acordeA;
				if (actividadCardiaca) firstTrim.actividad_cardiaca = actividadCardiaca;
				if (movimientosEmbrionarios) firstTrim.movimientos_embrionarios = movimientosEmbrionarios;
				if (conclusiones) firstTrim.conclusiones = conclusiones;
				if (Object.keys(firstTrim).length > 0) obst.first_trimester = firstTrim;
			}

			// Segundo y Tercer Trimestre - guardar SOLO si está seleccionado
			if (obstetricReportType === 'second_third_trimester') {
				const secondTrim: Record<string, any> = {};
				// Primera sección: Datos de la Paciente
				if (edadGestacional_t2) secondTrim.edad_gestacional = edadGestacional_t2;
				if (fur_t2) secondTrim.fur = fur_t2;
				if (fpp_t2) secondTrim.fpp = fpp_t2;
				if (gestas_t2) secondTrim.gestas = gestas_t2;
				if (paras_t2) secondTrim.paras = paras_t2;
				if (cesareas_t2) secondTrim.cesareas = cesareas_t2;
				if (abortos_t2) secondTrim.abortos = abortos_t2;
				if (otros_t2) secondTrim.otros = otros_t2;
				if (motivoConsulta_t2) secondTrim.motivo_consulta = motivoConsulta_t2;
				if (referencia_t2) secondTrim.referencia = referencia_t2;
				// Segunda sección: Datos Obstétricos
				if (numFetos) secondTrim.num_fetos = numFetos;
				if (actividadCardiaca_t2) secondTrim.actividad_cardiaca = actividadCardiaca_t2;
				if (situacion_t2) secondTrim.situacion = situacion_t2;
				if (presentacion_t2) secondTrim.presentacion = presentacion_t2;
				if (dorso_t2) secondTrim.dorso = dorso_t2;
				// Tercera sección: Datos Biométricos
				if (dbp) secondTrim.dbp = dbp;
				if (cc) secondTrim.cc = cc;
				if (ca) secondTrim.ca = ca;
				if (lf) secondTrim.lf = lf;
				if (pesoEstimadoFetal) secondTrim.peso_estimado_fetal = pesoEstimadoFetal;
				if (para_t2) secondTrim.para = para_t2;
				// Cuarta sección: Datos Placenta Foliculares
				if (placenta_t2) secondTrim.placenta = placenta_t2;
				if (ubi_t2) secondTrim.ubi = ubi_t2;
				if (insercion_t2) secondTrim.insercion = insercion_t2;
				if (grado_t2) secondTrim.grado = grado_t2;
				if (cordonUmbilical_t2) secondTrim.cordon_umbilical = cordonUmbilical_t2;
				if (liquAmniotico_t2) secondTrim.liqu_amniotico = liquAmniotico_t2;
				if (p_t2) secondTrim.p = p_t2;
				if (ila_t2) secondTrim.ila = ila_t2;
				// Quinta sección: Datos Anatomofuncionales
				if (craneo_t2) secondTrim.craneo = craneo_t2;
				if (corazon_t2) secondTrim.corazon = corazon_t2;
				if (fcf) secondTrim.fcf = fcf;
				if (pulmones_t2) secondTrim.pulmones = pulmones_t2;
				if (situsVisceral_t2) secondTrim.situs_visceral = situsVisceral_t2;
				if (intestino_t2) secondTrim.intestino = intestino_t2;
				if (vejiga_t2) secondTrim.vejiga = vejiga_t2;
				if (vejigaExtra_t2) secondTrim.vejiga_extra = vejigaExtra_t2;
				if (estomago_t2) secondTrim.estomago = estomago_t2;
				if (estomagoExtra_t2) secondTrim.estomago_extra = estomagoExtra_t2;
				if (rinones_t2) secondTrim.rinones = rinones_t2;
				if (rinonesExtra_t2) secondTrim.rinones_extra = rinonesExtra_t2;
				if (genitales_t2) secondTrim.genitales = genitales_t2;
				if (miembrosSuperiores_t2) secondTrim.miembros_superiores = miembrosSuperiores_t2;
				if (manos_t2) secondTrim.manos = manos_t2;
				if (miembrosInferiores_t2) secondTrim.miembros_inferiores = miembrosInferiores_t2;
				if (pies_t2) secondTrim.pies = pies_t2;
				if (conclusiones_t2) secondTrim.conclusiones = conclusiones_t2;
				if (Object.keys(secondTrim).length > 0) {
					obst.second_third_trimester = secondTrim;
				}
			}

			// Solo incluir obstetrics si hay datos guardados (más allá del report_type)
			if (Object.keys(obst).length > 1) {
				out.obstetrics = obst;
			}
		}

		// Nutrition - solo si la especialidad está permitida Y está expandida (activa)
		if (allowedSpecialtyCodes.includes('nutrition') && expandedSpecialties.has('nutrition')) {
			const nutr: Record<string, any> = {};
			if (waistCircumference) nutr.waist_cm = waistCircumference;
			if (bmiOverride) nutr.bmi_override = bmiOverride;
			if (Object.keys(nutr).length) out.nutrition = nutr;
		}

		// Dermatology - solo si la especialidad está permitida Y está expandida (activa)
		if (allowedSpecialtyCodes.includes('dermatology') && expandedSpecialties.has('dermatology')) {
			const derma: Record<string, any> = {};
			if (lesionDesc) derma.lesion_description = lesionDesc;
			if (lesionSize) derma.lesion_size_cm = lesionSize;
			if (Object.keys(derma).length) out.dermatology = derma;
		}

		// Psychiatry - solo si la especialidad está permitida Y está expandida (activa)
		if (allowedSpecialtyCodes.includes('psychiatry') && expandedSpecialties.has('psychiatry')) {
			const psych: Record<string, any> = {};
			if (moodScale) psych.mood_scale = moodScale;
			if (phq9) psych.phq9 = phq9;
			if (Object.keys(psych).length) out.psychiatry = psych;
		}

		// Orthopedics - solo si la especialidad está permitida Y está expandida (activa)
		if (allowedSpecialtyCodes.includes('orthopedics') && expandedSpecialties.has('orthopedics')) {
			const ortho: Record<string, any> = {};
			if (romNotes) ortho.range_of_motion = romNotes;
			if (limbStrength) ortho.limb_strength = limbStrength;
			if (Object.keys(ortho).length) out.orthopedics = ortho;
		}

		// ENT - solo si la especialidad está permitida Y está expandida (activa)
		if (allowedSpecialtyCodes.includes('ent') && expandedSpecialties.has('ent')) {
			const ent: Record<string, any> = {};
			if (hearingLeft) ent.hearing_left_db = hearingLeft;
			if (hearingRight) ent.hearing_right_db = hearingRight;
			if (otoscopyNotes) ent.otoscopy = otoscopyNotes;
			if (Object.keys(ent).length) out.ent = ent;
		}

		// Gynecology - solo si la especialidad está permitida, está expandida (activa) Y se está usando
		// Lógica mejorada:
		// 1. Debe estar expandida (activa) en expandedSpecialties
		// 2. Si es un informe de obstetricia (first_trimester o second_third_trimester), NO guardar ginecología
		// 3. Si NO es informe de obstetricia, verificar si hay datos reales de ginecología
		// 4. Solo guardar si hay datos reales (no solo valores predeterminados) O si el report_type es explícitamente 'gynecology'
		const isObstetricReport = obstetricReportType === 'first_trimester' || obstetricReportType === 'second_third_trimester';
		const hasRealGynData = hasRealGynecologyData();
		const isExplicitlyGynecology = obstetricReportType === 'gynecology' || selectedReportType === 'gynecology';
		const isGynecologyExpanded = expandedSpecialties.has('gynecology');
		
		// Solo guardar ginecología si:
		// - Está expandida (activa) Y
		// - NO es un informe de obstetricia Y
		// - (Hay datos reales de ginecología O es explícitamente ginecología)
		const shouldSaveGynecology = isGynecologyExpanded && !isObstetricReport && (hasRealGynData || isExplicitlyGynecology);
		
		if (allowedSpecialtyCodes.includes('gynecology') && shouldSaveGynecology) {
			const gyn: Record<string, any> = {};
			// LMP es obligatorio si hay datos de ginecología, así que siempre lo incluimos
			if (lmp) gyn.last_menstrual_period = lmp;
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
			if (colposcopyImage) colposcopy.colposcopy_image = colposcopyImage;
			if (colposcopyAdditionalDetails) colposcopy.additional_details = colposcopyAdditionalDetails;
			if (Object.keys(colposcopy).length) gyn.colposcopy = colposcopy;

			// Solo agregar ginecología si hay al menos un campo con datos
			if (Object.keys(gyn).length > 0) out.gynecology = gyn;
		}

		// Endocrinology - solo si la especialidad está permitida Y está expandida (activa)
		if (allowedSpecialtyCodes.includes('endocrinology') && expandedSpecialties.has('endocrinology')) {
			const endo: Record<string, any> = {};
			if (tsh) endo.tsh = tsh;
			if (hba1c) endo.hba1c = hba1c;
			if (Object.keys(endo).length) out.endocrinology = endo;
		}

		// Ophthalmology - solo si la especialidad está permitida Y está expandida (activa)
		if (allowedSpecialtyCodes.includes('ophthalmology') && expandedSpecialties.has('ophthalmology')) {
			const oph: Record<string, any> = {};
			if (visualAcuity) oph.visual_acuity = visualAcuity;
			if (iop) oph.iop = iop;
			if (Object.keys(oph).length) out.ophthalmology = oph;
		}

		return Object.keys(out).length ? out : null;
	}

	/* -------------------------
     Validation for required fields by specialty
     ------------------------- */
	function validateRequiredFields(): string[] {
		const errors: string[] = [];
		const vitals = buildVitalsObject() ?? {};

		const requiredMap: Record<string, string[]> = {
			cardiology: [], // Campos opcionales
			pulmonology: [], // Campos opcionales
			neurology: [], // Campos opcionales
			obstetrics: [], // Campos opcionales - los datos se guardan en first_trimester o second_third_trimester
			nutrition: [], // Campos opcionales
			dermatology: [], // Campos opcionales
			psychiatry: [],
			orthopedics: [], // Campos opcionales
			ent: [], // Campos opcionales
			gynecology: [], // Campos opcionales
			endocrinology: [], // Campos opcionales
			ophthalmology: [], // Campos opcionales
			general: [], // Campos opcionales - se puede guardar sin datos completos
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

			// Guardado optimista: actualizar UI inmediatamente y no bloquear
			setSuccess('Guardando...');

			// Intentar guardado inmediato con timeout corto
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), isLiteMode ? 10000 : 15000);

			let saveSuccess = false;
			try {
				const res = await fetch(`/api/consultations/${initial.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				const data = await res.json().catch(() => ({}));
				if (!res.ok) {
					throw new Error(data?.error || data?.message || 'Error al guardar');
				}

				// Si el guardado fue exitoso, continuar
				saveSuccess = true;
				setSuccess('Consulta guardada correctamente.');
			} catch (err: any) {
				clearTimeout(timeoutId);
				
				// Si es timeout o error de red, usar guardado optimista en background
				if (err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('fetch failed') || err.message?.includes('network')) {
					console.warn('[EditConsultationForm] Timeout o error de red, guardando en background:', err);
					
					// Agregar a la cola de guardado optimista
					saveOptimistically(
						'consultation',
						`/api/consultations/${initial.id}`,
						payload,
						(result) => {
							setSuccess('Consulta guardada en segundo plano.');
						},
						(error) => {
							console.warn('Error en guardado optimista:', error);
						}
					);

					// Continuar sin bloquear - el usuario puede seguir trabajando
					setSuccess('Guardando en segundo plano, puedes continuar trabajando...');
					setLoading(false);
					// No lanzar error, permitir que continúe con la actualización del paciente
				} else {
					// Error real, mostrar al usuario
					throw err;
				}
			}

			// Solo actualizar paciente si el guardado de consulta fue exitoso o si estamos en modo optimista
			if (saveSuccess || !loading) {
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

				// Intentar actualizar paciente con timeout
				const patientController = new AbortController();
				const patientTimeoutId = setTimeout(() => patientController.abort(), isLiteMode ? 8000 : 12000);

				try {
					const patientRes = await fetch(`/api/consultations/${initial.id}/patient`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							patient_id: patientId,
							is_unregistered: isUnregistered,
							...patientUpdatePayload,
						}),
						signal: patientController.signal,
					});

					clearTimeout(patientTimeoutId);

					const patientData = await patientRes.json().catch(() => ({}));
					if (!patientRes.ok) {
						console.warn('Error al actualizar datos del paciente:', patientData?.error || patientData?.message);
						// No lanzar error, solo mostrar advertencia ya que la consulta se guardó correctamente
					}
				} catch (patientErr: any) {
					clearTimeout(patientTimeoutId);
					if (patientErr.name !== 'AbortError') {
						console.warn('Error al actualizar datos del paciente:', patientErr);
					}
					// No bloquear si falla la actualización del paciente
				}
			}
			}

			if (saveSuccess) {
				setSuccess('Consulta actualizada correctamente.');
			}
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
		// Solo validar contenido para informes que no son de obstetricia (1er trimestre o 2do/3er trimestre)
		if (selectedReportType !== 'first_trimester' && selectedReportType !== 'second_third_trimester') {
			if (!reportContent.trim()) {
				setReportError('Por favor, escribe el contenido del informe');
				return;
			}
		}

		setGeneratingReport(true);
		setReportError(null);
		setReportSuccess(null);

		try {
			// Determinar el tipo de informe
			const vitals = initial.vitals || {};
			const obst = vitals.obstetrics || {};
			const reportType = obst.report_type || selectedReportType;
			
			// Para informes de obstetricia (1er trimestre o 2do/3er trimestre), no enviar content
			// Solo se usarán las variables del formulario directamente en el Word
			const requestBody: any = {
				font_family: fontFamily,
				report_type: reportType
			};
			
			// Solo incluir content si NO es un informe de obstetricia
			if (reportType !== 'first_trimester' && reportType !== 'second_third_trimester') {
				requestBody.content = reportContent;
			}
			
			const res = await fetch(`/api/consultations/${initial.id}/generate-report`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al generar informe');
			}

			// Verificar que report_url existe en la respuesta
			if (!data.report_url) {
				console.error('[Generate Report] No se recibió report_url en la respuesta:', data);
				throw new Error('No se recibió la URL del informe generado');
			}

			console.log('[Generate Report] Informe generado exitosamente, URL:', data.report_url);
			// Actualizar estados en el orden correcto
			setReportError(null); // Limpiar cualquier error previo primero
			setReportUrl(data.report_url); // Actualizar URL del informe
			setReportSuccess('Informe generado exitosamente. Puedes descargarlo o guardarlo en el historial del paciente.');
		} catch (err: any) {
			console.error('[Generate Report] Error:', err);
			setReportError(err?.message ?? String(err));
			setReportUrl(null); // Asegurar que reportUrl se limpia en caso de error
		} finally {
			setGeneratingReport(false);
		}
	}

	async function handleSaveReport() {
		if (!reportUrl) {
			setReportError('Primero debes generar el informe antes de guardarlo');
			return;
		}

		setSavingReport(true);
		setReportError(null);
		setReportSuccess(null);

		try {
			const res = await fetch(`/api/consultations/${initial.id}/save-report`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: reportContent }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al guardar informe');
			}

			// Descargar el informe automáticamente después de guardarlo
			if (reportUrl) {
				try {
					// Intentar descargar el archivo desde la URL
					// Primero intentamos con fetch para obtener el blob y forzar la descarga
					const response = await fetch(reportUrl);
					if (response.ok) {
						const blob = await response.blob();
						const url = window.URL.createObjectURL(blob);
						
						// Crear un elemento <a> temporal para descargar el archivo
						const link = document.createElement('a');
						link.href = url;
						link.download = `informe-consulta-${initial.id}-${new Date().toISOString().split('T')[0]}.docx`;
						link.style.display = 'none';
						
						// Agregar al DOM, hacer click y remover
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
						
						// Limpiar la URL del objeto después de un tiempo
						setTimeout(() => {
							window.URL.revokeObjectURL(url);
						}, 100);
					} else {
						// Si fetch falla, intentar con método alternativo (abrir en nueva pestaña)
						window.open(reportUrl, '_blank');
					}
				} catch (downloadError) {
					console.warn('Error al descargar el informe automáticamente:', downloadError);
					// Si falla, intentar abrir en nueva pestaña como fallback
					try {
						window.open(reportUrl, '_blank');
					} catch (openError) {
						console.warn('Error al abrir el informe:', openError);
					}
					// No fallar si la descarga falla, el informe ya está guardado
				}
			}

			setReportSuccess('Informe guardado exitosamente en el historial del paciente y descargado');
		} catch (err: any) {
			setReportError(err?.message ?? String(err));
		} finally {
			setSavingReport(false);
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
											<div className="p-4 pt-0 space-y-4">
												{/* Botón de Grabar Audio para generar informe */}
												<div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
													<AudioRecorderButton
														consultationId={initial.id}
														reportType="cardiology"
														specialty="Cardiología"
														onSuccess={(reportUrl) => {
															setSuccess('Informe generado exitosamente desde el audio');
															setReportUrl(reportUrl);
														}}
														onError={(errorMsg) => {
															setError(`Error al generar informe: ${errorMsg}`);
														}}
													/>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
											<div className="p-4 pt-0 space-y-4">
												{/* Botón de Grabar Audio para generar informe */}
												<div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
													<AudioRecorderButton
														consultationId={initial.id}
														reportType="pulmonology"
														specialty="Neumología"
														onSuccess={(reportUrl) => {
															setSuccess('Informe generado exitosamente desde el audio');
															setReportUrl(reportUrl);
														}}
														onError={(errorMsg) => {
															setError(`Error al generar informe: ${errorMsg}`);
														}}
													/>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
											<div className="p-4 pt-0 space-y-4">
												{/* Botón de Grabar Audio para generar informe */}
												<div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
													<AudioRecorderButton
														consultationId={initial.id}
														reportType="neurology"
														specialty="Neurología"
														onSuccess={(reportUrl) => {
															setSuccess('Informe generado exitosamente desde el audio');
															setReportUrl(reportUrl);
														}}
														onError={(errorMsg) => {
															setError(`Error al generar informe: ${errorMsg}`);
														}}
													/>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
											<div className="p-4 pt-0 space-y-6">
												{/* Si el doctor tiene Obstetricia guardada, mostrar ambos formularios directamente */}
												{hasObstetrics && (
													<>
													{/* Formulario del Primer Trimestre - Siempre visible si tiene Obstetricia */}
													<div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 rounded-xl border border-pink-200 dark:border-pink-800 shadow-sm p-6 mb-6">
														<div className="flex items-center gap-3 mb-6 pb-4 border-b border-pink-200 dark:border-pink-800">
															<div className="w-10 h-10 rounded-lg bg-pink-500 dark:bg-pink-600 flex items-center justify-center">
																<FileText className="w-5 h-5 text-white" />
															</div>
															<h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Formulario del Primer Trimestre</h3>
														</div>
														{/* Botón de Grabar Audio para Primer Trimestre */}
														<div className="mb-4 pb-4 border-b border-pink-200 dark:border-pink-800">
															<AudioRecorderButton
																consultationId={initial.id}
																reportType="first_trimester"
																specialty="Obstetricia - Primer Trimestre"
																onSuccess={(reportUrl) => {
																	setSuccess('Informe del Primer Trimestre generado exitosamente desde el audio');
																	setReportUrl(reportUrl);
																}}
																onError={(errorMsg) => {
																	setError(`Error al generar informe: ${errorMsg}`);
																}}
															/>
														</div>
														<div className="space-y-6">
														{/* Sección: Datos de la Paciente */}
														<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
															<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																<span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
																Datos De La Paciente
															</h4>
															<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																<div>
																	<label className={labelClass}>Edad Gestacional</label>
																	<input value={edadGestacional} onChange={(e) => setEdadGestacional(e.target.value)} className={`${inputBase} ${inputDark}`} />
																</div>
																<div>
																	<label className={labelClass}>FUR</label>
																	<input value={fur} onChange={(e) => setFur(e.target.value)} className={`${inputBase} ${inputDark}`} />
																</div>
																<div>
																	<label className={labelClass}>FPP</label>
																	<input value={fpp} onChange={(e) => setFpp(e.target.value)} type="date" className={`${inputBase} ${inputDark}`} />
																</div>
																<div>
																	<label className={labelClass}>Gestas</label>
																	<input value={gestas} onChange={(e) => setGestas(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																</div>
																<div>
																	<label className={labelClass}>Paras</label>
																	<input value={paras} onChange={(e) => setParas(e.target.value)} className={`${inputBase} ${inputDark}`} />
																</div>
																<div>
																	<label className={labelClass}>Cesareas</label>
																	<input value={cesareas} onChange={(e) => setCesareas(e.target.value)} className={`${inputBase} ${inputDark}`} />
																</div>
																<div>
																	<label className={labelClass}>Abortors</label>
																	<input value={abortors} onChange={(e) => setAbortors(e.target.value)} className={`${inputBase} ${inputDark}`} />
																</div>
																<div>
																	<label className={labelClass}>Otros</label>
																	<input value={otros} onChange={(e) => setOtros(e.target.value)} className={`${inputBase} ${inputDark}`} />
																</div>
																<div>
																	<label className={labelClass}>Motivo de la consulta</label>
																	<input value={motivoConsulta} onChange={(e) => setMotivoConsulta(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Captación de embarazo" />
																</div>
																<div>
																	<label className={labelClass}>Referencia</label>
																	<input value={referencia} onChange={(e) => setReferencia(e.target.value)} className={`${inputBase} ${inputDark}`} />
																</div>
															</div>
														</div>

														{/* Sección: Datos Obstétricos Del 1er Trimestre */}
														<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
															<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																<span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
																Datos Obstétricos Del 1er Trimestre
															</h4>
															<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																<div>
																	<label className={labelClass}>Posición</label>
																	<input value={posicion} onChange={(e) => setPosicion(e.target.value)} className={`${inputBase} ${inputDark}`} />
																</div>
																<div>
																	<label className={labelClass}>Superficie</label>
																	<input value={superficie} onChange={(e) => setSuperficie(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Regular" />
																</div>
																<div>
																	<label className={labelClass}>Miometrio</label>
																	<input value={miometrio} onChange={(e) => setMiometrio(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="HOMOGENEO" />
																</div>
																<div>
																	<label className={labelClass}>Endometrio</label>
																	<input value={endometrio} onChange={(e) => setEndometrio(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Ocupado Por Saco Gestacional." />
																</div>
																<div>
																	<label className={labelClass}>Ovario Derecho</label>
																	<input value={ovarioDerecho} onChange={(e) => setOvarioDerecho(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Normal" />
																</div>
																<div>
																	<label className={labelClass}>Ovario Izquierdo</label>
																	<input value={ovarioIzquierdo} onChange={(e) => setOvarioIzquierdo(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Normal" />
																</div>
																<div>
																	<label className={labelClass}>Anexos Ecopatron</label>
																	<input value={anexosEcopatron} onChange={(e) => setAnexosEcopatron(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Normal" />
																</div>
																<div>
																	<label className={labelClass}>Fondo De Saco</label>
																	<input value={fondoDeSaco} onChange={(e) => setFondoDeSaco(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Libre" />
																</div>
																<div>
																	<label className={labelClass}>Cuerpo Lúteo</label>
																	<select value={cuerpoLuteo} onChange={(e) => setCuerpoLuteo(e.target.value)} className={`${inputBase} ${inputDark}`}>
																		<option value="">Seleccionar...</option>
																		<option value="Presente">Presente</option>
																		<option value="Ausente">Ausente</option>
																		<option value="Otro">Otro</option>
																	</select>
																</div>
															</div>
														</div>

														{/* Sección: Saco Gestacional */}
														<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
															<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																<span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
																Saco Gestacional
															</h4>
															<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
																<div>
																	<label className={labelClass}>Gestación</label>
																	<select value={gestacion} onChange={(e) => setGestacion(e.target.value)} className={`${inputBase} ${inputDark}`}>
																		<option value="">Seleccionar...</option>
																		<option value="Única">Única</option>
																		<option value="Múltiple">Múltiple</option>
																	</select>
																</div>
																<div>
																	<label className={labelClass}>Localización</label>
																	<select value={localizacion} onChange={(e) => setLocalizacion(e.target.value)} className={`${inputBase} ${inputDark}`}>
																		<option value="">Seleccionar...</option>
																		<option value="Intrauterina">Intrauterina</option>
																		<option value="Extrauterina">Extrauterina</option>
																		<option value="Otro">Otro</option>
																	</select>
																</div>
																<div>
																	<label className={labelClass}>Vesícula</label>
																	<select value={vesicula} onChange={(e) => setVesicula(e.target.value)} className={`${inputBase} ${inputDark}`}>
																		<option value="">Seleccionar...</option>
																		<option value="No Visible">No Visible</option>
																		<option value="Visible">Visible</option>
																		<option value="Otro">Otro</option>
																	</select>
																</div>
																<div>
																	<label className={labelClass}>Cavidad Exocelomica</label>
																	<select value={cavidadExocelomica} onChange={(e) => setCavidadExocelomica(e.target.value)} className={`${inputBase} ${inputDark}`}>
																		<option value="">Seleccionar...</option>
																		<option value="No Visible">No Visible</option>
																		<option value="Visible">Visible</option>
																		<option value="Otro">Otro</option>
																	</select>
																</div>
															</div>
														</div>

														{/* Sección: Embrión */}
														<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
															<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																<span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
																Embrión
															</h4>
															<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																<div>
																	<label className={labelClass}>Embrión Visto</label>
																	<select value={embrionVisto} onChange={(e) => setEmbrionVisto(e.target.value)} className={`${inputBase} ${inputDark}`}>
																		<option value="">Seleccionar...</option>
																		<option value="Si">Si</option>
																		<option value="No">No</option>
																	</select>
																</div>
																<div>
																	<label className={labelClass}>Ecoanatomía</label>
																	<select value={ecoanatomia} onChange={(e) => setEcoanatomia(e.target.value)} className={`${inputBase} ${inputDark}`}>
																		<option value="">Seleccionar...</option>
																		<option value="Acorde a Edad Gestacional">Acorde a Edad Gestacional</option>
																		<option value="No Acorde a Edad Gestacional">No Acorde a Edad Gestacional</option>
																		<option value="Otro">Otro</option>
																	</select>
																</div>
																<div>
																	<label className={labelClass}>LCR</label>
																	<input value={lcr} onChange={(e) => setLcr(e.target.value)} className={`${inputBase} ${inputDark}`} />
																</div>
																<div>
																	<label className={labelClass}>Acorde A</label>
																	<input value={acordeA} onChange={(e) => setAcordeA(e.target.value)} className={`${inputBase} ${inputDark}`} />
																</div>
																<div>
																	<label className={labelClass}>Actividad Cardiaca</label>
																	<select value={actividadCardiaca} onChange={(e) => setActividadCardiaca(e.target.value)} className={`${inputBase} ${inputDark}`}>
																		<option value="">Seleccionar...</option>
																		<option value="Presente">Presente</option>
																		<option value="Ausente">Ausente</option>
																		<option value="Otro">Otro</option>
																	</select>
																</div>
																<div>
																	<label className={labelClass}>Movimientos Embrionarios</label>
																	<select value={movimientosEmbrionarios} onChange={(e) => setMovimientosEmbrionarios(e.target.value)} className={`${inputBase} ${inputDark}`}>
																		<option value="">Seleccionar...</option>
																		<option value="Normal">Normal</option>
																		<option value="Lentos">Lentos</option>
																		<option value="Ausentes">Ausentes</option>
																		<option value="Otro">Otro</option>
																	</select>
																</div>
															</div>
														</div>

														{/* Sección: Conclusiones */}
														<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
															<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																<span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
																Conclusiones
															</h4>
															<textarea
																value={conclusiones}
																onChange={(e) => {
																	const value = e.target.value;
																	// Si el usuario presiona Enter, agregar numeración automática
																	if (value.length > conclusiones.length && value.endsWith('\n')) {
																		const lines = value.split('\n');
																		const lastLine = lines[lines.length - 2] || '';
																		const lastLineMatch = lastLine.match(/^(\d+)\.\s*(.*)$/);
																		if (lastLineMatch || lastLine.trim() === '') {
																			const nextNumber = lastLineMatch ? parseInt(lastLineMatch[1]) + 1 : 1;
																			const newValue = value.slice(0, -1) + `\n${nextNumber}. `;
																			setConclusiones(newValue);
																			return;
																		}
																	}
																	setConclusiones(value);
																}}
																onKeyDown={(e) => {
																	// Si presiona Enter, agregar numeración
																	if (e.key === 'Enter' && !e.shiftKey) {
																		e.preventDefault();
																		const lines = conclusiones.split('\n');
																		const lastLine = lines[lines.length - 1] || '';
																		const lastLineMatch = lastLine.match(/^(\d+)\.\s*(.*)$/);
																		const nextNumber = lastLineMatch ? parseInt(lastLineMatch[1]) + 1 : lines.filter(l => l.match(/^\d+\./)).length + 1;
																		setConclusiones(conclusiones + (conclusiones ? '\n' : '') + `${nextNumber}. `);
																	}
																}}
																rows={8}
																className={`${inputBase} ${inputDark} font-mono text-sm`}
																placeholder="1. Escribe la primera conclusión y presiona Enter para la siguiente..."
															/>
															<p className="text-xs text-slate-500 mt-2">Presiona Enter para agregar automáticamente el siguiente número de conclusión.</p>
														</div>
														</div>
													</div>
													{/* Formulario del Segundo y Tercer Trimestre */}
													<div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm p-6 mt-6">
														<div className="flex items-center gap-3 mb-6 pb-4 border-b border-indigo-200 dark:border-indigo-800">
															<div className="w-10 h-10 rounded-lg bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center">
																<FileText className="w-5 h-5 text-white" />
															</div>
															<h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Formulario del Segundo y Tercer Trimestre</h3>
														</div>
														{/* Botón de Grabar Audio para Segundo y Tercer Trimestre */}
														<div className="mb-4 pb-4 border-b border-indigo-200 dark:border-indigo-800">
															<AudioRecorderButton
																consultationId={initial.id}
																reportType="second_third_trimester"
																specialty="Obstetricia - Segundo y Tercer Trimestre"
																onSuccess={(reportUrl) => {
																	setSuccess('Informe del Segundo y Tercer Trimestre generado exitosamente desde el audio');
																	setReportUrl(reportUrl);
																}}
																onError={(errorMsg) => {
																	setError(`Error al generar informe: ${errorMsg}`);
																}}
															/>
														</div>
														<div className="space-y-6">
															{/* Primera sección: Datos de la Paciente */}
															<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																	<span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
																	Datos De La Paciente
																</h4>
																<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																	<div>
																		<label className={labelClass}>Edad Gestacional</label>
																		<input value={edadGestacional_t2} onChange={(e) => setEdadGestacional_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>FUR</label>
																		<input value={fur_t2} onChange={(e) => setFur_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>FPP</label>
																		<input value={fpp_t2} onChange={(e) => setFpp_t2(e.target.value)} type="date" className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Gestas</label>
																		<input value={gestas_t2} onChange={(e) => setGestas_t2(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Paras</label>
																		<input value={paras_t2} onChange={(e) => setParas_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Cesáreas</label>
																		<input value={cesareas_t2} onChange={(e) => setCesareas_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Abortos</label>
																		<input value={abortos_t2} onChange={(e) => setAbortos_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Otros</label>
																		<input value={otros_t2} onChange={(e) => setOtros_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Motivo de la consulta</label>
																		<input value={motivoConsulta_t2} onChange={(e) => setMotivoConsulta_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Referencia</label>
																		<input value={referencia_t2} onChange={(e) => setReferencia_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																</div>
															</div>

															{/* Segunda sección: Datos Obstétricos */}
															<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																	<span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
																	Datos Obstétricos
																</h4>
																<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																	<div>
																		<label className={labelClass}>Nº de Fetos</label>
																		<input value={numFetos} onChange={(e) => setNumFetos(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Actividad Cardiaca</label>
																		<select value={actividadCardiaca_t2} onChange={(e) => setActividadCardiaca_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="">Seleccionar...</option>
																			<option value="Presente">Presente</option>
																			<option value="Ausente">Ausente</option>
																			<option value="Otro">Otro</option>
																		</select>
																	</div>
																	<div>
																		<label className={labelClass}>Situación</label>
																		<input value={situacion_t2} onChange={(e) => setSituacion_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Presentación</label>
																		<input value={presentacion_t2} onChange={(e) => setPresentacion_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Dorso</label>
																		<input value={dorso_t2} onChange={(e) => setDorso_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																</div>
															</div>

															{/* Tercera sección: Datos Biométricos */}
															<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																	<span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
																	Datos Biométricos
																</h4>
																<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																	<div>
																		<label className={labelClass}>DBP (mm)</label>
																		<input value={dbp} onChange={(e) => setDbp(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>CC (mm)</label>
																		<input value={cc} onChange={(e) => setCc(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>CA (mm)</label>
																		<input value={ca} onChange={(e) => setCa(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>LF (mm)</label>
																		<input value={lf} onChange={(e) => setLf(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Peso Estimado Fetal</label>
																		<input value={pesoEstimadoFetal} onChange={(e) => setPesoEstimadoFetal(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Para</label>
																		<input value={para_t2} onChange={(e) => setPara_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																</div>
															</div>

															{/* Cuarta sección: Datos Placenta Foliculares */}
															<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																	<span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
																	Datos Placenta Foliculares
																</h4>
																<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																	<div>
																		<label className={labelClass}>Placenta</label>
																		<input value={placenta_t2} onChange={(e) => setPlacenta_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>UBI.</label>
																		<input value={ubi_t2} onChange={(e) => setUbi_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Inserción</label>
																		<input value={insercion_t2} onChange={(e) => setInsercion_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Grado</label>
																		<input value={grado_t2} onChange={(e) => setGrado_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>Cordón Umbilical</label>
																		<select value={cordonUmbilical_t2} onChange={(e) => setCordonUmbilical_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																			<option value="">Seleccionar...</option>
																			<option value="3 ELEMENTOS">3 ELEMENTOS</option>
																			<option value="Otro">Otro</option>
																		</select>
																	</div>
																	<div>
																		<label className={labelClass}>Liqu. Amniótico</label>
																		<input value={liquAmniotico_t2} onChange={(e) => setLiquAmniotico_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>P</label>
																		<input value={p_t2} onChange={(e) => setP_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																	<div>
																		<label className={labelClass}>ILA</label>
																		<input value={ila_t2} onChange={(e) => setIla_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																	</div>
																</div>
															</div>

															{/* Quinta sección: Datos Anatomofuncionales */}
															<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-6 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																	<span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
																	Datos Anatomofuncionales
																</h4>
																
																{/* Subsección: CABEZA, CUELLO, SNC */}
																<div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
																	<h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-400">CABEZA, CUELLO, SNC</h5>
																	<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
																		<div>
																			<label className={labelClass}>Cráneo</label>
																			<select value={craneo_t2} onChange={(e) => setCraneo_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Normal">Normal</option>
																				<option value="Anormal">Anormal</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																	</div>
																</div>

																{/* Subsección: TÓRAX */}
																<div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
																	<h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-400">TÓRAX</h5>
																	<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
																		<div>
																			<label className={labelClass}>Corazón</label>
																			<select value={corazon_t2} onChange={(e) => setCorazon_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Normal">Normal</option>
																				<option value="Anormal">Anormal</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>FCF</label>
																			<input value={fcf} onChange={(e) => setFcf(e.target.value)} className={`${inputBase} ${inputDark}`} />
																		</div>
																		<div>
																			<label className={labelClass}>Pulmones</label>
																			<select value={pulmones_t2} onChange={(e) => setPulmones_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Normal">Normal</option>
																				<option value="Anormal">Anormal</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																	</div>
																</div>

																{/* Subsección: ABDOMEN */}
																<div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
																	<h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-400">ABDOMEN</h5>
																	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																		<div>
																			<label className={labelClass}>Situs Visceral</label>
																			<select value={situsVisceral_t2} onChange={(e) => setSitusVisceral_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Normal">Normal</option>
																				<option value="Anormal">Anormal</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>Intestino</label>
																			<select value={intestino_t2} onChange={(e) => setIntestino_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Normal">Normal</option>
																				<option value="Anormal">Anormal</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																		<div className="md:col-span-2 lg:col-span-1 grid grid-cols-2 gap-2">
																			<div>
																				<label className={labelClass}>Vejiga</label>
																				<select value={vejiga_t2} onChange={(e) => setVejiga_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																					<option value="">Seleccionar...</option>
																					<option value="Normal">Normal</option>
																					<option value="Anormal">Anormal</option>
																					<option value="Otro">Otro</option>
																				</select>
																			</div>
																			<div>
																				<label className={labelClass}>Datos Extra</label>
																				<input value={vejigaExtra_t2} onChange={(e) => setVejigaExtra_t2(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Ej: LLENA" />
																			</div>
																		</div>
																		<div className="md:col-span-2 lg:col-span-1 grid grid-cols-2 gap-2">
																			<div>
																				<label className={labelClass}>Estómago</label>
																				<select value={estomago_t2} onChange={(e) => setEstomago_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																					<option value="">Seleccionar...</option>
																					<option value="Normal">Normal</option>
																					<option value="Anormal">Anormal</option>
																					<option value="Otro">Otro</option>
																				</select>
																			</div>
																			<div>
																				<label className={labelClass}>Datos Extra</label>
																				<input value={estomagoExtra_t2} onChange={(e) => setEstomagoExtra_t2(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Ej: LLENO" />
																			</div>
																		</div>
																		<div className="md:col-span-2 lg:col-span-1 grid grid-cols-2 gap-2">
																			<div>
																				<label className={labelClass}>Riñones</label>
																				<select value={rinones_t2} onChange={(e) => setRinones_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																					<option value="">Seleccionar...</option>
																					<option value="Normal">Normal</option>
																					<option value="Anormal">Anormal</option>
																					<option value="Otro">Otro</option>
																				</select>
																			</div>
																			<div>
																				<label className={labelClass}>Datos Extra</label>
																				<input value={rinonesExtra_t2} onChange={(e) => setRinonesExtra_t2(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Ej: 2 VISTOS" />
																			</div>
																		</div>
																		<div>
																			<label className={labelClass}>Genitales</label>
																			<input value={genitales_t2} onChange={(e) => setGenitales_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																		</div>
																	</div>
																</div>

																{/* Subsección: EXTREMIDADES */}
																<div className="mb-6">
																	<h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-400">EXTREMIDADES</h5>
																	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
																		<div>
																			<label className={labelClass}>Miembros Superiores</label>
																			<select value={miembrosSuperiores_t2} onChange={(e) => setMiembrosSuperiores_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Normal">Normal</option>
																				<option value="Anormal">Anormal</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>Manos</label>
																			<select value={manos_t2} onChange={(e) => setManos_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Normal">Normal</option>
																				<option value="Anormal">Anormal</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>Miembros Inferiores</label>
																			<select value={miembrosInferiores_t2} onChange={(e) => setMiembrosInferiores_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Normal">Normal</option>
																				<option value="Anormal">Anormal</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>Pies</label>
																			<select value={pies_t2} onChange={(e) => setPies_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Normal">Normal</option>
																				<option value="Anormal">Anormal</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																	</div>
																</div>
															</div>

															{/* Sección: Conclusiones */}
															<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																	<span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
																	Conclusiones
																</h4>
																<textarea
																	value={conclusiones_t2}
																	onChange={(e) => {
																		const value = e.target.value;
																		setConclusiones_t2(value);
																	}}
																	onKeyDown={(e) => {
																		// Si presiona Enter sin Shift, agregar numeración automática
																		if (e.key === 'Enter' && !e.shiftKey) {
																			e.preventDefault();
																			
																			const textarea = e.currentTarget;
																			const startPos = textarea.selectionStart;
																			const endPos = textarea.selectionEnd;
																			const currentValue = conclusiones_t2;
																			
																			const beforeCursor = currentValue.substring(0, startPos);
																			const afterCursor = currentValue.substring(endPos);
																			
																			const linesBefore = beforeCursor.split('\n');
																			const currentLineIndex = linesBefore.length - 1;
																			const currentLine = linesBefore[currentLineIndex] || '';
																			
																			const lineMatch = currentLine.match(/^(\d+)\.\s*(.*)$/);
																			
																			let nextNumber = 1;
																			
																			if (lineMatch) {
																				nextNumber = parseInt(lineMatch[1]) + 1;
																			} else {
																				const allLines = currentValue.split('\n');
																				const numberedLines = allLines
																					.map((line: string) => {
																						const match = line.match(/^(\d+)\./);
																						return match ? parseInt(match[1]) : 0;
																					})
																					.filter((num: number) => num > 0);
																				
																				if (numberedLines.length > 0) {
																					nextNumber = Math.max(...numberedLines) + 1;
																				} else if (currentLine.trim() !== '' || currentValue.trim() !== '') {
																					nextNumber = 1;
																				}
																			}
																			
																			const needsNewline = beforeCursor.trim() !== '' && !beforeCursor.endsWith('\n');
																			const newLineWithNumber = `${needsNewline ? '\n' : ''}${nextNumber}. `;
																			
																			const newValue = beforeCursor + newLineWithNumber + afterCursor;
																			setConclusiones_t2(newValue);
																			
																			setTimeout(() => {
																				const newCursorPos = startPos + newLineWithNumber.length;
																				textarea.setSelectionRange(newCursorPos, newCursorPos);
																				textarea.focus();
																			}, 10);
																		}
																	}}
																	rows={8}
																	className={`${inputBase} ${inputDark} font-mono text-sm`}
																	placeholder="1. Escribe la primera conclusión y presiona Enter para la siguiente..."
																/>
																<p className="text-xs text-slate-500 mt-2">Presiona Enter para agregar automáticamente el siguiente número de conclusión.</p>
															</div>
														</div>
													</div>
												</>
												)}
												
												{/* Si no tiene Obstetricia guardada pero la especialidad está en shouldShowSpecialty, mostrar selector (compatibilidad) */}
												{!hasObstetrics && (
													<React.Fragment>
														{/* Selector de tipo de informe */}
														<div>
															<label className={labelClass}>Tipo de Informe a Generar</label>
															<select
																value={obstetricReportType}
																onChange={(e) => setObstetricReportType(e.target.value)}
																className={`${inputBase} ${inputDark}`}
															>
																<option value="gynecology">Informe de Ginecología</option>
																<option value="first_trimester">Informe del Primer Trimestre</option>
																<option value="second_third_trimester">Informe del Segundo y Tercer Trimestre</option>
															</select>
														</div>
														
														{/* Formulario del Primer Trimestre */}
														{obstetricReportType === 'first_trimester' && (
															<div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 rounded-xl border border-pink-200 dark:border-pink-800 shadow-sm p-6 mt-6">
																<div className="flex items-center gap-3 mb-6 pb-4 border-b border-pink-200 dark:border-pink-800">
																	<div className="w-10 h-10 rounded-lg bg-pink-500 dark:bg-pink-600 flex items-center justify-center">
																		<FileText className="w-5 h-5 text-white" />
																	</div>
																	<h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Formulario del Primer Trimestre</h3>
																</div>
																{/* Botón de Grabar Audio para Primer Trimestre */}
																<div className="mb-4 pb-4 border-b border-pink-200 dark:border-pink-800">
																	<AudioRecorderButton
																		consultationId={initial.id}
																		reportType="first_trimester"
																		specialty="Obstetricia - Primer Trimestre"
																		onSuccess={(reportUrl) => {
																			setSuccess('Informe del Primer Trimestre generado exitosamente desde el audio');
																			setReportUrl(reportUrl);
																		}}
																		onError={(errorMsg) => {
																			setError(`Error al generar informe: ${errorMsg}`);
																		}}
																	/>
																</div>
																<div className="space-y-6">
																{/* Sección: Datos de la Paciente */}
																<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																	<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																		<span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
																		Datos De La Paciente
																	</h4>
																	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																		<div>
																			<label className={labelClass}>Edad Gestacional</label>
																			<input value={edadGestacional} onChange={(e) => setEdadGestacional(e.target.value)} className={`${inputBase} ${inputDark}`} />
																		</div>
																		<div>
																			<label className={labelClass}>FUR</label>
																			<input value={fur} onChange={(e) => setFur(e.target.value)} className={`${inputBase} ${inputDark}`} />
																		</div>
																		<div>
																			<label className={labelClass}>FPP</label>
																			<input value={fpp} onChange={(e) => setFpp(e.target.value)} type="date" className={`${inputBase} ${inputDark}`} />
																		</div>
																		<div>
																			<label className={labelClass}>Gestas</label>
																			<input value={gestas} onChange={(e) => setGestas(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																		</div>
																		<div>
																			<label className={labelClass}>Paras</label>
																			<input value={paras} onChange={(e) => setParas(e.target.value)} className={`${inputBase} ${inputDark}`} />
																		</div>
																		<div>
																			<label className={labelClass}>Cesareas</label>
																			<input value={cesareas} onChange={(e) => setCesareas(e.target.value)} className={`${inputBase} ${inputDark}`} />
																		</div>
																		<div>
																			<label className={labelClass}>Abortors</label>
																			<input value={abortors} onChange={(e) => setAbortors(e.target.value)} className={`${inputBase} ${inputDark}`} />
																		</div>
																		<div>
																			<label className={labelClass}>Otros</label>
																			<input value={otros} onChange={(e) => setOtros(e.target.value)} className={`${inputBase} ${inputDark}`} />
																		</div>
																		<div>
																			<label className={labelClass}>Motivo de la consulta</label>
																			<input value={motivoConsulta} onChange={(e) => setMotivoConsulta(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Captación de embarazo" />
																		</div>
																		<div>
																			<label className={labelClass}>Referencia</label>
																			<input value={referencia} onChange={(e) => setReferencia(e.target.value)} className={`${inputBase} ${inputDark}`} />
																		</div>
																	</div>
																</div>

																{/* Sección: Datos Obstétricos Del 1er Trimestre */}
																<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																	<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																		<span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
																		Datos Obstétricos Del 1er Trimestre
																	</h4>
																	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																		<div>
																			<label className={labelClass}>Posición</label>
																			<input value={posicion} onChange={(e) => setPosicion(e.target.value)} className={`${inputBase} ${inputDark}`} />
																		</div>
																		<div>
																			<label className={labelClass}>Superficie</label>
																			<input value={superficie} onChange={(e) => setSuperficie(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Regular" />
																		</div>
																		<div>
																			<label className={labelClass}>Miometrio</label>
																			<input value={miometrio} onChange={(e) => setMiometrio(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="HOMOGENEO" />
																		</div>
																		<div>
																			<label className={labelClass}>Endometrio</label>
																			<input value={endometrio} onChange={(e) => setEndometrio(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Ocupado Por Saco Gestacional." />
																		</div>
																		<div>
																			<label className={labelClass}>Ovario Derecho</label>
																			<input value={ovarioDerecho} onChange={(e) => setOvarioDerecho(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Normal" />
																		</div>
																		<div>
																			<label className={labelClass}>Ovario Izquierdo</label>
																			<input value={ovarioIzquierdo} onChange={(e) => setOvarioIzquierdo(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Normal" />
																		</div>
																		<div>
																			<label className={labelClass}>Anexos Ecopatron</label>
																			<input value={anexosEcopatron} onChange={(e) => setAnexosEcopatron(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Normal" />
																		</div>
																		<div>
																			<label className={labelClass}>Fondo De Saco</label>
																			<input value={fondoDeSaco} onChange={(e) => setFondoDeSaco(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Libre" />
																		</div>
																		<div>
																			<label className={labelClass}>Cuerpo Lúteo</label>
																			<select value={cuerpoLuteo} onChange={(e) => setCuerpoLuteo(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Presente">Presente</option>
																				<option value="Ausente">Ausente</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																	</div>
																</div>

																{/* Sección: Saco Gestacional */}
																<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																	<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																		<span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
																		Saco Gestacional
																	</h4>
																	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
																		<div>
																			<label className={labelClass}>Gestación</label>
																			<select value={gestacion} onChange={(e) => setGestacion(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Única">Única</option>
																				<option value="Múltiple">Múltiple</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>Localización</label>
																			<select value={localizacion} onChange={(e) => setLocalizacion(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Intrauterina">Intrauterina</option>
																				<option value="Extrauterina">Extrauterina</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>Vesícula</label>
																			<select value={vesicula} onChange={(e) => setVesicula(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="No Visible">No Visible</option>
																				<option value="Visible">Visible</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>Cavidad Exocelomica</label>
																			<select value={cavidadExocelomica} onChange={(e) => setCavidadExocelomica(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="No Visible">No Visible</option>
																				<option value="Visible">Visible</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																	</div>
																</div>

																{/* Sección: Embrión */}
																<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																	<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																		<span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
																		Embrión
																	</h4>
																	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																		<div>
																			<label className={labelClass}>Embrión Visto</label>
																			<select value={embrionVisto} onChange={(e) => setEmbrionVisto(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Si">Si</option>
																				<option value="No">No</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>Ecoanatomía</label>
																			<select value={ecoanatomia} onChange={(e) => setEcoanatomia(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Acorde a Edad Gestacional">Acorde a Edad Gestacional</option>
																				<option value="No Acorde a Edad Gestacional">No Acorde a Edad Gestacional</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>LCR</label>
																			<input value={lcr} onChange={(e) => setLcr(e.target.value)} className={`${inputBase} ${inputDark}`} />
																		</div>
																		<div>
																			<label className={labelClass}>Acorde A</label>
																			<input value={acordeA} onChange={(e) => setAcordeA(e.target.value)} className={`${inputBase} ${inputDark}`} />
																		</div>
																		<div>
																			<label className={labelClass}>Actividad Cardiaca</label>
																			<select value={actividadCardiaca} onChange={(e) => setActividadCardiaca(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Presente">Presente</option>
																				<option value="Ausente">Ausente</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																		<div>
																			<label className={labelClass}>Movimientos Embrionarios</label>
																			<select value={movimientosEmbrionarios} onChange={(e) => setMovimientosEmbrionarios(e.target.value)} className={`${inputBase} ${inputDark}`}>
																				<option value="">Seleccionar...</option>
																				<option value="Normal">Normal</option>
																				<option value="Lentos">Lentos</option>
																				<option value="Ausentes">Ausentes</option>
																				<option value="Otro">Otro</option>
																			</select>
																		</div>
																	</div>
																</div>

																{/* Sección: Conclusiones */}
																<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																	<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																		<span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
																		Conclusiones
																	</h4>
																	<textarea
																		value={conclusiones}
																		onChange={(e) => {
																			const value = e.target.value;
																			if (value.length > conclusiones.length && value.endsWith('\n')) {
																				const lines = value.split('\n');
																				const lastLine = lines[lines.length - 2] || '';
																				const lastLineMatch = lastLine.match(/^(\d+)\.\s*(.*)$/);
																				if (lastLineMatch || lastLine.trim() === '') {
																					const nextNumber = lastLineMatch ? parseInt(lastLineMatch[1]) + 1 : 1;
																					const newValue = value.slice(0, -1) + `\n${nextNumber}. `;
																					setConclusiones(newValue);
																					return;
																				}
																			}
																			setConclusiones(value);
																		}}
																		onKeyDown={(e) => {
																			if (e.key === 'Enter' && !e.shiftKey) {
																				e.preventDefault();
																				const lines = conclusiones.split('\n');
																				const lastLine = lines[lines.length - 1] || '';
																				const lastLineMatch = lastLine.match(/^(\d+)\.\s*(.*)$/);
																				const nextNumber = lastLineMatch ? parseInt(lastLineMatch[1]) + 1 : lines.filter(l => l.match(/^\d+\./)).length + 1;
																				setConclusiones(conclusiones + (conclusiones ? '\n' : '') + `${nextNumber}. `);
																			}
																		}}
																		rows={8}
																		className={`${inputBase} ${inputDark} font-mono text-sm`}
																		placeholder="1. Escribe la primera conclusión y presiona Enter para la siguiente..."
																	/>
																	<p className="text-xs text-slate-500 mt-2">Presiona Enter para agregar automáticamente el siguiente número de conclusión.</p>
																</div>
																</div>
															</div>
														)}

														{/* Formulario del Segundo y Tercer Trimestre */}
														{obstetricReportType === 'second_third_trimester' && (
															<div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm p-6 mt-6">
																<div className="flex items-center gap-3 mb-6 pb-4 border-b border-indigo-200 dark:border-indigo-800">
																	<div className="w-10 h-10 rounded-lg bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center">
																		<FileText className="w-5 h-5 text-white" />
																	</div>
																	<h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Formulario del Segundo y Tercer Trimestre</h3>
																</div>
																{/* Botón de Grabar Audio para Segundo y Tercer Trimestre */}
																<div className="mb-4 pb-4 border-b border-indigo-200 dark:border-indigo-800">
																	<AudioRecorderButton
																		consultationId={initial.id}
																		reportType="second_third_trimester"
																		specialty="Obstetricia - Segundo y Tercer Trimestre"
																		onSuccess={(reportUrl) => {
																			setSuccess('Informe del Segundo y Tercer Trimestre generado exitosamente desde el audio');
																			setReportUrl(reportUrl);
																		}}
																		onError={(errorMsg) => {
																			setError(`Error al generar informe: ${errorMsg}`);
																		}}
																	/>
																</div>
																<div className="space-y-6">
																	{/* Primera sección: Datos de la Paciente */}
																	<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																		<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																			<span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
																			Datos De La Paciente
																		</h4>
																		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																			<div>
																				<label className={labelClass}>Edad Gestacional</label>
																				<input value={edadGestacional_t2} onChange={(e) => setEdadGestacional_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>FUR</label>
																				<input value={fur_t2} onChange={(e) => setFur_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>FPP</label>
																				<input value={fpp_t2} onChange={(e) => setFpp_t2(e.target.value)} type="date" className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Gestas</label>
																				<input value={gestas_t2} onChange={(e) => setGestas_t2(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Paras</label>
																				<input value={paras_t2} onChange={(e) => setParas_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Cesáreas</label>
																				<input value={cesareas_t2} onChange={(e) => setCesareas_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Abortos</label>
																				<input value={abortos_t2} onChange={(e) => setAbortos_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Otros</label>
																				<input value={otros_t2} onChange={(e) => setOtros_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Motivo de la consulta</label>
																				<input value={motivoConsulta_t2} onChange={(e) => setMotivoConsulta_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Referencia</label>
																				<input value={referencia_t2} onChange={(e) => setReferencia_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																		</div>
																	</div>

																	{/* Segunda sección: Datos Obstétricos */}
																	<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																		<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																			<span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
																			Datos Obstétricos
																		</h4>
																		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																			<div>
																				<label className={labelClass}>Nº de Fetos</label>
																				<input value={numFetos} onChange={(e) => setNumFetos(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Actividad Cardiaca</label>
																				<select value={actividadCardiaca_t2} onChange={(e) => setActividadCardiaca_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																					<option value="">Seleccionar...</option>
																					<option value="Presente">Presente</option>
																					<option value="Ausente">Ausente</option>
																					<option value="Otro">Otro</option>
																				</select>
																			</div>
																			<div>
																				<label className={labelClass}>Situación</label>
																				<input value={situacion_t2} onChange={(e) => setSituacion_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Presentación</label>
																				<input value={presentacion_t2} onChange={(e) => setPresentacion_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Dorso</label>
																				<input value={dorso_t2} onChange={(e) => setDorso_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																		</div>
																	</div>

																	{/* Tercera sección: Datos Biométricos */}
																	<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																		<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																			<span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
																			Datos Biométricos
																		</h4>
																		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																			<div>
																				<label className={labelClass}>DBP (mm)</label>
																				<input value={dbp} onChange={(e) => setDbp(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>CC (mm)</label>
																				<input value={cc} onChange={(e) => setCc(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>CA (mm)</label>
																				<input value={ca} onChange={(e) => setCa(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>LF (mm)</label>
																				<input value={lf} onChange={(e) => setLf(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Peso Estimado Fetal</label>
																				<input value={pesoEstimadoFetal} onChange={(e) => setPesoEstimadoFetal(e.target.value)} type="number" className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Para</label>
																				<input value={para_t2} onChange={(e) => setPara_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																		</div>
																	</div>

																	{/* Cuarta sección: Datos Placenta Foliculares */}
																	<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																		<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																			<span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
																			Datos Placenta Foliculares
																		</h4>
																		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																			<div>
																				<label className={labelClass}>Placenta</label>
																				<input value={placenta_t2} onChange={(e) => setPlacenta_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>UBI.</label>
																				<input value={ubi_t2} onChange={(e) => setUbi_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Inserción</label>
																				<input value={insercion_t2} onChange={(e) => setInsercion_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Grado</label>
																				<input value={grado_t2} onChange={(e) => setGrado_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>Cordón Umbilical</label>
																				<select value={cordonUmbilical_t2} onChange={(e) => setCordonUmbilical_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																					<option value="">Seleccionar...</option>
																					<option value="3 ELEMENTOS">3 ELEMENTOS</option>
																					<option value="Otro">Otro</option>
																				</select>
																			</div>
																			<div>
																				<label className={labelClass}>Liqu. Amniótico</label>
																				<input value={liquAmniotico_t2} onChange={(e) => setLiquAmniotico_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>P</label>
																				<input value={p_t2} onChange={(e) => setP_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																			<div>
																				<label className={labelClass}>ILA</label>
																				<input value={ila_t2} onChange={(e) => setIla_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																			</div>
																		</div>
																	</div>

																	{/* Quinta sección: Datos Anatomofuncionales */}
																	<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																		<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-6 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																			<span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
																			Datos Anatomofuncionales
																		</h4>
																		
																		{/* Subsección: CABEZA, CUELLO, SNC */}
																		<div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
																			<h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-400">CABEZA, CUELLO, SNC</h5>
																			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
																				<div>
																					<label className={labelClass}>Cráneo</label>
																					<select value={craneo_t2} onChange={(e) => setCraneo_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																						<option value="">Seleccionar...</option>
																						<option value="Normal">Normal</option>
																						<option value="Anormal">Anormal</option>
																						<option value="Otro">Otro</option>
																					</select>
																				</div>
																			</div>
																		</div>

																		{/* Subsección: TÓRAX */}
																		<div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
																			<h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-400">TÓRAX</h5>
																			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
																				<div>
																					<label className={labelClass}>Corazón</label>
																					<select value={corazon_t2} onChange={(e) => setCorazon_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																						<option value="">Seleccionar...</option>
																						<option value="Normal">Normal</option>
																						<option value="Anormal">Anormal</option>
																						<option value="Otro">Otro</option>
																					</select>
																				</div>
																				<div>
																					<label className={labelClass}>FCF</label>
																					<input value={fcf} onChange={(e) => setFcf(e.target.value)} className={`${inputBase} ${inputDark}`} />
																				</div>
																				<div>
																					<label className={labelClass}>Pulmones</label>
																					<select value={pulmones_t2} onChange={(e) => setPulmones_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																						<option value="">Seleccionar...</option>
																						<option value="Normal">Normal</option>
																						<option value="Anormal">Anormal</option>
																						<option value="Otro">Otro</option>
																					</select>
																				</div>
																			</div>
																		</div>

																		{/* Subsección: ABDOMEN */}
																		<div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
																			<h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-400">ABDOMEN</h5>
																			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
																				<div>
																					<label className={labelClass}>Situs Visceral</label>
																					<select value={situsVisceral_t2} onChange={(e) => setSitusVisceral_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																						<option value="">Seleccionar...</option>
																						<option value="Normal">Normal</option>
																						<option value="Anormal">Anormal</option>
																						<option value="Otro">Otro</option>
																					</select>
																				</div>
																				<div>
																					<label className={labelClass}>Intestino</label>
																					<select value={intestino_t2} onChange={(e) => setIntestino_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																						<option value="">Seleccionar...</option>
																						<option value="Normal">Normal</option>
																						<option value="Anormal">Anormal</option>
																						<option value="Otro">Otro</option>
																					</select>
																				</div>
																				<div className="md:col-span-2 lg:col-span-1 grid grid-cols-2 gap-2">
																					<div>
																						<label className={labelClass}>Vejiga</label>
																						<select value={vejiga_t2} onChange={(e) => setVejiga_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																							<option value="">Seleccionar...</option>
																							<option value="Normal">Normal</option>
																							<option value="Anormal">Anormal</option>
																							<option value="Otro">Otro</option>
																						</select>
																					</div>
																					<div>
																						<label className={labelClass}>Datos Extra</label>
																						<input value={vejigaExtra_t2} onChange={(e) => setVejigaExtra_t2(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Ej: LLENA" />
																					</div>
																				</div>
																				<div className="md:col-span-2 lg:col-span-1 grid grid-cols-2 gap-2">
																					<div>
																						<label className={labelClass}>Estómago</label>
																						<select value={estomago_t2} onChange={(e) => setEstomago_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																							<option value="">Seleccionar...</option>
																							<option value="Normal">Normal</option>
																							<option value="Anormal">Anormal</option>
																							<option value="Otro">Otro</option>
																						</select>
																					</div>
																					<div>
																						<label className={labelClass}>Datos Extra</label>
																						<input value={estomagoExtra_t2} onChange={(e) => setEstomagoExtra_t2(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Ej: LLENO" />
																					</div>
																				</div>
																				<div className="md:col-span-2 lg:col-span-1 grid grid-cols-2 gap-2">
																					<div>
																						<label className={labelClass}>Riñones</label>
																						<select value={rinones_t2} onChange={(e) => setRinones_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																							<option value="">Seleccionar...</option>
																							<option value="Normal">Normal</option>
																							<option value="Anormal">Anormal</option>
																							<option value="Otro">Otro</option>
																						</select>
																					</div>
																					<div>
																						<label className={labelClass}>Datos Extra</label>
																						<input value={rinonesExtra_t2} onChange={(e) => setRinonesExtra_t2(e.target.value)} className={`${inputBase} ${inputDark}`} placeholder="Ej: 2 VISTOS" />
																					</div>
																				</div>
																				<div>
																					<label className={labelClass}>Genitales</label>
																					<input value={genitales_t2} onChange={(e) => setGenitales_t2(e.target.value)} className={`${inputBase} ${inputDark}`} />
																				</div>
																			</div>
																		</div>

																		{/* Subsección: EXTREMIDADES */}
																		<div className="mb-6">
																			<h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-400">EXTREMIDADES</h5>
																			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
																				<div>
																					<label className={labelClass}>Miembros Superiores</label>
																					<select value={miembrosSuperiores_t2} onChange={(e) => setMiembrosSuperiores_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																						<option value="">Seleccionar...</option>
																						<option value="Normal">Normal</option>
																						<option value="Anormal">Anormal</option>
																						<option value="Otro">Otro</option>
																					</select>
																				</div>
																				<div>
																					<label className={labelClass}>Manos</label>
																					<select value={manos_t2} onChange={(e) => setManos_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																						<option value="">Seleccionar...</option>
																						<option value="Normal">Normal</option>
																						<option value="Anormal">Anormal</option>
																						<option value="Otro">Otro</option>
																					</select>
																				</div>
																				<div>
																					<label className={labelClass}>Miembros Inferiores</label>
																					<select value={miembrosInferiores_t2} onChange={(e) => setMiembrosInferiores_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																						<option value="">Seleccionar...</option>
																						<option value="Normal">Normal</option>
																						<option value="Anormal">Anormal</option>
																						<option value="Otro">Otro</option>
																					</select>
																				</div>
																				<div>
																					<label className={labelClass}>Pies</label>
																					<select value={pies_t2} onChange={(e) => setPies_t2(e.target.value)} className={`${inputBase} ${inputDark}`}>
																						<option value="">Seleccionar...</option>
																						<option value="Normal">Normal</option>
																						<option value="Anormal">Anormal</option>
																						<option value="Otro">Otro</option>
																					</select>
																				</div>
																			</div>
																		</div>
																	</div>

																	{/* Sección: Conclusiones */}
																	<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
																		<h4 className="font-bold text-slate-900 dark:text-slate-100 mb-5 text-base flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
																			<span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
																			Conclusiones
																		</h4>
																		<textarea
																			value={conclusiones_t2}
																			onChange={(e) => {
																				const value = e.target.value;
																				setConclusiones_t2(value);
																			}}
																			onKeyDown={(e) => {
																				// Si presiona Enter sin Shift, agregar numeración automática
																				if (e.key === 'Enter' && !e.shiftKey) {
																					e.preventDefault();
																					
																					const textarea = e.currentTarget;
																					const startPos = textarea.selectionStart;
																					const endPos = textarea.selectionEnd;
																					const currentValue = conclusiones_t2;
																					
																					const beforeCursor = currentValue.substring(0, startPos);
																					const afterCursor = currentValue.substring(endPos);
																					
																					const linesBefore = beforeCursor.split('\n');
																					const currentLineIndex = linesBefore.length - 1;
																					const currentLine = linesBefore[currentLineIndex] || '';
																					
																					const lineMatch = currentLine.match(/^(\d+)\.\s*(.*)$/);
																					
																					let nextNumber = 1;
																					
																					if (lineMatch) {
																						nextNumber = parseInt(lineMatch[1]) + 1;
																					} else {
																						const allLines = currentValue.split('\n');
																						const numberedLines = allLines
																							.map((line: string) => {
																								const match = line.match(/^(\d+)\./);
																								return match ? parseInt(match[1]) : 0;
																							})
																							.filter((num: number) => num > 0);
																						
																						if (numberedLines.length > 0) {
																							nextNumber = Math.max(...numberedLines) + 1;
																						} else if (currentLine.trim() !== '' || currentValue.trim() !== '') {
																							nextNumber = 1;
																						}
																					}
																					
																					const needsNewline = beforeCursor.trim() !== '' && !beforeCursor.endsWith('\n');
																					const newLineWithNumber = `${needsNewline ? '\n' : ''}${nextNumber}. `;
																					
																					const newValue = beforeCursor + newLineWithNumber + afterCursor;
																					setConclusiones_t2(newValue);
																					
																					setTimeout(() => {
																						const newCursorPos = startPos + newLineWithNumber.length;
																						textarea.setSelectionRange(newCursorPos, newCursorPos);
																						textarea.focus();
																					}, 10);
																				}
																			}}
																			rows={8}
																			className={`${inputBase} ${inputDark} font-mono text-sm`}
																			placeholder="1. Escribe la primera conclusión y presiona Enter para la siguiente..."
																		/>
																		<p className="text-xs text-slate-500 mt-2">Presiona Enter para agregar automáticamente el siguiente número de conclusión.</p>
																	</div>
																</div>
															</div>
														)}

														{/* Formulario de Ginecología (campos antiguos) */}
														{obstetricReportType === 'gynecology' && (
															<div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-slate-200 dark:border-slate-700 pt-4">
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
													</React.Fragment>
												)}
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
											<div className="p-4 pt-0 space-y-4">
												{/* Botón de Grabar Audio para generar informe */}
												<div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
													<AudioRecorderButton
														consultationId={initial.id}
														reportType="nutrition"
														specialty="Nutrición"
														onSuccess={(reportUrl) => {
															setSuccess('Informe generado exitosamente desde el audio');
															setReportUrl(reportUrl);
														}}
														onError={(errorMsg) => {
															setError(`Error al generar informe: ${errorMsg}`);
														}}
													/>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
													<div>
														<label className={labelClass}>Circunferencia Cintura (cm)</label>
														<input value={waistCircumference} onChange={(e) => setWaistCircumference(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
													</div>
												<div>
													<label className={labelClass}>IMC (Override)</label>
													<input value={bmiOverride} onChange={(e) => setBmiOverride(e.target.value)} placeholder={computedBMI || ''} className={`${inputBase} ${inputDark}`} />
												</div>
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
											<div className="p-4 pt-0 space-y-4">
												{/* Botón de Grabar Audio para generar informe */}
												<div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
													<AudioRecorderButton
														consultationId={initial.id}
														reportType="dermatology"
														specialty="Dermatología"
														onSuccess={(reportUrl) => {
															setSuccess('Informe generado exitosamente desde el audio');
															setReportUrl(reportUrl);
														}}
														onError={(errorMsg) => {
															setError(`Error al generar informe: ${errorMsg}`);
														}}
													/>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
													<div className="md:col-span-2">
														<label className={labelClass}>Descripción Lesión</label>
														<input value={lesionDesc} onChange={(e) => setLesionDesc(e.target.value)} className={`${inputBase} ${inputDark}`} />
													</div>
												<div>
													<label className={labelClass}>Tamaño Lesión (cm)</label>
													<input value={lesionSize} onChange={(e) => setLesionSize(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
												</div>
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
											<div className="p-4 pt-0 space-y-4">
												{/* Botón de Grabar Audio para generar informe */}
												<div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
													<AudioRecorderButton
														consultationId={initial.id}
														reportType="psychiatry"
														specialty="Psiquiatría"
														onSuccess={(reportUrl) => {
															setSuccess('Informe generado exitosamente desde el audio');
															setReportUrl(reportUrl);
														}}
														onError={(errorMsg) => {
															setError(`Error al generar informe: ${errorMsg}`);
														}}
													/>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
													<div>
														<label className={labelClass}>Escala de Ánimo</label>
														<input value={moodScale} onChange={(e) => setMoodScale(e.target.value)} className={`${inputBase} ${inputDark}`} />
													</div>
												<div>
													<label className={labelClass}>PHQ-9</label>
													<input value={phq9} onChange={(e) => setPhq9(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" />
												</div>
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
											<div className="p-4 pt-0 space-y-4">
												{/* Botón de Grabar Audio para generar informe */}
												<div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
													<AudioRecorderButton
														consultationId={initial.id}
														reportType="orthopedics"
														specialty="Ortopedia"
														onSuccess={(reportUrl) => {
															setSuccess('Informe generado exitosamente desde el audio');
															setReportUrl(reportUrl);
														}}
														onError={(errorMsg) => {
															setError(`Error al generar informe: ${errorMsg}`);
														}}
													/>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
													<div className="md:col-span-2">
														<label className={labelClass}>Rango de Movimiento (Notas)</label>
														<input value={romNotes} onChange={(e) => setRomNotes(e.target.value)} className={`${inputBase} ${inputDark}`} />
													</div>
												<div>
													<label className={labelClass}>Fuerza (0-5)</label>
													<input value={limbStrength} onChange={(e) => setLimbStrength(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="numeric" min="0" max="5" />
												</div>
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
											<div className="p-4 pt-0 space-y-4">
												{/* Botón de Grabar Audio para generar informe */}
												<div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
													<AudioRecorderButton
														consultationId={initial.id}
														reportType="ent"
														specialty="ORL/Otorrino"
														onSuccess={(reportUrl) => {
															setSuccess('Informe generado exitosamente desde el audio');
															setReportUrl(reportUrl);
														}}
														onError={(errorMsg) => {
															setError(`Error al generar informe: ${errorMsg}`);
														}}
													/>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
											</div>
										)}
									</div>
								)}

								{/* Gynecology */}
								{shouldShowSpecialty('gynecology') && (
									<div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
										{/* Si es solo Vídeo colposcopía O solo colposcopia, mostrar directamente la sección de colposcopia sin el resto del formulario */}
										{(isOnlyVideoColposcopia || shouldOnlyShowColposcopy) ? (
											<div className="p-4">
												<h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
													<div className="w-1 h-6 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full"></div>
													Vídeo Colposcopía
												</h3>
												<p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Complete todos los campos del examen colposcópico según los hallazgos observados</p>
												
												{/* Sección de Colposcopia directamente visible - Solo mostrar la sección de colposcopia completa */}
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

															{/* Sección 7: Imagen Colposcópica y Detalles Adicionales */}
															<div className="bg-gradient-to-br from-rose-50 to-pink-50/50 dark:from-rose-900/20 dark:to-pink-900/10 rounded-xl p-6 border border-rose-200 dark:border-rose-800 shadow-sm">
																<h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
																	<div className="w-2 h-2 bg-rose-500 rounded-full"></div>
																	Documentación Adicional
																</h4>

																<div className="space-y-6">
																	{/* Campo de Imagen Colposcópica */}
																	<div>
																		<label className={labelClass}>Imagen Colposcópica</label>
																		<div className="space-y-3">
																			{colposcopyImage ? (
																				<div className="relative border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
																					<div className="flex items-center justify-between">
																						<div className="flex items-center gap-3 flex-1 min-w-0">
																							<div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
																								<Image className="w-6 h-6 text-white" />
																							</div>
																							<div className="flex-1 min-w-0">
																								<p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">Imagen colposcópica cargada</p>
																								<a href={colposcopyImage} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 dark:text-teal-400 hover:underline truncate block">
																									Ver imagen
																								</a>
																							</div>
																						</div>
																						<button type="button" onClick={() => setColposcopyImage('')} className="flex-shrink-0 ml-3 p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900 transition-colors">
																							<X size={18} />
																						</button>
																					</div>
																				</div>
																			) : (
																				<label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
																					<div className="flex flex-col items-center justify-center pt-5 pb-6">
																						{uploadingColposcopyImage ? (
																							<>
																								<Loader2 className="w-8 h-8 mb-2 text-teal-600 dark:text-teal-400 animate-spin" />
																								<p className="text-sm text-slate-600 dark:text-slate-400">Subiendo imagen...</p>
																							</>
																						) : (
																							<>
																								<Upload className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-500" />
																								<p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
																									<span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
																								</p>
																								<p className="text-xs text-slate-500 dark:text-slate-500">PNG, JPG, WEBP (MAX. 10MB)</p>
																							</>
																						)}
																					</div>
																					<input
																						type="file"
																						className="hidden"
																						accept="image/png,image/jpeg,image/jpg,image/webp"
																						onChange={async (e) => {
																							const file = e.target.files?.[0];
																							if (!file) return;

																							// Validar tamaño (10MB)
																							if (file.size > 10 * 1024 * 1024) {
																								alert('El archivo es demasiado grande. Máximo 10MB.');
																								return;
																							}

																							setUploadingColposcopyImage(true);
																							try {
																								const formData = new FormData();
																								formData.append('file', file);
																								formData.append('consultation_id', initial.id);
																								formData.append('file_name', 'colposcopy-image');

																								const res = await fetch('/api/consultations/upload-image', {
																									method: 'POST',
																									body: formData,
																								});

																								const data = await res.json();

																								if (!res.ok) {
																									throw new Error(data.error || 'Error al subir imagen');
																								}

																								setColposcopyImage(data.url);
																								setSuccess('Imagen colposcópica subida exitosamente');
																							} catch (err: any) {
																								setError(err?.message || 'Error al subir imagen');
																							} finally {
																								setUploadingColposcopyImage(false);
																							}
																						}}
																						disabled={uploadingColposcopyImage}
																					/>
																				</label>
																			)}
																		</div>
																		<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Sube una imagen del examen colposcópico para documentar los hallazgos visuales</p>
																	</div>

																	{/* Campo de Detalles Adicionales */}
																	<div>
																		<label className={labelClass}>Detalles Adicionales</label>
																		<textarea value={colposcopyAdditionalDetails} onChange={(e) => setColposcopyAdditionalDetails(e.target.value)} rows={4} className={`${inputBase} ${inputDark} resize-none`} placeholder="Agrega comentarios adicionales sobre la colposcopía, observaciones importantes, recomendaciones de seguimiento, etc." />
																		<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Comentarios adicionales sobre el examen colposcópico</p>
																	</div>
																</div>
															</div>
														</div>
													</div>
												) : (
													<>
														<button type="button" onClick={() => toggleSpecialty('gynecology')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
															<span className="font-semibold text-slate-900 dark:text-slate-100">Ginecología</span>
															{expandedSpecialties.has('gynecology') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
														</button>
														{expandedSpecialties.has('gynecology') && (
															<div className="p-4 pt-0 space-y-6">
																{/* Botón de Grabar Audio para generar informe */}
																<div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
																	<AudioRecorderButton
																		consultationId={initial.id}
																		reportType="gynecology"
																		specialty="Ginecología"
																		onSuccess={(reportUrl) => {
																			setSuccess('Informe generado exitosamente desde el audio');
																			setReportUrl(reportUrl);
																		}}
																		onError={(errorMsg) => {
																			setError(`Error al generar informe: ${errorMsg}`);
																		}}
																	/>
																</div>
																{/* Si solo debe mostrar colposcopia, ocultar el resto del formulario */}
																{!shouldOnlyShowColposcopy && (
																	<>
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

																{/* Ecografía Transvaginal - Mostrar si tiene Ecografía Transvaginal o si NO es una Consulta simple Y NO es solo colposcopia */}
																{(hasEcografiaTransvaginal || (!isSimpleConsulta && !shouldOnlyShowColposcopy)) && (
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
																				<label className={labelClass}>Ecografía Transvaginal Interfase Endometrial</label>
																				<select value={endometrialInterfacePhase} onChange={(e) => setEndometrialInterfacePhase(e.target.value)} className={`${inputBase} ${inputDark}`}>
																					<option value="">Seleccionar...</option>
																					<option value="Menstrual: Día 1 - 4">Lineal</option>
																					<option value="Proliferativa Temprana: Día 5 - 13">Proliferativa Temprana</option>
																					<option value="Proliferativa Tardía: Día 14 - 16">Proliferativa Tardía</option>
																					<option value="Secretora: Día 16 - 28">Secretora</option>
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
																)}

																{/* Diagnóstico con CIE-11 - Solo si NO es solo colposcopia */}
																{!shouldOnlyShowColposcopy && (
																	<div className="border-t border-slate-200 dark:border-slate-700 pt-4">
																		<label className={labelClass}>Diagnóstico (CIE-11)</label>
																		<ICD11Search
																			onSelect={(code) => {
																				setIcd11Code(code.code);
																				setIcd11Title(code.title);
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
																)}

																{/* Observaciones Adicionales - Solo si NO es solo colposcopia */}
																{!shouldOnlyShowColposcopy && (
																	<div className="border-t border-slate-200 dark:border-slate-700 pt-4">
																		<label className={labelClass}>Observaciones Adicionales</label>
																		<textarea value={cervicalExamNotes} onChange={(e) => setCervicalExamNotes(e.target.value)} className={`${inputBase} ${inputDark}`} rows={3} placeholder="Observaciones adicionales del examen cervical" />
																	</div>
																)}
																	</>
																)}

																{/* Botón para mostrar formulario de Colposcopia - Solo si NO es una Consulta simple Y NO es solo Consulta+Ecografía Y NO es solo Vídeo colposcopía Y NO se muestra automáticamente Y NO es solo colposcopia */}
																{!isSimpleConsulta && !hasEcografiaTransvaginal && !isOnlyVideoColposcopia && !shouldAutoShowColposcopy && !shouldOnlyShowColposcopy && (
																	<div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex justify-end">
																		<button type="button" onClick={() => setShowColposcopySection(!showColposcopySection)} className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2">
																			{showColposcopySection ? 'Ocultar' : 'Siguiente'} - Colposcopia
																			{showColposcopySection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
																		</button>
																	</div>
																)}

																{/* Sección de Colposcopia - Mostrar si:
																	- NO es una Consulta simple Y NO es solo Consulta+Ecografía Y showColposcopySection está activo
																	- O si debe mostrarse automáticamente (ginecología sin consulta o servicio con colposcopia) */}
																{((!isSimpleConsulta && !hasEcografiaTransvaginal && showColposcopySection) || shouldAutoShowColposcopy) && (
																	<div className="border-t-2 border-teal-500 dark:border-teal-400 pt-6 mt-6">
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
																			{/* Sección 7: Imagen Colposcópica y Detalles Adicionales */}
																			<div className="bg-gradient-to-br from-rose-50 to-pink-50/50 dark:from-rose-900/20 dark:to-pink-900/10 rounded-xl p-6 border border-rose-200 dark:border-rose-800 shadow-sm">
																				<h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
																					<div className="w-2 h-2 bg-rose-500 rounded-full"></div>
																					Documentación Adicional
																				</h4>
																				<div className="space-y-6">
																					<div>
																						<label className={labelClass}>Imagen Colposcópica</label>
																						<div className="space-y-3">
																							{colposcopyImage ? (
																								<div className="relative border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
																									<div className="flex items-center justify-between">
																										<div className="flex items-center gap-3 flex-1 min-w-0">
																											<div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
																												<Image className="w-6 h-6 text-white" />
																											</div>
																											<div className="flex-1 min-w-0">
																												<p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">Imagen colposcópica cargada</p>
																												<a href={colposcopyImage} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 dark:text-teal-400 hover:underline truncate block">
																													Ver imagen
																												</a>
																											</div>
																										</div>
																										<button type="button" onClick={() => setColposcopyImage('')} className="flex-shrink-0 ml-3 p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900 transition-colors">
																											<X size={18} />
																										</button>
																									</div>
																								</div>
																							) : (
																								<label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
																									<div className="flex flex-col items-center justify-center pt-5 pb-6">
																										{uploadingColposcopyImage ? (
																											<>
																												<Loader2 className="w-8 h-8 mb-2 text-teal-600 dark:text-teal-400 animate-spin" />
																												<p className="text-sm text-slate-600 dark:text-slate-400">Subiendo imagen...</p>
																											</>
																										) : (
																											<>
																												<Upload className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-500" />
																												<p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
																													<span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
																												</p>
																												<p className="text-xs text-slate-500 dark:text-slate-500">PNG, JPG, WEBP (MAX. 10MB)</p>
																											</>
																										)}
																									</div>
																									<input
																										type="file"
																										className="hidden"
																										accept="image/png,image/jpeg,image/jpg,image/webp"
																										onChange={async (e) => {
																											const file = e.target.files?.[0];
																											if (!file) return;
																											if (file.size > 10 * 1024 * 1024) {
																												alert('El archivo es demasiado grande. Máximo 10MB.');
																												return;
																											}
																											setUploadingColposcopyImage(true);
																											try {
																												const formData = new FormData();
																												formData.append('file', file);
																												formData.append('consultation_id', initial.id);
																												formData.append('file_name', 'colposcopy-image');
																												const res = await fetch('/api/consultations/upload-image', {
																													method: 'POST',
																													body: formData,
																												});
																												const data = await res.json();
																												if (!res.ok) {
																													throw new Error(data.error || 'Error al subir imagen');
																												}
																												setColposcopyImage(data.url);
																												setSuccess('Imagen colposcópica subida exitosamente');
																											} catch (err: any) {
																												setError(err?.message || 'Error al subir imagen');
																											} finally {
																												setUploadingColposcopyImage(false);
																											}
																										}}
																										disabled={uploadingColposcopyImage}
																									/>
																								</label>
																							)}
																						</div>
																						<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Sube una imagen del examen colposcópico para documentar los hallazgos visuales</p>
																					</div>
																					<div>
																						<label className={labelClass}>Detalles Adicionales</label>
																						<textarea value={colposcopyAdditionalDetails} onChange={(e) => setColposcopyAdditionalDetails(e.target.value)} rows={4} className={`${inputBase} ${inputDark} resize-none`} placeholder="Agrega comentarios adicionales sobre la colposcopía, observaciones importantes, recomendaciones de seguimiento, etc." />
																						<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Comentarios adicionales sobre el examen colposcópico</p>
																					</div>
																				</div>
																			</div>
																		</div>
																	</div>
																)}
															</div>
														)}
													</>
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
											<div className="p-4 pt-0 space-y-4">
												{/* Botón de Grabar Audio para generar informe */}
												<div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
													<AudioRecorderButton
														consultationId={initial.id}
														reportType="endocrinology"
														specialty="Endocrinología"
														onSuccess={(reportUrl) => {
															setSuccess('Informe generado exitosamente desde el audio');
															setReportUrl(reportUrl);
														}}
														onError={(errorMsg) => {
															setError(`Error al generar informe: ${errorMsg}`);
														}}
													/>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
													<div>
														<label className={labelClass}>TSH (mIU/L)</label>
													<input value={tsh} onChange={(e) => setTsh(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
												</div>
												<div>
													<label className={labelClass}>HbA1c (%)</label>
													<input value={hba1c} onChange={(e) => setHba1c(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" step="0.1" />
												</div>
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
											<div className="p-4 pt-0 space-y-4">
												{/* Botón de Grabar Audio para generar informe */}
												<div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
													<AudioRecorderButton
														consultationId={initial.id}
														reportType="ophthalmology"
														specialty="Oftalmología"
														onSuccess={(reportUrl) => {
															setSuccess('Informe generado exitosamente desde el audio');
															setReportUrl(reportUrl);
														}}
														onError={(errorMsg) => {
															setError(`Error al generar informe: ${errorMsg}`);
														}}
													/>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
													<div>
														<label className={labelClass}>Agudeza Visual (p.ej. 20/20)</label>
														<input value={visualAcuity} onChange={(e) => setVisualAcuity(e.target.value)} className={`${inputBase} ${inputDark}`} />
													</div>
													<div>
														<label className={labelClass}>Presión Intraocular (mmHg)</label>
														<input value={iop} onChange={(e) => setIop(e.target.value)} className={`${inputBase} ${inputDark}`} type="number" inputMode="decimal" />
													</div>
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
							<div className="mb-6 flex items-center justify-between">
								<h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
									<FileCheck size={20} />
									Generar Informe Médico
								</h2>
								<button
									type="button"
									onClick={() => setShowPrivateNotesModal(true)}
									className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
									<Lock size={16} />
									Observaciones Privadas
								</button>
							</div>

							{hasObstetrics ? (
								<div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4 mb-6">
									<p className="text-sm text-pink-800 dark:text-pink-200 mb-3">
										<strong>Tipo de Informe:</strong> Selecciona el tipo de informe que deseas generar.
									</p>
									<div className="flex flex-wrap gap-3">
										<button
											type="button"
											onClick={() => {
												setSelectedReportType('gynecology');
												setReportContent('');
												setReportError(null);
												setReportSuccess(null);
											}}
											className={`px-4 py-2 rounded-lg font-medium transition-colors ${
												selectedReportType === 'gynecology'
													? 'bg-teal-600 text-white shadow-md'
													: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-teal-300 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/30'
											}`}>
											📋 Informe de Ginecología
										</button>
										<button
											type="button"
											onClick={() => {
												setSelectedReportType('first_trimester');
												setReportContent('');
												setReportError(null);
												setReportSuccess(null);
											}}
											className={`px-4 py-2 rounded-lg font-medium transition-colors ${
												selectedReportType === 'first_trimester'
													? 'bg-pink-600 text-white shadow-md'
													: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-pink-300 dark:border-pink-700 hover:bg-pink-100 dark:hover:bg-pink-900/30'
											}`}>
											📋 Informe del Primer Trimestre
										</button>
										<button
											type="button"
											onClick={() => {
												setSelectedReportType('second_third_trimester');
												setReportContent('');
												setReportError(null);
												setReportSuccess(null);
											}}
											className={`px-4 py-2 rounded-lg font-medium transition-colors ${
												selectedReportType === 'second_third_trimester'
													? 'bg-indigo-600 text-white shadow-md'
													: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
											}`}>
											📋 Informe del 2do y 3er Trimestre
										</button>
									</div>
								</div>
							) : (
								<div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4 mb-6">
									<p className="text-sm text-teal-800 dark:text-teal-200">
										<strong>Informe de Ginecología:</strong> Se generará el informe de ginecología estándar.
									</p>
								</div>
							)}

							{/* Instrucciones diferentes según el tipo de informe */}
							{selectedReportType === 'first_trimester' || selectedReportType === 'second_third_trimester' ? (
								<div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4 mb-6">
									<p className="text-sm text-pink-800 dark:text-pink-200">
										<strong>Instrucciones:</strong> Este informe se genera directamente desde la plantilla de Word cargada. Las variables del formulario se insertarán automáticamente en el documento Word.
										<span className="block mt-2">
											<strong>Importante:</strong> Asegúrate de haber cargado la plantilla de Word correspondiente en{' '}
											<Link 
												href="/dashboard/medic/plantilla-informe" 
												className="text-pink-700 dark:text-pink-300 underline font-semibold hover:text-pink-800 dark:hover:text-pink-200 transition-colors"
											>
												"dashboard/medic/plantilla-informe"
											</Link>
											{' '}para el tipo de informe seleccionado ({selectedReportType === 'first_trimester' ? 'Primer Trimestre' : 'Segundo y Tercer Trimestre'}).
										</span>
									</p>
								</div>
							) : (
								<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
									<p className="text-sm text-blue-800 dark:text-blue-200">
										<strong>Instrucciones:</strong> El contenido del informe se genera automáticamente desde la plantilla de texto configurada. Puedes revisar y editar el contenido antes de generar el informe. El contenido se insertará en el marcador <code className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded font-mono text-xs">{'{{contenido}}'}</code> de tu plantilla Word.
										<span className="block mt-2">
											<strong>Importante:</strong> Asegúrate de haber cargado la plantilla de Word correspondiente en{' '}
											<Link 
												href="/dashboard/medic/plantilla-informe" 
												className="text-blue-700 dark:text-blue-300 underline font-semibold hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
											>
												"dashboard/medic/plantilla-informe"
											</Link>
											{' '}para el tipo de informe seleccionado.
										</span>
									</p>
								</div>
							)}

							<div className="space-y-4">
								{/* Selector de Fuente */}
								<div>
									<label className={labelClass}>Fuente del Informe</label>
									<select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className={`${inputBase} ${inputDark} w-full`} style={{ fontFamily: fontFamily }}>
										{availableFonts.map((font) => (
											<option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
												{font.label}
											</option>
										))}
									</select>
									<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">La fuente seleccionada se aplicará al generar el informe.</p>
								</div>

								{/* Campo de Contenido del Informe - Solo para informes que NO son de obstetricia (1er trimestre o 2do/3er trimestre) */}
								{(selectedReportType !== 'first_trimester' && selectedReportType !== 'second_third_trimester') && (
									<>
										<div className="flex items-center justify-between">
											<label className={labelClass}>Contenido del Informe</label>
											<button
												type="button"
												onClick={async () => {
													try {
														// Determinar el tipo de informe
														const vitals = initial.vitals || {};
														const obst = vitals.obstetrics || {};
														const reportType = obst.report_type || selectedReportType;
														
														const res = await fetch(`/api/consultations/${initial.id}/generate-report-content?report_type=${reportType}`, {
															credentials: 'include',
														});
														const data = await res.json();
														if (res.ok && data.content) {
															setReportContent(data.content);
															if (data.font_family) {
																setFontFamily(data.font_family);
															}
															setReportSuccess('Contenido generado automáticamente desde la plantilla');
															setReportError(null);
														} else {
															setReportError(data.error || 'Error al generar contenido automáticamente');
															setReportSuccess(null);
														}
													} catch (err: any) {
														setReportError(err.message || 'Error al generar contenido automáticamente');
														setReportSuccess(null);
													}
												}}
												className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
												🔄 Generar Automáticamente
											</button>
										</div>
										<textarea value={reportContent} onChange={(e) => setReportContent(e.target.value)} rows={16} className={`${inputBase} ${inputDark} resize-none font-mono text-sm`} placeholder="El contenido se generará automáticamente desde la plantilla de texto. Haz clic en 'Generar Automáticamente' o escribe el contenido manualmente..." />
									</>
								)}

								{reportError && <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 text-sm">{reportError}</div>}

								{reportSuccess && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-4 text-sm">{reportSuccess}</div>}

								{/* Botones de acción del informe */}
								<div className="flex flex-col gap-3">
									{/* Fila 1: Generar y Descargar lado a lado */}
									<div className="flex items-center gap-3">
										<button 
											type="button" 
											onClick={handleGenerateReport} 
											disabled={
												generatingReport || 
												(selectedReportType !== 'first_trimester' && 
												 selectedReportType !== 'second_third_trimester' && 
												 !reportContent.trim())
											} 
											className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
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

										{reportUrl ? (
											<a href={reportUrl} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
												<Download size={18} />
												Descargar Informe
											</a>
										) : null}
									</div>

									{/* Fila 2: Guardar Informe (debajo de Descargar) */}
									{reportUrl ? (
										<button type="button" onClick={handleSaveReport} disabled={savingReport} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
											{savingReport ? (
												<>
													<Loader2 className="w-5 h-5 animate-spin" />
													Guardando Informe...
												</>
											) : (
												<>
													<Save size={18} />
													Guardar Informe en Base de Datos
												</>
											)}
										</button>
									) : null}
								</div>
							</div>
						</div>
					)}

					{/* Prescription Section - After Report */}
					{activeTab === 'report' && (
						<div className={sectionCard}>
							<div className="mb-6">
								<h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
									<ClipboardList size={20} />
									Prescripción Médica
								</h2>
							</div>

							<div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4 mb-6">
								<p className="text-sm text-teal-800 dark:text-teal-200">
									<strong>Información:</strong> Crea y gestiona las prescripciones médicas para esta consulta. Puedes agregar medicamentos, dosis, frecuencia y duración del tratamiento.
								</p>
							</div>

							<div className="flex justify-center">
								<Link href={`/dashboard/medic/consultas/${initial.id}/prescription`} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all" aria-label="Crear prescripción">
									<ClipboardList size={18} />
									Crear Prescripción
								</Link>
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

			{/* Modal de Observaciones Privadas */}
			<DoctorPrivateNotesModal
				isOpen={showPrivateNotesModal}
				onClose={() => setShowPrivateNotesModal(false)}
				consultationId={initial.id}
				patientId={initial.patient_id || null}
				unregisteredPatientId={(initial as any).unregistered_patient_id || null}
				doctorId={initial.doctor_id}
			/>
		</div>
	);
}
