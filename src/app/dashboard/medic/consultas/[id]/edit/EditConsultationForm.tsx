'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { 
	Loader2, 
	Save, 
	Trash2, 
	FileText, 
	Download, 
	ChevronUp, 
	Activity, 
	ClipboardList, 
	Stethoscope, 
	FileCheck, 
	X, 
	Sparkles, 
	Plus,
	ShieldAlert,
	User,
	Clipboard,
	ChevronRight,
	FileDown,
	HeartPulse,
	Lock,
	Settings,
	CheckCircle2,
	Baby,
	Droplets
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ICD11Search from '@/components/ICD11Search';
import { useOptimisticSave } from '@/lib/optimistic-save';
import { extractTextFromDocx } from '@/lib/docx-parser';
import { parseRecipeText } from '@/lib/docx-section-parser';
import AudioRecorderButton from '@/components/medic/AudioRecorderButton';
import PrescriptionForm, { PrescriptionFormData } from '@/components/medic/PrescriptionForm';

// Modular Obstetrics Components
import ObstetricsT1 from '@/components/medic/consultations/obstetrics/ObstetricsT1';
import ObstetricsT2T3 from '@/components/medic/consultations/obstetrics/ObstetricsT2T3';

// Componentes Reutilizables Pequeños
const MultiInput = ({ 
	value, 
	onChange, 
	placeholder 
}: { 
	value: string; 
	onChange: (val: string) => void; 
	placeholder?: string 
}) => {
	const [inputValue, setInputValue] = useState('');
	
	const items = value ? value.split('\n').filter(line => line.trim() !== '') : [];

	const handleAdd = () => {
		if (inputValue.trim()) {
			const newItems = [...items, inputValue.trim()];
			onChange(newItems.join('\n'));
			setInputValue('');
		}
	};

	const handleRemove = (index: number) => {
		const newItems = items.filter((_, i) => i !== index);
		onChange(newItems.join('\n'));
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAdd();
		}
	};

	return (
		<div className="space-y-2">
			<div className="flex gap-2">
				<input
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					onKeyDown={handleKeyDown}
					className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition flex-1"
					placeholder={placeholder || "Escribir y Enter"}
				/>
				<button
					type="button"
					onClick={handleAdd}
					className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
				>
					<Plus size={18} />
				</button>
			</div>
			{items.length > 0 && (
				<ul className="space-y-1">
					{items.map((item, idx) => (
						<li key={idx} className="flex items-start justify-between gap-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg text-sm group">
							<span className="text-slate-700 break-words flex-1 text-xs font-medium">{item}</span>
							<button
								type="button"
								onClick={() => handleRemove(idx)}
								className="text-slate-400 hover:text-rose-500 transition-colors flex-shrink-0"
							>
								<X size={14} />
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
import DoctorPrivateNotesModal from '@/components/medic/DoctorPrivateNotesModal';
import ConsultationSidebar, { NavItemStatus } from '../../components/ConsultationSidebar';
import ConsultationContentPane from '../../components/ConsultationContentPane';
import ReportPreviewPane from '../../components/ReportPreviewPane';

// Tipos de datos para la consulta
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
	report_url?: string | null;
	unregistered_patient_id?: string | null;
};

// Componentes Reutilizables Pequeños
const QuickValueChip = ({ label, options, currentValue, onSelect }: { label: string, options: string[], currentValue: string, onSelect: (val: string) => void }) => (
	<div className="flex flex-col gap-2">
		<span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
			<ChevronRight size={10} className="text-teal-500" /> {label}
		</span>
		<div className="flex flex-wrap gap-2">
			{options.map(opt => (
				<button
					key={opt}
					type="button"
					onClick={() => onSelect(opt)}
					className={`px-3 py-1 text-xs rounded-full border transition-all ${
						currentValue === opt 
							? 'bg-teal-500 border-teal-500 text-white shadow-md scale-105' 
							: 'bg-white border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50'
					}`}
				>
					{opt}
				</button>
			))}
		</div>
	</div>
);

export default function EditConsultationForm({ 
	initial, 
	patient, 
	doctor, 
	doctorSpecialties 
}: { 
	initial: ConsultationShape; 
	patient?: any; 
	doctor?: any; 
	doctorSpecialties?: string[];
}) {
	const router = useRouter();
	const { saveOptimistically } = useOptimisticSave();
	
	// --- Estilos ASHIRA ---
	const inputBase = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition';
	const labelClass = 'block text-sm font-semibold text-slate-700 mb-2';
	const sectionCard = 'w-full';

	// --- ESTADO DE NAVEGACIÓN ---
	const [currentSection, setCurrentSection] = useState('patient_data');
	const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
	const [showPreview, setShowPreview] = useState(false);
	const [loading, setLoading] = useState(false);
	const [generatingReport, setGeneratingReport] = useState(false);
	const [reportUrl, setReportUrl] = useState<string | null>(initial.report_url || null);
	const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
	const [savingReport, setSavingReport] = useState(false);

	// --- ESTADO DE REPORTE ---
	const [selectedReportType, setSelectedReportType] = useState<'gynecology' | 'first_trimester' | 'second_third_trimester'>('gynecology');
	const [reportContent, setReportContent] = useState('');
	const [reportError, setReportError] = useState<string | null>(null);
	const [reportSuccess, setReportSuccess] = useState<string | null>(null);
	const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
	
	// --- ESTADO DE CORREO ---
	const [sendingEmail, setSendingEmail] = useState(false);
	const [emailSent, setEmailSent] = useState(false);
	const [patientEmail, setPatientEmail] = useState(patient?.email || '');

	// --- ESTADO DE PRESCRIPCIÓN ---
	const [prescriptionInitialData, setPrescriptionInitialData] = useState<PrescriptionFormData>({
		patientId: patient?.id || '',
		items: []
	});
	const [selectedTemplateUrl, setSelectedTemplateUrl] = useState<string | null>(null);

	const availableFonts = [
		{ label: 'Arial (Docxtemplater default)', value: 'Arial' },
		{ label: 'Times New Roman', value: 'Times New Roman' },
		{ label: 'Calibri', value: 'Calibri' },
		{ label: 'Helvetica', value: 'Helvetica' },
		{ label: 'Outfit (Ashira)', value: 'Outfit' },
		{ label: 'Inter (Ashira)', value: 'Inter' }
	];

	// --- ESTADO DE LA CONSULTA (GINECOLOGÍA) ---
	const initVitals = (initial.vitals ?? {}) as Record<string, any>;
	const initGen = initVitals.general ?? {};
	const initGyn = initVitals.gynecology ?? {};
	const initObst = initVitals.obstetrics ?? {};

	// --- ESTADOS DE OBSTETRICIA (RESTAURADOS) ---
	const [obstetricsT1, setObstetricsT1] = useState(initObst.first_trimester ?? {
		edad_gestacional: '', fur: '', fpp: '', gestas: '', paras: '', cesareas: '', abortors: '', otros: '',
		motivo_consulta: '', referencia: '', posicion: '', superficie: '',
		miometrio: '', endometrio: '', ovario_derecho: '',
		ovario_izquierdo: '', anexos_ecopatron: '', fondo_de_saco: '', cuerpo_luteo: '',
		gestacion: '', localizacion: '', vesicula: '', cavidad_exocelomica: '', embrion_visto: '',
		ecoanatomia: '', lcr: '', acorde_a: '', actividad_cardiaca: '', movimientos_embrionarios: '',
		conclusiones: ''
	});

	const [obstetricsT2T3, setObstetricsT2T3] = useState(initObst.second_third_trimester ?? {
		edad_gestacional: '', fur: '', fpp: '', gestas: '', paras: '', cesareas: '', abortos: '', otros: '',
		motivo_consulta: '', referencia: '', num_fetos: '', actividad_cardiaca: '', situacion: '',
		presentacion: '', dorso: '', dbp: '', cc: '', ca: '', lf: '', peso_estimado_fetal: '',
		para: '', placenta: '', ubi: '', insercion: '', grado: '', cordon_umbilical: '',
		liqu_amniotico: '', p: '', ila: '', craneo: '', corazon: '', fcf: '', pulmones: '',
		situs_visceral: '', intestino: '', vejiga: '', vejiga_extra: '', estomago: '',
		estomago_extra: '', rinones: '', rinones_extra: '', genitales: '', miembros_superiores: '',
		manos: '', miembros_inferiores: '', pies: '', conclusiones: ''
	});

	// Patient details
	const [patientFirstName, setPatientFirstName] = useState(patient?.firstName || '');
	const [patientLastName, setPatientLastName] = useState(patient?.lastName || '');
	const [patientIdentifier, setPatientIdentifier] = useState(patient?.identifier || '');
	const [patientDob, setPatientDob] = useState(patient?.dob?.split('T')[0] || patient?.birth_date || '');
	const [patientAge, setPatientAge] = useState<number | null>(null);
	const [patientPhone, setPatientPhone] = useState(patient?.phone || '');
	const [patientAddress, setPatientAddress] = useState(patient?.address || '');
	const [patientProfession, setPatientProfession] = useState(patient?.profession || '');
	const [patientBloodType, setPatientBloodType] = useState(patient?.blood_type || '');
	const [patientAllergies, setPatientAllergies] = useState(patient?.allergies || '');
	const [patientChronicConditions, setPatientChronicConditions] = useState(patient?.chronic_conditions || '');
	const [patientCurrentMedications, setPatientCurrentMedications] = useState(patient?.current_medication || '');
	const [patientFamilyHistory, setPatientFamilyHistory] = useState(patient?.family_history || '');

	// Function to calculate age
	const calculateAge = (dob: string | Date | null | undefined): number | null => {
		if (!dob) return null;
		try {
			const birthDate = new Date(dob);
			const today = new Date();
			let age = today.getFullYear() - birthDate.getFullYear();
			const m = today.getMonth() - birthDate.getMonth();
			if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
				age--;
			}
			return age;
		} catch {
			return null;
		}
	};

	// Update age when DOB changes
	useEffect(() => {
		if (patientDob) {
			setPatientAge(calculateAge(patientDob));
		}
	}, [patientDob]);

	// Core Medical Info
	const [chiefComplaint, setChiefComplaint] = useState(initial.chief_complaint ?? '');
	const [diagnosis, setDiagnosis] = useState(initial.diagnosis ?? '');
	const [icd11Code, setIcd11Code] = useState(initial.icd11_code ?? '');
	const [icd11Title, setIcd11Title] = useState(initial.icd11_title ?? '');
	const [diagnosisInputMode, setDiagnosisInputMode] = useState<'cie11' | 'manual'>('cie11');
	const [manualDiagnosisInput, setManualDiagnosisInput] = useState('');
	const [gynDiagnoses, setGynDiagnoses] = useState<string[]>(() => {
		if (initGyn.diagnoses && Array.isArray(initGyn.diagnoses)) return initGyn.diagnoses;
		if (initGyn.diagnosis) return [initGyn.diagnosis];
		if (initial.diagnosis) return [initial.diagnosis];
		return [];
	});
	
	// Sincronizar campo diagnosis general con gynDiagnoses
	useEffect(() => {
		if (gynDiagnoses.length > 0) {
			setDiagnosis(gynDiagnoses.join('\n'));
		} else {
			setDiagnosis('');
		}
	}, [gynDiagnoses]);

	const [planIndications, setPlanIndications] = useState(initGyn.plan_indications ?? initGyn.plan_treatment ?? '');
	const [fontFamily, setFontFamily] = useState('Arial');
	const [startedAt, setStartedAt] = useState(initial.started_at || initial.created_at);

	// Vitals
	const [weight, setWeight] = useState(initGen.weight ?? '');
	const [height, setHeight] = useState(initGen.height ?? '');
	const [bpSystolic, setBpSystolic] = useState(initGen.bp_systolic ?? '');
	const [bpDiastolic, setBpDiastolic] = useState(initGen.bp_diastolic ?? '');
	const [heartRate, setHeartRate] = useState(initGen.heart_rate ?? '');
	const [temperature, setTemperature] = useState(initGen.temperature ?? '');
	const [respiratoryRate, setRespiratoryRate] = useState(initGen.respiratory_rate ?? '');
	const [spo2, setSpo2] = useState(initGen.spo2 ?? '');
	const [glucose, setGlucose] = useState(initGen.glucose ?? '');
	const [vitalsNotes, setVitalsNotes] = useState(initGen.notes ?? '');
	const [bmiOverride, setBmiOverride] = useState(initGen.bmi ?? '');

	// Computed BMI
	const computedBMI = useMemo(() => {
		const w = parseFloat(String(weight).replace(',', '.'));
		const h = parseFloat(String(height).replace(',', '.'));
		if (!w || !h || h === 0) return '';
		const heightInMeters = h / 100;
		return (w / (heightInMeters * heightInMeters)).toFixed(1);
	}, [weight, height]);

	// Gyn Specific
	const [allergies, setAllergies] = useState(initGyn.allergies ?? '');
	const [surgicalHistory, setSurgicalHistory] = useState(initGyn.surgical_history ?? '');
	const [familyHistoryMother, setFamilyHistoryMother] = useState(initGyn.family_history_mother ?? '');
	const [familyHistoryFather, setFamilyHistoryFather] = useState(initGyn.family_history_father ?? '');
	const [familyHistoryBreastCancer, setFamilyHistoryBreastCancer] = useState(initGyn.family_history_breast_cancer ?? '');
	const [psychobiologicalHabits, setPsychobiologicalHabits] = useState(initGyn.psychobiological_habits ?? '');
	
	const [menstruationType, setMenstruationType] = useState(initGyn.menstruation_type ?? '');
	const [dysmenorrhea, setDysmenorrhea] = useState(initGyn.dysmenorrhea ?? '');
	const [lmp, setLmp] = useState(initGyn.last_menstrual_period ?? '');
	const [menarche, setMenarche] = useState(initGyn.menarche ?? '');
	const [its, setIts] = useState(initGyn.its ?? '');
	const [gardasil, setGardasil] = useState(initGyn.gardasil ?? '');
	const [ho, setHo] = useState(initGyn.obstetric_history ?? '');

	const [generalConditions, setGeneralConditions] = useState(initGyn.general_conditions ?? '');
	const [breastSymmetry, setBreastSymmetry] = useState(initGyn.breast_symmetry ?? '');
	const [breastCap, setBreastCap] = useState(initGyn.breast_cap ?? '');
	const [abdomen, setAbdomen] = useState(initGyn.abdomen ?? '');
	const [externalGenitals, setExternalGenitals] = useState(initGyn.external_genitals ?? '');
	const [speculumCervix, setSpeculumCervix] = useState(initGyn.speculum_cervix ?? '');
	const [hinselmannTest, setHinselmannTest] = useState(initGyn.hinselmann_test ?? '');
	const [schillerTest, setSchillerTest] = useState(initGyn.schiller_test ?? '');

	const [uterusDimensions, setUterusDimensions] = useState(initGyn.uterus_dimensions ?? '');
	const [endometrialInterface, setEndometrialInterface] = useState(initGyn.endometrial_interface ?? '');
	const [endometrialInterfacePhase, setEndometrialInterfacePhase] = useState(initGyn.endometrial_interface_phase ?? '');
	const [endometrialInterfaceType, setEndometrialInterfaceType] = useState(initGyn.endometrial_interface_type ?? '');
	const [leftOvaryDimensions, setLeftOvaryDimensions] = useState(initGyn.left_ovary_dimensions ?? '');
	const [rightOvaryDimensions, setRightOvaryDimensions] = useState(initGyn.right_ovary_dimensions ?? '');
	const [fundusFluid, setFundusFluid] = useState(initGyn.fundus_fluid ?? '');

	// --- ESTADOS RESTAURADOS DEL LEGACY ---
	const [hypersensitivity, setHypersensitivity] = useState(initGyn.hypersensitivity ?? 'NIEGA');
	const [firstSexualRelation, setFirstSexualRelation] = useState(initGyn.first_sexual_relation ?? '');
	const [sexualPartners, setSexualPartners] = useState(initGyn.sexual_partners ?? '');
	const [lastCytology, setLastCytology] = useState(initGyn.last_cytology ?? '');
	const [mastopathies, setMastopathies] = useState(initGyn.mastopathies ?? 'NIEGA');
	const [currentPartner, setCurrentPartner] = useState(initGyn.current_partner ?? '');
	const [vaccinated, setVaccinated] = useState(initGyn.vaccinated ?? 'NO');
	const [firstPregnancyAge, setFirstPregnancyAge] = useState(initGyn.first_pregnancy_age ?? '');
	const [exclusiveBreastfeeding, setExclusiveBreastfeeding] = useState(initGyn.exclusive_breastfeeding ?? 'NO');
	const [menstruationPattern, setMenstruationPattern] = useState(initGyn.menstruation_pattern ?? '');

	const [breastSize, setBreastSize] = useState(initGyn.breast_size ?? '');
	const [breastSecretion, setBreastSecretion] = useState(initGyn.breast_secretion ?? '');
	const [axillaryFossae, setAxillaryFossae] = useState(initGyn.axillary_fossae ?? '');
	
	const [vaginalDischarge, setVaginalDischarge] = useState(initGyn.vaginal_discharge ?? '');
	const [tactCervix, setTactCervix] = useState(initGyn.tact_cervix ?? '');
	const [fundusSacs, setFundusSacs] = useState(initGyn.fundus_sacs ?? '');
	const [adnexa, setAdnexa] = useState(initGyn.adnexa ?? '');

	const initColposcopy = initGyn.colposcopy ?? {};
	const [colposcopyAcetic5, setColposcopyAcetic5] = useState(initColposcopy.acetic_5 ?? '');
	const [colposcopyEctocervix, setColposcopyEctocervix] = useState(initColposcopy.ectocervix ?? '');
	const [colposcopyType, setColposcopyType] = useState(initColposcopy.type ?? '');
	const [colposcopyExtension, setColposcopyExtension] = useState(initColposcopy.extension ?? '');
	const [colposcopyDescription, setColposcopyDescription] = useState(initColposcopy.description ?? '');
	const [colposcopyLocation, setColposcopyLocation] = useState(initColposcopy.location ?? '');
	const [colposcopyAcetowhite, setColposcopyAcetowhite] = useState(initColposcopy.acetowhite ?? '');
	const [colposcopyAcetowhiteDetails, setColposcopyAcetowhiteDetails] = useState(initColposcopy.acetowhite_details ?? '');
	const [colposcopyMosaic, setColposcopyMosaic] = useState(initColposcopy.mosaic ?? '');
	const [colposcopyPunctation, setColposcopyPunctation] = useState(initColposcopy.punctation ?? '');
	const [colposcopyAtypicalVessels, setColposcopyAtypicalVessels] = useState(initColposcopy.atypical_vessels ?? '');
	const [colposcopyInvasiveCarcinoma, setColposcopyInvasiveCarcinoma] = useState(initColposcopy.invasive_carcinoma ?? '');
	const [colposcopyBorders, setColposcopyBorders] = useState(initColposcopy.borders ?? '');
	const [colposcopySituation, setColposcopySituation] = useState(initColposcopy.situation ?? '');
	const [colposcopyElevation, setColposcopyElevation] = useState(initColposcopy.elevation ?? '');
	const [colposcopyBiopsy, setColposcopyBiopsy] = useState(initColposcopy.biopsy ?? '');
	const [colposcopyBiopsyLocation, setColposcopyBiopsyLocation] = useState(initColposcopy.biopsy_location ?? '');
	const [colposcopyLugol, setColposcopyLugol] = useState(initColposcopy.lugol ?? '');

	// --- PLAN DE TRATAMIENTO ADICIONAL ---
	const [dietIndications, setDietIndications] = useState(initGyn.diet_indications ?? '');
	const [intimateSoap, setIntimateSoap] = useState(initGyn.intimate_soap ?? '');
	const [treatmentInfection, setTreatmentInfection] = useState(initGyn.treatment_infection ?? '');
	const [probiotics, setProbiotics] = useState(initGyn.probiotics ?? '');
	const [vitamins, setVitamins] = useState(initGyn.vitamins ?? '');
	const [contraceptiveTreatment, setContraceptiveTreatment] = useState(initGyn.contraceptive_treatment ?? '');
	const [bleedingTreatment, setBleedingTreatment] = useState(initGyn.bleeding_treatment ?? '');

	const [templates, setTemplates] = useState<any[]>([]);
	const [applyingRecipe, setApplyingRecipe] = useState(false);
	const [linkedRecipeId, setLinkedRecipeId] = useState<string | null>(initGyn.linked_recipe_id ?? null);

	// Cargar plantillas de recetas al inicio
	useEffect(() => {
		const loadTemplates = async () => {
			try {
				const res = await fetch('/api/medic/prescription-templates');
				if (res.ok) {
					const data = await res.json();
					setTemplates(data.templates || []);
				}
			} catch (err) {
				console.error('Error loading templates:', err);
			}
		};
		loadTemplates();
	}, []);
	
	// Sincronizar selectedTemplateUrl si ya existe una receta vinculada al cargar
	useEffect(() => {
		if (linkedRecipeId && templates.length > 0 && !selectedTemplateUrl) {
			const linkedTemplate = templates.find(t => t.id === linkedRecipeId);
			if (linkedTemplate?.file_url) {
				setSelectedTemplateUrl(linkedTemplate.file_url);
			}
		}
	}, [linkedRecipeId, templates, selectedTemplateUrl]);

	const handleApplyRecipe = async (templateId: string) => {
		const template = templates.find((t) => t.id === templateId);
		if (!template) return;

		try {
			setApplyingRecipe(true);
			setLinkedRecipeId(template.id);
			setSelectedTemplateUrl(template.file_url || null);
			
			const fileUrl = template.file_url;
			if (!fileUrl) throw new Error('No se pudo obtener la URL de la plantilla.');

			const res = await fetch(fileUrl);
			if (!res.ok) throw new Error('Error al descargar la plantilla.');
			
			const arrayBuffer = await res.arrayBuffer();
			const text = await extractTextFromDocx(arrayBuffer);
			const parsed = parseRecipeText(text);

			if (parsed.planIndications) setPlanIndications(parsed.planIndications);
			
			// Solo cargamos la descripción general, no los items individuales para evitar duplicados en el Word
			setPrescriptionInitialData(prev => ({
				...prev,
				notes: parsed.description || parsed.planIndications,
				items: [] // Empezamos con lista vacía para nuevos medicamentos
			}));


			if (parsed.dietIndications) setDietIndications(parsed.dietIndications);
			if (parsed.intimateSoap) setIntimateSoap(parsed.intimateSoap);
			if (parsed.treatmentInfection) setTreatmentInfection(parsed.treatmentInfection);
			if (parsed.probiotics) setProbiotics(parsed.probiotics);
			if (parsed.vitamins) setVitamins(parsed.vitamins);
			if (parsed.contraceptiveTreatment) setContraceptiveTreatment(parsed.contraceptiveTreatment);
			if (parsed.bleedingTreatment) setBleedingTreatment(parsed.bleedingTreatment);

			toast.success(`Plantilla "${template.name}" aplicada correctamente.`);
		} catch (err: any) {
			console.error('Error applying recipe:', err);
			toast.error('Error al procesar la plantilla: ' + err.message);
		} finally {
			setApplyingRecipe(false);
		}
	};
	
	const handleSendEmail = async () => {
		if (!patientEmail) {
			toast.error('Ocurrió un error: El paciente no tiene un correo electrónico registrado.');
			return;
		}

		setSendingEmail(true);
		try {
			const res = await fetch('/api/medic/send-clinical-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					consultationId: initial.id,
					patientId: patient?.id,
					recipientEmail: patientEmail
				})
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error al enviar el correo');

			toast.success('Informe y receta enviados correctamente al paciente.');
			setEmailSent(true);
		} catch (err: any) {
			toast.error('No se pudo enviar el correo: ' + err.message);
		} finally {
			setSendingEmail(false);
		}
	};

	// --- ESTADOS DE REPORTE Y SECCIONES ---
	const [includedSections, setIncludedSections] = useState<string[]>(['patient_data', 'vitals', 'plan']);

	// Auto-detectar secciones con datos para el informe
	useEffect(() => {
		setIncludedSections(prev => {
			const detected = new Set(prev);
			let changed = false;
			const check = (id: string, condition: boolean) => {
				if (condition && !detected.has(id)) {
					detected.add(id);
					changed = true;
				}
			};
			check('patient_data', !!chiefComplaint);
			check('vitals', !!(weight || bpSystolic || heartRate || temperature || spo2));
			check('gyn_antecedentes', !!(allergies || surgicalHistory || familyHistoryMother || familyHistoryFather || familyHistoryBreastCancer || psychobiologicalHabits));
			check('gyn_historia', !!(lmp || menarche || firstSexualRelation || sexualPartners || currentPartner || lastCytology || menstruationPattern || firstPregnancyAge || ho));
			check('gyn_fisico', !!(generalConditions || breastSize || breastSymmetry || breastCap || breastSecretion || axillaryFossae || abdomen || externalGenitals || vaginalDischarge || speculumCervix || tactCervix || fundusSacs || adnexa || hinselmannTest || schillerTest));
			check('gyn_eco', !!(uterusDimensions || leftOvaryDimensions || rightOvaryDimensions || endometrialInterface || fundusFluid));
			check('gyn_colpo', !!(colposcopyAcetic5 || colposcopyType || colposcopyAcetowhite || colposcopyBiopsy));
			check('gyn_cie11', gynDiagnoses.length > 0);
			check('obstetrics_t1', Object.values(obstetricsT1).some(v => v && v !== ''));
			check('obstetrics_t2t3', Object.values(obstetricsT2T3).some(v => v && v !== ''));
			check('plan', !!(planIndications || dietIndications || intimateSoap || treatmentInfection || probiotics || vitamins || contraceptiveTreatment || bleedingTreatment));
			return changed ? Array.from(detected) : prev;
		});
	}, [
		chiefComplaint, weight, bpSystolic, heartRate, temperature, spo2,
		allergies, surgicalHistory, familyHistoryMother, familyHistoryFather, familyHistoryBreastCancer, psychobiologicalHabits,
		lmp, menarche, firstSexualRelation, sexualPartners, currentPartner, lastCytology, menstruationPattern, firstPregnancyAge, ho,
		generalConditions, breastSize, breastSymmetry, breastCap, breastSecretion, axillaryFossae, abdomen, externalGenitals, vaginalDischarge, speculumCervix, tactCervix, fundusSacs, adnexa, hinselmannTest, schillerTest,
		uterusDimensions, leftOvaryDimensions, rightOvaryDimensions, endometrialInterface, fundusFluid,
		colposcopyAcetic5, colposcopyType, colposcopyAcetowhite, colposcopyBiopsy,
		gynDiagnoses,
		obstetricsT1,
		obstetricsT2T3,
		planIndications, dietIndications, intimateSoap, treatmentInfection, probiotics, vitamins, contraceptiveTreatment, bleedingTreatment
	]);


	const buildVitalsObject = () => {
		const out = {
			general: { 
				weight, 
				height, 
				temperature, 
				bp_systolic: bpSystolic, 
				bp_diastolic: bpDiastolic, 
				heart_rate: heartRate,
				respiratory_rate: respiratoryRate,
				spo2,
				glucose,
				notes: vitalsNotes,
				bmi: bmiOverride || computedBMI
			},
			gynecology: {
				allergies, surgical_history: surgicalHistory, family_history_mother: familyHistoryMother,
				family_history_father: familyHistoryFather, family_history_breast_cancer: familyHistoryBreastCancer,
				psychobiological_habits: psychobiologicalHabits, hypersensitivity, menstruation_type: menstruationType,
				dysmenorrhea, last_menstrual_period: lmp, menarche, its, gardasil, menstruation_pattern: menstruationPattern,
				first_sexual_relation: firstSexualRelation, sexual_partners: sexualPartners, last_cytology: lastCytology,
				mastopathies, current_partner: currentPartner, vaccinated, first_pregnancy_age: firstPregnancyAge,
				exclusive_breastfeeding: exclusiveBreastfeeding,
				obstetric_history: ho, general_conditions: generalConditions,
				breast_size: breastSize, breast_symmetry: breastSymmetry, breast_cap: breastCap, breast_secretion: breastSecretion,
				axillary_fossae: axillaryFossae, abdomen,
				external_genitals: externalGenitals, vaginal_discharge: vaginalDischarge, speculum_cervix: speculumCervix, tact_cervix: tactCervix,
				fundus_sacs: fundusSacs, adnexa,
				hinselmann_test: hinselmannTest, schiller_test: schillerTest,
				uterus_dimensions: uterusDimensions, endometrial_interface: endometrialInterface, endometrial_interface_phase: endometrialInterfacePhase,
				endometrial_interface_type: endometrialInterfaceType, left_ovary_dimensions: leftOvaryDimensions,
				right_ovary_dimensions: rightOvaryDimensions, fundus_fluid: fundusFluid,
				diagnoses: gynDiagnoses,
				diagnosis: gynDiagnoses.join('\n'),
				plan_indications: planIndications,
				plan_treatment: planIndications,
				diet_indications: dietIndications,
				intimate_soap: intimateSoap,
				treatment_infection: treatmentInfection,
				probiotics: probiotics,
				vitamins: vitamins,
				contraceptive_treatment: contraceptiveTreatment,
				bleeding_treatment: bleedingTreatment,
				linked_recipe_id: linkedRecipeId,
				colposcopy: {
					acetic_5: colposcopyAcetic5, ectocervix: colposcopyEctocervix, type: colposcopyType,
					extension: colposcopyExtension, description: colposcopyDescription, location: colposcopyLocation,
					acetowhite: colposcopyAcetowhite, acetowhite_details: colposcopyAcetowhiteDetails,
					mosaic: colposcopyMosaic, punctation: colposcopyPunctation, atypical_vessels: colposcopyAtypicalVessels,
					invasive_carcinoma: colposcopyInvasiveCarcinoma, borders: colposcopyBorders, situation: colposcopySituation,
					elevation: colposcopyElevation, biopsy: colposcopyBiopsy, biopsy_location: colposcopyBiopsyLocation,
					lugol: colposcopyLugol
				}
			},
			obstetrics: {
				first_trimester: obstetricsT1,
				second_third_trimester: obstetricsT2T3
			}
		};
		return out;
	};

	const handleSave = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		setLoading(true);
		
		const payload = {
			chief_complaint: chiefComplaint,
			diagnosis: diagnosis,
			icd11_code: icd11Code,
			icd11_title: icd11Title,
			vitals: buildVitalsObject(),
			report_url: reportUrl
		};

		try {
			await saveOptimistically('consultation', `/api/medic/consultations/${initial.id}`, payload);
			
			// Update patient data if available
			if (patient) {
				const isUnregistered = patient.isUnregistered === true;
				const patientId = patient.id;
				
				const patientUpdatePayload: any = {
					patient_id: patientId,
					is_unregistered: isUnregistered,
					firstName: patientFirstName,
					lastName: patientLastName,
					identifier: patientIdentifier,
					phone: patientPhone,
					address: patientAddress,
					profession: patientProfession,
					dob: patientDob,
					blood_type: patientBloodType,
					allergies: patientAllergies,
					chronic_conditions: patientChronicConditions,
					current_medication: patientCurrentMedications,
					family_history: patientFamilyHistory
				};
				
				// Optional: You could use saveOptimistically here too, but since the patient 
				// info is shared state, a direct fetch might be safer for immediate DB sync.
				await fetch(`/api/consultations/${initial.id}/patient`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(patientUpdatePayload)
				});
			}

			toast.success('Consulta y datos del paciente guardados correctamente');
			setCompletedSections(prev => new Set(prev).add(currentSection));
		} catch (error) {
			toast.error('Error al guardar la consulta');
		} finally {
			setLoading(false);
		}
	};

	const handleSaveReport = async () => {
		try {
			setSavingReport(true);
			const payload = {
				report_url: reportUrl,
			};
			
			await saveOptimistically(
				'consultation',
				`/api/consultations/${initial.id}`,
				payload
			);
			toast.success('Informe guardado en la base de datos');
		} catch (error: any) {
			toast.error('Error al guardar el informe en la BD');
		} finally {
			setSavingReport(false);
		}
	};

	const replaceTemplateVariables = (text: string) => {
		if (!text) return '';
		
		let result = text;
		const mappings: Record<string, any> = {
			'historia_enfermedad_actual': includedSections.includes('patient_data') ? (chiefComplaint || '---') : '',
			'menarquia': includedSections.includes('gyn_historia') ? (menarche || '---') : '',
			'ultima_regla': includedSections.includes('gyn_historia') ? (lmp || '---') : '',
			'patron_menstruacion': includedSections.includes('gyn_historia') ? (menstruationPattern || '---') : '',
			'ultima_citologia': includedSections.includes('gyn_historia') ? (lastCytology || '---') : '',
			'primera_relacion_sexual': includedSections.includes('gyn_historia') ? (firstSexualRelation || '---') : '',
			'parejas_sexuales': includedSections.includes('gyn_historia') ? (sexualPartners || '---') : '',
			'metodo_anticonceptivo': includedSections.includes('plan') ? (contraceptiveTreatment || '---') : '',
			'pareja_actual': includedSections.includes('gyn_historia') ? (currentPartner || '---') : '',
			'peso': includedSections.includes('vitals') ? (weight || '---') : '',
			'tension_arterial': (includedSections.includes('vitals') && bpSystolic && bpDiastolic) ? `${bpSystolic}/${bpDiastolic}` : (includedSections.includes('vitals') ? '---' : ''),
			'secrecion_mamas': includedSections.includes('gyn_fisico') ? (breastSecretion || '---') : '',
			'abdomen': includedSections.includes('gyn_fisico') ? (abdomen || '---') : '',
			'especuloscopia': includedSections.includes('gyn_fisico') ? (speculumCervix || '---') : '',
			'test_hinselmann': includedSections.includes('gyn_fisico') ? (hinselmannTest || '---') : '',
			'test_schiller': includedSections.includes('gyn_fisico') ? (schillerTest || '---') : '',
			'utero_diametros': includedSections.includes('gyn_eco') ? (uterusDimensions || '---') : '',
			'interfase_endometrial': includedSections.includes('gyn_eco') ? (endometrialInterface || '---') : '',
			'ovario_derecho': includedSections.includes('gyn_eco') ? (rightOvaryDimensions || '---') : '',
			'ovario_izquierdo': includedSections.includes('gyn_eco') ? (leftOvaryDimensions || '---') : '',
			'fondo_saco': includedSections.includes('gyn_eco') ? (fundusFluid || '---') : '',
			'diagnostico_1': includedSections.includes('gyn_cie11') ? (gynDiagnoses[0] || '---') : '',
			'diagnostico_2': includedSections.includes('gyn_cie11') ? (gynDiagnoses[1] || '---') : '',
			'diagnostico_3': includedSections.includes('gyn_cie11') ? (gynDiagnoses[2] || '---') : '',
			'plan_indicaciones': includedSections.includes('plan') ? (planIndications || '---') : '',
			'indicaciones_alimentacion': includedSections.includes('plan') ? (dietIndications || '---') : '',
			'jabon_intimo': includedSections.includes('plan') ? (intimateSoap || '---') : '',
			'probioticos': includedSections.includes('plan') ? (probiotics || '---') : '',
			'vitaminas': includedSections.includes('plan') ? (vitamins || '---') : '',
			'paciente_nombre': `${patientFirstName} ${patientLastName}`,
			'paciente_edad': patientAge || 'N/A',
			'fecha_actual': new Date().toLocaleDateString(),
			'anticonceptivo': includedSections.includes('plan') ? (contraceptiveTreatment || '---') : '',
			'tratamiento_sangrado': includedSections.includes('plan') ? (bleedingTreatment || '---') : '',
			'ho': includedSections.includes('gyn_historia') ? (ho || '---') : '',
			'its': includedSections.includes('gyn_historia') ? (its || '---') : '',
			'examen_fisico_general': includedSections.includes('gyn_fisico') ? (generalConditions || '---') : '',
			'mamas_simetria': includedSections.includes('gyn_fisico') ? (breastSymmetry || '---') : '',
			'mamas_cap': includedSections.includes('gyn_fisico') ? (breastCap || '---') : '',
			'genitales_externos': includedSections.includes('gyn_fisico') ? (externalGenitals || '---') : '',
			'especulo': includedSections.includes('gyn_fisico') ? (speculumCervix || '---') : '',
			'axilas': includedSections.includes('gyn_fisico') ? (axillaryFossae || '---') : '',

			// --- OBSTETRICIA T1 ---
			'obst_t1_edad_gestacional': includedSections.includes('obstetrics_t1') ? (obstetricsT1.edad_gestacional || '---') : '',
			'obst_t1_fur': includedSections.includes('obstetrics_t1') ? (obstetricsT1.fur || '---') : '',
			'obst_t1_fpp': includedSections.includes('obstetrics_t1') ? (obstetricsT1.fpp || '---') : '',
			'obst_t1_gestas': includedSections.includes('obstetrics_t1') ? (obstetricsT1.gestas || '---') : '',
			'obst_t1_paras': includedSections.includes('obstetrics_t1') ? (obstetricsT1.paras || '---') : '',
			'obst_t1_cesareas': includedSections.includes('obstetrics_t1') ? (obstetricsT1.cesareas || '---') : '',
			'obst_t1_abortos': includedSections.includes('obstetrics_t1') ? (obstetricsT1.abortors || '---') : '',
			'obst_t1_otros': includedSections.includes('obstetrics_t1') ? (obstetricsT1.otros || '---') : '',
			'obst_t1_motivo': includedSections.includes('obstetrics_t1') ? (obstetricsT1.motivo_consulta || '---') : '',
			'obst_t1_referencia': includedSections.includes('obstetrics_t1') ? (obstetricsT1.referencia || '---') : '',
			'obst_t1_posicion': includedSections.includes('obstetrics_t1') ? (obstetricsT1.posicion || '---') : '',
			'obst_t1_superficie': includedSections.includes('obstetrics_t1') ? (obstetricsT1.superficie || '---') : '',
			'obst_t1_miometrio': includedSections.includes('obstetrics_t1') ? (obstetricsT1.miometrio || '---') : '',
			'obst_t1_endometrio': includedSections.includes('obstetrics_t1') ? (obstetricsT1.endometrio || '---') : '',
			'obst_t1_ovario_d': includedSections.includes('obstetrics_t1') ? (obstetricsT1.ovario_derecho || '---') : '',
			'obst_t1_ovario_i': includedSections.includes('obstetrics_t1') ? (obstetricsT1.ovario_izquierdo || '---') : '',
			'obst_t1_anexos': includedSections.includes('obstetrics_t1') ? (obstetricsT1.anexos_ecopatron || '---') : '',
			'obst_t1_fondo_saco': includedSections.includes('obstetrics_t1') ? (obstetricsT1.fondo_de_saco || '---') : '',
			'obst_t1_cuerpo_luteo': includedSections.includes('obstetrics_t1') ? (obstetricsT1.cuerpo_luteo || '---') : '',
			'obst_t1_gestacion': includedSections.includes('obstetrics_t1') ? (obstetricsT1.gestacion || '---') : '',
			'obst_t1_localizacion': includedSections.includes('obstetrics_t1') ? (obstetricsT1.localizacion || '---') : '',
			'obst_t1_vesicula': includedSections.includes('obstetrics_t1') ? (obstetricsT1.vesicula || '---') : '',
			'obst_t1_cavidad_exocelomica': includedSections.includes('obstetrics_t1') ? (obstetricsT1.cavidad_exocelomica || '---') : '',
			'obst_t1_embrion_visto': includedSections.includes('obstetrics_t1') ? (obstetricsT1.embrion_visto || '---') : '',
			'obst_t1_ecoanatomia': includedSections.includes('obstetrics_t1') ? (obstetricsT1.ecoanatomia || '---') : '',
			'obst_t1_lcr': includedSections.includes('obstetrics_t1') ? (obstetricsT1.lcr || '---') : '',
			'obst_t1_acorde_a': includedSections.includes('obstetrics_t1') ? (obstetricsT1.acorde_a || '---') : '',
			'obst_t1_actividad_cardiaca': includedSections.includes('obstetrics_t1') ? (obstetricsT1.actividad_cardiaca || '---') : '',
			'obst_t1_movimientos': includedSections.includes('obstetrics_t1') ? (obstetricsT1.movimientos_embrionarios || '---') : '',
			'obst_t1_conclusiones': includedSections.includes('obstetrics_t1') ? (obstetricsT1.conclusiones || '---') : '',

			// --- OBSTETRICIA T2/T3 ---
			'obst_t2_edad_gestacional': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.edad_gestacional || '---') : '',
			'obst_t2_fur': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.fur || '---') : '',
			'obst_t2_fpp': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.fpp || '---') : '',
			'obst_t2_gestas': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.gestas || '---') : '',
			'obst_t2_paras': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.paras || '---') : '',
			'obst_t2_cesareas': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.cesareas || '---') : '',
			'obst_t2_abortos': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.abortos || '---') : '',
			'obst_t2_otros': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.otros || '---') : '',
			'obst_t2_motivo': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.motivo_consulta || '---') : '',
			'obst_t2_referencia': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.referencia || '---') : '',
			'obst_t2_num_fetos': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.num_fetos || '---') : '',
			'obst_t2_actividad_cardiaca': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.actividad_cardiaca || '---') : '',
			'obst_t2_situacion': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.situacion || '---') : '',
			'obst_t2_presentacion': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.presentacion || '---') : '',
			'obst_t2_dorso': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.dorso || '---') : '',
			'obst_t2_dbp': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.dbp || '---') : '',
			'obst_t2_cc': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.cc || '---') : '',
			'obst_t2_ca': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.ca || '---') : '',
			'obst_t2_lf': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.lf || '---') : '',
			'obst_t2_peso_estimado': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.peso_estimado_fetal || '---') : '',
			'obst_t2_para': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.para || '---') : '',
			'obst_t2_placenta': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.placenta || '---') : '',
			'obst_t2_ubi': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.ubi || '---') : '',
			'obst_t2_insercion': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.insercion || '---') : '',
			'obst_t2_grado': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.grado || '---') : '',
			'obst_t2_cordon': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.cordon_umbilical || '---') : '',
			'obst_t2_liquido': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.liqu_amniotico || '---') : '',
			'obst_t2_p': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.p || '---') : '',
			'obst_t2_ila': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.ila || '---') : '',
			'obst_t2_craneo': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.craneo || '---') : '',
			'obst_t2_corazon': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.corazon || '---') : '',
			'obst_t2_fcf': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.fcf || '---') : '',
			'obst_t2_pulmones': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.pulmones || '---') : '',
			'obst_t2_situs': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.situs_visceral || '---') : '',
			'obst_t2_intestino': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.intestino || '---') : '',
			'obst_t2_vejiga': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.vejiga || '---') : '',
			'obst_t2_vejiga_extra': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.vejiga_extra || '---') : '',
			'obst_t2_estomago': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.estomago || '---') : '',
			'obst_t2_estomago_extra': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.estomago_extra || '---') : '',
			'obst_t2_rinones': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.rinones || '---') : '',
			'obst_t2_rinones_extra': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.rinones_extra || '---') : '',
			'obst_t2_genitales': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.genitales || '---') : '',
			'obst_t2_miembros_superiores': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.miembros_superiores || '---') : '',
			'obst_t2_manos': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.manos || '---') : '',
			'obst_t2_miembros_inferiores': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.miembros_inferiores || '---') : '',
			'obst_t2_pies': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.pies || '---') : '',
			'obst_t2_conclusiones': includedSections.includes('obstetrics_t2t3') ? (obstetricsT2T3.conclusiones || '---') : '',
		};

		// Reemplazo robusto usando Regex para manejar variaciones de llaves: {{var}}, {{{var}}, {{var}, {var}
		Object.entries(mappings).forEach(([key, value]) => {
			const regex = new RegExp(`\\{+\\s*${key}\\s*\\}*`, 'g');
			// Si el valor es vacío absoluto (porque la sección no está incluida), usamos string vacío
			result = result.replace(regex, value !== undefined && value !== null ? value : '');
		});

		// Reemplazos de contexto Legacy / Paciente
		result = result.split('N/A años de edad').join(`${patientAge || '---'} años de edad`);
		result = result.split('{{paciente_nombre}}').join(`${patientFirstName} ${patientLastName}`);
		result = result.split('{{paciente_id}}').join(patientIdentifier);

		return result;
	};

	const handleGenerateReport = async () => {
		// Validar contenido para informes que no son de obstetricia
		const isObstetrics = selectedReportType === 'first_trimester' || selectedReportType === 'second_third_trimester';
		
		if (!isObstetrics) {
			if (!reportContent.trim()) {
				setReportError('Por favor, escribe el contenido del informe o carga la plantilla.');
				return;
			}
		}

		setGeneratingReport(true);
		setReportError(null);
		setReportSuccess(null);

		try {
			const requestBody: any = {
				font_family: fontFamily,
				report_type: selectedReportType
			};
			
			if (!isObstetrics) {
				requestBody.content = reportContent;
			}
			
			const res = await fetch(`/api/consultations/${initial.id}/generate-report`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});
			
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Error al generar informe');
			
			setReportUrl(data.url);
			setReportSuccess('Informe generado con éxito');
			toast.success('Informe generado con éxito');
		} catch (error: any) {
			setReportError(error.message || 'Error al generar el informe');
			toast.error('Error al generar el informe: ' + error.message);
		} finally {
			setGeneratingReport(false);
		}
	};

	// --- ESTRUCTURA DE NAVEGACIÓN ---
	const sectionOrder = [
		'patient_data', 
		'vitals', 
		'gyn_antecedentes', 'gyn_historia', 'gyn_fisico', 'gyn_eco', 'gyn_colpo', 'gyn_cie11', 
		'obstetrics_t1', 'obstetrics_t2t3',
		'plan', 
		'report', 
		'prescription'
	];

	const getSectionStatus = (id: string): NavItemStatus => {
		if (currentSection === id) return 'active';
		if (id === 'ginecologia') {
			const sub = ['gyn_antecedentes', 'gyn_historia', 'gyn_fisico', 'gyn_eco', 'gyn_colpo', 'gyn_cie11'];
			if (sub.includes(currentSection)) return 'active';
			return sub.every(s => completedSections.has(s)) ? 'done' : 'pending';
		}
		if (id === 'obstetricia') {
			const sub = ['obstetrics_t1', 'obstetrics_t2t3'];
			if (sub.includes(currentSection)) return 'active';
			return sub.every(s => completedSections.has(s)) ? 'done' : 'pending';
		}
		return completedSections.has(id) ? 'done' : 'pending';
	};

	const navTree = [
		{ id: 'patient_data', label: 'Datos del Paciente', status: getSectionStatus('patient_data'), icon: User },
		{ id: 'vitals', label: 'Signos Vitales', status: getSectionStatus('vitals'), icon: Activity },
		{ 
			id: 'ginecologia', label: 'Ginecología', status: getSectionStatus('ginecologia'), icon: Stethoscope,
			children: [
				{ id: 'gyn_antecedentes', label: 'Antecedentes', status: getSectionStatus('gyn_antecedentes') },
				{ id: 'gyn_historia', label: 'Historia ginecológica', status: getSectionStatus('gyn_historia') },
				{ id: 'gyn_fisico', label: 'Examen físico', status: getSectionStatus('gyn_fisico') },
				{ id: 'gyn_eco', label: 'Ecografía transvaginal', status: getSectionStatus('gyn_eco') },
				{ id: 'gyn_colpo', label: 'Colposcopia', status: getSectionStatus('gyn_colpo') },
				{ id: 'gyn_cie11', label: 'Diagnóstico CIE-11', status: getSectionStatus('gyn_cie11') },
			]
		},
		{ 
			id: 'obstetricia', label: 'Obstetricia', status: getSectionStatus('obstetricia'), icon: Baby,
			children: [
				{ id: 'obstetrics_t1', label: 'Primer Trimestre', status: getSectionStatus('obstetrics_t1') },
				{ id: 'obstetrics_t2t3', label: '2do/3er Trimestre', status: getSectionStatus('obstetrics_t2t3') },
			]
		},
		{ id: 'plan', label: 'Plan / Tratamiento', status: getSectionStatus('plan'), icon: ClipboardList },
		{ id: 'report', label: 'Informe Médico', status: getSectionStatus('report'), icon: FileCheck },
		{ id: 'prescription', label: 'Prescripción', status: getSectionStatus('prescription'), icon: FileText },
	];

	// --- RENDERS ---
	const renderSectionContent = () => {
		switch (currentSection) {
			case 'patient_data':
				return (
					<div className={sectionCard}>
						<div className="mb-8 border-b pb-4 flex items-center justify-between">
							<h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
								<User size={24} className="text-teal-600" /> Información General del Paciente
							</h2>
						</div>

						{/* Sección 1: Motivo Clínico */}
						<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6">
							<div className="flex items-center gap-2 mb-4 text-teal-700">
								<HeartPulse size={18} />
								<h3 className="font-bold text-sm uppercase tracking-wider">Motivo de Consulta</h3>
							</div>
							<textarea 
								value={chiefComplaint} 
								onChange={(e) => setChiefComplaint(e.target.value)} 
								rows={3} 
								className={`${inputBase} !bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-teal-500`} 
								placeholder="Describa el motivo principal de la consulta..."
							/>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
							{/* Sección 2: Identificación (Col-span 8) */}
							<div className="lg:col-span-8 space-y-6">
								<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
									<div className="flex items-center gap-2 mb-4 text-teal-700">
										<Clipboard size={18} />
										<h3 className="font-bold text-sm uppercase tracking-wider">Identificación y Datos de Contacto</h3>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className={labelClass}>Nombre(s)</label>
											<input value={patientFirstName} onChange={e => setPatientFirstName(e.target.value)} className={inputBase} />
										</div>
										<div>
											<label className={labelClass}>Apellido(s)</label>
											<input value={patientLastName} onChange={e => setPatientLastName(e.target.value)} className={inputBase} />
										</div>
										<div>
											<label className={labelClass}>Identificación (ID / Cédula)</label>
											<input value={patientIdentifier} onChange={e => setPatientIdentifier(e.target.value)} className={inputBase} />
										</div>
										<div>
											<label className={labelClass}>Teléfono de Contacto</label>
											<input type="tel" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} className={inputBase} placeholder="Ej: +58 412..." />
										</div>
										<div>
											<label className={labelClass}>Fecha de Nacimiento</label>
											<input type="date" value={patientDob} onChange={e => setPatientDob(e.target.value)} className={inputBase} />
										</div>
										<div>
											<label className={labelClass}>Edad (Calculada)</label>
											<input value={patientAge ? `${patientAge} años` : '---'} readOnly className={`${inputBase} bg-slate-50 font-bold text-teal-700`} />
										</div>
										<div className="md:col-span-2">
											<label className={labelClass}>Profesión / Ocupación</label>
											<input value={patientProfession} onChange={e => setPatientProfession(e.target.value)} className={inputBase} placeholder="Ej: Ingeniero, Estudiante, etc." />
										</div>
										<div className="md:col-span-2">
											<label className={labelClass}>Dirección de Habitación</label>
											<input value={patientAddress} onChange={e => setPatientAddress(e.target.value)} className={inputBase} placeholder="Ciudad, Sector, Edificio..." />
										</div>
									</div>
								</div>

								{/* Sección 3: Antecedentes Crónicos y Alergias */}
								<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
									<div className="flex items-center gap-2 mb-4 text-rose-700">
										<ShieldAlert size={18} />
										<h3 className="font-bold text-sm uppercase tracking-wider">Alertas Médicas y Antecedentes</h3>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div>
											<label className={labelClass}>Alergias Conocidas</label>
											<MultiInput value={patientAllergies} onChange={setPatientAllergies} placeholder="Ej: Penicilina, AINES..." />
										</div>
										<div>
											<label className={labelClass}>Entidades Mórbidas / Antecedentes Personales</label>
											<MultiInput value={patientChronicConditions} onChange={setPatientChronicConditions} placeholder="Ej: Hipertensión, Diabetes..." />
										</div>
										<div className="md:col-span-2">
											<label className={labelClass}>Medicamentos Actuales</label>
											<MultiInput value={patientCurrentMedications} onChange={setPatientCurrentMedications} placeholder="Nombre del fármaco y dosis..." />
										</div>
									</div>
								</div>
							</div>

							{/* Sección Lateral: Resumen Médico (Col-span 4) */}
							<div className="lg:col-span-4 space-y-6">
								<div className="bg-teal-600 p-6 rounded-2xl text-white shadow-lg shadow-teal-100">
									<h3 className="text-xs font-bold uppercase mb-4 opacity-80 tracking-widest">Estado Vital Crítico</h3>
									<div>
										<label className="block text-[10px] font-bold uppercase mb-1 opacity-70">Grupo Sanguíneo</label>
										<select 
											value={patientBloodType} 
											onChange={e => setPatientBloodType(e.target.value)} 
											className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-white/50 transition-all appearance-none cursor-pointer"
										>
											<option value="" className="text-slate-900">Seleccionar...</option>
											{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
												<option key={t} value={t} className="text-slate-900">{t}</option>
											))}
										</select>
									</div>
								</div>

								<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
									<div className="flex items-center gap-2 mb-4 text-indigo-700">
										<User size={18} />
										<h3 className="font-bold text-sm uppercase tracking-wider">Antecedentes Familiares</h3>
									</div>
									<textarea 
										value={patientFamilyHistory} 
										onChange={e => setPatientFamilyHistory(e.target.value)} 
										rows={10} 
										className={`${inputBase} resize-none text-xs leading-relaxed`} 
										placeholder="Registrar historia médica familiar relevante..."
									/>
								</div>
							</div>
						</div>
					</div>
				);
			case 'vitals':
				return (
					<div className={sectionCard}>
						<div className="mb-8 border-b pb-4 flex items-center justify-between">
							<h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
								<Activity size={24} className="text-rose-600" /> Registro de Signos Vitales
							</h2>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Sección 1: Antropometría e IMC */}
							<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
								<div className="flex items-center gap-2 mb-2 text-indigo-700">
									<Activity size={18} />
									<h3 className="font-bold text-sm uppercase tracking-wider">Antropometría</h3>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className={labelClass}>Peso (kg)</label>
										<input value={weight} onChange={e => setWeight(e.target.value)} className={inputBase} type="number" step="0.1" placeholder="0.0" />
									</div>
									<div>
										<label className={labelClass}>Talla (cm)</label>
										<input value={height} onChange={e => setHeight(e.target.value)} className={inputBase} type="number" placeholder="0" />
									</div>
								</div>
								<div className="pt-4 border-t border-slate-50">
									<div className="flex items-center justify-between mb-2">
										<label className={labelClass}>IMC (Índice de Masa Corp.)</label>
										<span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
											!computedBMI ? 'bg-slate-100 text-slate-400' :
											Number(computedBMI) < 18.5 ? 'bg-blue-100 text-blue-700' :
											Number(computedBMI) < 25 ? 'bg-green-100 text-green-700' :
											Number(computedBMI) < 30 ? 'bg-yellow-100 text-yellow-700' :
											'bg-rose-100 text-rose-700'
										}`}>
											{!computedBMI ? '---' : 
											 Number(computedBMI) < 18.5 ? 'Bajo Peso' :
											 Number(computedBMI) < 25 ? 'Normal' :
											 Number(computedBMI) < 30 ? 'Sobrepeso' : 'Obesidad'}
										</span>
									</div>
									<div className="flex gap-2">
										<div className="flex-1 relative">
											<input value={computedBMI} readOnly className={`${inputBase} bg-slate-50 font-bold text-lg text-slate-700`} />
											<div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">CALCULADO</div>
										</div>
										<div className="w-24">
											<input value={bmiOverride} onChange={e => setBmiOverride(e.target.value)} className={inputBase} placeholder="Manual" />
										</div>
									</div>
								</div>
							</div>

							{/* Sección 2: Hemodinámica */}
							<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
								<div className="flex items-center gap-2 mb-2 text-rose-700">
									<HeartPulse size={18} />
									<h3 className="font-bold text-sm uppercase tracking-wider">Perfil Hemodinámico</h3>
								</div>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
									<div>
										<label className={labelClass}>PAS (Sistólica)</label>
										<input value={bpSystolic} onChange={e => setBpSystolic(e.target.value)} className={`${inputBase} font-bold text-rose-700`} type="number" placeholder="120" />
									</div>
									<div>
										<label className={labelClass}>PAD (Diastólica)</label>
										<input value={bpDiastolic} onChange={e => setBpDiastolic(e.target.value)} className={inputBase} type="number" placeholder="80" />
									</div>
									<div>
										<label className={labelClass}>Frec. Cardíaca (LPM)</label>
										<input value={heartRate} onChange={e => setHeartRate(e.target.value)} className={inputBase} type="number" placeholder="72" />
									</div>
									<div>
										<label className={labelClass}>Temp. Digital (°C)</label>
										<input value={temperature} onChange={e => setTemperature(e.target.value)} className={inputBase} type="number" step="0.1" placeholder="36.5" />
									</div>
								</div>
								<div className="pt-4 border-t border-slate-50">
									<div className="flex items-center gap-2 mb-2 text-teal-700">
										<Sparkles size={16} />
										<h3 className="font-bold text-sm uppercase tracking-wider">Respiratorio / Metabólico</h3>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div>
											<label className={labelClass}>Frec. Resp. (RPM)</label>
											<input value={respiratoryRate} onChange={e => setRespiratoryRate(e.target.value)} className={inputBase} type="number" placeholder="16" />
										</div>
										<div>
											<label className={labelClass}>Saturación O2 (%)</label>
											<input value={spo2} onChange={e => setSpo2(e.target.value)} className={inputBase} type="number" placeholder="98" />
										</div>
										<div>
											<label className={labelClass}>Glucemia (mg/dL)</label>
											<input value={glucose} onChange={e => setGlucose(e.target.value)} className={inputBase} type="number" placeholder="90" />
										</div>
									</div>
								</div>
							</div>

							{/* Sección 3: Notas de Enfermería / Médicas */}
							<div className="lg:col-span-3">
								<div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
									<div className="flex items-center gap-2 mb-4 text-slate-700">
										<ClipboardList size={18} />
										<h3 className="font-bold text-sm uppercase tracking-wider">Notas y Observaciones de Signos Vitales</h3>
									</div>
									<textarea 
										value={vitalsNotes} 
										onChange={e => setVitalsNotes(e.target.value)} 
										rows={4} 
										className={`${inputBase} resize-none`} 
										placeholder="Ingrese cualquier observación relevante detectada durante la toma de signos vitales..."
									/>
								</div>
							</div>
						</div>
					</div>
				);
			case 'gyn_antecedentes':
				return (
					<div className={sectionCard}>
						<h3 className="text-lg font-bold text-slate-700 mb-6 border-b pb-2">Antecedentes Médicos y Familiares</h3>
						<div className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<QuickValueChip label="Alergias" currentValue={allergies} options={["NIEGA", "PENICILINA", "DIPIRONA", "AINES"]} onSelect={setAllergies} />
								<QuickValueChip label="Hipersensibilidad" currentValue={hypersensitivity} options={["NIEGA", "ALIMENTOS", "POLVO", "A PRECISAR"]} onSelect={setHypersensitivity} />
							</div>
							
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<QuickValueChip label="Hábitos Psicobiológicos" currentValue={psychobiologicalHabits} options={["NIEGA TABAQUISMO, NIEGA ALCOHOLISMO", "FUMADOR OCASIONAL", "ALCOHOL SOCIAL", "A PRECISAR"]} onSelect={setPsychobiologicalHabits} />
								<QuickValueChip label="Quirúrgicos" currentValue={surgicalHistory} options={["NIEGA", "APENDICECTOMÍA", "CESÁREA", "CISTECTOMÍA"]} onSelect={setSurgicalHistory} />
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
								<QuickValueChip label="Madre" currentValue={familyHistoryMother} options={["VIVA SANA", "HTA", "DM2", "FALLECIDA"]} onSelect={setFamilyHistoryMother} />
								<QuickValueChip label="Padre" currentValue={familyHistoryFather} options={["VIVO SANO", "HTA", "DM2", "FALLECIDO"]} onSelect={setFamilyHistoryFather} />
								<QuickValueChip label="Ca de Mama (Familiar)" currentValue={familyHistoryBreastCancer} options={["NIEGA", "A PRECISAR", "SI, FAMILIAR DIRECTO"]} onSelect={setFamilyHistoryBreastCancer} />
							</div>
							
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<QuickValueChip label="Mastopatías Previas" currentValue={mastopathies} options={["NIEGA", "FIBROADENOMA", "QUISTICA"]} onSelect={setMastopathies} />
							</div>
						</div>
					</div>
				);
			case 'gyn_historia':
				return (
					<div className={sectionCard}>
						<h3 className="text-lg font-bold text-slate-700 mb-6 border-b pb-2">Historia Ginecológica</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
							<div><label className={labelClass}>FUR (LMP)</label><input type="date" value={lmp} onChange={e => setLmp(e.target.value)} className={inputBase} /></div>
							<div><label className={labelClass}>Menarquia (Edad)</label><input value={menarche} onChange={e => setMenarche(e.target.value)} className={inputBase} /></div>
							<div><label className={labelClass}>Primera Relación Sexual</label><input value={firstSexualRelation} onChange={e => setFirstSexualRelation(e.target.value)} className={inputBase} /></div>
							<div><label className={labelClass}>No. Parejas Sexuales</label><input value={sexualPartners} onChange={e => setSexualPartners(e.target.value)} className={inputBase} type="number" /></div>
							<div><label className={labelClass}>Pareja Actual</label><input value={currentPartner} onChange={e => setCurrentPartner(e.target.value)} className={inputBase} /></div>
							<div><label className={labelClass}>Última Citología</label><input value={lastCytology} onChange={e => setLastCytology(e.target.value)} className={inputBase} /></div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							<QuickValueChip label="Tipo de Menstruación" currentValue={menstruationType} options={["REGULARES", "IRREGULARES"]} onSelect={setMenstruationType} />
							<QuickValueChip label="Dismenorrea" currentValue={dysmenorrhea} options={["NO", "SI", "LEVE", "MODERADA", "SEVERA"]} onSelect={setDysmenorrhea} />
							<QuickValueChip label="ETS (ITS) Previa" currentValue={its} options={["NIEGA", "VPH", "CANDIDIASIS", "A PRECISAR"]} onSelect={setIts} />
							<QuickValueChip label="Vacuna Gardasil (VPH)" currentValue={gardasil} options={["NO APLICADA", "1 DOSIS", "2 DOSIS", "3 DOSIS"]} onSelect={setGardasil} />
							<QuickValueChip label="Otras Vacunas (Gine)" currentValue={vaccinated} options={["NO", "SI"]} onSelect={setVaccinated} />
							<QuickValueChip label="Lactancia Materna Exclusiva" currentValue={exclusiveBreastfeeding} options={["NO", "SI", "ACTUALMENTE"]} onSelect={setExclusiveBreastfeeding} />
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
							<div><label className={labelClass}>Patrón Menstrual</label><input value={menstruationPattern} onChange={e => setMenstruationPattern(e.target.value)} className={inputBase} placeholder="Ej. 4/28" /></div>
							<div><label className={labelClass}>Edad Primer Embarazo</label><input value={firstPregnancyAge} onChange={e => setFirstPregnancyAge(e.target.value)} className={inputBase} type="number" /></div>
							<div><label className={labelClass}>Historia Obstétrica (G P C A)</label><input value={ho} onChange={e => setHo(e.target.value)} className={inputBase} placeholder="G: P: C: A:" /></div>
						</div>
					</div>
				);
			case 'gyn_fisico':
				return (
					<div className={sectionCard}>
						<h3 className="text-lg font-bold text-slate-700 mb-6 border-b pb-2">Examen Físico y Especuloscopia</h3>
						
						<div className="mb-6"><QuickValueChip label="Condiciones Generales" currentValue={generalConditions} options={["ESTABLES", "REGULARES", "GUARDADAS"]} onSelect={setGeneralConditions} /></div>

						<h4 className="font-semibold text-teal-800 mb-4 bg-teal-50 p-2 rounded">Valoración Mamaria</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
							<QuickValueChip label="Tamaño" currentValue={breastSize} options={["MEDIANO TAMAÑO", "PEQUEÑAS", "GRANDES"]} onSelect={setBreastSize} />
							<QuickValueChip label="Simetría" currentValue={breastSymmetry} options={["SIMÉTRICAS", "ASIMÉTRICAS"]} onSelect={setBreastSymmetry} />
							<QuickValueChip label="CAP" currentValue={breastCap} options={["SIN ALTERACIONES", "ALTERADO"]} onSelect={setBreastCap} />
							<QuickValueChip label="Secreción" currentValue={breastSecretion} options={["NO SE EVIDENCIA SALIDA DE SECRECIÓN", "SECRECIÓN BLANQUECINA", "SECRECIÓN SEROSA"]} onSelect={setBreastSecretion} />
							<QuickValueChip label="Fosas Axilares" currentValue={axillaryFossae} options={["LIBRES", "ADENOPATÍAS PALPABLES"]} onSelect={setAxillaryFossae} />
						</div>

						<h4 className="font-semibold text-teal-800 mb-4 bg-teal-50 p-2 rounded">Abdomen y Genitales</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							<div>
								<label className={labelClass}>Abdomen</label>
								<textarea value={abdomen} onChange={e => setAbdomen(e.target.value)} rows={2} className={inputBase} placeholder="Abdomen..." />
							</div>
							<div>
								<label className={labelClass}>Especuloscopia (Cérvix)</label>
								<textarea value={speculumCervix} onChange={e => setSpeculumCervix(e.target.value)} rows={2} className={inputBase} placeholder="CUELLO MACROSCÓPICAMENTE SANO..." />
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							<QuickValueChip label="Genitales Externos" currentValue={externalGenitals} options={["NORMOCONFIGURADOS", "ALTERADOS", "LESIONES VISIBLES"]} onSelect={setExternalGenitals} />
							<QuickValueChip label="Flujo Vaginal" currentValue={vaginalDischarge} options={["sin secreciones", "BLANQUECINO GROSUMO", "AMARILLENTO FETIDO", "SANGUINOLENTO"]} onSelect={setVaginalDischarge} />
							<QuickValueChip label="Tacto de Cuello" currentValue={tactCervix} options={["CUELLO RENITENTE NO DOLOROSO A LA MOVILIZACIÓN", "CUELLO DEBIL", "CUELLO DOLOROSO AL TACTO"]} onSelect={setTactCervix} />
							<QuickValueChip label="Culisacos / Fondos" currentValue={fundusSacs} options={["LIBRES", "OCUPADOS", "DOLOROSOS"]} onSelect={setFundusSacs} />
							<QuickValueChip label="Anexos" currentValue={adnexa} options={["NO PALPABLES", "PALPABLES", "DOLOROSOS", "TUMORACIÓN"]} onSelect={setAdnexa} />
						</div>

						<h4 className="font-semibold text-teal-800 mb-4 bg-teal-50 p-2 rounded">Pruebas Auxiliares</h4>
						<div className="grid grid-cols-2 gap-4">
							<QuickValueChip label="Hinselmann (Acético)" currentValue={hinselmannTest} options={["NEGATIVO", "POSITIVO"]} onSelect={setHinselmannTest} />
							<QuickValueChip label="Schiller (Lugol)" currentValue={schillerTest} options={["NEGATIVO", "POSITIVO"]} onSelect={setSchillerTest} />
						</div>
					</div>
				);
			case 'gyn_eco':
				return (
					<div className={sectionCard}>
						<h3 className="text-lg font-bold text-slate-700 mb-6 border-b pb-2">Ecografía Transvaginal</h3>
						
						<h4 className="font-semibold text-teal-800 mb-4 bg-teal-50 p-2 rounded">Útero y Ovarios (Dimensiones)</h4>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
							<div><label className={labelClass}>Útero</label><input value={uterusDimensions} onChange={e => setUterusDimensions(e.target.value)} className={inputBase} placeholder="Ej. 65 x 42 x 38 mm" /></div>
							<div><label className={labelClass}>Ovario Izq</label><input value={leftOvaryDimensions} onChange={e => setLeftOvaryDimensions(e.target.value)} className={inputBase} placeholder="Ej. 28 x 15 mm" /></div>
							<div><label className={labelClass}>Ovario Der</label><input value={rightOvaryDimensions} onChange={e => setRightOvaryDimensions(e.target.value)} className={inputBase} placeholder="Ej. 30 x 18 mm" /></div>
						</div>

						<h4 className="font-semibold text-teal-800 mb-4 bg-teal-50 p-2 rounded">Endometrio e Hallazgos</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							<div><label className={labelClass}>Línea Endometrial (mm)</label><input value={endometrialInterface} onChange={e => setEndometrialInterface(e.target.value)} className={inputBase} /></div>
							<QuickValueChip label="Tipo de Endometrio" currentValue={endometrialInterfaceType} options={["TRILAMINAR", "QUISTICO", "ENGROSADO", "A PRECISAR"]} onSelect={setEndometrialInterfaceType} />
							<QuickValueChip label="Fase Endometrial" currentValue={endometrialInterfacePhase} options={["PROLIFERATIVA", "SECRETORA", "MENSTRUAL"]} onSelect={setEndometrialInterfacePhase} />
							<QuickValueChip label="Líquido en Fondo de Saco" currentValue={fundusFluid} options={["NO SE EVIDENCIA LÍQUIDO", "ESCASO LÍQUIDO", "ABUNDANTE LÍQUIDO LIBRE"]} onSelect={setFundusFluid} />
						</div>
					</div>
				);
			case 'gyn_colpo':
				return (
					<div className={sectionCard}>
						<h3 className="text-lg font-bold text-slate-700 mb-6 border-b pb-2">Informe Colposcópico</h3>
						
						<h4 className="font-semibold text-teal-800 mb-4 bg-teal-50 p-2 rounded">Evaluación General</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
							<QuickValueChip label="Prueba Acético 5%" currentValue={colposcopyAcetic5} options={["SATISFACTORIO", "INSATISFACTORIO"]} onSelect={setColposcopyAcetic5} />
							<QuickValueChip label="Tipo de Transformación" currentValue={colposcopyType} options={["TIPO 1", "TIPO 2", "TIPO 3", "ALTERADA"]} onSelect={setColposcopyType} />
							<QuickValueChip label="Ectocérvix" currentValue={colposcopyEctocervix} options={["EPITELIO ESCAMOSO ORIGINAL", "ECTOPIA", "QUISTES DE NABOTH"]} onSelect={setColposcopyEctocervix} />
						</div>

						<h4 className="font-semibold text-teal-800 mb-4 bg-teal-50 p-2 rounded">Hallazgos Anormales (Ácido Acético)</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
							<QuickValueChip label="Acetoblanco" currentValue={colposcopyAcetowhite} options={["Negativo", "Tenue", "Denso"]} onSelect={setColposcopyAcetowhite} />
							<QuickValueChip label="Mosaico" currentValue={colposcopyMosaic} options={["No", "Fino", "Grueso"]} onSelect={setColposcopyMosaic} />
							<QuickValueChip label="Puntillado" currentValue={colposcopyPunctation} options={["No", "Fino", "Grueso"]} onSelect={setColposcopyPunctation} />
							<QuickValueChip label="Vasos Atípicos" currentValue={colposcopyAtypicalVessels} options={["No", "Si"]} onSelect={setColposcopyAtypicalVessels} />
							<QuickValueChip label="Carcinoma Invasor" currentValue={colposcopyInvasiveCarcinoma} options={["No", "Si"]} onSelect={setColposcopyInvasiveCarcinoma} />
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							<div>
								<label className={labelClass}>Detalles del Acetoblanco</label>
								<textarea value={colposcopyAcetowhiteDetails} onChange={e => setColposcopyAcetowhiteDetails(e.target.value)} rows={2} className={inputBase} />
							</div>
							<div>
								<label className={labelClass}>Ubicación y Extensión</label>
								<textarea value={colposcopyExtension} onChange={e => setColposcopyExtension(e.target.value)} rows={2} className={inputBase} />
							</div>
						</div>

						<h4 className="font-semibold text-teal-800 mb-4 bg-teal-50 p-2 rounded">Intervención Diagnóstica</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<QuickValueChip label="Test de Lugol (Schiller)" currentValue={colposcopyLugol} options={["Caoba", "Amarillo Mostaza", "Negativo"]} onSelect={setColposcopyLugol} />
							<QuickValueChip label="Toma de Biopsia" currentValue={colposcopyBiopsy} options={["No", "Si"]} onSelect={setColposcopyBiopsy} />
							{colposcopyBiopsy === "Si" && (
								<div className="md:col-span-2">
									<label className={labelClass}>Ubicación Biopsia (Reloj)</label>
									<input value={colposcopyBiopsyLocation} onChange={e => setColposcopyBiopsyLocation(e.target.value)} className={inputBase} placeholder="Ej: A las 12 horas" />
								</div>
							)}
						</div>
					</div>
				);
			case 'obstetrics_t1':
				return <ObstetricsT1 data={obstetricsT1} onChange={setObstetricsT1} />;
			case 'obstetrics_t2t3':
				return <ObstetricsT2T3 data={obstetricsT2T3} onChange={setObstetricsT2T3} />;
			case 'gyn_cie11':
				return (
					<div className={sectionCard}>
						<div className="flex justify-between items-center mb-6 border-b pb-2">
							<h3 className="text-lg font-bold text-slate-700">Diagnósticos</h3>
						</div>

						<div className="bg-slate-50 p-1.5 rounded-xl flex gap-1 mb-6">
							<button
								onClick={() => setDiagnosisInputMode('cie11')}
								className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
									diagnosisInputMode === 'cie11'
										? 'bg-white text-teal-600 shadow-sm'
										: 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
								}`}
							>
								Búsqueda CIE-11
							</button>
							<button
								onClick={() => setDiagnosisInputMode('manual')}
								className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
									diagnosisInputMode === 'manual'
										? 'bg-white text-teal-600 shadow-sm'
										: 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
								}`}
							>
								Ingreso Manual
							</button>
						</div>

						<div className="relative">
							{diagnosisInputMode === 'cie11' ? (
								<ICD11Search 
									onSelect={(icd) => {
										const { code, title } = icd;
										setIcd11Code(code);
										setIcd11Title(title);
										const newDiag = `${code} - ${title}`;
										if (!gynDiagnoses.includes(newDiag)) {
											setGynDiagnoses([...gynDiagnoses, newDiag]);
										}
									}} 
								/>
							) : (
								<div className="flex gap-2 anime-fade-in">
									<input
										type="text"
										value={manualDiagnosisInput}
										onChange={(e) => setManualDiagnosisInput(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												if (manualDiagnosisInput.trim() && !gynDiagnoses.includes(manualDiagnosisInput.trim())) {
													setGynDiagnoses([...gynDiagnoses, manualDiagnosisInput.trim()]);
													setManualDiagnosisInput('');
												}
											}
										}}
										className={inputBase}
										placeholder="Escribir diagnóstico y presionar Enter..."
									/>
									<button
										onClick={() => {
											if (manualDiagnosisInput.trim() && !gynDiagnoses.includes(manualDiagnosisInput.trim())) {
												setGynDiagnoses([...gynDiagnoses, manualDiagnosisInput.trim()]);
												setManualDiagnosisInput('');
											}
										}}
										className="px-6 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition"
									>
										Añadir
									</button>
								</div>
							)}
						</div>

						{gynDiagnoses.length > 0 && (
							<div className="mt-8">
								<h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">Diagnósticos Registrados</h4>
								<ul className="space-y-2">
									{gynDiagnoses.map((diag, index) => (
										<li key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-medium text-slate-700 group">
											<div className="flex items-start gap-3 flex-1 break-words">
												<div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0"></div>
												<span>{diag}</span>
											</div>
											<button
												onClick={() => {
													const newDiags = [...gynDiagnoses];
													newDiags.splice(index, 1);
													setGynDiagnoses(newDiags);
												}}
												className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
												title="Eliminar diagnóstico"
											>
												<Trash2 size={16} />
											</button>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				);
			case 'plan':
				return (
					<div className={sectionCard}>
						<div className="flex items-center justify-between mb-8 border-b pb-4">
							<h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
								<ClipboardList size={24} className="text-teal-600" /> Plan / Tratamiento
							</h2>
							<div className="flex items-center gap-2">
								{loading && <Loader2 size={16} className="animate-spin text-teal-600" />}
								<select 
									className={`${inputBase} !py-2 !text-sm lg:w-64`}
									onChange={(e) => {
										if (e.target.value) handleApplyRecipe(e.target.value);
										e.target.value = "";
									}}
									disabled={applyingRecipe}
								>
									<option value="">Cargar Plantilla de Receta...</option>
									{templates.map(tmpl => (
										<option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
									))}
								</select>
							</div>
						</div>

						{applyingRecipe && (
							<div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-3 text-teal-700 font-medium">
								<Loader2 size={18} className="animate-spin" /> Descargando y procesando plantilla...
							</div>
						)}

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
							<div className="space-y-6 lg:col-span-2">
								<div>
									<label className={labelClass}>Indicaciones Generales del Plan</label>
									<MultiInput value={planIndications} onChange={setPlanIndications} placeholder="Escriba aquí las indicaciones generales..." />
								</div>
							</div>

							<div className="space-y-6">
								<h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><Sparkles size={16}/> Medicación Estándar</h3>
								<div>
									<label className={labelClass}>Tratamiento Infección</label>
									<MultiInput value={treatmentInfection} onChange={setTreatmentInfection} placeholder="Antibióticos / Antifúngicos..." />
								</div>
								<div>
									<label className={labelClass}>Tratamiento del Sangrado</label>
									<MultiInput value={bleedingTreatment} onChange={setBleedingTreatment} placeholder="Especificar tratamiento de sangrado..." />
								</div>
								<div>
									<label className={labelClass}>Tratamiento Anticonceptivo</label>
									<MultiInput value={contraceptiveTreatment} onChange={setContraceptiveTreatment} placeholder="Especificar método anticonceptivo..." />
								</div>
							</div>

							<div className="space-y-6">
								<h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><Activity size={16}/> Suplementos y Cuidados</h3>
								<div>
									<label className={labelClass}>Recomendaciones Dietéticas</label>
									<MultiInput value={dietIndications} onChange={setDietIndications} placeholder="Especificar dieta..." />
								</div>
								<div>
									<label className={labelClass}>Jabón Íntimo</label>
									<MultiInput value={intimateSoap} onChange={setIntimateSoap} placeholder="Especificar tipo o marca..." />
								</div>
								<div>
									<label className={labelClass}>Probióticos (Opcional)</label>
									<MultiInput value={probiotics} onChange={setProbiotics} placeholder="Especificar probióticos..." />
								</div>
								<div>
									<label className={labelClass}>Vitaminas (Opcional)</label>
									<MultiInput value={vitamins} onChange={setVitamins} placeholder="Especificar vitaminas..." />
								</div>
							</div>
						</div>
					</div>
				);
			case 'report':
				const hasObstetrics = initial?.vitals?.obstetrics != null && Object.keys(initial.vitals.obstetrics).length > 0;
				return (
					<div className="flex flex-col gap-6 animate-in fade-in duration-700" data-tab="report">
						
						{/* BARRA DE HERRAMIENTAS CORPORATIVA (TOP TOOLBAR) */}
						<div className="bg-white border border-slate-200 shadow-sm rounded-xl px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
							<div className="flex items-center gap-6">
								<div className="flex items-center gap-3 pr-6 border-r border-slate-100">
									<div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
										<FileText size={18} />
									</div>
									<h3 className="text-sm font-bold text-slate-800 tracking-tight">Estación de Informe</h3>
								</div>

								<div className="flex items-center gap-4">
									{hasObstetrics && (
										<div className="flex bg-slate-100 p-1 rounded-lg">
											{[
												{ id: 'gynecology', label: 'General' },
												{ id: 'first_trimester', label: '1er Trim.' },
												{ id: 'second_third_trimester', label: '2do/3er Trim.' }
											].map((t) => (
												<button
													key={t.id}
													type="button"
													onClick={() => setSelectedReportType(t.id as any)}
													className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all ${
														selectedReportType === t.id 
															? 'bg-white text-blue-600 shadow-sm' 
															: 'text-slate-500 hover:text-slate-700'
													}`}
												>
													{t.label}
												</button>
											))}
										</div>
									)}
									<div className="flex items-center gap-2">
										<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fuente:</span>
										<select 
											value={fontFamily} 
											onChange={(e) => setFontFamily(e.target.value)}
											className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none border-b border-slate-200 pb-0.5 hover:border-blue-400 transition-all px-1"
										>
											{availableFonts.map(f => (
												<option key={f.value} value={f.value}>{f.label}</option>
											))}
										</select>
									</div>
								</div>
							</div>
							
							<div className="flex items-center gap-3">
								<button 
									type="button" 
									onClick={async () => {
										try {
											const reportType = selectedReportType === 'gynecology' ? 'text' : selectedReportType;
											const res = await fetch(`/api/consultations/${initial.id}/generate-report-content?report_type=${reportType}`);
											const data = await res.json();
											if (res.ok && data.content) {
												setReportContent(replaceTemplateVariables(data.content));
												setReportSuccess('Datos clínicos sincronizados correctamente.');
												setReportError(null);
											} else {
												setReportError('No se encontró una plantilla compatible.');
											}
										} catch (err: any) { setReportError('Error de red al sincronizar.'); }
									}}
									className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-green-700 shadow-sm transition-all active:scale-95"
								>
									<CheckCircle2 size={14} /> Cargar Datos Clínicos
								</button>
							</div>
						</div>

						{/* CONFIGURACIÓN DE SECCIONES (SELECTOR GRANULAR) */}
						<div className="bg-white border border-slate-200 shadow-sm rounded-xl px-6 py-6 mb-2">
							<div className="flex items-center gap-3 mb-6">
								<div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
									<CheckCircle2 size={18} />
								</div>
								<div>
									<h4 className="text-sm font-bold text-slate-800 tracking-tight">Configuración del Contenido</h4>
									<p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Selecciona los módulos a incluir en el informe final</p>
								</div>
							</div>

							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
								{[
									{ id: 'patient_data', label: 'Datos Paciente' },
									{ id: 'vitals', label: 'Signos Vitales' },
									{ id: 'gyn_antecedentes', label: 'Antecedentes Gyn' },
									{ id: 'gyn_historia', label: 'Historia Gyn' },
									{ id: 'gyn_fisico', label: 'Examen Físico' },
									{ id: 'gyn_eco', label: 'Ecografía Gyn' },
									{ id: 'gyn_colpo', label: 'Colposcopia' },
									{ id: 'gyn_cie11', label: 'Diagnósticos' },
									{ id: 'obstetrics_t1', label: 'Obstetricia T1' },
									{ id: 'obstetrics_t2t3', label: 'Obstetricia T2/T3' },
									{ id: 'plan', label: 'Plan / Tratamiento' },
								].map((s) => (
									<label 
										key={s.id} 
										className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
											includedSections.includes(s.id) 
												? 'bg-teal-50 border-teal-200 text-teal-700 shadow-sm' 
												: 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
										}`}
									>
										<input 
											type="checkbox" 
											className="hidden" 
											checked={includedSections.includes(s.id)}
											onChange={(e) => {
												if (e.target.checked) {
													setIncludedSections([...includedSections, s.id]);
												} else {
													setIncludedSections(includedSections.filter(x => x !== s.id));
												}
											}}
										/>
										<div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${
											includedSections.includes(s.id) ? 'bg-teal-600 border-teal-600' : 'bg-transparent border-slate-200'
										}`}>
											{includedSections.includes(s.id) && <CheckCircle2 size={12} className="text-white" />}
										</div>
										<span className="text-xs font-bold leading-none">{s.label}</span>
									</label>
								))}
							</div>
						</div>

						{/* ASISTENTE INTELIGENTE (ESTILO CORPORATIVO) */}
						<div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden transition-all duration-300">
							<div className="flex items-center justify-between px-6 py-4 border-b border-slate-50 bg-slate-50/50">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
										<Sparkles size={16} />
									</div>
									<div>
										<h4 className="text-xs font-bold text-slate-800 uppercase tracking-normal">Procesamiento Inteligente con IA</h4>
										<p className="text-[10px] text-slate-500 font-medium">Automatización clínica avanzada</p>
									</div>
								</div>
								<button 
									onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
									className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest border border-blue-100 px-3 py-1 rounded-md hover:bg-blue-50 transition-all"
								>
									{isAIPanelOpen ? 'Ocultar Herramientas' : 'Mostrar Asistente'}
									<ChevronRight size={14} className={`transition-transform duration-300 ${isAIPanelOpen ? 'rotate-90' : ''}`} />
								</button>
							</div>

							{isAIPanelOpen && (
								<div className="p-8 md:p-12 bg-white animate-in fade-in slide-in-from-top-4 duration-700">
									<div className="max-w-5xl mx-auto flex flex-col md:flex-row items-stretch gap-0 border border-slate-200 rounded-3xl overflow-hidden shadow-2xl shadow-slate-200/40">
										{/* Panel de Control (Izquierda) */}
										<div className="flex-1 bg-white p-10 md:p-14 border-r border-slate-100">
											<div className="flex items-center gap-3 mb-8">
												<div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
													<div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Live AI Engine
												</div>
											</div>
											
											<h5 className="text-3xl font-extrabold text-slate-900 tracking-tighter mb-4 leading-[1.1]">
												Generación Cognitiva de Informe Médico.
											</h5>
											
											<p className="text-base text-slate-500 leading-relaxed font-medium mb-10 max-w-md">
												Nuestra infraestructura de **IA 2026** analiza la semántica de su consulta para estructurar un documento clínico de alta precisión en tiempo real.
											</p>

											<div className="space-y-4">
												<AudioRecorderButton
													consultationId={initial.id}
													reportType="general"
													specialty="General"
													onStart={() => { setReportError(null); setReportSuccess(null); }}
													onSuccess={(url) => {
														setReportUrl(url);
														setReportSuccess('Procesamiento de IA finalizado.');
														toast.success('Informe Generado');
													}}
													onError={(errorMsg) => setReportError(`IA Error: ${errorMsg}`)}
													className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl hover:bg-black transition-all transform active:scale-95 flex items-center justify-center gap-4"
												/>
												<div className="flex items-center gap-3 text-slate-400 pl-2">
													<div className="w-8 h-px bg-slate-100" />
													<span className="text-[10px] font-bold uppercase tracking-widest italic">Listo para capturar audio</span>
												</div>
											</div>
										</div>

										{/* Panel de Estado (Derecha) */}
										<div className="w-full md:w-[350px] bg-slate-50 p-10 md:p-12 flex flex-col justify-between relative overflow-hidden group">
											<div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32" />
											
											<div className="relative space-y-10">
												<div className="space-y-3">
													<div className="p-3 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
														<Sparkles className="text-blue-600" size={24} />
													</div>
													<h6 className="text-xs font-black text-slate-900 uppercase tracking-widest">IA 2026 Standard</h6>
													<p className="text-[11px] text-slate-500 leading-relaxed font-medium">
														Procesamiento de lenguaje natural optimizado para terminología médica internacional.
													</p>
												</div>

												<div className="space-y-3">
													<div className="p-3 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
														<Loader2 className="text-emerald-500 animate-spin" size={24} />
													</div>
													<h6 className="text-xs font-black text-slate-900 uppercase tracking-widest">Sincronización Cloud</h6>
													<p className="text-[11px] text-slate-500 leading-relaxed font-medium">
														Generación persistente en formato Word compatible con firma digital.
													</p>
												</div>
											</div>

											<div className="pt-10 border-t border-slate-200/60 relative">
												<div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
													<span>Estado del Motor</span>
													<span className="text-emerald-500 flex items-center gap-1.5">
														<div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operativo
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* ÁREA DE TRABAJO (EDITOR FULL WIDTH) */}
						<div className="bg-white border border-slate-200 shadow-md rounded-xl overflow-hidden flex flex-col flex-1 border-t-4 border-t-blue-600/20">
							<div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
									<p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Edición Profesional Activa</p>
								</div>
								<div className="text-[10px] font-bold text-slate-400 flex items-center gap-4">
									<span>Longitud: {reportContent.length} caracteres</span>
									<span>Guardado automático activado</span>
								</div>
							</div>
							
							<div className="p-0 flex-1 bg-white relative">
								<textarea 
									value={reportContent} 
									onChange={(e) => setReportContent(e.target.value)} 
									className="w-full min-h-[700px] px-16 py-12 text-lg text-slate-800 focus:outline-none resize-none bg-transparent placeholder-slate-200 leading-[1.8] font-normal" 
									placeholder="Inicie la transcripción o redacción del informe médico..."
									style={{ fontFamily: fontFamily === 'Outfit' || fontFamily === 'Inter' ? fontFamily : 'inherit' }}
								/>
								<div className="absolute bottom-8 right-12 opacity-[0.05] pointer-events-none select-none">
									<h2 className="text-5xl font-bold uppercase tracking-normal text-slate-900 opacity-20">ESTACIÓN MÉDICA</h2>
								</div>
							</div>
						</div>

						{/* FEEDBACK Y ACCIONES FINALES */}
						<div className="space-y-4">
							{(reportError || reportSuccess) && (
								<div className="animate-in slide-in-from-bottom-2">
									{reportError && <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 p-4 text-xs font-bold flex items-center gap-3 shadow-sm italic text-center justify-center uppercase tracking-widest leading-loose bg-red-500 text-white/90 border-transparent shadow shadow-red-500 shadow-sm border border-red-500/20 backdrop-blur-sm shadow shadow-red-500 shadow-sm border border-red-500/20 backdrop-blur-sm"><X size={16} /> {reportError}</div>}
									{reportSuccess && <div className="rounded-xl bg-green-50 border border-green-100 text-green-700 p-4 text-xs font-bold flex items-center gap-3 shadow-sm animate-in zoom-in-95 duration-500"><CheckCircle2 size={16} /> {reportSuccess}</div>}
								</div>
							)}

							<div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-4">
								<button 
									type="button" 
									onClick={handleGenerateReport} 
									disabled={generatingReport || (!reportContent.trim() && !hasObstetrics)} 
									className="flex-1 w-full md:w-auto px-10 py-4 bg-slate-900 text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md disabled:opacity-30 disabled:grayscale"
								>
									{generatingReport ? (
										<div className="flex items-center gap-3">
											<Loader2 className="animate-spin" size={16} /> Generando Word...
										</div>
									) : 'Procesar Documento Word (DOCX)'}
								</button>
								
								{reportUrl && (
									<div className="flex items-center gap-4 w-full md:w-auto">
										<a 
											href={reportUrl} 
											target="_blank" 
											rel="noopener noreferrer" 
											className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-white border border-slate-200 text-blue-700 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
										>
											<Download size={16} /> Descargar
										</a>
										<button 
											type="button" 
											onClick={handleSaveReport} 
											disabled={savingReport} 
											className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-4 bg-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
										>
											{savingReport ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
											Confirmar en Sistema
										</button>
									</div>
								)}
							</div>

							{patientEmail && (
								<div className="mt-4 p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
									<div className="flex items-center gap-4">
										<div className="p-3 bg-white rounded-xl shadow-sm border border-indigo-100 text-indigo-600">
											<Sparkles size={24} />
										</div>
										<div>
											<h4 className="font-bold text-indigo-900">Envío Digital Directo</h4>
											<p className="text-sm text-indigo-700">Enviar informe médico y recetas al correo: <span className="font-semibold underline">{patientEmail}</span></p>
										</div>
									</div>
									<button
										type="button"
										onClick={handleSendEmail}
										disabled={sendingEmail}
										className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
									>
										{sendingEmail ? <Loader2 className="animate-spin" size={18} /> : (emailSent ? <CheckCircle2 size={18} /> : <Sparkles size={18} />)}
										{sendingEmail ? 'Enviando...' : (emailSent ? '¡Correo Enviado!' : 'Enviar por Correo')}
									</button>
								</div>
							)}
						</div>
					</div>
				);
							
			case 'prescription':
				return (
					<div className="p-0">
						<PrescriptionForm 
							patients={patient ? [{ 
								id: patient.id, 
								firstName: patient.firstName, 
								lastName: patient.lastName, 
								identifier: patient.identifier,
								isUnregistered: patient.isUnregistered || false
							}] : []}
							initialData={prescriptionInitialData}
							activeTemplateUrl={selectedTemplateUrl}
							consultationId={initial.id}
							onCreated={(newPresc) => {
								// Al crear la receta, podemos marcar la sección como completada
								setCompletedSections(prev => new Set(prev).add('prescription'));
								// No cerramos, permitimos seguir navegando
							}}
						/>
					</div>
				);
			default: return null;
		}
	};

	const generateReportTextForPreview = () => {
		let text = `PACIENTE: ${patientFirstName} ${patientLastName}\nFECHA: ${new Date().toLocaleDateString()}\n\n`;
		if (chiefComplaint) text += `MOTIVO: ${chiefComplaint}\n\n`;
		text += `PLAN: ${planIndications}\n\nDIAGNÓSTICO: ${icd11Title}`;
		return text;
	};

	return (
		<div className="bg-slate-50 w-full flex-1 flex items-stretch relative">
			<ConsultationSidebar 
				patient={{ firstName: patientFirstName, lastName: patientLastName, identifier: patientIdentifier }}
				currentSection={currentSection}
				completedSections={completedSections}
				onNavigate={setCurrentSection}
				onSave={handleSave}
				loading={loading}
				progressPercent={Math.round((completedSections.size / sectionOrder.length) * 100)}
				navTree={navTree}
			/>

			<div className="flex-1 flex flex-col min-w-0 h-full">
					<ConsultationContentPane 
						title={navTree.find(n => n.id === currentSection || n.children?.some(c => c.id === currentSection))?.label || ''}
						fullWidth={currentSection === 'report'}
						onNext={() => {
							const next = sectionOrder[sectionOrder.indexOf(currentSection) + 1];
							if (next) { setCompletedSections(prev => new Set(prev).add(currentSection)); setCurrentSection(next); }
						}}
						onBack={() => {
							const prev = sectionOrder[sectionOrder.indexOf(currentSection) - 1];
							if (prev) setCurrentSection(prev);
						}}
						hideBack={currentSection === 'patient_data'}
						nextLabel={currentSection === 'prescription' ? 'Guardar Todo' : 'Siguiente'}
					>
						{renderSectionContent()}
					</ConsultationContentPane>
			</div>

			{isNotesModalOpen && (
				<DoctorPrivateNotesModal 
					isOpen={isNotesModalOpen} 
					onClose={() => setIsNotesModalOpen(false)} 
					consultationId={initial.id} 
					patientId={patient?.id}
					unregisteredPatientId={initial.unregistered_patient_id}
					doctorId={initial.doctor_id}
				/>
			)}
		</div>
	);
}
