'use client';

import { useState, useEffect } from 'react';
import { FileText, User, Calendar, Stethoscope, Heart, Thermometer, Activity, Download, Pill, FileCheck, Image, File } from 'lucide-react';
import { motion } from 'framer-motion';

type PrescriptionItem = {
	id: string;
	name: string;
	dosage: string | null;
	frequency: string | null;
	duration: string | null;
	instructions: string | null;
};

type Prescription = {
	id: string;
	consultation_id: string | null;
	issued_at: string;
	valid_until: string | null;
	status: string;
	notes: string | null;
	attachments: string[];
	prescription_item: PrescriptionItem[];
};

type Consultation = {
	id: string;
	started_at: string | null;
	ended_at: string | null;
	chief_complaint: string | null;
	diagnosis: string | null;
	notes: string | null;
	vitals: any;
	prescriptions: Prescription[];
	attachments: string[];
	doctor: {
		name: string | null;
	} | null;
	appointment: {
		reason: string | null;
	} | null;
};

type MedicalRecord = {
	id: string;
	content: any;
	attachments: string[];
	createdAt: string;
	author: {
		name: string | null;
	} | null;
};

export default function HistorialPage() {
	const [loading, setLoading] = useState(true);
	const [consultations, setConsultations] = useState<Consultation[]>([]);
	const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
	const [activeTab, setActiveTab] = useState<'consultations' | 'records'>('consultations');

	useEffect(() => {
		loadHistorial();
	}, []);

	const loadHistorial = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/historial', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar historial');

			const data = await res.json();
			setConsultations(data.consultations || []);
			setMedicalRecords(data.medicalRecords || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const getFileIcon = (url: string) => {
		const ext = url.split('.').pop()?.toLowerCase();
		if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
			return Image;
		}
		return File;
	};

	const getFileName = (url: string, index: number) => {
		try {
			const urlParts = url.split('/');
			const fileName = urlParts[urlParts.length - 1];
			if (fileName && fileName.includes('.')) {
				return fileName;
			}
		} catch {
			// ignore
		}
		return `Documento ${index + 1}`;
	};

	const renderConsultationCard = (consultation: Consultation) => {
		const vitals = consultation.vitals || {};
		return (
			<motion.div
				key={consultation.id}
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-3 sm:p-4 md:p-5 lg:p-6 space-y-3 sm:space-y-4 md:space-y-6"
			>
				{/* Header de la consulta */}
				<div className="flex items-start justify-between pb-2 sm:pb-3 md:pb-4 border-b border-slate-200">
					<div className="flex-1 min-w-0">
						<h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-slate-900 mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
							<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-teal-600 flex-shrink-0" />
							<span className="break-words leading-tight">
								{consultation.started_at ? (
									<>
										<span className="hidden sm:inline">
											{new Date(consultation.started_at).toLocaleDateString('es-ES', {
												year: 'numeric',
												month: 'long',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
											})}
										</span>
										<span className="sm:hidden">
											{new Date(consultation.started_at).toLocaleDateString('es-ES', {
												day: 'numeric',
												month: 'short',
												year: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
											})}
										</span>
									</>
								) : (
									'Fecha no disponible'
								)}
							</span>
						</h3>
						{consultation.doctor && (
							<p className="text-[10px] sm:text-xs md:text-sm text-slate-600 flex items-center gap-1 sm:gap-1.5 md:gap-2">
								<User className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
								<span className="font-semibold break-words">Dr. {consultation.doctor.name || 'Médico'}</span>
							</p>
						)}
					</div>
				</div>

				<div className="space-y-3 sm:space-y-4 md:space-y-6">
					{/* Motivo de Consulta */}
					{consultation.chief_complaint && (
						<div>
							<p className="font-bold text-slate-900 mb-1 sm:mb-1.5 md:mb-2 text-[10px] sm:text-xs md:text-sm uppercase tracking-wide">Motivo de Consulta</p>
							<p className="text-xs sm:text-sm md:text-base text-slate-700 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 border border-blue-100 leading-relaxed break-words">
								{consultation.chief_complaint}
							</p>
						</div>
					)}

					{/* Diagnóstico */}
					{consultation.diagnosis && (
						<div>
							<p className="font-bold text-slate-900 mb-1 sm:mb-1.5 md:mb-2 text-[10px] sm:text-xs md:text-sm uppercase tracking-wide">Diagnóstico</p>
							<p className="text-xs sm:text-sm md:text-base text-slate-700 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 border border-teal-100 leading-relaxed break-words">
								{consultation.diagnosis}
							</p>
						</div>
					)}

					{/* Notas */}
					{consultation.notes && (
						<div>
							<p className="font-bold text-slate-900 mb-1 sm:mb-1.5 md:mb-2 text-[10px] sm:text-xs md:text-sm uppercase tracking-wide">Notas Médicas</p>
							<p className="text-xs sm:text-sm md:text-base text-slate-700 bg-slate-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 border border-slate-200 leading-relaxed whitespace-pre-wrap break-words">
								{consultation.notes}
							</p>
						</div>
					)}

					{/* Signos Vitales */}
					{Object.keys(vitals).length > 0 && (
						<div>
							<p className="font-bold text-slate-900 mb-2 sm:mb-3 text-[10px] sm:text-xs md:text-sm uppercase tracking-wide">Signos Vitales</p>
							<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3 lg:gap-4">
								{vitals.bloodPressure && (
									<div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg sm:rounded-xl p-2 sm:p-2.5 md:p-3 lg:p-4 border border-red-200">
										<div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 mb-1 sm:mb-1.5 md:mb-2">
											<Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-red-600 flex-shrink-0" />
											<span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-red-700 uppercase leading-tight">Presión Arterial</span>
										</div>
										<p className="text-sm sm:text-base md:text-lg font-bold text-slate-900 break-words">{vitals.bloodPressure}</p>
									</div>
								)}
								{vitals.heartRate && (
									<div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg sm:rounded-xl p-2 sm:p-2.5 md:p-3 lg:p-4 border border-pink-200">
										<div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 mb-1 sm:mb-1.5 md:mb-2">
											<Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-pink-600 flex-shrink-0" />
											<span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-pink-700 uppercase leading-tight">Frecuencia Cardíaca</span>
										</div>
										<p className="text-sm sm:text-base md:text-lg font-bold text-slate-900 break-words">{vitals.heartRate} bpm</p>
									</div>
								)}
								{vitals.temperature && (
									<div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg sm:rounded-xl p-2 sm:p-2.5 md:p-3 lg:p-4 border border-orange-200">
										<div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 mb-1 sm:mb-1.5 md:mb-2">
											<Thermometer className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-orange-600 flex-shrink-0" />
											<span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-orange-700 uppercase leading-tight">Temperatura</span>
										</div>
										<p className="text-sm sm:text-base md:text-lg font-bold text-slate-900 break-words">{vitals.temperature}°C</p>
									</div>
								)}
								{vitals.weight && (
									<div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg sm:rounded-xl p-2 sm:p-2.5 md:p-3 lg:p-4 border border-blue-200">
										<div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 mb-1 sm:mb-1.5 md:mb-2">
											<Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-blue-600 flex-shrink-0" />
											<span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-blue-700 uppercase leading-tight">Peso</span>
										</div>
										<p className="text-sm sm:text-base md:text-lg font-bold text-slate-900 break-words">{vitals.weight} kg</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Archivos adjuntos de la consulta (informes médicos) */}
					{consultation.attachments && consultation.attachments.length > 0 && (
						<div className="pt-4 sm:pt-5 md:pt-6 border-t-2 border-slate-200">
							<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
								<div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-md flex-shrink-0">
									<FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
								</div>
								<div className="min-w-0">
									<p className="font-bold text-slate-900 text-sm sm:text-base md:text-lg">Documentos e Informes Médicos</p>
									<p className="text-[10px] sm:text-xs md:text-sm text-slate-600">
										{consultation.attachments.length} {consultation.attachments.length === 1 ? 'documento' : 'documentos'} adjunto{consultation.attachments.length === 1 ? '' : 's'}
									</p>
								</div>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
								{consultation.attachments.map((attachment, idx) => {
									const FileIcon = getFileIcon(attachment);
									const fileName = getFileName(attachment, idx);
									return (
										<a
											key={idx}
											href={attachment}
											target="_blank"
											rel="noopener noreferrer"
											className="group flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-lg sm:rounded-xl hover:from-indigo-100 hover:to-purple-100 transition-all border-2 border-indigo-200 hover:border-indigo-300 shadow-sm hover:shadow-md"
										>
											<div className="p-1.5 sm:p-2 bg-white rounded-lg group-hover:scale-110 transition-transform flex-shrink-0">
												<FileIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{fileName}</p>
												<p className="text-[10px] sm:text-xs text-slate-600">Informe médico</p>
											</div>
											<Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 flex-shrink-0" />
										</a>
									);
								})}
							</div>
						</div>
					)}

					{/* Prescripciones relacionadas */}
					{consultation.prescriptions && consultation.prescriptions.length > 0 && (
						<div className="pt-6 border-t-2 border-slate-200">
							<div className="flex items-center gap-3 mb-4">
								<div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg shadow-md">
									<Pill className="w-5 h-5 text-white" />
								</div>
								<div>
									<p className="font-bold text-slate-900 text-lg">Prescripciones Médicas</p>
									<p className="text-sm text-slate-600">{consultation.prescriptions.length} {consultation.prescriptions.length === 1 ? 'prescripción' : 'prescripciones'} asociada{consultation.prescriptions.length === 1 ? '' : 's'}</p>
								</div>
							</div>
							<div className="space-y-4">
								{consultation.prescriptions.map((prescription) => (
									<div key={prescription.id} className="bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 rounded-xl p-5 border-2 border-teal-200 shadow-sm">
										{/* Header de la prescripción */}
										<div className="flex items-start justify-between mb-4 pb-4 border-b border-teal-200">
											<div>
												<p className="text-sm font-bold text-slate-900 mb-1">
													Emitida: {new Date(prescription.issued_at).toLocaleDateString('es-ES', {
														year: 'numeric',
														month: 'long',
														day: 'numeric',
													})}
												</p>
												{prescription.valid_until && (
													<p className={`text-xs font-medium ${
														new Date(prescription.valid_until) < new Date()
															? 'text-red-600'
															: 'text-slate-600'
													}`}>
														Válida hasta: {new Date(prescription.valid_until).toLocaleDateString('es-ES')}
													</p>
												)}
											</div>
											<span className={`px-3 py-1 rounded-full text-xs font-bold ${
												prescription.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border border-green-300' :
												prescription.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
												'bg-slate-100 text-slate-700 border border-slate-300'
											}`}>
												{prescription.status}
											</span>
										</div>

										{/* Medicamentos */}
										{prescription.prescription_item && prescription.prescription_item.length > 0 && (
											<div className="mb-4">
												<p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Medicamentos Prescritos</p>
												<div className="space-y-3">
													{prescription.prescription_item.map((item) => (
														<div key={item.id} className="bg-white rounded-lg p-4 border border-teal-200 shadow-sm">
															<p className="font-bold text-slate-900 mb-2 flex items-center gap-2">
																<Pill className="w-4 h-4 text-teal-600" />
																{item.name || 'Medicamento'}
															</p>
															<div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
																{item.dosage && (
																	<div>
																		<span className="font-semibold">Dosis:</span> {item.dosage}
																	</div>
																)}
																{item.frequency && (
																	<div>
																		<span className="font-semibold">Frecuencia:</span> {item.frequency}
																	</div>
																)}
																{item.duration && (
																	<div>
																		<span className="font-semibold">Duración:</span> {item.duration}
																	</div>
																)}
															</div>
															{item.instructions && (
																<p className="text-sm text-slate-700 mt-3 pt-3 border-t border-slate-200 italic">
																	{item.instructions}
																</p>
															)}
														</div>
													))}
												</div>
											</div>
										)}

										{/* Archivos adjuntos de la prescripción (recetas escaneadas) */}
										{prescription.attachments && prescription.attachments.length > 0 && (
											<div className="mt-4 pt-4 border-t border-teal-200">
												<p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
													<FileCheck className="w-4 h-4" />
													Recetas Escaneadas ({prescription.attachments.length})
												</p>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
													{prescription.attachments.map((attachment, idx) => {
														const FileIcon = getFileIcon(attachment);
														const fileName = getFileName(attachment, idx);
														return (
															<a
																key={idx}
																href={attachment}
																target="_blank"
																rel="noopener noreferrer"
																className="group flex items-center gap-3 px-4 py-3 bg-white text-teal-700 rounded-lg hover:bg-teal-50 transition-all border-2 border-teal-200 hover:border-teal-300 shadow-sm hover:shadow-md"
															>
																<div className="p-2 bg-teal-50 rounded-lg group-hover:scale-110 transition-transform">
																	<FileIcon className="w-5 h-5 text-teal-600" />
																</div>
																<div className="flex-1 min-w-0">
																	<p className="text-sm font-semibold text-slate-900 truncate">{fileName}</p>
																	<p className="text-xs text-slate-600">Receta médica</p>
																</div>
																<Download className="w-4 h-4 text-teal-600 flex-shrink-0" />
															</a>
														);
													})}
												</div>
											</div>
										)}

										{/* Notas de la prescripción */}
										{prescription.notes && (
											<div className="mt-4 pt-4 border-t border-teal-200">
												<p className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Notas Adicionales</p>
												<p className="text-sm text-slate-700 bg-white rounded-lg p-3 border border-teal-200">{prescription.notes}</p>
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</motion.div>
		);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6 border border-slate-200">
					<h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
						<FileText className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-teal-600 flex-shrink-0" />
						<span>Historial Médico</span>
					</h1>
					<p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">
						Consulta tu historial médico completo con todas las consultas, prescripciones y documentos adjuntos
					</p>
				</div>

				{/* Tabs */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6 border border-slate-200">
					<div className="flex gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
						<button
							onClick={() => setActiveTab('consultations')}
							className={`px-2.5 sm:px-3 md:px-6 py-1.5 sm:py-2 md:py-3 font-bold border-b-2 transition-colors whitespace-nowrap text-xs sm:text-sm md:text-base ${
								activeTab === 'consultations'
									? 'border-teal-600 text-teal-600'
									: 'border-transparent text-slate-600 hover:text-slate-900'
							}`}
						>
							Consultas ({consultations.length})
						</button>
						<button
							onClick={() => setActiveTab('records')}
							className={`px-2.5 sm:px-3 md:px-6 py-1.5 sm:py-2 md:py-3 font-bold border-b-2 transition-colors whitespace-nowrap text-xs sm:text-sm md:text-base ${
								activeTab === 'records'
									? 'border-teal-600 text-teal-600'
									: 'border-transparent text-slate-600 hover:text-slate-900'
							}`}
						>
							Registros Médicos ({consultations.length})
						</button>
					</div>
				</div>

				{/* Contenido */}
				{loading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse border border-slate-200">
								<div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
								<div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : activeTab === 'consultations' ? (
					<div className="space-y-6">
						{consultations.length === 0 ? (
							<div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-slate-200">
								<Stethoscope className="w-16 h-16 text-slate-400 mx-auto mb-4" />
								<p className="text-slate-600 text-lg font-semibold">No hay consultas registradas</p>
							</div>
						) : (
							consultations.map((consultation) => renderConsultationCard(consultation))
						)}
					</div>
				) : (
					<div className="space-y-6">
						{consultations.length === 0 ? (
							<div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-slate-200">
								<FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
								<p className="text-slate-600 text-lg font-semibold">No hay registros médicos disponibles</p>
								<p className="text-slate-500 text-sm mt-2">Las consultas con sus archivos adjuntos y prescripciones aparecerán aquí</p>
							</div>
						) : (
							<>
								<div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
									<div className="flex items-start gap-3">
										<FileCheck className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
										<div>
											<p className="font-bold text-blue-900 mb-1">Registros Médicos Completos</p>
											<p className="text-sm text-blue-800">
												Aquí encontrarás todas tus consultas médicas con sus informes, prescripciones y documentos adjuntos organizados por fecha.
											</p>
										</div>
									</div>
								</div>
								{consultations.map((consultation) => renderConsultationCard(consultation))}
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
