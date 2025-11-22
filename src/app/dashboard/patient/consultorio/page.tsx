'use client';

import { useState, useEffect } from 'react';
import { Stethoscope, MapPin, Phone, Search, Calendar, Star, CheckCircle2, Shield } from 'lucide-react';
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
			setConsultorios(data.data || []);
			setTotal(data.meta?.total || 0);
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
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
					<h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
						<Stethoscope className="w-10 h-10" />
						Consultorios Privados
					</h1>
					<p className="text-purple-100 text-lg">Encuentra especialistas certificados y consultorios verificados</p>
				</div>

				{/* Filtros */}
				<div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
							<input
								type="text"
								placeholder="Buscar consultorio o especialista..."
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
								className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
							/>
						</div>
						<select
							value={specialty}
							onChange={(e) => {
								setSpecialty(e.target.value);
								setPage(1);
							}}
							className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all"
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
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse border border-gray-200">
								<div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
								<div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
								<div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : consultorios.length === 0 ? (
					<div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
						<Stethoscope className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-600 text-lg">No se encontraron consultorios</p>
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{consultorios.map((consultorio) => {
								const id = consultorioId(consultorio);
								return (
									<Link
										key={`consultorio-${id}`}
										href={`/dashboard/patient/consultorio/${id}`}
										className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-200 hover:border-purple-300 overflow-hidden"
									>
										{/* Imagen de portada */}
										<div className="relative h-48 bg-gradient-to-br from-purple-500 to-indigo-600 overflow-hidden">
											{consultorio.photo ? (
												<img 
													src={consultorio.photo} 
													alt={consultorio.name}
													className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<Stethoscope className="w-16 h-16 text-white/80" />
												</div>
											)}
											{/* Badge de verificado */}
											<div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
												<Shield className="w-4 h-4 text-green-600" />
												<span className="text-xs font-bold text-green-700">Verificado</span>
											</div>
										</div>

										{/* Contenido */}
										<div className="p-6">
											{/* Nombre y especialidad */}
											<div className="mb-4">
												<h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
													{consultorio.name}
												</h3>
												{consultorio.doctor?.name && (
													<p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
														<Stethoscope className="w-4 h-4 text-purple-600" />
														Dr. {consultorio.doctor.name}
													</p>
												)}
												{consultorio.specialty && (
													<div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
														<span className="text-sm font-bold text-purple-700">{consultorio.specialty}</span>
													</div>
												)}
											</div>

											{/* Información de contacto */}
											<div className="space-y-2.5 mb-4">
												{consultorio.address && (
													<div className="flex items-start gap-2.5 text-sm text-gray-700">
														<MapPin className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
														<span className="line-clamp-2 leading-relaxed">{consultorio.address}</span>
													</div>
												)}
												{consultorio.phone && (
													<div className="flex items-center gap-2.5 text-sm text-gray-700">
														<Phone className="w-4 h-4 text-purple-600 flex-shrink-0" />
														<span>{consultorio.phone}</span>
													</div>
												)}
											</div>

											{/* Footer con CTA */}
											<div className="pt-4 border-t border-gray-200 flex items-center justify-between">
												<span className="text-purple-600 font-semibold text-sm group-hover:text-purple-700 transition-colors">
													Ver detalles
												</span>
												<div className="flex items-center gap-2 text-purple-600 group-hover:translate-x-1 transition-transform">
													<Calendar className="w-4 h-4" />
													<span className="text-lg">→</span>
												</div>
											</div>
										</div>
									</Link>
								);
							})}
						</div>

						{/* Paginación */}
						{total > 20 && (
							<div className="flex items-center justify-center gap-3 mt-8">
								<button
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
									className="px-6 py-3 bg-white border-2 border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-purple-300 transition-all font-semibold"
								>
									Anterior
								</button>
								<span className="px-6 py-3 bg-purple-50 text-purple-700 rounded-xl font-semibold border-2 border-purple-200">
									Página {page} de {Math.ceil(total / 20)}
								</span>
								<button
									onClick={() => setPage((p) => p + 1)}
									disabled={page >= Math.ceil(total / 20)}
									className="px-6 py-3 bg-white border-2 border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-purple-300 transition-all font-semibold"
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
