'use client';

import { FileText, User, Calendar, Stethoscope, Pill, FileCheck, Download, AlertCircle, Clock, Heart, Thermometer, Activity, Image, File, Eye, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

type Patient = {
	id: string;
	firstName: string;
	lastName: string;
	identifier?: string | null;
	dob?: string | null;
	gender?: string | null;
	phone?: string | null;
	address?: string | null;
	allergies?: string | null;
	chronicConditions?: string | null;
	currentMedications?: string | null;
	familyHistory?: string | null;
};

type Consultation = {
	id: string;
	patient_id: string;
	doctor_id: string;
	appointment_id: string | null;
	started_at: string | null;
	ended_at: string | null;
	chief_complaint: string | null;
	diagnosis: string | null;
	notes: string | null;
	vitals: any;
	attachments?: string[];
	attachmentsDetailed?: Array<{
		url: string;
		name: string;
		type?: string;
		size?: number;
	}>;
	created_at: string;
	updated_at: string;
	doctor: {
		id: string;
		name: string | null;
		email: string | null;
	} | null;
	appointment: {
		id: string;
		reason: string | null;
		scheduled_at: string | null;
	} | null;
};

type Prescription = {
	id: string;
	consultation_id: string | null;
	issued_at: string;
	valid_until: string | null;
	status: string;
	notes: string | null;
	prescription_item: Array<{
		id: string;
		name: string;
		dosage: string | null;
		form: string | null;
		frequency: string | null;
		duration: string | null;
		quantity: number | null;
		instructions: string | null;
	}>;
};

type Order = {
	id: string;
	patient_id: string;
	consultation_id: string | null;
	result_type: string;
	result: any;
	attachments?: string[];
	is_critical: boolean;
	reported_at?: string;
	created_at: string;
};

type Props = {
	consultation: Consultation;
	patient: Patient;
	prescriptions: Prescription[];
	orders: Order[];
	prescriptionFiles: any[];
};

export default function ConsultationShareView({ consultation, patient, prescriptions, orders, prescriptionFiles }: Props) {
	const parseVitals = (vitals: any) => {
		if (!vitals || typeof vitals !== 'object') return null;
		try {
			return typeof vitals === 'string' ? JSON.parse(vitals) : vitals;
		} catch {
			return vitals;
		}
	};

	const vitals = parseVitals(consultation.vitals);

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
			<div className="max-w-5xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<div className="p-3 bg-blue-100 rounded-lg">
								<FileText className="w-6 h-6 text-blue-600" />
							</div>
							<div>
								<h1 className="text-2xl font-bold text-gray-900">Consulta Médica Compartida</h1>
								<p className="text-sm text-gray-600">Información médica compartida por el paciente</p>
							</div>
						</div>
						<div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
							<AlertCircle className="w-4 h-4 text-blue-600" />
							<span className="text-xs font-medium text-blue-800">Solo lectura</span>
						</div>
					</div>
				</div>

				{/* Información del Paciente */}
				<div className="bg-white rounded-xl shadow-lg p-6">
					<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
						<User className="w-5 h-5 text-blue-600" />
						Información del Paciente
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p className="text-sm font-medium text-gray-700">Nombre Completo</p>
							<p className="text-base text-gray-900">{patient.firstName} {patient.lastName}</p>
						</div>
						{patient.identifier && (
							<div>
								<p className="text-sm font-medium text-gray-700">Cédula de Identidad</p>
								<p className="text-base text-gray-900">{patient.identifier}</p>
							</div>
						)}
						{patient.dob && (
							<div>
								<p className="text-sm font-medium text-gray-700">Fecha de Nacimiento</p>
								<p className="text-base text-gray-900">
									{format(new Date(patient.dob), 'dd/MM/yyyy')}
								</p>
							</div>
						)}
						{patient.gender && (
							<div>
								<p className="text-sm font-medium text-gray-700">Sexo</p>
								<p className="text-base text-gray-900">{patient.gender}</p>
							</div>
						)}
						{patient.phone && (
							<div>
								<p className="text-sm font-medium text-gray-700">Teléfono</p>
								<p className="text-base text-gray-900">{patient.phone}</p>
							</div>
						)}
						{patient.address && (
							<div className="md:col-span-2">
								<p className="text-sm font-medium text-gray-700">Dirección</p>
								<p className="text-base text-gray-900">{patient.address}</p>
							</div>
						)}
					</div>

					{/* Información Médica del Paciente */}
					{(patient.allergies || patient.chronicConditions || patient.currentMedications || patient.familyHistory) && (
						<div className="mt-6 pt-6 border-t border-gray-200">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Antecedentes Médicos</h3>
							<div className="space-y-4">
								{patient.allergies && (
									<div>
										<p className="text-sm font-medium text-red-700 mb-1">Alergias</p>
										<p className="text-base text-gray-900 bg-red-50 p-3 rounded-lg">{patient.allergies}</p>
									</div>
								)}
								{patient.chronicConditions && (
									<div>
										<p className="text-sm font-medium text-gray-700 mb-1">Condiciones Crónicas</p>
										<p className="text-base text-gray-900 bg-gray-50 p-3 rounded-lg">{patient.chronicConditions}</p>
									</div>
								)}
								{patient.currentMedications && (
									<div>
										<p className="text-sm font-medium text-gray-700 mb-1">Medicamentos Actuales</p>
										<p className="text-base text-gray-900 bg-gray-50 p-3 rounded-lg">{patient.currentMedications}</p>
									</div>
								)}
								{patient.familyHistory && (
									<div>
										<p className="text-sm font-medium text-gray-700 mb-1">Historial Familiar</p>
										<p className="text-base text-gray-900 bg-gray-50 p-3 rounded-lg">{patient.familyHistory}</p>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Información de la Consulta */}
				<div className="bg-white rounded-xl shadow-lg p-6">
					<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
						<Stethoscope className="w-5 h-5 text-blue-600" />
						Información de la Consulta
					</h2>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{consultation.doctor && (
								<div>
									<p className="text-sm font-medium text-gray-700">Especialista</p>
									<p className="text-base text-gray-900">Dr. {consultation.doctor.name || 'No especificado'}</p>
								</div>
							)}
							{consultation.started_at && (
								<div>
									<p className="text-sm font-medium text-gray-700">Fecha de Consulta</p>
									<p className="text-base text-gray-900">
										{format(new Date(consultation.started_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm")}
									</p>
								</div>
							)}
							{consultation.appointment?.reason && (
								<div>
									<p className="text-sm font-medium text-gray-700">Motivo de la Cita</p>
									<p className="text-base text-gray-900">{consultation.appointment.reason}</p>
								</div>
							)}
						</div>

						{consultation.chief_complaint && (
							<div>
								<p className="text-sm font-medium text-gray-700 mb-1">Motivo de Consulta</p>
								<p className="text-base text-gray-900 bg-blue-50 p-3 rounded-lg">{consultation.chief_complaint}</p>
							</div>
						)}

						{consultation.diagnosis && (
							<div>
								<p className="text-sm font-medium text-red-700 mb-1">Diagnóstico</p>
								<p className="text-base text-gray-900 bg-red-50 p-3 rounded-lg font-medium">{consultation.diagnosis}</p>
							</div>
						)}

						{consultation.notes && (
							<div>
								<p className="text-sm font-medium text-gray-700 mb-1">Notas del Especialista</p>
								<p className="text-base text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{consultation.notes}</p>
							</div>
						)}
					</div>
				</div>

				{/* Signos Vitales */}
				{vitals && Object.keys(vitals).length > 0 && (
					<div className="bg-white rounded-xl shadow-lg p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
							<Activity className="w-5 h-5 text-blue-600" />
							Signos Vitales
						</h2>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							{vitals.general?.weight && (
								<div className="bg-gray-50 p-3 rounded-lg">
									<p className="text-xs font-medium text-gray-600">Peso</p>
									<p className="text-lg font-semibold text-gray-900">{vitals.general.weight} kg</p>
								</div>
							)}
							{vitals.general?.height && (
								<div className="bg-gray-50 p-3 rounded-lg">
									<p className="text-xs font-medium text-gray-600">Altura</p>
									<p className="text-lg font-semibold text-gray-900">{vitals.general.height} cm</p>
								</div>
							)}
							{vitals.general?.temperature && (
								<div className="bg-gray-50 p-3 rounded-lg">
									<p className="text-xs font-medium text-gray-600">Temperatura</p>
									<p className="text-lg font-semibold text-gray-900">{vitals.general.temperature} °C</p>
								</div>
							)}
							{vitals.general?.bp_systolic && vitals.general?.bp_diastolic && (
								<div className="bg-gray-50 p-3 rounded-lg">
									<p className="text-xs font-medium text-gray-600">Presión Arterial</p>
									<p className="text-lg font-semibold text-gray-900">
										{vitals.general.bp_systolic}/{vitals.general.bp_diastolic} mmHg
									</p>
								</div>
							)}
							{vitals.general?.heart_rate && (
								<div className="bg-gray-50 p-3 rounded-lg">
									<p className="text-xs font-medium text-gray-600">Frecuencia Cardíaca</p>
									<p className="text-lg font-semibold text-gray-900">{vitals.general.heart_rate} bpm</p>
								</div>
							)}
							{vitals.general?.respiratory_rate && (
								<div className="bg-gray-50 p-3 rounded-lg">
									<p className="text-xs font-medium text-gray-600">Frecuencia Respiratoria</p>
									<p className="text-lg font-semibold text-gray-900">{vitals.general.respiratory_rate} rpm</p>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Prescripciones */}
				{prescriptions.length > 0 && (
					<div className="bg-white rounded-xl shadow-lg p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
							<Pill className="w-5 h-5 text-blue-600" />
							Prescripciones Médicas
						</h2>
						<div className="space-y-4">
							{prescriptions.map((prescription) => (
								<div key={prescription.id} className="border border-gray-200 rounded-lg p-4">
									<div className="flex items-center justify-between mb-3">
										<div>
											<p className="text-sm font-medium text-gray-600">
												Emitida: {format(new Date(prescription.issued_at), 'dd/MM/yyyy')}
											</p>
											{prescription.valid_until && (
												<p className="text-sm text-gray-600">
													Válida hasta: {format(new Date(prescription.valid_until), 'dd/MM/yyyy')}
												</p>
											)}
										</div>
										<span className={`px-3 py-1 rounded-full text-xs font-semibold ${
											prescription.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
										}`}>
											{prescription.status}
										</span>
									</div>
									{prescription.prescription_item && prescription.prescription_item.length > 0 && (
										<div className="space-y-3">
											{prescription.prescription_item.map((item) => (
												<div key={item.id} className="bg-gray-50 p-3 rounded-lg">
													<p className="font-semibold text-gray-900 mb-1">{item.name}</p>
													<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-700">
														{item.dosage && (
															<div>
																<span className="font-medium">Dosis: </span>
																{item.dosage} {item.form && `(${item.form})`}
															</div>
														)}
														{item.frequency && (
															<div>
																<span className="font-medium">Frecuencia: </span>
																{item.frequency}
															</div>
														)}
														{item.duration && (
															<div>
																<span className="font-medium">Duración: </span>
																{item.duration}
															</div>
														)}
														{item.quantity && (
															<div>
																<span className="font-medium">Cantidad: </span>
																{item.quantity}
															</div>
														)}
													</div>
													{item.instructions && (
														<p className="text-sm text-gray-700 mt-2">
															<span className="font-medium">Instrucciones: </span>
															{item.instructions}
														</p>
													)}
												</div>
											))}
										</div>
									)}
									{prescription.notes && (
										<div className="mt-3 pt-3 border-t border-gray-200">
											<p className="text-sm text-gray-700">
												<span className="font-medium">Notas: </span>
												{prescription.notes}
											</p>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Órdenes Médicas / Resultados de Laboratorio */}
				{orders.length > 0 && (
					<div className="bg-white rounded-xl shadow-lg p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
							<FileCheck className="w-5 h-5 text-blue-600" />
							Resultados de Laboratorio
						</h2>
						<div className="space-y-4">
							{orders.map((order) => (
								<div key={order.id} className={`border rounded-lg p-4 ${order.is_critical ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
									<div className="flex items-center justify-between mb-3">
										<div className="flex items-center gap-3">
											<p className="font-semibold text-gray-900">{order.result_type || 'Resultado de Laboratorio'}</p>
											{order.is_critical && (
												<span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
													Crítico
												</span>
											)}
										</div>
										<p className="text-sm text-gray-600">
											{order.reported_at 
												? format(new Date(order.reported_at), 'dd/MM/yyyy')
												: format(new Date(order.created_at), 'dd/MM/yyyy')}
										</p>
									</div>
									{order.result && Object.keys(order.result).length > 0 && (
										<div className="mt-3 pt-3 border-t border-gray-200">
											<p className="text-sm font-medium text-gray-700 mb-2">Resultado:</p>
											<pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-auto max-h-48">
												{typeof order.result === 'string' ? order.result : JSON.stringify(order.result, null, 2)}
											</pre>
										</div>
									)}
									{/* Imágenes adjuntas por el paciente */}
									{order.attachments && order.attachments.length > 0 && (
										<div className="mt-4 pt-4 border-t border-gray-200">
											<p className="text-sm font-medium text-gray-700 mb-3">Imágenes de Resultados:</p>
											<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
												{order.attachments.map((attachment, idx) => {
													// Verificar si es una URL de imagen
													const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment) || attachment.startsWith('http');
													
													return (
														<div
															key={idx}
															className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
														>
															{isImage ? (
																<a
																	href={attachment}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="block"
																>
																	<img
																		src={attachment}
																		alt={`Resultado de laboratorio ${idx + 1}`}
																		className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
																		onError={(e) => {
																			// Si la imagen falla al cargar, mostrar un placeholder
																			const target = e.target as HTMLImageElement;
																			target.style.display = 'none';
																			const parent = target.parentElement;
																			if (parent) {
																				parent.innerHTML = `
																					<div class="w-full h-32 flex items-center justify-center bg-gray-100">
																						<FileText class="w-8 h-8 text-gray-400" />
																					</div>
																				`;
																			}
																		}}
																	/>
																</a>
															) : (
																<a
																	href={attachment}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="p-3 flex items-center justify-center h-32"
																>
																	<FileText className="w-8 h-8 text-gray-400" />
																</a>
															)}
															<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
																<a
																	href={attachment}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-lg hover:bg-white transition-colors"
																	title="Ver en tamaño completo"
																>
																	<Eye className="w-3.5 h-3.5 text-blue-600" />
																</a>
															</div>
														</div>
													);
												})}
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Archivos Adjuntos de la Consulta */}
				{(() => {
					const allAttachments = consultation.attachmentsDetailed || 
						(consultation.attachments?.map((url: string) => ({ 
							url, 
							name: url.split('/').pop() || 'Archivo adjunto' 
						})) || []);
					
					if (!allAttachments || allAttachments.length === 0) {
						return null;
					}

					return (
						<div className="bg-white rounded-xl shadow-lg p-6">
							<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
								<Download className="w-5 h-5 text-blue-600" />
								Archivos Adjuntos de la Consulta
							</h2>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
								{allAttachments.map((attachment: any, idx: number) => {
									const attachmentUrl = typeof attachment === 'string' ? attachment : attachment.url;
									const attachmentName = typeof attachment === 'string' 
										? attachment.split('/').pop() || `Archivo ${idx + 1}` 
										: attachment.name || attachmentUrl.split('/').pop() || `Archivo ${idx + 1}`;
									const attachmentType = typeof attachment === 'object' ? attachment.type : undefined;
									
									// Detectar tipo de archivo por extensión o content_type
									const urlLower = attachmentUrl.toLowerCase();
									const isImage = attachmentType?.startsWith('image/') || 
										/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(urlLower);
									const isPDF = attachmentType === 'application/pdf' || /\.pdf$/i.test(urlLower);
									const isDoc = /\.(doc|docx)$/i.test(urlLower);
									const isVideo = attachmentType?.startsWith('video/') || 
										/\.(mp4|avi|mov|wmv|flv|webm)$/i.test(urlLower);
									
									if (!attachmentUrl) return null;

									return (
										<a
											key={idx}
											href={attachmentUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="flex flex-col gap-3 p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-all border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg group"
										>
											<div className="flex items-start gap-3">
												<div className="p-3 bg-white rounded-lg shadow-md group-hover:shadow-lg transition-shadow shrink-0">
													{isImage ? (
														<Image className="w-7 h-7 text-blue-600" />
													) : isPDF ? (
														<FileText className="w-7 h-7 text-red-600" />
													) : isDoc ? (
														<FileText className="w-7 h-7 text-blue-700" />
													) : isVideo ? (
														<File className="w-7 h-7 text-purple-600" />
													) : (
														<File className="w-7 h-7 text-gray-600" />
													)}
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-700 transition-colors break-words">
														{attachmentName}
													</p>
													{typeof attachment === 'object' && attachment.size && (
														<p className="text-xs text-gray-500 mt-1">
															{attachment.size >= 1024 * 1024 
																? `${(attachment.size / 1024 / 1024).toFixed(2)} MB`
																: `${(attachment.size / 1024).toFixed(2)} KB`}
														</p>
													)}
													{attachmentType && (
														<p className="text-xs text-gray-400 mt-1 capitalize">
															{attachmentType.split('/')[1] || attachmentType}
														</p>
													)}
												</div>
											</div>
											
											{/* Preview de imagen */}
											{isImage && (
												<div className="w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 relative group/image">
													<img 
														src={attachmentUrl} 
														alt={attachmentName}
														className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
														loading="lazy"
														crossOrigin="anonymous"
														onError={(e) => {
															console.error('Error cargando imagen:', attachmentUrl, e);
															const target = e.target as HTMLImageElement;
															target.style.display = 'none';
															if (target.parentElement) {
																target.parentElement.innerHTML = 
																	'<div class="w-full h-full flex items-center justify-center text-gray-400"><p class="text-sm">Error al cargar imagen. URL: ' + attachmentUrl.substring(0, 50) + '...</p></div>';
															}
														}}
													/>
													<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
														<Eye className="w-8 h-8 text-white opacity-0 group-hover/image:opacity-100 transition-opacity" />
													</div>
												</div>
											)}
											
											<div className="flex items-center justify-between pt-3 border-t border-gray-300">
												<p className="text-xs font-medium text-gray-600">
													{isImage ? 'Ver imagen' : isPDF ? 'Ver PDF' : isDoc ? 'Ver documento' : 'Descargar archivo'}
												</p>
												<div className="flex items-center gap-2">
													<ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
													<Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
												</div>
											</div>
										</a>
									);
								})}
							</div>
						</div>
					);
				})()}


				{/* Footer */}
				<div className="bg-white rounded-xl shadow-lg p-6 text-center">
					<p className="text-sm text-gray-600">
						Este enlace fue generado por el paciente para compartir información médica con especialistas externos.
					</p>
					<p className="text-xs text-gray-500 mt-2">
						KAVIRA - Sistema de Gestión Médica
					</p>
				</div>
			</div>
		</div>
	);
}

