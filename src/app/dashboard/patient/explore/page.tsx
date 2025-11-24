'use client';

import { useState, useEffect } from 'react';
import { Search, Building2, ShoppingBag, FlaskConical, Stethoscope, MapPin, Phone, Clock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PRIVATE_SPECIALTIES } from '@/lib/constants/specialties';

type ExploreResult = {
	type: 'CLINICA' | 'FARMACIA' | 'LABORATORIO' | 'CONSULTORIO_PRIVADO';
	id: string;
	clinicProfileId?: string | null;
	name: string;
	address?: string | null;
	phone?: string | null;
	specialties?: any[];
	services?: any[];
	specialty?: string;
	organization?: {
		id: string;
		name: string;
		type: string;
	} | null;
	doctor?: {
		id: string;
		name: string | null;
		email: string | null;
	} | null;
};

export default function ExplorePage() {
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [results, setResults] = useState<ExploreResult[]>([]);
	const [filters, setFilters] = useState({
		query: searchParams.get('query') || '',
		type: searchParams.get('type') || 'CONSULTORIO_PRIVADO', // Por defecto solo consultorios privados
		specialty: searchParams.get('specialty') || '',
	});

	useEffect(() => {
		loadResults();
	}, [filters]);

	const loadResults = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (filters.query) params.set('query', filters.query);
			// Solo buscar consultorios privados
			params.set('type', 'CONSULTORIO_PRIVADO');
			if (filters.specialty) params.set('specialty', filters.specialty);

			const res = await fetch(`/api/patient/explore?${params.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al buscar');

			const data = await res.json();
			setResults(data.data || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const getIcon = (type: string) => {
		switch (type) {
			case 'CLINICA':
				return <Building2 className="w-6 h-6 text-indigo-600" />;
			case 'FARMACIA':
				return <ShoppingBag className="w-6 h-6 text-green-600" />;
			case 'LABORATORIO':
				return <FlaskConical className="w-6 h-6 text-yellow-600" />;
			case 'CONSULTORIO_PRIVADO':
				return <Stethoscope className="w-6 h-6 text-purple-600" />;
			default:
				return <Building2 className="w-6 h-6 text-gray-600" />;
		}
	};

	const getColor = (type: string) => {
		switch (type) {
			case 'CLINICA':
				return 'indigo';
			case 'FARMACIA':
				return 'green';
			case 'LABORATORIO':
				return 'yellow';
			case 'CONSULTORIO_PRIVADO':
				return 'purple';
			default:
				return 'gray';
		}
	};

	const getLink = (result: ExploreResult) => {
		switch (result.type) {
			case 'CLINICA':
				return `/dashboard/patient/clinics/${result.id}`;
			case 'FARMACIA':
				return `/dashboard/patient/pharmacies/${result.id}`;
			case 'LABORATORIO':
				return `/dashboard/patient/labs/${result.id}`;
			case 'CONSULTORIO_PRIVADO':
				return `/dashboard/patient/clinics/${result.id}`; // TODO: crear página de consultorio privado
			default:
				return '#';
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
						<Search className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-indigo-600 flex-shrink-0" />
						<span className="truncate">Buscar Consultorios Privados</span>
					</h1>
					<p className="text-xs sm:text-sm md:text-base text-gray-600">Encuentra especialistas y consultorios privados según tu necesidad</p>
				</div>

				{/* Filtros */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<div className="space-y-3 sm:space-y-4">
						{/* Búsqueda y tipo */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
								<input
									type="text"
									placeholder="Buscar por nombre del especialista o consultorio..."
									value={filters.query}
									onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
									className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
								/>
							</div>
							<div className="relative">
								<select
									value={filters.type}
									onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
									className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none text-sm sm:text-base"
								>
									<option value="CONSULTORIO_PRIVADO">Consultorio Privado</option>
									<option value="CLINICA" disabled>Clínica - Próximamente</option>
									<option value="FARMACIA" disabled>Farmacia - Próximamente</option>
									<option value="LABORATORIO" disabled>Laboratorio - Próximamente</option>
								</select>
								<style jsx>{`
									select option:disabled {
										text-decoration: line-through;
										color: #9CA3AF;
										opacity: 0.6;
									}
								`}</style>
							</div>
						</div>
						
						{/* Filtro de especialidad */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
							<div>
								<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
									Filtrar por Especialidad
								</label>
								<select
									value={filters.specialty}
									onChange={(e) => setFilters(prev => ({ ...prev, specialty: e.target.value }))}
									className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-sm sm:text-base"
								>
									<option value="">Todas las especialidades</option>
									{PRIVATE_SPECIALTIES.map((specialty) => (
										<option key={specialty} value={specialty}>
											{specialty}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>
				</div>

				{/* Resultados */}
				{loading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-5 md:p-6 animate-pulse">
								<div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4 mb-3 sm:mb-4"></div>
								<div className="h-3 sm:h-4 bg-gray-200 rounded w-full mb-1.5 sm:mb-2"></div>
							</div>
						))}
					</div>
				) : results.length === 0 ? (
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-10 md:p-12 text-center">
						<Search className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
						<p className="text-gray-600 text-sm sm:text-base md:text-lg">No se encontraron resultados</p>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
						{results.map((result) => {
							// Para consultorios privados, usar el organization.id como identificador
							const consultorioId = result.type === 'CONSULTORIO_PRIVADO' && result.organization?.id 
								? result.organization.id 
								: result.id;
							
							// Obtener especialidad única (evitar duplicados)
							// Priorizar result.specialty sobre result.specialties
							const displaySpecialty = result.specialty || (result.specialties && result.specialties.length > 0 
								? (typeof result.specialties[0] === 'string' ? result.specialties[0] : result.specialties[0]?.name || result.specialties[0]?.specialty || null)
								: null);
							
							return (
								<Link
									key={`${result.type}-${consultorioId}`}
									href={result.type === 'CONSULTORIO_PRIVADO' 
										? `/dashboard/patient/consultorio/${consultorioId}` 
										: getLink(result)}
									className="group bg-gradient-to-br from-white to-purple-50/30 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-purple-100 hover:border-purple-300 overflow-hidden"
								>
									{/* Header con icono y badge */}
									<div className="relative bg-gradient-to-r from-purple-500 to-indigo-600 p-4 sm:p-5 md:p-6">
										<div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
											<div className="p-2 sm:p-2.5 md:p-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
												<Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
											</div>
											<span className="px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 bg-white/90 backdrop-blur-sm text-purple-700 text-[9px] sm:text-[10px] md:text-xs font-bold rounded-full shadow-md flex-shrink-0">
												Consultorio Privado
											</span>
										</div>
										<h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-1 line-clamp-2 leading-tight">
											{result.name}
										</h3>
										{result.doctor?.name && (
											<p className="text-purple-100 text-xs sm:text-sm font-medium mt-0.5 sm:mt-1 truncate">
												Dr. {result.doctor.name}
											</p>
										)}
									</div>

									{/* Contenido */}
									<div className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
										{/* Especialidad destacada - Solo mostrar una vez */}
										{displaySpecialty && (
											<div className="flex items-center gap-1.5 sm:gap-2">
												<div className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg border-2 border-purple-200 shadow-sm">
													<span className="text-xs sm:text-sm font-bold text-purple-700 flex items-center gap-1.5 sm:gap-2">
														<Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
														<span className="truncate">{displaySpecialty}</span>
													</span>
												</div>
											</div>
										)}

										{/* Información de contacto */}
										<div className="space-y-2 sm:space-y-2.5">
											{result.address && (
												<div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-slate-700">
													<MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0 mt-0.5" />
													<span className="line-clamp-2 leading-relaxed break-words">{result.address}</span>
												</div>
											)}
											{result.phone && (
												<div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-700">
													<Phone className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
													<span className="truncate">{result.phone}</span>
												</div>
											)}
										</div>

										{/* Servicios disponibles (si existen) */}
										{result.services && Array.isArray(result.services) && result.services.length > 0 && (
											<div className="pt-2 sm:pt-3 border-t border-purple-100">
												<p className="text-[10px] sm:text-xs font-semibold text-slate-600 mb-1.5 sm:mb-2 uppercase tracking-wide">
													Servicios Disponibles
												</p>
												<div className="flex flex-wrap gap-1.5 sm:gap-2">
													{result.services.slice(0, 3).map((service: any, idx: number) => {
														const serviceName = typeof service === 'string' 
															? service 
															: service?.name || '';
														if (!serviceName) return null;
														return (
															<span
																key={idx}
																className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-white border border-purple-200 text-purple-700 text-[9px] sm:text-[10px] md:text-xs font-medium rounded-lg shadow-sm"
															>
																{serviceName}
															</span>
														);
													})}
													{result.services.length > 3 && (
														<span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-purple-50 text-purple-600 text-[9px] sm:text-[10px] md:text-xs font-medium rounded-lg border border-purple-200">
															+{result.services.length - 3} más
														</span>
													)}
												</div>
											</div>
										)}

										{/* Botón de acción */}
										<div className="pt-3 sm:pt-4 border-t border-purple-100">
											<div className="flex items-center justify-between">
												<span className="text-purple-600 font-semibold text-xs sm:text-sm group-hover:text-purple-700 transition-colors">
													Ver detalles
												</span>
												<span className="text-purple-600 group-hover:translate-x-1 transition-transform text-base sm:text-lg">
													→
												</span>
											</div>
										</div>
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
