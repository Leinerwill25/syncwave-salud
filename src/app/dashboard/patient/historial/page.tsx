'use client';

import { useState, useEffect } from 'react';
import { FileText, User, Calendar, Stethoscope, Heart, Thermometer, Activity, Download, Pill, FileCheck } from 'lucide-react';

type PrescriptionItem = {
	id: string;
	medication_name: string | null;
	dosage: string | null;
	frequency: string | null;
	duration_days: number | null;
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

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
						<FileText className="w-8 h-8 text-indigo-600" />
						Historial Médico
					</h1>
					<p className="text-gray-600">Consulta tu historial médico completo</p>
				</div>

				{/* Tabs */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<div className="flex gap-2 border-b border-gray-200">
						<button
							onClick={() => setActiveTab('consultations')}
							className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
								activeTab === 'consultations'
									? 'border-indigo-600 text-indigo-600'
									: 'border-transparent text-gray-600 hover:text-gray-900'
							}`}
						>
							Consultas ({consultations.length})
						</button>
						<button
							onClick={() => setActiveTab('records')}
							className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
								activeTab === 'records'
									? 'border-indigo-600 text-indigo-600'
									: 'border-transparent text-gray-600 hover:text-gray-900'
							}`}
						>
							Registros Médicos ({medicalRecords.length})
						</button>
					</div>
				</div>

				{/* Contenido */}
				{loading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
								<div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
								<div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : activeTab === 'consultations' ? (
					<div className="space-y-4">
						{consultations.length === 0 ? (
							<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
								<Stethoscope className="w-16 h-16 text-gray-400 mx-auto mb-4" />
								<p className="text-gray-600 text-lg">No hay consultas registradas</p>
							</div>
						) : (
							consultations.map((consultation) => {
								const vitals = consultation.vitals || {};
								return (
									<div key={consultation.id} className="bg-white rounded-xl shadow-lg p-6">
										<div className="flex items-start justify-between mb-4">
											<div>
												<h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
													<Calendar className="w-5 h-5 text-indigo-600" />
													{consultation.started_at
														? new Date(consultation.started_at).toLocaleDateString('es-ES', {
																year: 'numeric',
																month: 'long',
																day: 'numeric',
														  })
														: 'Fecha no disponible'}
												</h3>
												{consultation.doctor && (
													<p className="text-gray-600 flex items-center gap-2">
														<User className="w-4 h-4" />
														Dr. {consultation.doctor.name || 'Médico'}
													</p>
												)}
											</div>
										</div>

										<div className="space-y-4">
											{consultation.chief_complaint && (
												<div>
													<p className="font-semibold text-gray-900 mb-1">Motivo de Consulta</p>
													<p className="text-gray-700 bg-gray-50 rounded-lg p-3">{consultation.chief_complaint}</p>
												</div>
											)}
											{consultation.diagnosis && (
												<div>
													<p className="font-semibold text-gray-900 mb-1">Diagnóstico</p>
													<p className="text-gray-700 bg-indigo-50 rounded-lg p-3">{consultation.diagnosis}</p>
												</div>
											)}
											{consultation.notes && (
												<div>
													<p className="font-semibold text-gray-900 mb-1">Notas</p>
													<p className="text-gray-700 bg-gray-50 rounded-lg p-3">{consultation.notes}</p>
												</div>
											)}

											{Object.keys(vitals).length > 0 && (
												<div>
													<p className="font-semibold text-gray-900 mb-3">Signos Vitales</p>
													<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
														{vitals.bloodPressure && (
															<div className="bg-red-50 rounded-lg p-3">
																<div className="flex items-center gap-2 mb-1">
																	<Activity className="w-4 h-4 text-red-600" />
																	<span className="text-xs font-semibold text-red-700">Presión Arterial</span>
																</div>
																<p className="text-sm font-medium text-gray-900">{vitals.bloodPressure}</p>
															</div>
														)}
														{vitals.heartRate && (
															<div className="bg-pink-50 rounded-lg p-3">
																<div className="flex items-center gap-2 mb-1">
																	<Heart className="w-4 h-4 text-pink-600" />
																	<span className="text-xs font-semibold text-pink-700">Frecuencia Cardíaca</span>
																</div>
																<p className="text-sm font-medium text-gray-900">{vitals.heartRate} bpm</p>
															</div>
														)}
														{vitals.temperature && (
															<div className="bg-orange-50 rounded-lg p-3">
																<div className="flex items-center gap-2 mb-1">
																	<Thermometer className="w-4 h-4 text-orange-600" />
																	<span className="text-xs font-semibold text-orange-700">Temperatura</span>
																</div>
																<p className="text-sm font-medium text-gray-900">{vitals.temperature}°C</p>
															</div>
														)}
														{vitals.weight && (
															<div className="bg-blue-50 rounded-lg p-3">
																<div className="flex items-center gap-2 mb-1">
																	<Activity className="w-4 h-4 text-blue-600" />
																	<span className="text-xs font-semibold text-blue-700">Peso</span>
																</div>
																<p className="text-sm font-medium text-gray-900">{vitals.weight} kg</p>
															</div>
														)}
													</div>
												</div>
											)}

											{/* Archivos adjuntos de la consulta (informes médicos) */}
											{consultation.attachments && consultation.attachments.length > 0 && (
												<div className="mt-4 pt-4 border-t border-gray-200">
													<p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
														<FileCheck className="w-5 h-5 text-indigo-600" />
														Documentos e Informes Médicos ({consultation.attachments.length})
													</p>
													<div className="flex flex-wrap gap-2">
														{consultation.attachments.map((attachment, idx) => (
															<a
																key={idx}
																href={attachment}
																target="_blank"
																rel="noopener noreferrer"
																className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
															>
																<Download className="w-4 h-4" />
																<span className="text-sm font-medium">Informe {idx + 1}</span>
															</a>
														))}
													</div>
												</div>
											)}

											{/* Prescripciones relacionadas */}
											{consultation.prescriptions && consultation.prescriptions.length > 0 && (
												<div className="mt-4 pt-4 border-t border-gray-200">
													<p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
														<Pill className="w-5 h-5 text-indigo-600" />
														Prescripciones ({consultation.prescriptions.length})
													</p>
													<div className="space-y-4">
														{consultation.prescriptions.map((prescription) => (
															<div key={prescription.id} className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
																<div className="flex items-start justify-between mb-3">
																	<div>
																		<p className="text-sm font-medium text-gray-700">
																			Emitida: {new Date(prescription.issued_at).toLocaleDateString('es-ES')}
																		</p>
																		{prescription.valid_until && (
																			<p className="text-xs text-gray-600">
																				Válida hasta: {new Date(prescription.valid_until).toLocaleDateString('es-ES')}
																			</p>
																		)}
																		<span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold ${
																			prescription.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
																			prescription.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
																			'bg-gray-100 text-gray-700'
																		}`}>
																			{prescription.status}
																		</span>
																	</div>
																</div>

																{/* Medicamentos */}
																{prescription.prescription_item && prescription.prescription_item.length > 0 && (
																	<div className="mb-3">
																		<p className="text-xs font-semibold text-gray-700 mb-2 uppercase">Medicamentos:</p>
																		<div className="space-y-2">
																			{prescription.prescription_item.map((item) => (
																				<div key={item.id} className="bg-white rounded-lg p-3 border border-indigo-100">
																					<p className="font-medium text-gray-900">{item.medication_name}</p>
																					<div className="mt-1 text-xs text-gray-600 space-y-1">
																						{item.dosage && <p>Dosis: {item.dosage}</p>}
																						{item.frequency && <p>Frecuencia: {item.frequency}</p>}
																						{item.duration_days && <p>Duración: {item.duration_days} días</p>}
																						{item.instructions && <p className="text-gray-700 mt-2">{item.instructions}</p>}
																					</div>
																				</div>
																			))}
																		</div>
																	</div>
																)}

																{/* Archivos adjuntos de la prescripción */}
																{prescription.attachments && prescription.attachments.length > 0 && (
																	<div className="mt-3 pt-3 border-t border-indigo-200">
																		<p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
																			<FileCheck className="w-4 h-4" />
																			Documentos Adjuntos:
																		</p>
																		<div className="flex flex-wrap gap-2">
																			{prescription.attachments.map((attachment, idx) => (
																				<a
																					key={idx}
																					href={attachment}
																					target="_blank"
																					rel="noopener noreferrer"
																					className="inline-flex items-center gap-2 px-3 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-200"
																				>
																					<Download className="w-4 h-4" />
																					<span className="text-sm">Documento {idx + 1}</span>
																				</a>
																			))}
																		</div>
																	</div>
																)}

																{prescription.notes && (
																	<div className="mt-3 pt-3 border-t border-indigo-200">
																		<p className="text-xs font-semibold text-gray-700 mb-1">Notas:</p>
																		<p className="text-sm text-gray-700 bg-white rounded-lg p-2">{prescription.notes}</p>
																	</div>
																)}
															</div>
														))}
													</div>
												</div>
											)}
										</div>
									</div>
								);
							})
						)}
					</div>
				) : (
					<div className="space-y-4">
						{medicalRecords.length === 0 ? (
							<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
								<FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
								<p className="text-gray-600 text-lg">No hay registros médicos</p>
							</div>
						) : (
							medicalRecords.map((record) => (
								<div key={record.id} className="bg-white rounded-xl shadow-lg p-6">
									<div className="flex items-start justify-between mb-4">
										<div>
											<h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
												<FileText className="w-5 h-5 text-indigo-600" />
												{new Date(record.createdAt).toLocaleDateString('es-ES', {
													year: 'numeric',
													month: 'long',
													day: 'numeric',
												})}
											</h3>
											{record.author && (
												<p className="text-gray-600 flex items-center gap-2">
													<User className="w-4 h-4" />
													{record.author.name || 'Autor'}
												</p>
											)}
										</div>
									</div>

									{record.content && (
										<div className="mb-4">
											<p className="font-semibold text-gray-900 mb-1">Contenido</p>
											<div className="text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
												{typeof record.content === 'string' ? record.content : JSON.stringify(record.content, null, 2)}
											</div>
										</div>
									)}

									{record.attachments && record.attachments.length > 0 && (
										<div>
											<p className="font-semibold text-gray-900 mb-2">Adjuntos</p>
											<div className="flex flex-wrap gap-2">
												{record.attachments.map((attachment, idx) => (
													<a
														key={idx}
														href={attachment}
														target="_blank"
														rel="noopener noreferrer"
														className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
													>
														<Download className="w-4 h-4" />
														<span className="text-sm">Archivo {idx + 1}</span>
													</a>
												))}
											</div>
										</div>
									)}
								</div>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
}
