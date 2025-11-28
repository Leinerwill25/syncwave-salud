'use client';

import { FileText, User, Calendar, Stethoscope, Pill, FileCheck, Download, AlertCircle, Clock, Heart, Thermometer, Activity, Image, File } from 'lucide-react';
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
	status: string;
	result: any;
	is_critical: boolean;
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

				{/* Órdenes Médicas */}
				{orders.length > 0 && (
					<div className="bg-white rounded-xl shadow-lg p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
							<FileCheck className="w-5 h-5 text-blue-600" />
							Órdenes Médicas
						</h2>
						<div className="space-y-3">
							{orders.map((order) => (
								<div key={order.id} className="border border-gray-200 rounded-lg p-4">
									<div className="flex items-center justify-between mb-2">
										<p className="font-semibold text-gray-900">{order.result_type}</p>
										<div className="flex items-center gap-2">
											{order.is_critical && (
												<span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
													Crítico
												</span>
											)}
											<span className={`px-2 py-1 rounded text-xs font-semibold ${
												order.status === 'completed' ? 'bg-green-100 text-green-700' :
												order.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
												'bg-gray-100 text-gray-700'
											}`}>
												{order.status}
											</span>
										</div>
									</div>
									<p className="text-sm text-gray-600">
										Fecha: {format(new Date(order.created_at), 'dd/MM/yyyy')}
									</p>
									{order.result && (
										<div className="mt-3 pt-3 border-t border-gray-200">
											<p className="text-sm font-medium text-gray-700 mb-1">Resultado:</p>
											<pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-auto">
												{typeof order.result === 'string' ? order.result : JSON.stringify(order.result, null, 2)}
											</pre>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Archivos Adjuntos de la Consulta */}
				{consultation.attachments && consultation.attachments.length > 0 && (
					<div className="bg-white rounded-xl shadow-lg p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
							<Download className="w-5 h-5 text-blue-600" />
							Archivos Adjuntos de la Consulta
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{consultation.attachments.map((attachment, idx) => {
								const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment);
								return (
									<a
										key={idx}
										href={attachment}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
									>
										{isImage ? (
											<Image className="w-8 h-8 text-blue-600" />
										) : (
											<File className="w-8 h-8 text-blue-600" />
										)}
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-gray-900 truncate">
												{attachment.split('/').pop() || `Archivo ${idx + 1}`}
											</p>
											<p className="text-xs text-gray-600">Haz clic para descargar</p>
										</div>
										<Download className="w-4 h-4 text-gray-400" />
									</a>
								);
							})}
						</div>
					</div>
				)}

				{/* Archivos de Prescripciones */}
				{prescriptionFiles.length > 0 && (
					<div className="bg-white rounded-xl shadow-lg p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
							<FileCheck className="w-5 h-5 text-blue-600" />
							Archivos de Prescripciones
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{prescriptionFiles.map((file: any, idx: number) => {
								const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.url || '');
								return (
									<a
										key={idx}
										href={file.url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
									>
										{isImage ? (
											<Image className="w-8 h-8 text-blue-600" />
										) : (
											<File className="w-8 h-8 text-blue-600" />
										)}
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-gray-900 truncate">
												{file.file_name || file.url?.split('/').pop() || `Archivo ${idx + 1}`}
											</p>
											<p className="text-xs text-gray-600">Haz clic para descargar</p>
										</div>
										<Download className="w-4 h-4 text-gray-400" />
									</a>
								);
							})}
						</div>
					</div>
				)}

				{/* Footer */}
				<div className="bg-white rounded-xl shadow-lg p-6 text-center">
					<p className="text-sm text-gray-600">
						Este enlace fue generado por el paciente para compartir información médica con especialistas externos.
					</p>
					<p className="text-xs text-gray-500 mt-2">
						Syncwave Salud - Sistema de Gestión Médica
					</p>
				</div>
			</div>
		</div>
	);
}

