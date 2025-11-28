'use client';

import { useState, useEffect } from 'react';
import { Stethoscope, MapPin, Phone, Search, Calendar, Star, CheckCircle2, Shield, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { PRIVATE_SPECIALTIES } from '@/lib/constants/specialties';

type Consultorio = {
	id: string;
	name: string;
	address?: string | null;
	phone?: string | null;
	email?: string | null;
	specialty?: string | null;
	photo?: string | null;
	has_cashea?: boolean;
	organization: {
		id: string;
		name: string;
		type: string;
	} | null;
	doctor?: {
		name: string | null;
	} | null;
};

export default function ConsultoriosPage() {
	const [loading, setLoading] = useState(true);
	const [consultorios, setConsultorios] = useState<Consultorio[]>([]);
	const [search, setSearch] = useState('');
	const [specialty, setSpecialty] = useState('');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);

	useEffect(() => {
		loadConsultorios();
	}, [page, search, specialty]);

	const loadConsultorios = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams({
				type: 'CONSULTORIO_PRIVADO',
				page: page.toString(),
				per_page: '20',
			});
			if (search) params.set('query', search);
			if (specialty) params.set('specialty', specialty);

			const res = await fetch(`/api/patient/explore?${params.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar consultorios');

			const data = await res.json();
			const rawConsultorios = data.data || [];
			
			// Deduplicar consultorios usando organization_id como clave única
			const consultoriosMap = new Map<string, Consultorio>();
			
			rawConsultorios.forEach((consultorio: Consultorio) => {
				const orgId = consultorio.organization?.id || consultorio.id;
				
				// Si este organization_id ya existe en el mapa, omitirlo (duplicado)
				if (consultoriosMap.has(orgId)) {
					console.log(`[Consultorios] Consultorio duplicado detectado y omitido: ${orgId} - ${consultorio.name}`);
					return;
				}
				
				consultoriosMap.set(orgId, consultorio);
			});
			
			const uniqueConsultorios = Array.from(consultoriosMap.values());
			setConsultorios(uniqueConsultorios);
			setTotal(uniqueConsultorios.length); // Actualizar total con los únicos
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const consultorioId = (consultorio: Consultorio) => {
		return consultorio.organization?.id || consultorio.id;
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-5 md:p-6 lg:p-8 text-white">
					<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3">
						<Stethoscope className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 flex-shrink-0" />
						<span className="truncate">Consultorios Privados</span>
					</h1>
					<p className="text-purple-100 text-sm sm:text-base md:text-lg">Encuentra especialistas certificados y consultorios verificados</p>
				</div>

				{/* Filtros */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-purple-100">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
							<input
								type="text"
								placeholder="Buscar consultorio o especialista..."
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
								className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm sm:text-base"
							/>
						</div>
						<select
							value={specialty}
							onChange={(e) => {
								setSpecialty(e.target.value);
								setPage(1);
							}}
							className="px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all text-sm sm:text-base"
						>
							<option value="">Todas las especialidades</option>
							{PRIVATE_SPECIALTIES.map((spec) => (
								<option key={spec} value={spec}>
									{spec}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Resultados */}
				{loading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 animate-pulse border border-gray-200">
								<div className="h-32 sm:h-40 md:h-48 bg-gray-200 rounded-lg sm:rounded-xl mb-3 sm:mb-4"></div>
								<div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4 mb-3 sm:mb-4"></div>
								<div className="h-3 sm:h-4 bg-gray-200 rounded w-full mb-1.5 sm:mb-2"></div>
							</div>
						))}
					</div>
				) : consultorios.length === 0 ? (
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-10 md:p-12 text-center border border-gray-200">
						<Stethoscope className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
						<p className="text-gray-600 text-sm sm:text-base md:text-lg">No se encontraron consultorios</p>
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
							{consultorios.map((consultorio) => {
								const id = consultorioId(consultorio);
								return (
									<Link
										key={`consultorio-${id}`}
										href={`/dashboard/patient/consultorio/${id}`}
										className="group bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-200 hover:border-purple-300 overflow-hidden"
									>
										{/* Imagen de portada */}
										<div className="relative h-32 sm:h-40 md:h-48 bg-gradient-to-br from-purple-500 to-indigo-600 overflow-hidden">
											{consultorio.photo ? (
												<img 
													src={consultorio.photo} 
													alt={consultorio.name}
													className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<Stethoscope className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-white/80" />
												</div>
											)}
											{/* Badge de verificado */}
											<div className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 bg-white/90 backdrop-blur-sm px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1 sm:gap-1.5 shadow-lg">
												<Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-green-600 flex-shrink-0" />
												<span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-green-700">Verificado</span>
											</div>
										</div>

										{/* Contenido */}
										<div className="p-4 sm:p-5 md:p-6">
											{/* Nombre y especialidad */}
											<div className="mb-3 sm:mb-4">
												<h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
													{consultorio.name}
												</h3>
												{consultorio.doctor?.name && (
													<p className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2 flex items-center gap-1">
														<Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
														<span className="truncate">Dr. {consultorio.doctor.name}</span>
													</p>
												)}
												{consultorio.specialty && (
													<div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
														<span className="text-xs sm:text-sm font-bold text-purple-700 truncate">{consultorio.specialty}</span>
													</div>
												)}
											</div>

											{/* Información de contacto */}
											<div className="space-y-2 sm:space-y-2.5 mb-3 sm:mb-4">
												{consultorio.address && (
													<div className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-gray-700">
														<MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0 mt-0.5" />
														<span className="line-clamp-2 leading-relaxed break-words">{consultorio.address}</span>
													</div>
												)}
												{consultorio.phone && (
													<div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-gray-700">
														<Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
														<span className="truncate">{consultorio.phone}</span>
													</div>
												)}
												{/* Cashea */}
												<div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-gray-700 pt-2 sm:pt-2.5 border-t border-gray-200">
													<div className="flex items-center gap-2">
														<Image 
															src="/descarga.png" 
															alt="Cashea" 
															width={20} 
															height={20} 
															className="flex-shrink-0"
														/>
														{consultorio.has_cashea ? (
															<CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
														) : (
															<X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 flex-shrink-0" />
														)}
													</div>
													<span className="text-gray-600">
														{consultorio.has_cashea ? 'Cuenta con Cashea' : 'No cuenta con Cashea'}
													</span>
												</div>
											</div>

											{/* Footer con CTA */}
											<div className="pt-3 sm:pt-4 border-t border-gray-200 flex items-center justify-between">
												<span className="text-purple-600 font-semibold text-xs sm:text-sm group-hover:text-purple-700 transition-colors">
													Ver detalles
												</span>
												<div className="flex items-center gap-1.5 sm:gap-2 text-purple-600 group-hover:translate-x-1 transition-transform">
													<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
													<span className="text-base sm:text-lg">→</span>
												</div>
											</div>
										</div>
									</Link>
								);
							})}
						</div>

						{/* Paginación */}
						{total > 20 && (
							<div className="flex items-center justify-center gap-2 sm:gap-3 mt-6 sm:mt-7 md:mt-8 flex-wrap">
								<button
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
									className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white border-2 border-gray-300 rounded-lg sm:rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-purple-300 transition-all font-semibold text-xs sm:text-sm md:text-base"
								>
									Anterior
								</button>
								<span className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-purple-50 text-purple-700 rounded-lg sm:rounded-xl font-semibold border-2 border-purple-200 text-xs sm:text-sm md:text-base">
									Página {page} de {Math.ceil(total / 20)}
								</span>
								<button
									onClick={() => setPage((p) => p + 1)}
									disabled={page >= Math.ceil(total / 20)}
									className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white border-2 border-gray-300 rounded-lg sm:rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-purple-300 transition-all font-semibold text-xs sm:text-sm md:text-base"
								>
									Siguiente
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
