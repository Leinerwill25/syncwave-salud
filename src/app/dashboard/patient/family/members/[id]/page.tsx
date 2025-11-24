'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User, Calendar, Stethoscope, Pill, FlaskConical, Receipt, ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

type MemberData = {
	patient: {
		id: string;
		firstName: string;
		lastName: string;
		identifier: string | null;
		dob: string | null;
		gender: string | null;
		phone: string | null;
	} | null;
	consultations: any[];
	prescriptions: any[];
	labResults: any[];
	appointments: any[];
	facturas: any[];
};

export default function FamilyMemberPage() {
	const params = useParams();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [memberData, setMemberData] = useState<MemberData | null>(null);
	const [activeTab, setActiveTab] = useState<'overview' | 'consultations' | 'prescriptions' | 'labs' | 'appointments' | 'billing'>('overview');

	useEffect(() => {
		if (params.id) {
			loadMemberData();
		}
	}, [params.id]);

	const loadMemberData = async () => {
		try {
			setLoading(true);
			// Obtener datos del miembro desde el grupo familiar
			const res = await fetch(`/api/patient/family/member/${params.id}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404) {
					router.push('/dashboard/patient/family');
					return;
				}
				throw new Error('Error al cargar datos del miembro');
			}

			const data = await res.json();
			setMemberData(data);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-3 sm:p-4 md:p-6">
				<div className="max-w-7xl mx-auto">
					<div className="animate-pulse space-y-3 sm:space-y-4 md:space-y-6">
						<div className="h-6 sm:h-7 md:h-8 bg-gray-200 rounded w-1/2 sm:w-1/3"></div>
						<div className="h-48 sm:h-56 md:h-64 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		);
	}

	if (!memberData || !memberData.patient) {
		return null;
	}

	const patient = memberData.patient;

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<Link
					href="/dashboard/patient/family"
					className="inline-flex items-center gap-1.5 sm:gap-2 text-purple-600 hover:text-purple-700 font-medium text-xs sm:text-sm md:text-base"
				>
					<ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
					<span>Volver al Grupo Familiar</span>
				</Link>

				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
						<div className="p-2 sm:p-3 md:p-4 bg-purple-100 rounded-lg sm:rounded-xl flex-shrink-0">
							<User className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-purple-600" />
						</div>
						<div className="min-w-0 flex-1">
							<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
								{patient.firstName} {patient.lastName}
							</h1>
							<div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 md:gap-4 mt-1 sm:mt-2 text-gray-600 text-xs sm:text-sm">
								{patient.identifier && <span className="truncate">ID: {patient.identifier}</span>}
								{patient.dob && (
									<span className="flex items-center gap-1">
										<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
										{new Date(patient.dob).toLocaleDateString('es-ES')}
									</span>
								)}
								{patient.gender && <span>{patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Femenino' : 'Otro'}</span>}
							</div>
						</div>
					</div>

					{/* Tabs */}
					<div className="border-b border-gray-200 mb-4 sm:mb-5 md:mb-6">
						<div className="flex gap-1 sm:gap-2 overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0 pb-2">
							{[
								{ id: 'overview', label: 'Resumen', icon: FileText },
								{ id: 'consultations', label: `Consultas (${memberData.consultations.length})`, icon: Stethoscope },
								{ id: 'prescriptions', label: `Recetas (${memberData.prescriptions.length})`, icon: Pill },
								{ id: 'labs', label: `Laboratorios (${memberData.labResults.length})`, icon: FlaskConical },
								{ id: 'appointments', label: `Citas (${memberData.appointments.length})`, icon: Calendar },
								{ id: 'billing', label: `Facturas (${memberData.facturas.length})`, icon: Receipt },
							].map((tab) => {
								const Icon = tab.icon;
								return (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id as any)}
										className={`flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 font-semibold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
											activeTab === tab.id
												? 'border-purple-600 text-purple-600'
												: 'border-transparent text-gray-600 hover:text-gray-900'
										}`}
									>
										<Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
										<span className="hidden sm:inline">{tab.label}</span>
										<span className="sm:hidden">{tab.label.split(' ')[0]}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Contenido de tabs */}
					{activeTab === 'overview' && (
						<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
							<div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
								<p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Consultas</p>
								<p className="text-xl sm:text-2xl font-bold text-blue-600">{memberData.consultations.length}</p>
							</div>
							<div className="p-3 sm:p-4 bg-purple-50 rounded-lg">
								<p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Recetas</p>
								<p className="text-xl sm:text-2xl font-bold text-purple-600">{memberData.prescriptions.length}</p>
							</div>
							<div className="p-3 sm:p-4 bg-yellow-50 rounded-lg">
								<p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Laboratorios</p>
								<p className="text-xl sm:text-2xl font-bold text-yellow-600">{memberData.labResults.length}</p>
							</div>
							<div className="p-3 sm:p-4 bg-green-50 rounded-lg">
								<p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Citas</p>
								<p className="text-xl sm:text-2xl font-bold text-green-600">{memberData.appointments.length}</p>
							</div>
						</div>
					)}

					{activeTab === 'consultations' && (
						<div className="space-y-3 sm:space-y-4">
							{memberData.consultations.length === 0 ? (
								<p className="text-gray-600 text-center py-6 sm:py-8 text-xs sm:text-sm md:text-base">No hay consultas registradas</p>
							) : (
								memberData.consultations.map((consultation: any) => (
									<div key={consultation.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
										<p className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">
											{consultation.started_at
												? new Date(consultation.started_at).toLocaleDateString('es-ES')
												: 'Fecha no disponible'}
										</p>
										{consultation.chief_complaint && (
											<p className="text-xs sm:text-sm text-gray-700 mb-1 break-words">
												<span className="font-medium">Motivo: </span>
												{consultation.chief_complaint}
											</p>
										)}
										{consultation.diagnosis && (
											<p className="text-xs sm:text-sm text-gray-700 break-words">
												<span className="font-medium">Diagnóstico: </span>
												{consultation.diagnosis}
											</p>
										)}
									</div>
								))
							)}
						</div>
					)}

					{activeTab === 'prescriptions' && (
						<div className="space-y-3 sm:space-y-4">
							{memberData.prescriptions.length === 0 ? (
								<p className="text-gray-600 text-center py-6 sm:py-8 text-xs sm:text-sm md:text-base">No hay recetas registradas</p>
							) : (
								memberData.prescriptions.map((prescription: any) => (
									<div key={prescription.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
										<p className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">
											{new Date(prescription.issued_at).toLocaleDateString('es-ES')}
										</p>
										<p className="text-xs sm:text-sm text-gray-700">
											<span className="font-medium">Estado: </span>
											{prescription.status}
										</p>
										{prescription.prescription_item && prescription.prescription_item.length > 0 && (
											<div className="mt-1.5 sm:mt-2">
												<p className="text-[10px] sm:text-xs font-medium text-gray-600 mb-0.5 sm:mb-1">Medicamentos:</p>
												<ul className="text-xs sm:text-sm text-gray-700 space-y-0.5 sm:space-y-1">
													{prescription.prescription_item.map((item: any, idx: number) => (
														<li key={idx} className="break-words">• {item.name}</li>
													))}
												</ul>
											</div>
										)}
									</div>
								))
							)}
						</div>
					)}

					{activeTab === 'labs' && (
						<div className="space-y-3 sm:space-y-4">
							{memberData.labResults.length === 0 ? (
								<p className="text-gray-600 text-center py-6 sm:py-8 text-xs sm:text-sm md:text-base">No hay resultados de laboratorio</p>
							) : (
								memberData.labResults.map((result: any) => (
									<div
										key={result.id}
										className={`p-3 sm:p-4 rounded-lg ${result.is_critical ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`}
									>
										<div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
											<p className="font-semibold text-gray-900 text-sm sm:text-base truncate flex-1">
												{result.result_type || 'Resultado de Laboratorio'}
											</p>
											{result.is_critical && (
												<span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-600 text-white text-[9px] sm:text-[10px] md:text-xs font-semibold rounded flex-shrink-0">
													CRÍTICO
												</span>
											)}
										</div>
										<p className="text-xs sm:text-sm text-gray-600">
											{new Date(result.reported_at).toLocaleDateString('es-ES')}
										</p>
									</div>
								))
							)}
						</div>
					)}

					{activeTab === 'appointments' && (
						<div className="space-y-3 sm:space-y-4">
							{memberData.appointments.length === 0 ? (
								<p className="text-gray-600 text-center py-6 sm:py-8 text-xs sm:text-sm md:text-base">No hay citas registradas</p>
							) : (
								memberData.appointments.map((appointment: any) => (
									<div key={appointment.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
										<p className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base break-words">
											{new Date(appointment.scheduled_at).toLocaleDateString('es-ES', {
												weekday: 'long',
												year: 'numeric',
												month: 'long',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
											})}
										</p>
										<p className="text-xs sm:text-sm text-gray-700">
											<span className="font-medium">Estado: </span>
											{appointment.status}
										</p>
										{appointment.reason && (
											<p className="text-xs sm:text-sm text-gray-700 mt-1 break-words">
												<span className="font-medium">Motivo: </span>
												{appointment.reason}
											</p>
										)}
									</div>
								))
							)}
						</div>
					)}

					{activeTab === 'billing' && (
						<div className="space-y-3 sm:space-y-4">
							{memberData.facturas.length === 0 ? (
								<p className="text-gray-600 text-center py-6 sm:py-8 text-xs sm:text-sm md:text-base">No hay facturas registradas</p>
							) : (
								memberData.facturas.map((factura: any) => (
									<div key={factura.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
										<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-1.5 sm:mb-2 gap-1 sm:gap-2">
											<p className="font-semibold text-gray-900 text-sm sm:text-base truncate flex-1">
												{factura.numero_factura || `Factura #${factura.id.slice(0, 8)}`}
											</p>
											<p className="text-base sm:text-lg font-bold text-green-600">
												{new Intl.NumberFormat('es-VE', {
													style: 'currency',
													currency: factura.currency || 'USD',
												}).format(factura.total)}
											</p>
										</div>
										<p className="text-xs sm:text-sm text-gray-600">
											{new Date(factura.fecha_emision).toLocaleDateString('es-ES')}
										</p>
										<p className="text-xs sm:text-sm text-gray-700 mt-0.5 sm:mt-1">
											<span className="font-medium">Estado: </span>
											{factura.estado_pago}
										</p>
									</div>
								))
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

