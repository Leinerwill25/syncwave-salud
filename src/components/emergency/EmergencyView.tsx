'use client';

// Componente para visualizar información crítica del paciente en emergencias
// Diseñado para ser rápido, claro y profesional

import { 
	User, Phone, MapPin, Calendar, Droplet, AlertTriangle, Pill, 
	Heart, Activity, FileText, ClipboardList, ChevronDown, ChevronUp,
	Stethoscope, PhoneCall, Printer, Download, Clock, Shield
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type EmergencyData = {
	patient: {
		id: string;
		firstName: string;
		lastName: string;
		fullName: string;
		identifier?: string | null;
		dob?: string | null;
		age?: number | null;
		gender?: string | null;
		phone?: string | null;
		address?: string | null;
		bloodType?: string | null;
		allergies?: string | null;
		hasDisability?: boolean | null;
		disability?: string | null;
		hasElderlyConditions?: boolean | null;
		elderlyConditions?: string | null;
	};
	emergencyContact?: {
		name: string | null;
		phone: string | null;
		relationship: string | null;
	} | null;
	advanceDirectives?: {
		dnr?: boolean;
		restrictions?: string[];
		other?: string;
	} | null;
	lastVitals?: any;
	criticalLabs?: Array<{
		id: string;
		type: string;
		result: any;
		isCritical: boolean;
		reportedAt: string;
	}>;
	recentConsultation?: {
		chiefComplaint?: string | null;
		diagnosis?: string | null;
		createdAt: string;
	} | null;
	activePrescriptions?: Array<{
		id: string;
		issued_at: string;
		valid_until?: string | null;
		medications: Array<{
			name: string;
			dosage?: string | null;
			form?: string | null;
			frequency?: string | null;
			duration?: string | null;
			instructions?: string | null;
		}>;
	}>;
	lastMedicalRecord?: {
		id: string;
		content: any;
		createdAt: string;
	} | null;
};

type Props = {
	data: EmergencyData;
};

// Función para parsear y formatear la frecuencia de medicamentos
// Formato esperado: "2/2" = cada 2 horas por 2 días
function formatFrequency(frequency: string | null | undefined, duration?: string | null): string {
	if (!frequency) return duration || '';
	
	// Intentar parsear formato "X/Y" (cada X horas por Y días)
	const match = frequency.match(/^(\d+)\/(\d+)$/);
	if (match) {
		const hours = match[1];
		const days = match[2];
		return `Cada ${hours} hora${hours !== '1' ? 's' : ''} por ${days} día${days !== '1' ? 's' : ''}`;
	}
	
	// Si no coincide, mostrar la frecuencia tal cual y agregar duration si existe
	if (duration) {
		return `${frequency} por ${duration}`;
	}
	
	return frequency;
}

export default function EmergencyView({ data }: Props) {
	const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['critical']));

	const toggleSection = (section: string) => {
		setExpandedSections((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(section)) {
				newSet.delete(section);
			} else {
				newSet.add(section);
			}
			return newSet;
		});
	};

	const hasAllergies = data.patient.allergies && data.patient.allergies.trim() !== '';
	const hasDisability = data.patient.hasDisability && data.patient.disability;
	const hasChronicConditions = data.patient.elderlyConditions;

	// Función para imprimir
	const handlePrint = () => {
		window.print();
	};

	// Formatear fecha
	const formatDate = (dateString: string | null | undefined) => {
		if (!dateString) return 'N/A';
		try {
			return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
		} catch {
			return dateString;
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 print:bg-white">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-4">
				{/* Header Principal - Elegante y Profesional */}
				<div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl mb-8 print:shadow-none border-0 overflow-hidden">
					<div className="bg-white/10 backdrop-blur-sm p-8 print:p-6">
						<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
							{/* Información principal del paciente */}
							<div className="flex-1">
								<div className="flex flex-wrap items-center gap-3 mb-4">
									<div className="flex items-center gap-3">
										<div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
											<User className="w-8 h-8 text-white" />
										</div>
										<h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
											{data.patient.fullName}
										</h1>
									</div>
								</div>
								<div className="flex flex-wrap items-center gap-3 mb-4">
									{data.patient.identifier && (
										<span className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl text-sm font-semibold border border-white/30">
											Cédula: {data.patient.identifier}
										</span>
									)}
									{data.patient.age !== null && data.patient.age !== undefined && (
										<span className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl text-sm font-semibold border border-white/30">
											{data.patient.age} años
										</span>
									)}
									{data.patient.gender && (
										<span className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl text-sm font-semibold border border-white/30">
											{data.patient.gender}
										</span>
									)}
									{hasAllergies && (
										<span className="px-4 py-2 bg-red-500/90 text-white rounded-xl text-sm font-bold flex items-center gap-2 border-2 border-red-300 shadow-lg">
											<AlertTriangle className="w-4 h-4" />
											ALERGIAS
										</span>
									)}
									{data.patient.bloodType && (
										<span className="px-4 py-2 bg-rose-500/90 text-white rounded-xl text-sm font-bold flex items-center gap-2 border-2 border-rose-300 shadow-lg">
											<Droplet className="w-5 h-5" />
											{data.patient.bloodType}
										</span>
									)}
								</div>
								<div className="flex flex-wrap items-center gap-4 text-white/90 text-sm">
									{data.patient.phone && (
										<a 
											href={`tel:${data.patient.phone}`}
											className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all font-medium"
										>
											<Phone className="w-4 h-4" />
											{data.patient.phone}
										</a>
									)}
									{data.patient.address && (
										<span className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg">
											<MapPin className="w-4 h-4" />
											{data.patient.address}
										</span>
									)}
								</div>
							</div>

							{/* Acciones rápidas */}
							<div className="flex flex-wrap gap-3">
								{data.emergencyContact?.phone && (
									<a
										href={`tel:${data.emergencyContact.phone}`}
										className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl hover:shadow-xl transition-all text-sm font-bold border-2 border-red-300 shadow-lg"
									>
										<PhoneCall className="w-5 h-5" />
										Emergencia
									</a>
								)}
								<button
									onClick={handlePrint}
									className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl transition-all text-sm font-semibold border border-white/30 print:hidden"
								>
									<Printer className="w-5 h-5" />
									Imprimir
								</button>
							</div>
						</div>
					</div>

					{/* Contacto de emergencia */}
					{data.emergencyContact && (
						<div className="bg-blue-700/30 backdrop-blur-sm px-8 py-4 border-t border-white/20">
							<div className="flex flex-wrap items-center gap-3 text-white">
								<PhoneCall className="w-5 h-5" />
								<span className="font-bold">Contacto de Emergencia:</span>
								<span>
									{data.emergencyContact.name}
									{data.emergencyContact.relationship && ` (${data.emergencyContact.relationship})`}
								</span>
								{data.emergencyContact.phone && (
									<a 
										href={`tel:${data.emergencyContact.phone}`}
										className="ml-auto px-4 py-1.5 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg hover:shadow-lg transition-all font-semibold border border-white/30"
									>
										{data.emergencyContact.phone}
									</a>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Grid de información - Diseño mejorado */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-3">
					{/* Columna izquierda: Información de contacto y logística */}
					<div className="space-y-6">
						<div className="bg-white rounded-2xl shadow-lg p-6 print:shadow-none border border-slate-200/50 hover:shadow-xl transition-shadow">
							<div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200">
								<div className="p-2.5 bg-blue-100 rounded-xl">
									<User className="w-6 h-6 text-blue-600" />
								</div>
								<h2 className="text-xl font-bold text-slate-900">
									Información Personal
								</h2>
							</div>
							<dl className="space-y-4 text-sm">
								{data.patient.phone && (
									<div className="p-3 bg-slate-50 rounded-lg">
										<dt className="text-slate-600 font-semibold mb-1">Teléfono</dt>
										<dd className="text-slate-900">
											<a href={`tel:${data.patient.phone}`} className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
												{data.patient.phone}
											</a>
										</dd>
									</div>
								)}
								{data.patient.address && (
									<div className="p-3 bg-slate-50 rounded-lg">
										<dt className="text-slate-600 font-semibold mb-1">Dirección</dt>
										<dd className="text-slate-900">{data.patient.address}</dd>
									</div>
								)}
								{data.patient.dob && (
									<div className="p-3 bg-slate-50 rounded-lg">
										<dt className="text-slate-600 font-semibold mb-1">Fecha de Nacimiento</dt>
										<dd className="text-slate-900">{formatDate(data.patient.dob)}</dd>
									</div>
								)}
							</dl>
						</div>
					</div>

					{/* Columna central: Información clínica crítica */}
					<div className="space-y-6">
						{/* Alergias - CRÍTICO */}
						{hasAllergies && (
							<div className="bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-400 rounded-2xl shadow-xl p-6 print:shadow-none">
								<div className="flex items-center gap-3 mb-4">
									<div className="p-2.5 bg-red-500 rounded-xl">
										<AlertTriangle className="w-6 h-6 text-white" />
									</div>
									<h2 className="text-xl font-bold text-red-900">
										⚠️ ALERGIAS CONOCIDAS
									</h2>
								</div>
								<p className="text-red-900 font-semibold text-base whitespace-pre-wrap leading-relaxed">{data.patient.allergies}</p>
							</div>
						)}

						{/* Medicaciones activas - Mejorado */}
						{data.activePrescriptions && data.activePrescriptions.length > 0 && (
							<div className="bg-white rounded-2xl shadow-lg p-6 print:shadow-none border border-slate-200/50 hover:shadow-xl transition-shadow">
								<div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200">
									<div className="p-2.5 bg-purple-100 rounded-xl">
										<Pill className="w-6 h-6 text-purple-600" />
									</div>
									<h2 className="text-xl font-bold text-slate-900">
										Medicaciones Activas
									</h2>
								</div>
								<div className="space-y-4">
									{data.activePrescriptions.map((presc) => (
										<div key={presc.id} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border-l-4 border-purple-500">
											{presc.medications.map((med, idx) => (
												<div key={idx} className={idx > 0 ? "mt-4 pt-4 border-t border-purple-200" : ""}>
													<div className="flex items-start justify-between gap-3 mb-2">
														<p className="font-bold text-slate-900 text-base">{med.name}</p>
														{med.form && (
															<span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold whitespace-nowrap">
																{med.form}
															</span>
														)}
													</div>
													{med.dosage && (
														<p className="text-sm text-slate-700 mb-2">
															<span className="font-semibold">Dosis:</span> {med.dosage}
														</p>
													)}
													{med.frequency && (
														<div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
															<Clock className="w-4 h-4 text-purple-600" />
															<span className="font-semibold">Frecuencia:</span>
															<span className="bg-purple-100 text-purple-900 px-2 py-1 rounded font-medium">
																{formatFrequency(med.frequency, med.duration)}
															</span>
														</div>
													)}
													{med.instructions && (
														<p className="text-xs text-slate-600 mt-2 p-2 bg-white/60 rounded italic">
															{med.instructions}
														</p>
													)}
												</div>
											))}
											<p className="text-xs text-slate-500 mt-3 pt-3 border-t border-purple-200">
												Emitida: {formatDate(presc.issued_at)}
											</p>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Condiciones crónicas */}
						{(hasChronicConditions || hasDisability) && (
							<div className="bg-white rounded-2xl shadow-lg p-6 print:shadow-none border border-slate-200/50 hover:shadow-xl transition-shadow">
								<div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200">
									<div className="p-2.5 bg-amber-100 rounded-xl">
										<Stethoscope className="w-6 h-6 text-amber-600" />
									</div>
									<h2 className="text-xl font-bold text-slate-900">
										Condiciones Médicas
									</h2>
								</div>
								<div className="space-y-4 text-sm">
									{data.patient.elderlyConditions && (
										<div className="p-3 bg-amber-50 rounded-lg">
											<p className="text-slate-600 font-semibold mb-2">Condiciones Geriátricas</p>
											<p className="text-slate-900 whitespace-pre-wrap leading-relaxed">{data.patient.elderlyConditions}</p>
										</div>
									)}
									{hasDisability && (
										<div className="p-3 bg-amber-50 rounded-lg">
											<p className="text-slate-600 font-semibold mb-2">Discapacidad</p>
											<p className="text-slate-900">{data.patient.disability}</p>
										</div>
									)}
								</div>
							</div>
						)}
					</div>

					{/* Columna derecha: Datos recientes */}
					<div className="space-y-6">
						{/* Signos vitales recientes */}
						{data.lastVitals && (
							<div className="bg-white rounded-2xl shadow-lg p-6 print:shadow-none border border-slate-200/50 hover:shadow-xl transition-shadow">
								<div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200">
									<div className="p-2.5 bg-green-100 rounded-xl">
										<Activity className="w-6 h-6 text-green-600" />
									</div>
									<h2 className="text-xl font-bold text-slate-900">
										Signos Vitales
									</h2>
								</div>
								<div className="grid grid-cols-2 gap-4 text-sm">
									{data.lastVitals.bp_systolic && data.lastVitals.bp_diastolic && (
										<div className="p-3 bg-green-50 rounded-xl">
											<p className="text-slate-600 font-semibold mb-1">Presión Arterial</p>
											<p className="text-slate-900 font-bold text-xl">
												{data.lastVitals.bp_systolic}/{data.lastVitals.bp_diastolic} mmHg
											</p>
										</div>
									)}
									{data.lastVitals.heart_rate && (
										<div className="p-3 bg-green-50 rounded-xl">
											<p className="text-slate-600 font-semibold mb-1">Frecuencia Cardíaca</p>
											<p className="text-slate-900 font-bold text-xl">{data.lastVitals.heart_rate} bpm</p>
										</div>
									)}
									{data.lastVitals.temperature && (
										<div className="p-3 bg-green-50 rounded-xl">
											<p className="text-slate-600 font-semibold mb-1">Temperatura</p>
											<p className="text-slate-900 font-bold text-xl">{data.lastVitals.temperature} °C</p>
										</div>
									)}
									{data.lastVitals.spo2 && (
										<div className="p-3 bg-green-50 rounded-xl">
											<p className="text-slate-600 font-semibold mb-1">SpO2</p>
											<p className="text-slate-900 font-bold text-xl">{data.lastVitals.spo2}%</p>
										</div>
									)}
									{data.lastVitals.respiratory_rate && (
										<div className="p-3 bg-green-50 rounded-xl">
											<p className="text-slate-600 font-semibold mb-1">Frecuencia Respiratoria</p>
											<p className="text-slate-900 font-bold text-xl">{data.lastVitals.respiratory_rate} rpm</p>
										</div>
									)}
									{data.lastVitals.glucose && (
										<div className="p-3 bg-green-50 rounded-xl">
											<p className="text-slate-600 font-semibold mb-1">Glucosa</p>
											<p className="text-slate-900 font-bold text-xl">{data.lastVitals.glucose} mg/dL</p>
										</div>
									)}
								</div>
								{data.lastVitals.recordedAt && (
									<p className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-200">
										Registrado: {formatDate(data.lastVitals.recordedAt)}
									</p>
								)}
							</div>
						)}

						{/* Labs críticos */}
						{data.criticalLabs && data.criticalLabs.length > 0 && (
							<div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 rounded-2xl shadow-xl p-6 print:shadow-none">
								<div className="flex items-center gap-3 mb-5">
									<div className="p-2.5 bg-amber-500 rounded-xl">
										<AlertTriangle className="w-6 h-6 text-white" />
									</div>
									<h2 className="text-xl font-bold text-amber-900">
										⚠️ Resultados Críticos
									</h2>
								</div>
								<div className="space-y-4">
									{data.criticalLabs.map((lab) => (
										<div key={lab.id} className="bg-white/60 backdrop-blur-sm border-l-4 border-amber-500 rounded-xl p-4">
											<p className="font-bold text-amber-900 mb-2">{lab.type}</p>
											<p className="text-sm text-amber-800 mb-2">
												{typeof lab.result === 'object' ? JSON.stringify(lab.result, null, 2) : lab.result}
											</p>
											<p className="text-xs text-amber-600">{formatDate(lab.reportedAt)}</p>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Última consulta */}
						{data.recentConsultation && (
							<div className="bg-white rounded-2xl shadow-lg p-6 print:shadow-none border border-slate-200/50 hover:shadow-xl transition-shadow">
								<div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200">
									<div className="p-2.5 bg-blue-100 rounded-xl">
										<FileText className="w-6 h-6 text-blue-600" />
									</div>
									<h2 className="text-xl font-bold text-slate-900">
										Última Consulta
									</h2>
								</div>
								<div className="space-y-4 text-sm">
									{data.recentConsultation.chiefComplaint && (
										<div className="p-3 bg-blue-50 rounded-lg">
											<p className="text-slate-600 font-semibold mb-2">Motivo de Consulta</p>
											<p className="text-slate-900">{data.recentConsultation.chiefComplaint}</p>
										</div>
									)}
									{data.recentConsultation.diagnosis && (
										<div className="p-3 bg-blue-50 rounded-lg">
											<p className="text-slate-600 font-semibold mb-2">Diagnóstico</p>
											<p className="text-slate-900">{data.recentConsultation.diagnosis}</p>
										</div>
									)}
									<p className="text-xs text-slate-500 pt-4 border-t border-slate-200">
										{formatDate(data.recentConsultation.createdAt)}
									</p>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Directivas anticipadas - ALTA PRIORIDAD */}
				{data.advanceDirectives && (
					<div className="mt-8 bg-gradient-to-br from-red-100 to-rose-100 border-4 border-red-500 rounded-2xl shadow-2xl p-8 print:shadow-none">
						<div className="flex items-center gap-4 mb-6">
							<div className="p-3 bg-red-500 rounded-xl">
								<Shield className="w-8 h-8 text-white" />
							</div>
							<h2 className="text-2xl font-bold text-red-900">
								⚠️ DIRECTIVAS ANTICIPADAS / RESTRICCIONES DE SOPORTE VITAL
							</h2>
						</div>
						<div className="space-y-4 text-red-900">
							{data.advanceDirectives.dnr && (
								<div className="p-4 bg-red-200/50 rounded-xl border-2 border-red-400">
									<p className="font-bold text-xl">⚠️ DO NOT RESUSCITATE (DNR) - NO REANIMAR</p>
								</div>
							)}
							{data.advanceDirectives.restrictions && data.advanceDirectives.restrictions.length > 0 && (
								<div className="p-4 bg-red-200/50 rounded-xl border-2 border-red-400">
									<p className="font-semibold text-lg mb-2">Restricciones:</p>
									<ul className="list-disc list-inside mt-2 space-y-2">
										{data.advanceDirectives.restrictions.map((restriction, idx) => (
											<li key={idx} className="font-medium">{restriction}</li>
										))}
									</ul>
								</div>
							)}
							{data.advanceDirectives.other && (
								<div className="p-4 bg-red-200/50 rounded-xl border-2 border-red-400">
									<p className="whitespace-pre-wrap leading-relaxed">{data.advanceDirectives.other}</p>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Footer informativo */}
				<div className="mt-8 text-center text-xs text-slate-500 print:hidden">
					<p className="font-medium">Esta información es confidencial y está destinada exclusivamente para uso médico en emergencias.</p>
					<p className="mt-2 text-slate-600 font-semibold">Generado por ASHIRA - Plataforma de Salud Digital</p>
				</div>
			</div>

			{/* Estilos para impresión */}
			<style jsx global>{`
				@media print {
					.no-print {
						display: none !important;
					}
					.print\\:shadow-none {
						box-shadow: none !important;
					}
					.print\\:border-0 {
						border: 0 !important;
					}
					.print\\:border-b-2 {
						border-bottom-width: 2px !important;
					}
					.print\\:py-4 {
						padding-top: 1rem !important;
						padding-bottom: 1rem !important;
					}
					.print\\:p-4 {
						padding: 1rem !important;
					}
					.print\\:p-6 {
						padding: 1.5rem !important;
					}
					.print\\:bg-white {
						background-color: white !important;
					}
					.print\\:grid-cols-3 {
						grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
					}
				}
			`}</style>
		</div>
	);
}
