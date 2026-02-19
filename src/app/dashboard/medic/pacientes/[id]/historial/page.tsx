'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, FileText, Image as ImageIcon, Pill, ClipboardList, Download, ChevronDown, ChevronUp, Calendar, Stethoscope, User, FileCheck, Activity, AlertCircle, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrescriptionItem {
	id: string;
	name: string;
	dosage: string;
	instructions: string;
}

interface Prescription {
	id: string;
	consultation_id: string;
	prescription_url: string | null;
	recipe_text: string | null;
	created_at: string;
	items: PrescriptionItem[];
}

interface Consultation {
	id: string;
	appointment_id: string | null;
	patient_id: string;
	doctor_id: string;
	organization_id: string;
	chief_complaint: string | null;
	diagnosis: string | null;
	icd11_code: string | null;
	icd11_title: string | null;
	notes: string | null;
	vitals: any;
	started_at: string | null;
	ended_at: string | null;
	created_at: string;
	updated_at: string;
	medical_record_id: string | null;
	report_url: string | null;
	doctor: { id: string; name: string; email: string } | null;
	appointment: {
		id: string;
		status: string;
		location: string | null;
		scheduled_at: string | null;
	} | null;
	facturacion: Array<{
		id: string;
		numero_factura: string | null;
		subtotal: number;
		total: number;
		moneda: string | null;
		metodo_pago: string | null;
		estado_pago: string | null;
		created_at: string;
	}> | null;
	medicalRecord: {
		id: string;
		content: any;
		attachments: string[] | null;
		createdAt: string;
	} | null;
	prescriptions: Prescription[];
}

interface PatientInfo {
	id: string;
	firstName: string;
	lastName: string;
	dob: string | null;
	phone: string | null;
	gender: string | null;
}

export default function PatientHistoryPage({ params }: { params: Promise<{ id: string }> }) {
	const [patientId, setPatientId] = useState<string | null>(null);
	const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
	const [consultations, setConsultations] = useState<Consultation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);

	useEffect(() => {
		async function init() {
			const resolvedParams = await params;
			setPatientId(resolvedParams.id);
		}
		init();
	}, [params]);

	useEffect(() => {
		if (!patientId) return;

		async function fetchData() {
			try {
				setLoading(true);
				setError(null);

				// Fetch patient info
				const patientRes = await fetch(`/api/patients/${patientId}`, { credentials: 'include' });
				if (patientRes.ok) {
					const patientData = await patientRes.json();
					setPatientInfo(patientData);
				}

				// Fetch consultations
				const consultationsRes = await fetch(`/api/consultations/patient/${patientId}`, {
					credentials: 'include',
				});

				if (!consultationsRes.ok) {
					throw new Error('Error al cargar las consultas');
				}

				const consultationsData = await consultationsRes.json();
				setConsultations(consultationsData.consultations || []);
			} catch (err: any) {
				console.error('Error fetching data:', err);
				setError(err.message || 'Error al cargar los datos');
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [patientId]);

	const toggleConsultation = (consultationId: string) => {
		setExpandedConsultation(expandedConsultation === consultationId ? null : consultationId);
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return '—';
		try {
			return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
		} catch {
			return dateString;
		}
	};

	const formatDateTime = (dateString: string | null) => {
		if (!dateString) return '—';
		try {
			return format(new Date(dateString), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
		} catch {
			return dateString;
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-linear-to-br from-slate-50 to-white py-10 px-6">
				<div className="max-w-6xl mx-auto">
					<div className="flex items-center justify-center min-h-[400px]">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
							<p className="text-slate-600">Cargando historial médico...</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-linear-to-br from-slate-50 to-white py-10 px-6">
				<div className="max-w-6xl mx-auto">
					<div className="bg-red-50 border border-red-200 rounded-2xl p-6">
						<div className="flex items-center gap-3 mb-4">
							<AlertCircle className="w-6 h-6 text-red-600" />
							<h3 className="text-lg font-semibold text-red-800">Error</h3>
						</div>
						<p className="text-red-700 mb-4">{error}</p>
						<Link href="/dashboard/medic/pacientes" className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
							<ArrowLeft className="w-4 h-4" />
							Volver a Pacientes
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-50 to-white py-10 px-6">
			<div className="max-w-6xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-linear-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
					<div className="flex items-center justify-between mb-4">
						<Link href="/dashboard/medic/pacientes" className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
							<ArrowLeft className="w-4 h-4" />
							Volver a Pacientes
						</Link>
					</div>
					<div className="flex items-center gap-4">
						<div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
							<User className="w-8 h-8" />
						</div>
						<div>
							<h1 className="text-3xl font-bold mb-1">Historial Médico</h1>
							{patientInfo && (
								<p className="text-white/90">
									{patientInfo.firstName} {patientInfo.lastName}
								</p>
							)}
						</div>
					</div>
				</div>

				{/* Patient Info Card */}
				{patientInfo && (
					<div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
						<h2 className="text-xl font-semibold text-slate-900 mb-4">Información del Paciente</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<p className="text-sm text-slate-500 mb-1">Fecha de Nacimiento</p>
								<p className="font-medium">{patientInfo.dob ? formatDate(patientInfo.dob) : '—'}</p>
							</div>
							<div>
								<p className="text-sm text-slate-500 mb-1">Teléfono</p>
								<p className="font-medium">{patientInfo.phone || '—'}</p>
							</div>
							<div>
								<p className="text-sm text-slate-500 mb-1">Género</p>
								<p className="font-medium">{patientInfo.gender || '—'}</p>
							</div>
						</div>
					</div>
				)}

				{/* Consultations List */}
				<div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
							<ClipboardList className="w-6 h-6 text-indigo-600" />
							Consultas Realizadas ({consultations.length})
						</h2>
					</div>

					{consultations.length === 0 ? (
						<div className="text-center py-12">
							<FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
							<p className="text-slate-600">No hay consultas registradas para este paciente.</p>
						</div>
					) : (
						<div className="space-y-4">
							{consultations.map((consultation) => (
								<ConsultationCard key={consultation.id} consultation={consultation} isExpanded={expandedConsultation === consultation.id} onToggle={() => toggleConsultation(consultation.id)} formatDate={formatDate} formatDateTime={formatDateTime} />
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// Componente para renderizar vitals de forma estructurada
function VitalsDisplay({ vitals }: { vitals: any }) {
	const fieldLabels: Record<string, Record<string, string>> = {
		general: {
			bmi: 'Índice de Masa Corporal (IMC)',
			spo2: 'Saturación de Oxígeno (SpO2)',
			height: 'Estatura (cm)',
			weight: 'Peso (kg)',
			glucose: 'Glucosa (mg/dL)',
			heart_rate: 'Frecuencia Cardíaca (lpm)',
			bp_systolic: 'Presión Arterial Sistólica (mmHg)',
			bp_diastolic: 'Presión Arterial Diastólica (mmHg)',
			temperature: 'Temperatura (°C)',
			respiratory_rate: 'Frecuencia Respiratoria (rpm)',
		},
		cardiology: {
			bnp: 'BNP (pg/mL)',
			edema: 'Presencia de Edema',
			ekg_rhythm: 'Ritmo EKG / ECG',
			chest_pain_scale: 'Escala de Dolor Torácico',
		},
		gynecology: {
			last_menstrual_period: 'Última Menstruación (LMP)',
			lmp: 'Última Menstruación (LMP)',
			gravida: 'Gravidez (G)',
			para: 'Partos (P)',
			abortus: 'Abortos (A)',
			gestational_age: 'Edad Gestacional (semanas)',
			its: 'Infecciones de Transmisión Sexual (ITS)',
			adnexa: 'Evaluación de Anexos',
			abdomen: 'Examen de Abdomen',
			allergies: 'Alergias Conocidas',
			breast_cap: 'Capacidad Mamaria',
			breast_size: 'Tamaño de los Senos',
			fundus_sacs: 'Fondos de Saco Vaginales',
			tact_cervix: 'Tacto Vaginal / Cérvix',
			dysmenorrhea: 'Dismenorrea (Dolor Menstrual)',
			fundus_fluid: 'Líquido en Fondo de Saco Duoglas',
			schiller_test: 'Prueba de Schiller (Lugol)',
			axillary_fossae: 'Fosas Axilares',
			breast_symmetry: 'Simetría Mamaria',
			hinselmann_test: 'Prueba de Hinselmann',
			speculum_cervix: 'Inspección de Cérvix con Espéculo',
			breast_secretion: 'Secreción Mamaria',
			surgical_history: 'Antecedentes Quirúrgicos',
			external_genitals: 'Inspección de Genitales Externos',
			menstruation_type: 'Características de la Menstruación',
			general_conditions: 'Estado General de Salud',
			family_history_father: 'Antecedentes Familiares (Padre)',
			family_history_mother: 'Antecedentes Familiares (Madre)',
			family_history_breast_cancer: 'Antecedentes de Cáncer de Mama',
			endometrial_interface_type: 'Patrón de Interfaz Endometrial',
			colposcopy_type: 'Tipo de Colposcopia',
			colposcopy_extension: 'Extensión de la Colposcopia',
			colposcopy_description: 'Descripción de Hallazgos Colposcópicos',
			colposcopy_location: 'Localización de Lesiones',
			colposcopy_acetowhite: 'Epitelio Acetoblanco',
			colposcopy_acetowhite_details: 'Detallles de Epitelio Acetoblanco',
			colposcopy_mosaic: 'Patrón en Mosaico',
			colposcopy_punctation: 'Patrón Punteado',
			colposcopy_atypical_vessels: 'Presencia de Vasos Atípicos',
			colposcopy_invasive_carcinoma: 'Sospecha de Carcinoma Invasivo',
			colposcopy_borders: 'Características de los Bordes',
			colposcopy_situation: 'Situación de la Lesión',
			colposcopy_elevation: 'Elevación de la Superficie',
			colposcopy_lugol: 'Captación de Lugol',
			colposcopy_biopsy: 'Realización de Biopsia',
			colposcopy_image: 'Documentación Fotográfica Colposcópica',
			colposcopy: 'Detalles de Colposcopia',
			additional_details: 'Detalles y Observaciones Adicionales',
			ho: 'Historia (Ho)',
			diagnoses: 'Diagnósticos',
			diagnosis: 'Diagnosis',
			probiotics: 'Probióticos',
			vaccinated: 'Vacunada',
			mastopathies: 'Mastopatías',
			contraceptive: 'Anticonceptivos',
			intimate_soap: 'Jabón Íntimo',
			last_cytology: 'Última Citología',
			current_partner: 'Pareja Actual',
			sexual_partners: 'Parejas Sexuales',
			hypersensitivity: 'Hipersensibilidad',
			plan_indications: 'Plan e Indicaciones',
			vaginal_discharge: 'Flujo Vaginal',
			first_pregnancy_age: 'Edad de Primer Embarazo',
			treatment_infection: 'Tratamiento de Infección',
			menstruation_pattern: 'Patrón Menstrual',
			first_sexual_relation: 'Primera Relación Sexual',
			current_illness_history: 'Historia de la Enfermedad Actual',
			exclusive_breastfeeding: 'Lactancia Exclusiva',
			psychobiological_habits: 'Hábitos Psicobiológicos',
			menarche: 'Menarquia',
			gardasil: 'Vacuna VPH (Gardasil)',
		},
		pulmonology: {
			pef: 'Flujo Espiratorio Máximo (PEF)',
			fev1: 'Volumen Espiratorio Forzado (FEV1)',
			fvc: 'Capacidad Vital Forzada (FVC)',
			spirometry_notes: 'Observaciones de Espirometría',
		},
		neurology: {
			gcs: 'Escala de Coma de Glasgow (GCS)',
			mental_status: 'Evaluación del Estado Mental',
			motor_function: 'Evaluación de Función Motora',
			sensory_function: 'Evaluación de Función Sensorial',
		},
		obstetrics: {
			gestational_age: 'Edad Gestacional ACTUAL',
			fundal_height: 'Altura de Fondo Uterino (cm)',
			fetal_heart_rate: 'Frecuencia Cardíaca Fetal (lpm/FHR)',
			amniotic_fluid: 'Nivel/Calidad de Líquido Amniótico',
		},
		nutrition: {
			body_fat_percentage: 'Porcentaje de Grasa Corporal (%)',
			muscle_mass: 'Masa Muscular Estimada (kg)',
			basal_metabolic_rate: 'Tasa Metabólica Basal (TMB/BMR)',
		},
		dermatology: {
			lesion_type: 'Morfología de la Lesión',
			lesion_size: 'Dimensiones de la Lesión (cm)',
			lesion_location: 'Distribución / Localización de Lesión',
			skin_type: 'Clasificación de Tipo de Piel',
		},
		psychiatry: {
			phq9_score: 'Puntuación Depresión PHQ-9',
			gad7_score: 'Puntuación Ansiedad GAD-7',
			mental_status_exam: 'Examen de Estado Mental Detallado',
		},
	};

	const sectionLabels: Record<string, string> = {
		general: 'Signos Vitales Generales',
		cardiology: 'Cardiología',
		gynecology: 'Ginecología',
		pulmonology: 'Neumología',
		neurology: 'Neurología',
		obstetrics: 'Obstetricia',
		nutrition: 'Nutrición',
		dermatology: 'Dermatología',
		psychiatry: 'Psiquiatría',
	};

	const sectionColors: Record<string, string> = {
		general: 'from-blue-500 to-cyan-500',
		cardiology: 'from-red-500 to-rose-500',
		gynecology: 'from-pink-500 to-purple-500',
		pulmonology: 'from-sky-500 to-blue-500',
		neurology: 'from-indigo-500 to-violet-500',
		obstetrics: 'from-rose-500 to-pink-500',
		nutrition: 'from-green-500 to-emerald-500',
		dermatology: 'from-amber-500 to-orange-500',
		psychiatry: 'from-purple-500 to-indigo-500',
	};

	const formatValue = (value: any): string => {
		if (value === null || value === undefined || value === '') return '—';
		if (typeof value === 'boolean') return value ? 'Sí' : 'No';
		if (typeof value === 'object') {
			// Si es un objeto, intentar aplanarlo para mostrarlo
			return Object.entries(value)
				.filter(([_, v]) => v !== null && v !== undefined && v !== '')
				.map(([k, v]) => {
					const label = k.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
					return `${label}: ${formatValue(v)}`;
				})
				.join(' | ');
		}
		return String(value);
	};

	const renderField = (section: string, key: string, value: any) => {
		// Normalizar la clave para buscar (convertir a minúsculas y manejar diferentes formatos)
		const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');

		// Buscar etiqueta exacta primero
		let label = fieldLabels[section]?.[key];

		// Si no se encuentra, buscar con la clave normalizada
		if (!label && fieldLabels[section]) {
			// Buscar por coincidencia exacta en minúsculas
			const exactMatch = Object.keys(fieldLabels[section]).find((k) => k.toLowerCase() === normalizedKey || k.toLowerCase().replace(/\s+/g, '_') === normalizedKey);
			if (exactMatch) {
				label = fieldLabels[section][exactMatch];
			}
		}

		// Si aún no hay etiqueta, formatear el nombre del campo
		if (!label) {
			label = key
				.replace(/_/g, ' ')
				.replace(/([A-Z])/g, ' $1')
				.trim()
				.split(' ')
				.map((word) => {
					// Mantener acrónimos en mayúsculas (ITS, LMP, BNP, etc.)
					if (word.length <= 4 && word === word.toUpperCase()) {
						return word;
					}
					// Capitalizar primera letra de cada palabra
					return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
				})
				.join(' ')
				.replace(/Its/g, 'ITS')
				.replace(/Lmp/g, 'LMP')
				.replace(/Bnp/g, 'BNP')
				.replace(/Ekg/g, 'EKG')
				.replace(/Gcs/g, 'GCS')
				.replace(/Phq/g, 'PHQ')
				.replace(/Gad/g, 'GAD');
		}

		const formattedValue = formatValue(value);

		return (
			<div key={key} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 py-2 border-b border-slate-200 last:border-0">
				<span className="text-sm font-medium text-slate-700 min-w-[200px]">{label}</span>
				<span className="text-sm text-slate-900 font-semibold text-right">{formattedValue}</span>
			</div>
		);
	};

	return (
		<div>
			<h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
				<Activity className="w-5 h-5 text-indigo-600" />
				Signos Vitales y Especialidades
			</h4>
			<div className="space-y-4">
				{Object.entries(vitals).map(([section, data]: [string, any]) => {
					if (!data || typeof data !== 'object' || Object.keys(data).length === 0) return null;

					const sectionLabel = sectionLabels[section] || section.charAt(0).toUpperCase() + section.slice(1);
					const gradient = sectionColors[section] || 'from-slate-500 to-slate-600';

					return (
						<div key={section} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
							<div className={`bg-linear-to-r ${gradient} px-4 py-3`}>
								<h5 className="font-semibold text-white text-base">{sectionLabel}</h5>
							</div>
							<div className="p-4">
								<div className="space-y-1">
									{Object.entries(data).map(([key, value]) => {
										// Omitir campos vacíos o nulos
										if (value === null || value === undefined || value === '') return null;
										// Omitir campos de imagen (se muestran en otra sección)
										if (key === 'colposcopy_image' && typeof value === 'string') return null;
										return renderField(section, key, value);
									})}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// Componente para galería de imágenes con visor modal
function ImagesGallery({ images }: { images: Array<{ url: string; label: string; source: string }> }) {
	const [selectedImage, setSelectedImage] = useState<{ url: string; label: string; index: number } | null>(null);

	const isImageUrl = (url: string): boolean => {
		const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
		const lowerUrl = url.toLowerCase();
		return imageExtensions.some((ext) => lowerUrl.includes(ext)) || /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
	};

	const handleDownload = (url: string, label: string, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		fetch(url)
			.then((response) => response.blob())
			.then((blob) => {
				const blobUrl = window.URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = blobUrl;
				link.download = label || 'imagen-descargada';
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				window.URL.revokeObjectURL(blobUrl);
			})
			.catch((error) => {
				console.error('Error al descargar imagen:', error);
				// Fallback: abrir en nueva pestaña
				window.open(url, '_blank');
			});
	};

	if (images.length === 0) return null;

	return (
		<>
			<div>
				<h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<ImageIcon className="w-4 h-4 text-blue-600" />
					Imágenes Adjuntas ({images.length})
				</h4>
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					{images.map((image, idx) => {
						const isImage = isImageUrl(image.url);

						return (
							<div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-indigo-500 transition-all cursor-pointer bg-slate-50" onClick={() => setSelectedImage({ url: image.url, label: image.label, index: idx })}>
								{isImage ? (
									<>
										<img
											src={image.url}
											alt={image.label}
											className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
											onError={(e) => {
												// Si falla la carga de la imagen, mostrar un placeholder
												const target = e.target as HTMLImageElement;
												target.style.display = 'none';
												const parent = target.parentElement;
												if (parent) {
													parent.innerHTML = `
														<div class="w-full h-full flex flex-col items-center justify-center p-4">
															<svg class="w-12 h-12 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
															</svg>
															<p class="text-xs text-slate-500 text-center">Error al cargar</p>
														</div>
													`;
												}
											}}
										/>
										<div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
											<div className="absolute bottom-0 left-0 right-0 p-2">
												<p className="text-white text-xs font-medium truncate">{image.label}</p>
											</div>
										</div>
										<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
											<div className="flex gap-1">
												<button onClick={(e) => handleDownload(image.url, image.label, e)} className="p-1.5 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors" title="Descargar">
													<Download className="w-3.5 h-3.5 text-slate-700" />
												</button>
												<button
													onClick={(e) => {
														e.stopPropagation();
														setSelectedImage({ url: image.url, label: image.label, index: idx });
													}}
													className="p-1.5 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
													title="Ver en pantalla completa">
													<Maximize2 className="w-3.5 h-3.5 text-slate-700" />
												</button>
											</div>
										</div>
									</>
								) : (
									<div className="w-full h-full flex flex-col items-center justify-center p-4">
										<FileText className="w-12 h-12 text-slate-400 mb-2" />
										<p className="text-xs text-slate-600 text-center mb-2 truncate w-full">{image.label}</p>
										<a href={image.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
											Abrir archivo
										</a>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Modal para vista ampliada */}
			<AnimatePresence>
				{selectedImage && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
						<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
							<button onClick={() => setSelectedImage(null)} className="absolute -top-10 right-0 text-white hover:text-slate-300 transition-colors p-2">
								<X className="w-6 h-6" />
							</button>

							<div className="bg-white rounded-lg overflow-hidden shadow-2xl">
								<div className="p-4 bg-slate-900 text-white flex items-center justify-between">
									<h3 className="font-semibold">{images[selectedImage.index].label}</h3>
									<button onClick={() => handleDownload(selectedImage.url, selectedImage.label, { preventDefault: () => {}, stopPropagation: () => {} } as any)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
										<Download className="w-4 h-4" />
										Descargar
									</button>
								</div>
								<div className="relative">
									{isImageUrl(selectedImage.url) ? (
										<img
											src={selectedImage.url}
											alt={selectedImage.label}
											className="max-w-full max-h-[80vh] object-contain"
											onError={(e) => {
												const target = e.target as HTMLImageElement;
												target.style.display = 'none';
												const parent = target.parentElement;
												if (parent) {
													parent.innerHTML = `
														<div class="p-8 text-center">
															<p class="text-red-600">Error al cargar la imagen</p>
															<a href="${selectedImage.url}" target="_blank" class="text-indigo-600 hover:underline mt-2 inline-block">Abrir en nueva pestaña</a>
														</div>
													`;
												}
											}}
										/>
									) : (
										<div className="p-8 text-center">
											<FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
											<p className="text-slate-600 mb-4">Archivo no es una imagen</p>
											<a href={selectedImage.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
												<Download className="w-4 h-4" />
												Descargar/Abrir Archivo
											</a>
										</div>
									)}
								</div>
							</div>

							{/* Navegación entre imágenes */}
							{images.length > 1 && (
								<>
									<button
										onClick={(e) => {
											e.stopPropagation();
											const prevIndex = selectedImage.index > 0 ? selectedImage.index - 1 : images.length - 1;
											setSelectedImage({ ...images[prevIndex], index: prevIndex });
										}}
										className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-slate-300 transition-colors p-2 bg-black/50 rounded-full">
										<ChevronDown className="w-6 h-6 rotate-90" />
									</button>
									<button
										onClick={(e) => {
											e.stopPropagation();
											const nextIndex = selectedImage.index < images.length - 1 ? selectedImage.index + 1 : 0;
											setSelectedImage({ ...images[nextIndex], index: nextIndex });
										}}
										className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-slate-300 transition-colors p-2 bg-black/50 rounded-full">
										<ChevronDown className="w-6 h-6 -rotate-90" />
									</button>
								</>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}

// Componente para renderizar recetas de forma simplificada
function PrescriptionsDisplay({ prescriptions }: { prescriptions: Prescription[] }) {
	if (prescriptions.length === 0) return null;

	return (
		<div>
			<h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
				<Pill className="w-5 h-5 text-indigo-600" />
				Recetas Generadas ({prescriptions.length})
			</h4>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{prescriptions.map((presc) => {
					const medsList = presc.items?.map((i) => i.name).join(', ') || 'Medicación variada';

					return (
						<div key={presc.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col justify-between hover:border-indigo-300 transition-colors">
							<div className="mb-3">
								<div className="flex items-center justify-between mb-1">
									<span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
										{format(new Date(presc.created_at), 'dd/MM/yyyy', { locale: es })}
									</span>
									<ClipboardList className="w-4 h-4 text-emerald-500" />
								</div>
								<p className="text-sm font-semibold text-slate-800 line-clamp-2">
									{medsList}
								</p>
							</div>

							{presc.prescription_url ? (
								<a
									href={presc.prescription_url}
									target="_blank"
									rel="noopener noreferrer"
									className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
								>
									<Download className="w-4 h-4" />
									Descargar Receta
								</a>
							) : (
								<div className="w-full py-2 bg-slate-200 text-slate-500 rounded-lg text-sm font-medium text-center border border-dashed border-slate-300">
									Archivo no disponible
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function ConsultationCard({ consultation, isExpanded, onToggle, formatDate, formatDateTime }: { consultation: Consultation; isExpanded: boolean; onToggle: () => void; formatDate: (date: string | null) => string; formatDateTime: (date: string | null) => string }) {
	const consultationDate = consultation.started_at || consultation.created_at;

	const getStatusColor = (status: string) => {
		switch (status.toUpperCase()) {
			case 'COMPLETED': case 'COMPLETADA': return 'bg-green-100 text-green-700';
			case 'PENDING': case 'PENDIENTE': return 'bg-amber-100 text-amber-700';
			case 'CANCELLED': case 'CANCELADA': return 'bg-red-100 text-red-700';
			case 'IN_PROGRESS': case 'EN_CURSO': return 'bg-blue-100 text-blue-700';
			default: return 'bg-slate-100 text-slate-700';
		}
	};

	const translateStatus = (status: string) => {
		switch (status.toUpperCase()) {
			case 'COMPLETED': return 'Completada';
			case 'PENDING': return 'Pendiente';
			case 'CANCELLED': return 'Cancelada';
			case 'IN_PROGRESS': return 'En Curso';
			default: return status;
		}
	};

	return (
		<motion.div initial={false} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
			{/* Header - Always Visible */}
			<button onClick={onToggle} className="w-full p-5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left">
				<div className="flex items-center gap-4 flex-1">
					<div className="w-12 h-12 rounded-lg bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
						<Calendar className="w-6 h-6" />
					</div>
					<div className="flex-1">
						<div className="font-semibold text-lg text-slate-900 mb-1">Consulta del {formatDate(consultationDate)}</div>
						<div className="text-sm text-slate-600">{consultation.chief_complaint || consultation.diagnosis || 'Sin motivo específico'}</div>
					</div>
				</div>
				<div className="flex items-center gap-4">
					<div className="text-right">
						<div className="text-sm font-medium text-slate-700">{formatDateTime(consultationDate)}</div>
						{consultation.appointment && (
							<div className="mt-1 flex justify-end">
								<span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${getStatusColor(consultation.appointment.status)}`}>
									{translateStatus(consultation.appointment.status)}
								</span>
							</div>
						)}
					</div>
					{isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
				</div>
			</button>

			{/* Expanded Content */}
			<AnimatePresence>
				{isExpanded && (
					<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
						<div className="p-6 bg-white border-t border-slate-200 space-y-6">
							{/* Diagnosis & Chief Complaint */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{consultation.chief_complaint && (
									<div>
										<h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
											<Stethoscope className="w-4 h-4 text-indigo-600" />
											Motivo de Consulta
										</h4>
										<p className="text-slate-700 bg-slate-50 rounded-lg p-3">{consultation.chief_complaint}</p>
									</div>
								)}
								{consultation.diagnosis && (
									<div>
										<h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
											<FileCheck className="w-4 h-4 text-purple-600" />
											Diagnóstico
										</h4>
										<p className="text-slate-700 bg-slate-50 rounded-lg p-3">{consultation.diagnosis}</p>
										{consultation.icd11_code && (
											<div className="mt-2 text-xs text-slate-500">
												ICD-11: {consultation.icd11_code} - {consultation.icd11_title || ''}
											</div>
										)}
									</div>
								)}
							</div>

							{/* Notes */}
							{consultation.notes && (
								<div>
									<h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
										<FileText className="w-4 h-4 text-amber-600" />
										Notas Adicionales
									</h4>
									<p className="text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{consultation.notes}</p>
								</div>
							)}

							{/* Medical Report */}
							{consultation.report_url && (
								<div>
									<h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
										<FileCheck className="w-4 h-4 text-green-600" />
										Informe Médico
									</h4>
									<div className="bg-slate-50 rounded-lg p-4">
										<a href={consultation.report_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
											<Download className="w-4 h-4" />
											Descargar Informe
										</a>
									</div>
								</div>
							)}

							{/* All Images - Medical Record Attachments and Colposcopy Image */}
							{(() => {
								// Recolectar todas las imágenes de diferentes fuentes
								const allImages: Array<{ url: string; label: string; source: string }> = [];

								// 1. Imágenes del MedicalRecord
								if (consultation.medicalRecord?.attachments && Array.isArray(consultation.medicalRecord.attachments)) {
									consultation.medicalRecord.attachments.forEach((url, idx) => {
										if (url && typeof url === 'string') {
											allImages.push({
												url,
												label: `Imagen de Examen ${idx + 1}`,
												source: 'medicalRecord',
											});
										}
									});
								}

								// 2. Imagen colposcópica de vitals
								if (consultation.vitals?.gynecology?.colposcopy?.colposcopy_image) {
									const colposcopyImg = consultation.vitals.gynecology.colposcopy.colposcopy_image;
									if (typeof colposcopyImg === 'string' && colposcopyImg.trim()) {
										allImages.push({
											url: colposcopyImg,
											label: 'Imagen Colposcópica',
											source: 'colposcopy',
										});
									}
								}

								// 3. Buscar otras imágenes en vitals (por si hay más en otras secciones)
								if (consultation.vitals && typeof consultation.vitals === 'object') {
									const searchForImages = (obj: any, path: string = '') => {
										if (!obj || typeof obj !== 'object') return;
										for (const [key, value] of Object.entries(obj)) {
											const currentPath = path ? `${path}.${key}` : key;
											if (key.includes('image') || key.includes('imagen') || key.includes('photo') || key.includes('foto')) {
												if (typeof value === 'string' && value.trim() && value.startsWith('http')) {
													// Evitar duplicados (ya tenemos colposcopy_image)
													if (currentPath !== 'gynecology.colposcopy.colposcopy_image') {
														allImages.push({
															url: value,
															label: `Imagen - ${currentPath.replace(/[._]/g, ' ')}`,
															source: 'vitals',
														});
													}
												}
											}
											if (typeof value === 'object' && value !== null) {
												searchForImages(value, currentPath);
											}
										}
									};
									searchForImages(consultation.vitals);
								}

								if (allImages.length === 0) return null;

								return <ImagesGallery images={allImages} />;
							})()}

							{/* Prescriptions - Renderizado Estructurado */}
							{consultation.prescriptions && consultation.prescriptions.length > 0 && (
								<PrescriptionsDisplay prescriptions={consultation.prescriptions} />
							)}

							{/* Vitals - Renderizado Estructurado */}
							{consultation.vitals && Object.keys(consultation.vitals).length > 0 && <VitalsDisplay vitals={consultation.vitals} />}

							{/* Billing Info */}
							{consultation.facturacion && consultation.facturacion.length > 0 && (
								<div>
									<h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
										<Pill className="w-4 h-4 text-green-600" />
										Información de Facturación
									</h4>
									<div className="bg-slate-50 rounded-lg p-4 space-y-2">
										{consultation.facturacion.map((fact, idx) => (
											<div key={idx} className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
												<div>
													<div className="font-medium text-slate-900">{fact.numero_factura ? `Factura #${fact.numero_factura}` : 'Facturación'}</div>
													<div className="text-sm text-slate-600">
														{fact.metodo_pago && `Método: ${fact.metodo_pago}`}
														{fact.estado_pago && ` • Estado: ${fact.estado_pago}`}
													</div>
												</div>
												<div className="text-right">
													<div className="font-semibold text-slate-900">
														{fact.total.toFixed(2)} {fact.moneda || 'USD'}
													</div>
													<div className="text-xs text-slate-500">{formatDate(fact.created_at)}</div>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Actions */}
							<div className="flex gap-3 pt-4 border-t border-slate-200">
								<Link href={`/dashboard/medic/consultas/${consultation.id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
									<FileText className="w-4 h-4" />
									Ver Consulta Completa
								</Link>
								<Link href={`/dashboard/medic/consultas/${consultation.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
									Editar Consulta
								</Link>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
