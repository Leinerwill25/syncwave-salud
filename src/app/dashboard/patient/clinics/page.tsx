'use client';

import { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, Mail, Globe, Search, Calendar, Stethoscope } from 'lucide-react';
import Link from 'next/link';

type Clinic = {
	id: string;
	legal_name: string;
	trade_name: string | null;
	address_operational: string | null;
	phone_mobile: string | null;
	phone_fixed: string | null;
	contact_email: string | null;
	specialties: any[];
	opening_hours: any[];
	website: string | null;
	organization: {
		id: string;
		name: string;
		type: string;
	} | null;
};

export default function ClinicsPage() {
	const [loading, setLoading] = useState(true);
	const [clinics, setClinics] = useState<Clinic[]>([]);
	const [search, setSearch] = useState('');
	const [specialty, setSpecialty] = useState('');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);

	useEffect(() => {
		loadClinics();
	}, [page, search, specialty]);

	const loadClinics = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams({
				page: page.toString(),
				per_page: '20',
			});
			if (search) params.set('search', search);
			if (specialty) params.set('specialty', specialty);

			const res = await fetch(`/api/patient/clinics?${params.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar clínicas');

			const data = await res.json();
			setClinics(data.data || []);
			setTotal(data.meta?.total || 0);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
						<Building2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-indigo-600 flex-shrink-0" />
						<span>Clínicas</span>
					</h1>
					<p className="text-xs sm:text-sm md:text-base text-gray-600">Encuentra la clínica perfecta para tus necesidades</p>
				</div>

				{/* Filtros */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
							<input
								type="text"
								placeholder="Buscar clínicas..."
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
								className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
							/>
						</div>
						<input
							type="text"
							placeholder="Filtrar por especialidad..."
							value={specialty}
							onChange={(e) => {
								setSpecialty(e.target.value);
								setPage(1);
							}}
							className="px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
						/>
					</div>
				</div>

				{/* Lista de clínicas */}
				{loading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-5 md:p-6 animate-pulse">
								<div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4 mb-3 sm:mb-4"></div>
								<div className="h-3 sm:h-4 bg-gray-200 rounded w-full mb-1.5 sm:mb-2"></div>
								<div className="h-3 sm:h-4 bg-gray-200 rounded w-2/3"></div>
							</div>
						))}
					</div>
				) : clinics.length === 0 ? (
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-10 md:p-12 text-center">
						<Building2 className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
						<p className="text-gray-600 text-sm sm:text-base md:text-lg">No se encontraron clínicas</p>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
						{clinics.map((clinic) => {
							const specialties = Array.isArray(clinic.specialties)
								? clinic.specialties
								: typeof clinic.specialties === 'string'
									? JSON.parse(clinic.specialties)
									: [];

							return (
								<Link
									key={clinic.id}
									href={`/dashboard/patient/clinics/${clinic.id}`}
									className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-5 md:p-6 hover:shadow-xl transition-shadow group"
								>
									<div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
										<div className="p-2 sm:p-2.5 md:p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors flex-shrink-0">
											<Building2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-indigo-600" />
										</div>
										{specialties.length > 0 && (
											<span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-indigo-50 text-indigo-600 text-[9px] sm:text-[10px] md:text-xs font-semibold rounded flex-shrink-0">
												{specialties.length} especialidades
											</span>
										)}
									</div>
									<h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2 group-hover:text-indigo-600 transition-colors truncate">
										{clinic.trade_name || clinic.legal_name}
									</h3>
									{clinic.address_operational && (
										<div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2">
											<MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
											<span className="line-clamp-1 truncate">{clinic.address_operational}</span>
										</div>
									)}
									{clinic.phone_mobile && (
										<div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2">
											<Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
											<span className="truncate">{clinic.phone_mobile}</span>
										</div>
									)}
									{specialties.length > 0 && (
										<div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
											{specialties.slice(0, 3).map((spec: any, idx: number) => {
												const specName = typeof spec === 'string' ? spec : spec?.name || spec?.specialty || '';
												return (
													<span
														key={idx}
														className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-700 text-[9px] sm:text-[10px] md:text-xs rounded"
													>
														{specName}
													</span>
												);
											})}
											{specialties.length > 3 && (
												<span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-700 text-[9px] sm:text-[10px] md:text-xs rounded">
													+{specialties.length - 3}
												</span>
											)}
										</div>
									)}
									<div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
										<span className="text-indigo-600 font-medium text-xs sm:text-sm group-hover:underline">
											Ver detalles →
										</span>
									</div>
								</Link>
							);
						})}
					</div>
				)}

				{/* Paginación */}
				{total > 20 && (
					<div className="flex items-center justify-center gap-2 flex-wrap">
						<button
							onClick={() => setPage(p => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-xs sm:text-sm"
						>
							Anterior
						</button>
						<span className="px-3 sm:px-4 py-1.5 sm:py-2 text-gray-700 text-xs sm:text-sm">
							Página {page} de {Math.ceil(total / 20)}
						</span>
						<button
							onClick={() => setPage(p => p + 1)}
							disabled={page >= Math.ceil(total / 20)}
							className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-xs sm:text-sm"
						>
							Siguiente
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
