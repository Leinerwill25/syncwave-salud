'use client';

import { useState, useEffect } from 'react';
import { Pill, Calendar, User, Download, CheckCircle, XCircle, Clock } from 'lucide-react';

type Prescription = {
	id: string;
	issued_at: string;
	valid_until: string | null;
	status: string;
	realStatus?: string; // Estado real calculado por la API
	isExpired?: boolean; // Flag booleano
	notes: string | null;
	doctor: {
		name: string | null;
	} | null;
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

export default function RecetasPage() {
	const [loading, setLoading] = useState(true);
	const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
	const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active');

	useEffect(() => {
		loadPrescriptions();
	}, [filter]);

	const loadPrescriptions = async () => {
		try {
			setLoading(true);
			const status = filter === 'all' ? 'all' : filter;
			const res = await fetch(`/api/patient/recetas?status=${status}`, {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar recetas');

			const data = await res.json();
			setPrescriptions(data.data || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const getPrescriptionStatus = (prescription: Prescription) => {
		// Usar realStatus si está disponible (calculado por la API), sino calcularlo
		if (prescription.realStatus) {
			return prescription.realStatus;
		}
		if (prescription.isExpired !== undefined) {
			return prescription.isExpired ? 'EXPIRED' : prescription.status;
		}
		// Fallback: calcular en el cliente
		if (prescription.valid_until) {
			const isPastDue = new Date(prescription.valid_until) < new Date();
			return isPastDue ? 'EXPIRED' : prescription.status;
		}
		return prescription.status;
	};

	const getStatusColor = (status: string) => {
		switch (status.toUpperCase()) {
			case 'ACTIVE':
				return 'bg-green-100 text-green-700';
			case 'EXPIRED':
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status.toUpperCase()) {
			case 'ACTIVE':
				return <CheckCircle className="w-4 h-4" />;
			case 'EXPIRED':
				return <XCircle className="w-4 h-4" />;
			default:
				return <Clock className="w-4 h-4" />;
		}
	};

	const isExpired = (prescription: Prescription) => {
		// Usar el flag isExpired si está disponible
		if (prescription.isExpired !== undefined) {
			return prescription.isExpired;
		}
		// Fallback: calcular en el cliente
		if (!prescription.valid_until) return false;
		return new Date(prescription.valid_until) < new Date();
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6">
					<h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
						<Pill className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-purple-600 flex-shrink-0" />
						<span>Mis Recetas</span>
					</h1>
					<p className="text-xs sm:text-sm md:text-base text-gray-600">Gestiona tus recetas médicas</p>
				</div>

				{/* Filtros */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6">
					<div className="flex flex-wrap gap-2">
						<button
							onClick={() => setFilter('active')}
							className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
								filter === 'active'
									? 'bg-purple-600 text-white shadow-md'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Activas
						</button>
						<button
							onClick={() => setFilter('expired')}
							className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
								filter === 'expired'
									? 'bg-purple-600 text-white shadow-md'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Vencidas
						</button>
						<button
							onClick={() => setFilter('all')}
							className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
								filter === 'all'
									? 'bg-purple-600 text-white shadow-md'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Todas
						</button>
					</div>
				</div>

				{/* Lista de recetas */}
				{loading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
								<div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
								<div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : prescriptions.length === 0 ? (
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 text-center">
						<Pill className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-2 sm:mb-3 md:mb-4" />
						<p className="text-gray-600 text-sm sm:text-base md:text-lg">No tienes recetas {filter === 'active' ? 'activas' : filter === 'expired' ? 'vencidas' : ''}</p>
					</div>
				) : (
					<div className="space-y-3 sm:space-y-4">
						{prescriptions.map((prescription) => (
							<div key={prescription.id} className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-5 lg:p-6 hover:shadow-xl transition-shadow">
								<div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
									<div className="flex-1 min-w-0 w-full">
										<div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
											<div className="p-1.5 sm:p-2 md:p-3 bg-purple-100 rounded-lg flex-shrink-0">
												<Pill className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-600" />
											</div>
											<div className="flex-1 min-w-0">
												<h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 flex items-center gap-1.5 sm:gap-2 flex-wrap">
													<span className="break-words">Receta #{prescription.id.slice(0, 8)}</span>
													{(() => {
														const realStatus = getPrescriptionStatus(prescription);
														return (
															<span
																className={`inline-flex items-center gap-1 px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] md:text-xs font-semibold ${getStatusColor(
																	realStatus
																)}`}
															>
																{getStatusIcon(realStatus)}
																<span className="hidden sm:inline">{realStatus === 'EXPIRED' ? 'Vencida' : 'Activa'}</span>
																<span className="sm:hidden">{realStatus === 'EXPIRED' ? 'Ven.' : 'Act.'}</span>
															</span>
														);
													})()}
												</h3>
												<p className="text-[10px] sm:text-xs md:text-sm text-gray-600 flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
													<Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
													<span>Emitida: {new Date(prescription.issued_at).toLocaleDateString('es-ES')}</span>
													{prescription.valid_until && (
														<>
															<span className="text-gray-400 hidden sm:inline">•</span>
															<span className={`${isExpired(prescription) ? 'text-red-600 font-semibold' : ''} break-words`}>
																Válida hasta: {new Date(prescription.valid_until).toLocaleDateString('es-ES')}
															</span>
														</>
													)}
												</p>
											</div>
										</div>
										{prescription.doctor && (
											<p className="text-[10px] sm:text-xs md:text-sm text-gray-600 flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
												<User className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
												<span className="break-words">Dr. {prescription.doctor.name || 'Médico'}</span>
											</p>
										)}
									</div>
									<button className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base shadow-md hover:shadow-lg">
										<Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
										<span>PDF</span>
									</button>
								</div>

								{/* Medicamentos */}
								{prescription.prescription_item && prescription.prescription_item.length > 0 && (
									<div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
										<p className="font-semibold text-gray-900 mb-2 sm:mb-3 text-xs sm:text-sm md:text-base">Medicamentos</p>
										<div className="space-y-2 sm:space-y-3">
											{prescription.prescription_item.map((item) => (
												<div key={item.id} className="bg-gray-50 rounded-lg p-2.5 sm:p-3 md:p-4">
													<div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-2 mb-2">
														<h4 className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base break-words">{item.name}</h4>
														{item.quantity && (
															<span className="px-2 py-0.5 sm:py-1 bg-purple-100 text-purple-700 text-[9px] sm:text-[10px] md:text-xs font-semibold rounded whitespace-nowrap">
																Cantidad: {item.quantity}
															</span>
														)}
													</div>
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-xs md:text-sm text-gray-700">
														{item.dosage && (
															<div className="break-words">
																<span className="font-medium">Dosis: </span>
																{item.dosage}
																{item.form && ` (${item.form})`}
															</div>
														)}
														{item.frequency && (
															<div className="break-words">
																<span className="font-medium">Frecuencia: </span>
																{item.frequency}
																{item.duration && ` por ${item.duration}`}
															</div>
														)}
													</div>
													{item.instructions && (
														<div className="mt-2 text-[10px] sm:text-xs md:text-sm text-gray-700 break-words">
															<span className="font-medium">Instrucciones: </span>
															{item.instructions}
														</div>
													)}
												</div>
											))}
										</div>
									</div>
								)}

								{prescription.notes && (
									<div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
										<p className="font-semibold text-gray-900 mb-1 text-xs sm:text-sm md:text-base">Notas</p>
										<p className="text-[10px] sm:text-xs md:text-sm text-gray-700 bg-gray-50 rounded-lg p-2 sm:p-2.5 md:p-3 break-words leading-relaxed">
											{prescription.notes}
										</p>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
