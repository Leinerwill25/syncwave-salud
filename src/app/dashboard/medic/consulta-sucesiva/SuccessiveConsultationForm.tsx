'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
	Save,
	X,
	Upload,
	Image as ImageIcon,
	Scan as XRay,
	File as FileIcon,
	Loader2,
	AlertCircle,
	CheckCircle,
	Plus,
	Trash2,
	Calendar,
	User,
	FileText,
	Stethoscope,
} from 'lucide-react';
import Link from 'next/link';
import ICD11Search from '@/components/ICD11Search';

type Patient = {
	id: string;
	firstName: string;
	lastName: string;
	identifier?: string;
};

type OriginalConsultation = {
	id: string;
	chief_complaint: string | null;
	diagnosis: string | null;
	created_at: string;
	patient?: Patient;
	unregistered_patient_id?: string | null;
};

type SuccessiveConsultation = {
	id: string;
	original_consultation_id: string;
	patient_id: string;
	consultation_date: string;
	lab_results: any;
	results_description: string | null | string[];
	observations: string | null;
	additional_fields: any;
	images: string[];
	xrays: string[];
	documents: string[];
	diagnosis: string | null;
	icd11_code: string | null;
	icd11_title: string | null;
	notes: string | null;
	patient?: Patient;
	original_consultation?: OriginalConsultation;
};

type Props = {
	params?: Promise<{ id: string }>;
};

export default function SuccessiveConsultationForm({ params }: Props) {
	const router = useRouter();
	const [consultationId, setConsultationId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Form state
	const [originalConsultationId, setOriginalConsultationId] = useState<string>('');
	const [availableConsultations, setAvailableConsultations] = useState<OriginalConsultation[]>([]);
	const [selectedConsultation, setSelectedConsultation] = useState<OriginalConsultation | null>(null);
	const [consultationDate, setConsultationDate] = useState(new Date().toISOString().slice(0, 16));
	const [resultsDescription, setResultsDescription] = useState<string[]>([]);
	const [currentResultItem, setCurrentResultItem] = useState('');
	const [observations, setObservations] = useState('');
	const [additionalFields, setAdditionalFields] = useState<any>({});
	const [images, setImages] = useState<string[]>([]);
	const [xrays, setXrays] = useState<string[]>([]);
	const [documents, setDocuments] = useState<string[]>([]);
	const [diagnosis, setDiagnosis] = useState('');
	const [icd11Code, setIcd11Code] = useState('');
	const [icd11Title, setIcd11Title] = useState('');
	const [notes, setNotes] = useState('');

	// File upload states
	const [uploadingImages, setUploadingImages] = useState(false);
	const [uploadingXrays, setUploadingXrays] = useState(false);
	const [uploadingDocuments, setUploadingDocuments] = useState(false);

	const imageInputRef = useRef<HTMLInputElement>(null);
	const xrayInputRef = useRef<HTMLInputElement>(null);
	const documentInputRef = useRef<HTMLInputElement>(null);

	// Load consultation if editing
	useEffect(() => {
		async function loadData() {
			try {
				setLoading(true);
				setError(null);

				// Load available consultations
				const consultationsRes = await fetch('/api/successive-consultations/available-consultations');
				if (consultationsRes.ok) {
					const consultationsData = await consultationsRes.json();
					setAvailableConsultations(consultationsData || []);
				}

				// If editing, load existing consultation
				if (params) {
					const { id } = await params;
					if (id) {
						setConsultationId(id);
						const res = await fetch(`/api/successive-consultations/${id}`);
						if (!res.ok) {
							throw new Error('Error al cargar consulta sucesiva');
						}
						const data: SuccessiveConsultation = await res.json();
						
						setOriginalConsultationId(data.original_consultation_id);
						setConsultationDate(new Date(data.consultation_date).toISOString().slice(0, 16));
						// Convertir results_description a array si es string, o mantener array si ya lo es
						if (data.results_description) {
							if (typeof data.results_description === 'string') {
								// Si es string, dividir por saltos de línea y filtrar vacíos
								setResultsDescription(data.results_description.split('\n').filter((line: string) => line.trim().length > 0));
							} else if (Array.isArray(data.results_description)) {
								setResultsDescription(data.results_description);
							} else {
								setResultsDescription([]);
							}
						} else {
							setResultsDescription([]);
						}
						setObservations(data.observations || '');
						setAdditionalFields(data.additional_fields || {});
						setImages(data.images || []);
						setXrays(data.xrays || []);
						setDocuments(data.documents || []);
						setDiagnosis(data.diagnosis || '');
						setIcd11Code(data.icd11_code || '');
						setIcd11Title(data.icd11_title || '');
						setNotes(data.notes || '');
						
						if (data.original_consultation) {
							setSelectedConsultation(data.original_consultation);
						}
					}
				}
			} catch (err: any) {
				console.error('Error cargando datos:', err);
				setError(err.message || 'Error al cargar datos');
			} finally {
				setLoading(false);
			}
		}
		loadData();
	}, [params]);

	const handleFileUpload = async (
		files: FileList | null,
		type: 'image' | 'xray' | 'document',
		setUploading: (val: boolean) => void,
		setFiles: (urls: string[]) => void,
		currentFiles: string[]
	) => {
		if (!files || files.length === 0) return;

		setUploading(true);
		setError(null);

		try {
			const newUrls: string[] = [];

			for (const file of Array.from(files)) {
				// Validate file size (10MB max)
				if (file.size > 10 * 1024 * 1024) {
					setError(`El archivo ${file.name} es demasiado grande. Máximo 10MB.`);
					continue;
				}

				const formData = new FormData();
				formData.append('file', file);
				formData.append('fileType', type);
				if (consultationId) {
					formData.append('successiveConsultationId', consultationId);
				}

				const uploadRes = await fetch('/api/successive-consultations/upload-file', {
					method: 'POST',
					body: formData,
				});

				if (!uploadRes.ok) {
					const errorData = await uploadRes.json().catch(() => ({}));
					throw new Error(errorData.error || 'Error al subir archivo');
				}

				const uploadData = await uploadRes.json();
				if (uploadData.url) {
					newUrls.push(uploadData.url);
				}
			}

			setFiles([...currentFiles, ...newUrls]);
		} catch (err: any) {
			console.error('Error subiendo archivos:', err);
			setError(err.message || 'Error al subir archivos');
		} finally {
			setUploading(false);
		}
	};

	const handleRemoveFile = async (url: string, type: 'image' | 'xray' | 'document', setFiles: (urls: string[]) => void, currentFiles: string[]) => {
		// Extract path from URL if possible, or just remove from array
		// For now, we'll just remove from the array
		// In production, you might want to also delete from storage
		setFiles(currentFiles.filter(f => f !== url));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSuccess(false);

		try {
			if (!originalConsultationId) {
				throw new Error('Debe seleccionar una consulta original');
			}

			// Obtener el paciente de la consulta seleccionada
			const selectedConsultationData = availableConsultations.find(c => c.id === originalConsultationId);
			
			const payload: any = {
				original_consultation_id: originalConsultationId,
				consultation_date: new Date(consultationDate).toISOString(),
				lab_results: {}, // Mantener como objeto vacío para compatibilidad
				results_description: resultsDescription.length > 0 ? resultsDescription.join('\n') : null,
				observations: observations,
				additional_fields: additionalFields,
				images: images,
				xrays: xrays,
				documents: documents,
				diagnosis: diagnosis || null,
				icd11_code: icd11Code || null,
				icd11_title: icd11Title || null,
				notes: notes || null,
			};

			// Agregar patient_id o unregistered_patient_id según corresponda
			if (selectedConsultationData?.unregistered_patient_id) {
				payload.unregistered_patient_id = selectedConsultationData.unregistered_patient_id;
			} else if (selectedConsultationData?.patient?.id) {
				payload.patient_id = selectedConsultationData.patient.id;
			}

			const url = consultationId 
				? `/api/successive-consultations/${consultationId}`
				: '/api/successive-consultations';
			const method = consultationId ? 'PATCH' : 'POST';

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.error || 'Error al guardar consulta sucesiva');
			}

			setSuccess(true);
			setTimeout(() => {
				router.push('/dashboard/medic/consulta-sucesiva');
			}, 1500);
		} catch (err: any) {
			console.error('Error guardando consulta sucesiva:', err);
			setError(err.message || 'Error al guardar consulta sucesiva');
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
				<Loader2 className="animate-spin text-teal-600" size={32} />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-8 px-4 sm:px-6 lg:px-8">
			<div className="max-w-5xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-3xl font-bold text-slate-900 mb-2">
								{consultationId ? 'Editar Consulta Sucesiva' : 'Nueva Consulta Sucesiva'}
							</h1>
							<p className="text-slate-600">
								Registre los resultados de laboratorio y seguimiento del paciente
							</p>
						</div>
						<Link
							href="/dashboard/medic/consulta-sucesiva"
							className="inline-flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-slate-900 transition-colors"
						>
							<X size={20} />
							Cancelar
						</Link>
					</div>
				</div>

				{/* Error/Success Messages */}
				{error && (
					<div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
						<AlertCircle className="text-rose-600" size={20} />
						<p className="text-rose-800">{error}</p>
					</div>
				)}

				{success && (
					<div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
						<CheckCircle className="text-green-600" size={20} />
						<p className="text-green-800">Consulta sucesiva guardada exitosamente</p>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Consulta Original */}
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<FileText size={20} />
							Consulta Original
						</h2>
						<div className="space-y-4">
							<label className="block">
								<span className="text-sm font-semibold text-slate-700 mb-2 block">
									Seleccione la consulta original que solicitó los laboratorios *
								</span>
								<select
									value={originalConsultationId}
									onChange={(e) => {
										setOriginalConsultationId(e.target.value);
										const selected = availableConsultations.find(c => c.id === e.target.value);
										setSelectedConsultation(selected || null);
									}}
									required
									disabled={!!consultationId}
									className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500"
								>
									<option value="">Seleccione una consulta...</option>
									{availableConsultations.map((consultation) => (
										<option key={consultation.id} value={consultation.id}>
											{consultation.patient?.firstName} {consultation.patient?.lastName} - {format(new Date(consultation.created_at), "d MMM yyyy", { locale: es })} - {consultation.chief_complaint || 'Sin motivo'}
										</option>
									))}
								</select>
							</label>

							{selectedConsultation && (
								<div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
									<p className="text-sm font-semibold text-blue-900 mb-2">Información de la consulta original:</p>
									<p className="text-sm text-blue-800">
										<strong>Paciente:</strong> {selectedConsultation.patient?.firstName} {selectedConsultation.patient?.lastName}
									</p>
									{selectedConsultation.chief_complaint && (
										<p className="text-sm text-blue-800">
											<strong>Motivo:</strong> {selectedConsultation.chief_complaint}
										</p>
									)}
									{selectedConsultation.diagnosis && (
										<p className="text-sm text-blue-800">
											<strong>Diagnóstico:</strong> {selectedConsultation.diagnosis}
										</p>
									)}
								</div>
							)}
						</div>
					</div>

					{/* Fecha de Consulta */}
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<Calendar size={20} />
							Fecha de Consulta
						</h2>
						<label className="block">
							<span className="text-sm font-semibold text-slate-700 mb-2 block">Fecha y Hora *</span>
							<input
								type="datetime-local"
								value={consultationDate}
								onChange={(e) => setConsultationDate(e.target.value)}
								required
								className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500"
							/>
						</label>
					</div>

					{/* Resultados de Laboratorio */}
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<Stethoscope size={20} />
							Resultados de Laboratorio
						</h2>
						<div className="space-y-4">
							<label className="block">
								<span className="text-sm font-semibold text-slate-700 mb-2 block">
									Descripción de Resultados
									<span className="text-xs text-slate-500 ml-2">(Presione Enter para agregar un nuevo ítem)</span>
								</span>
								
								{/* Lista de resultados existentes */}
								{resultsDescription.length > 0 && (
									<div className="mb-3 space-y-2">
										{resultsDescription.map((item, index) => (
											<div key={index} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
												<span className="text-sm font-semibold text-slate-600 min-w-[24px]">{index + 1}.</span>
												<span className="flex-1 text-sm text-slate-900">{item}</span>
												<button
													type="button"
													onClick={() => {
														setResultsDescription(resultsDescription.filter((_, i) => i !== index));
													}}
													className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
													title="Eliminar ítem"
												>
													<Trash2 size={16} />
												</button>
											</div>
										))}
									</div>
								)}

								{/* Input para agregar nuevo ítem */}
								<div className="flex items-center gap-2">
									<span className="text-sm font-semibold text-slate-600 min-w-[24px]">
										{resultsDescription.length + 1}.
									</span>
									<input
										type="text"
										value={currentResultItem}
										onChange={(e) => setCurrentResultItem(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter' && currentResultItem.trim()) {
												e.preventDefault();
												setResultsDescription([...resultsDescription, currentResultItem.trim()]);
												setCurrentResultItem('');
											}
										}}
										placeholder="Escriba un resultado y presione Enter para agregarlo..."
										className="flex-1 px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500"
									/>
									{currentResultItem.trim() && (
										<button
											type="button"
											onClick={() => {
												setResultsDescription([...resultsDescription, currentResultItem.trim()]);
												setCurrentResultItem('');
											}}
											className="px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
										>
											<Plus size={16} />
											Agregar
										</button>
									)}
								</div>
								
								{resultsDescription.length === 0 && !currentResultItem && (
									<p className="text-xs text-slate-500 mt-2">
										Escriba cada resultado en una línea separada. Presione Enter o haga clic en "Agregar" para añadir el ítem a la lista.
									</p>
								)}
							</label>
						</div>
					</div>

					{/* Imágenes */}
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<ImageIcon size={20} />
							Imágenes
						</h2>
						<div className="space-y-4">
							<input
								ref={imageInputRef}
								type="file"
								multiple
								accept="image/*"
								onChange={(e) => handleFileUpload(e.target.files, 'image', setUploadingImages, setImages, images)}
								className="hidden"
							/>
							<button
								type="button"
								onClick={() => imageInputRef.current?.click()}
								disabled={uploadingImages}
								className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-teal-500 hover:bg-teal-50/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
							>
								{uploadingImages ? (
									<>
										<Loader2 className="animate-spin" size={20} />
										Subiendo...
									</>
								) : (
									<>
										<Upload size={20} />
										Subir Imágenes
									</>
								)}
							</button>
							{images.length > 0 && (
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
									{images.map((url, index) => (
										<div key={index} className="relative group">
											<img src={url} alt={`Imagen ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
											<button
												type="button"
												onClick={() => handleRemoveFile(url, 'image', setImages, images)}
												className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<Trash2 size={16} />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Radiografías */}
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<XRay size={20} />
							Radiografías
						</h2>
						<div className="space-y-4">
							<input
								ref={xrayInputRef}
								type="file"
								multiple
								accept="image/*,.pdf"
								onChange={(e) => handleFileUpload(e.target.files, 'xray', setUploadingXrays, setXrays, xrays)}
								className="hidden"
							/>
							<button
								type="button"
								onClick={() => xrayInputRef.current?.click()}
								disabled={uploadingXrays}
								className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-teal-500 hover:bg-teal-50/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
							>
								{uploadingXrays ? (
									<>
										<Loader2 className="animate-spin" size={20} />
										Subiendo...
									</>
								) : (
									<>
										<Upload size={20} />
										Subir Radiografías
									</>
								)}
							</button>
							{xrays.length > 0 && (
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
									{xrays.map((url, index) => (
										<div key={index} className="relative group">
											<img src={url} alt={`RX ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
											<button
												type="button"
												onClick={() => handleRemoveFile(url, 'xray', setXrays, xrays)}
												className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<Trash2 size={16} />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Documentos */}
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<FileIcon size={20} />
							Documentos
						</h2>
						<div className="space-y-4">
							<input
								ref={documentInputRef}
								type="file"
								multiple
								accept=".pdf,.doc,.docx"
								onChange={(e) => handleFileUpload(e.target.files, 'document', setUploadingDocuments, setDocuments, documents)}
								className="hidden"
							/>
							<button
								type="button"
								onClick={() => documentInputRef.current?.click()}
								disabled={uploadingDocuments}
								className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-teal-500 hover:bg-teal-50/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
							>
								{uploadingDocuments ? (
									<>
										<Loader2 className="animate-spin" size={20} />
										Subiendo...
									</>
								) : (
									<>
										<Upload size={20} />
										Subir Documentos
									</>
								)}
							</button>
							{documents.length > 0 && (
								<div className="space-y-2">
									{documents.map((url, index) => (
										<div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
											<a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-700 hover:text-teal-600">
												<FileIcon size={16} />
												Documento {index + 1}
											</a>
											<button
												type="button"
												onClick={() => handleRemoveFile(url, 'document', setDocuments, documents)}
												className="p-1 text-rose-600 hover:text-rose-700"
											>
												<Trash2 size={16} />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Observaciones */}
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<FileText size={20} />
							Observaciones
						</h2>
						<textarea
							value={observations}
							onChange={(e) => setObservations(e.target.value)}
							rows={6}
							placeholder="Ingrese las observaciones del doctor sobre los resultados y el estado del paciente..."
							className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500"
						/>
					</div>

					{/* Diagnóstico */}
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<Stethoscope size={20} />
							Diagnóstico
						</h2>
						<div className="space-y-4">
							<label className="block">
								<span className="text-sm font-semibold text-slate-700 mb-2 block">Diagnóstico</span>
								<input
									type="text"
									value={diagnosis}
									onChange={(e) => setDiagnosis(e.target.value)}
									placeholder="Ingrese el diagnóstico..."
									className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500"
								/>
							</label>
							<div>
								<span className="text-sm font-semibold text-slate-700 mb-2 block">Código CIE-11</span>
								<ICD11Search
									onSelect={(code) => {
										setIcd11Code(code.code);
										setIcd11Title(code.title);
										if (!diagnosis) {
											setDiagnosis(`${code.code} - ${code.title}`);
										}
									}}
									selectedCode={icd11Code && icd11Title ? { code: icd11Code, title: icd11Title } : null}
									placeholder="Buscar código CIE-11 (ej: diabetes, hipertensión...)"
									className="mb-3"
								/>
								{icd11Code && icd11Title && (
									<p className="mt-2 text-xs text-slate-600">
										<strong>Código CIE-11 seleccionado:</strong> {icd11Code} - {icd11Title}
									</p>
								)}
							</div>
						</div>
					</div>

					{/* Notas Adicionales */}
					<div className="bg-white rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<FileText size={20} />
							Notas Adicionales
						</h2>
						<textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={4}
							placeholder="Notas adicionales sobre la consulta sucesiva..."
							className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500"
						/>
					</div>

					{/* Submit Button */}
					<div className="flex items-center justify-end gap-4">
						<Link
							href="/dashboard/medic/consulta-sucesiva"
							className="px-6 py-3 text-slate-700 hover:text-slate-900 transition-colors"
						>
							Cancelar
						</Link>
						<button
							type="submit"
							disabled={saving}
							className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{saving ? (
								<>
									<Loader2 className="animate-spin" size={20} />
									Guardando...
								</>
							) : (
								<>
									<Save size={20} />
									Guardar Consulta Sucesiva
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
