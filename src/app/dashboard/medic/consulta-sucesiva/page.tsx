'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
	FileText, 
	PlusCircle, 
	Search, 
	User, 
	Calendar, 
	Stethoscope, 
	Loader2, 
	AlertCircle,
	ChevronRight,
	FileCheck,
	Image as ImageIcon,
	Scan as XRay,
	File
} from 'lucide-react';
import Link from 'next/link';

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
};

type SuccessiveConsultation = {
	id: string;
	original_consultation_id: string;
	patient_id: string;
	doctor_id: string;
	organization_id: string | null;
	appointment_id: string | null;
	consultation_date: string;
	lab_results: any;
	results_description: string | null;
	observations: string | null;
	additional_fields: any;
	images: string[];
	xrays: string[];
	documents: string[];
	diagnosis: string | null;
	icd11_code: string | null;
	icd11_title: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	patient?: Patient;
	original_consultation?: OriginalConsultation;
};

export default function ConsultaSucesivaPage() {
	const router = useRouter();
	const [consultations, setConsultations] = useState<SuccessiveConsultation[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadConsultations();
	}, []);

	const loadConsultations = async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch('/api/successive-consultations');
			if (!res.ok) {
				throw new Error('Error al cargar consultas sucesivas');
			}
			const data = await res.json();
			setConsultations(data || []);
		} catch (err: any) {
			console.error('Error cargando consultas sucesivas:', err);
			setError(err.message || 'Error al cargar consultas sucesivas');
		} finally {
			setLoading(false);
		}
	};

	const filteredConsultations = consultations.filter((consultation) => {
		if (!searchTerm) return true;
		const term = searchTerm.toLowerCase();
		const patientName = `${consultation.patient?.firstName || ''} ${consultation.patient?.lastName || ''}`.toLowerCase();
		const diagnosis = (consultation.diagnosis || '').toLowerCase();
		const observations = (consultation.observations || '').toLowerCase();
		const originalComplaint = (consultation.original_consultation?.chief_complaint || '').toLowerCase();
		
		return (
			patientName.includes(term) ||
			diagnosis.includes(term) ||
			observations.includes(term) ||
			originalComplaint.includes(term)
		);
	});

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-8 px-4 sm:px-6 lg:px-8">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-3xl font-bold text-slate-900 mb-2">Consulta Sucesiva</h1>
							<p className="text-slate-600">
								Gestione las consultas de seguimiento cuando los pacientes regresan con resultados de laboratorio
							</p>
						</div>
						<Link
							href="/dashboard/medic/consulta-sucesiva/new"
							className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 hover:shadow-xl transform hover:-translate-y-0.5"
						>
							<PlusCircle size={20} />
							Nueva Consulta Sucesiva
						</Link>
					</div>

					{/* Search Bar */}
					<div className="relative">
						<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
						<input
							type="text"
							placeholder="Buscar por paciente, diagnóstico u observaciones..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
						/>
					</div>
				</div>

				{/* Error Message */}
				{error && (
					<div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
						<AlertCircle className="text-rose-600" size={20} />
						<p className="text-rose-800">{error}</p>
					</div>
				)}

				{/* Loading State */}
				{loading && (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="animate-spin text-teal-600" size={32} />
					</div>
				)}

				{/* Consultations List */}
				{!loading && !error && (
					<>
						{filteredConsultations.length === 0 ? (
							<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
								<FileText className="mx-auto text-slate-400 mb-4" size={48} />
								<h3 className="text-xl font-semibold text-slate-900 mb-2">
									{searchTerm ? 'No se encontraron consultas' : 'No hay consultas sucesivas'}
								</h3>
								<p className="text-slate-600 mb-6">
									{searchTerm
										? 'Intente con otros términos de búsqueda'
										: 'Cree una nueva consulta sucesiva cuando un paciente regrese con resultados de laboratorio'}
								</p>
								{!searchTerm && (
									<Link
										href="/dashboard/medic/consulta-sucesiva/new"
										className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all"
									>
										<PlusCircle size={20} />
										Crear Primera Consulta Sucesiva
									</Link>
								)}
							</div>
						) : (
							<div className="grid gap-6">
								{filteredConsultations.map((consultation) => (
									<motion.div
										key={consultation.id}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
									>
										<Link
											href={`/dashboard/medic/consulta-sucesiva/${consultation.id}`}
											className="block p-6 hover:bg-slate-50/50 transition-colors"
										>
											<div className="flex items-start justify-between">
												<div className="flex-1">
													{/* Patient Info */}
													<div className="flex items-center gap-3 mb-4">
														<div className="p-2 bg-teal-100 rounded-lg">
															<User className="text-teal-600" size={20} />
														</div>
														<div>
															<h3 className="text-lg font-semibold text-slate-900">
																{consultation.patient?.firstName} {consultation.patient?.lastName}
															</h3>
															{consultation.patient?.identifier && (
																<p className="text-sm text-slate-600">ID: {consultation.patient.identifier}</p>
															)}
														</div>
													</div>

													{/* Consultation Date */}
													<div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
														<Calendar size={16} />
														<span>
															{format(new Date(consultation.consultation_date), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
														</span>
													</div>

													{/* Original Consultation Info */}
													{consultation.original_consultation && (
														<div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
															<p className="text-xs font-semibold text-blue-900 mb-1">Consulta Original</p>
															{consultation.original_consultation.chief_complaint && (
																<p className="text-sm text-blue-800">
																	<strong>Motivo:</strong> {consultation.original_consultation.chief_complaint}
																</p>
															)}
														</div>
													)}

													{/* Diagnosis */}
													{consultation.diagnosis && (
														<div className="mb-3">
															<p className="text-sm font-semibold text-slate-700 mb-1">Diagnóstico:</p>
															<p className="text-sm text-slate-600">{consultation.diagnosis}</p>
														</div>
													)}

													{/* Observations Preview */}
													{consultation.observations && (
														<div className="mb-3">
															<p className="text-sm font-semibold text-slate-700 mb-1">Observaciones:</p>
															<p className="text-sm text-slate-600 line-clamp-2">{consultation.observations}</p>
														</div>
													)}

													{/* Attachments Summary */}
													<div className="flex items-center gap-4 mt-4 text-sm text-slate-600">
														{consultation.images && consultation.images.length > 0 && (
															<div className="flex items-center gap-1">
																<ImageIcon size={16} />
																<span>{consultation.images.length} imagen{consultation.images.length !== 1 ? 'es' : ''}</span>
															</div>
														)}
														{consultation.xrays && consultation.xrays.length > 0 && (
															<div className="flex items-center gap-1">
																<XRay size={16} />
																<span>{consultation.xrays.length} radiografía{consultation.xrays.length !== 1 ? 's' : ''}</span>
															</div>
														)}
														{consultation.documents && consultation.documents.length > 0 && (
															<div className="flex items-center gap-1">
																<File size={16} />
																<span>{consultation.documents.length} documento{consultation.documents.length !== 1 ? 's' : ''}</span>
															</div>
														)}
													</div>
												</div>

												{/* Arrow */}
												<ChevronRight className="text-slate-400 flex-shrink-0 ml-4" size={24} />
											</div>
										</Link>
									</motion.div>
								))}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
