'use client';

import { useState, useEffect } from 'react';
import { Search, Building2, ShoppingBag, FlaskConical, Stethoscope, MapPin, Phone } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type ExploreResult = {
	type: 'CLINICA' | 'FARMACIA' | 'LABORATORIO' | 'CONSULTORIO_PRIVADO';
	id: string;
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
};

export default function ExplorePage() {
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [results, setResults] = useState<ExploreResult[]>([]);
	const [filters, setFilters] = useState({
		query: searchParams.get('query') || '',
		type: searchParams.get('type') || '',
		specialty: searchParams.get('specialty') || '',
		exam: searchParams.get('exam') || '',
		budget_min: searchParams.get('budget_min') || '',
		budget_max: searchParams.get('budget_max') || '',
	});

	useEffect(() => {
		loadResults();
	}, [filters]);

	const loadResults = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (filters.query) params.set('query', filters.query);
			if (filters.type) params.set('type', filters.type);
			if (filters.specialty) params.set('specialty', filters.specialty);
			if (filters.exam) params.set('exam', filters.exam);
			if (filters.budget_min) params.set('budget_min', filters.budget_min);
			if (filters.budget_max) params.set('budget_max', filters.budget_max);

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
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
						<Search className="w-8 h-8 text-indigo-600" />
						Explorador Global
					</h1>
					<p className="text-gray-600">Busca clínicas, farmacias, laboratorios y consultorios</p>
				</div>

				{/* Filtros */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									type="text"
									placeholder="Buscar..."
									value={filters.query}
									onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
									className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
							</div>
							<select
								value={filters.type}
								onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
								className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							>
								<option value="">Todos los tipos</option>
								<option value="CLINICA">Clínica</option>
								<option value="FARMACIA">Farmacia</option>
								<option value="LABORATORIO">Laboratorio</option>
								<option value="CONSULTORIO_PRIVADO">Consultorio Privado</option>
							</select>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							<input
								type="text"
								placeholder="Especialidad"
								value={filters.specialty}
								onChange={(e) => setFilters(prev => ({ ...prev, specialty: e.target.value }))}
								className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
							<input
								type="text"
								placeholder="Tipo de examen"
								value={filters.exam}
								onChange={(e) => setFilters(prev => ({ ...prev, exam: e.target.value }))}
								className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
							<input
								type="number"
								placeholder="Presupuesto mínimo"
								value={filters.budget_min}
								onChange={(e) => setFilters(prev => ({ ...prev, budget_min: e.target.value }))}
								className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
							<input
								type="number"
								placeholder="Presupuesto máximo"
								value={filters.budget_max}
								onChange={(e) => setFilters(prev => ({ ...prev, budget_max: e.target.value }))}
								className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
						</div>
					</div>
				</div>

				{/* Resultados */}
				{loading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
								<div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
								<div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : results.length === 0 ? (
					<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
						<Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-600 text-lg">No se encontraron resultados</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{results.map((result) => {
							const color = getColor(result.type);
							return (
								<Link
									key={`${result.type}-${result.id}`}
									href={getLink(result)}
									className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group border-2 border-transparent hover:border-${color}-300`}
								>
									<div className="flex items-start justify-between mb-4">
										<div className={`p-3 bg-${color}-100 rounded-lg group-hover:bg-${color}-200 transition-colors`}>
											{getIcon(result.type)}
										</div>
										<span className={`px-2 py-1 bg-${color}-50 text-${color}-600 text-xs font-semibold rounded`}>
											{result.type.replace('_', ' ')}
										</span>
									</div>
									<h3 className={`text-lg font-semibold text-gray-900 mb-2 group-hover:text-${color}-600 transition-colors`}>
										{result.name}
									</h3>
									{result.address && (
										<div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
											<MapPin className="w-4 h-4" />
											<span className="line-clamp-1">{result.address}</span>
										</div>
									)}
									{result.phone && (
										<div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
											<Phone className="w-4 h-4" />
											<span>{result.phone}</span>
										</div>
									)}
									{result.specialty && (
										<div className="mt-2">
											<span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
												{result.specialty}
											</span>
										</div>
									)}
									{result.specialties && result.specialties.length > 0 && (
										<div className="mt-2 flex flex-wrap gap-2">
											{result.specialties.slice(0, 2).map((spec: any, idx: number) => {
												const specName = typeof spec === 'string' ? spec : spec?.name || spec?.specialty || '';
												return (
													<span
														key={idx}
														className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
													>
														{specName}
													</span>
												);
											})}
										</div>
									)}
									<div className="mt-4 pt-4 border-t border-gray-200">
										<span className={`text-${color}-600 font-medium text-sm group-hover:underline`}>
											Ver detalles →
										</span>
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
