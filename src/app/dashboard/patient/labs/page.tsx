'use client';

import { useState, useEffect } from 'react';
import { FlaskConical, MapPin, Phone, Mail, Search } from 'lucide-react';
import Link from 'next/link';

type Lab = {
	id: string;
	name: string;
	type: string;
	clinic_profile: {
		id: string;
		trade_name: string | null;
		address_operational: string | null;
		phone_mobile: string | null;
		specialties: any[];
	} | null;
};

export default function LabsPage() {
	const [loading, setLoading] = useState(true);
	const [labs, setLabs] = useState<Lab[]>([]);
	const [search, setSearch] = useState('');
	const [examType, setExamType] = useState('');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);

	useEffect(() => {
		loadLabs();
	}, [page, search, examType]);

	const loadLabs = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams({
				page: page.toString(),
				per_page: '20',
			});
			if (search) params.set('search', search);
			if (examType) params.set('exam_type', examType);

			const res = await fetch(`/api/patient/labs?${params.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar laboratorios');

			const data = await res.json();
			setLabs(data.data || []);
			setTotal(data.meta?.total || 0);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
						<FlaskConical className="w-8 h-8 text-yellow-600" />
						Laboratorios
					</h1>
					<p className="text-gray-600">Encuentra laboratorios para tus exámenes médicos</p>
				</div>

				{/* Filtros */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
							<input
								type="text"
								placeholder="Buscar laboratorios..."
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
								className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
							/>
						</div>
						<input
							type="text"
							placeholder="Tipo de examen..."
							value={examType}
							onChange={(e) => {
								setExamType(e.target.value);
								setPage(1);
							}}
							className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
						/>
					</div>
				</div>

				{/* Lista de laboratorios */}
				{loading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
								<div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
								<div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
								<div className="h-4 bg-gray-200 rounded w-2/3"></div>
							</div>
						))}
					</div>
				) : labs.length === 0 ? (
					<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
						<FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-600 text-lg">No se encontraron laboratorios</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{labs.map((lab) => {
							const specialties = Array.isArray(lab.clinic_profile?.specialties)
								? lab.clinic_profile.specialties
								: typeof lab.clinic_profile?.specialties === 'string'
									? JSON.parse(lab.clinic_profile.specialties)
									: [];

							return (
								<Link
									key={lab.id}
									href={`/dashboard/patient/labs/${lab.id}`}
									className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
								>
									<div className="flex items-start justify-between mb-4">
										<div className="p-3 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
											<FlaskConical className="w-6 h-6 text-yellow-600" />
										</div>
										{specialties.length > 0 && (
											<span className="px-2 py-1 bg-yellow-50 text-yellow-600 text-xs font-semibold rounded">
												{specialties.length} exámenes
											</span>
										)}
									</div>
									<h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-yellow-600 transition-colors">
										{lab.clinic_profile?.trade_name || lab.name}
									</h3>
									{lab.clinic_profile?.address_operational && (
										<div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
											<MapPin className="w-4 h-4" />
											<span className="line-clamp-1">{lab.clinic_profile.address_operational}</span>
										</div>
									)}
									{lab.clinic_profile?.phone_mobile && (
										<div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
											<Phone className="w-4 h-4" />
											<span>{lab.clinic_profile.phone_mobile}</span>
										</div>
									)}
									{specialties.length > 0 && (
										<div className="mt-4 flex flex-wrap gap-2">
											{specialties.slice(0, 3).map((spec: any, idx: number) => {
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
											{specialties.length > 3 && (
												<span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
													+{specialties.length - 3}
												</span>
											)}
										</div>
									)}
									<div className="mt-4 pt-4 border-t border-gray-200">
										<span className="text-yellow-600 font-medium text-sm group-hover:underline">
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
					<div className="flex items-center justify-center gap-2">
						<button
							onClick={() => setPage(p => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
						>
							Anterior
						</button>
						<span className="px-4 py-2 text-gray-700">
							Página {page} de {Math.ceil(total / 20)}
						</span>
						<button
							onClick={() => setPage(p => p + 1)}
							disabled={page >= Math.ceil(total / 20)}
							className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
						>
							Siguiente
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
