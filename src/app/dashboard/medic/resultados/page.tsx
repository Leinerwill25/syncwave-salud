// app/dashboard/medic/resultados/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface LabResult {
	id: string;
	patient_id: string;
	consultation_id?: string;
	result_type: string;
	result: unknown;
	attachments: string[];
	is_critical: boolean;
	reported_at: string;
	created_at: string;
	Patient?: {
		firstName: string;
		lastName: string;
		identifier?: string;
	};
}

export default function LabResultsPage() {
	const [results, setResults] = useState<LabResult[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<'all' | 'critical'>('all');
	const [searchTerm, setSearchTerm] = useState('');

	useEffect(() => {
		fetchResults();
	}, [filter]);

	const fetchResults = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (filter === 'critical') {
				params.append('isCritical', 'true');
			}

			const res = await fetch(`/api/medic/labs?${params.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar resultados');

			const data = await res.json();
			setResults(data.results || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const filteredResults = results.filter((result) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			result.Patient?.firstName?.toLowerCase().includes(search) ||
			result.Patient?.lastName?.toLowerCase().includes(search) ||
			result.result_type?.toLowerCase().includes(search) ||
			result.Patient?.identifier?.toLowerCase().includes(search)
		);
	});

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">Resultados de Laboratorio</h1>
					<p className="text-slate-600 mt-1">Gestiona y revisa resultados de exámenes</p>
				</div>
			</div>

			{/* Filtros */}
			<div className="bg-white rounded-2xl border border-blue-100 p-4 space-y-4">
				<div className="flex flex-col sm:flex-row gap-4">
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
						<input
							type="text"
							placeholder="Buscar por paciente o tipo de examen..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
						/>
					</div>
					<div className="flex gap-2">
						<button
							onClick={() => setFilter('all')}
							className={`px-4 py-2 rounded-xl font-medium transition ${
								filter === 'all'
									? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
									: 'bg-white border border-blue-200 text-slate-700 hover:bg-blue-50'
							}`}
						>
							Todos
						</button>
						<button
							onClick={() => setFilter('critical')}
							className={`px-4 py-2 rounded-xl font-medium transition ${
								filter === 'critical'
									? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
									: 'bg-white border border-blue-200 text-slate-700 hover:bg-blue-50'
							}`}
						>
							Críticos
						</button>
					</div>
				</div>
			</div>

			{/* Lista de resultados */}
			{loading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{[...Array(6)].map((_, i) => (
						<div key={i} className="bg-white rounded-2xl border border-blue-100 p-6 animate-pulse">
							<div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
							<div className="h-4 bg-slate-200 rounded w-1/2"></div>
						</div>
					))}
				</div>
			) : filteredResults.length === 0 ? (
				<div className="bg-white rounded-2xl border border-blue-100 p-12 text-center">
					<FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
					<p className="text-slate-600 text-lg">No hay resultados de laboratorio</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredResults.map((result) => (
						<Link key={result.id} href={`/dashboard/medic/resultados/${result.id}`}>
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								className={`bg-white rounded-2xl border p-6 hover:shadow-lg transition cursor-pointer ${
									result.is_critical ? 'border-red-300 bg-red-50/30' : 'border-blue-100'
								}`}
							>
								<div className="flex items-start justify-between mb-4">
									<div className="flex items-center gap-2">
										{result.is_critical ? (
											<AlertTriangle className="w-5 h-5 text-red-600" />
										) : (
											<CheckCircle className="w-5 h-5 text-green-600" />
										)}
										{result.is_critical && (
											<span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
												Crítico
											</span>
										)}
									</div>
									{result.attachments && result.attachments.length > 0 && (
										<span className="text-xs text-slate-500 flex items-center gap-1">
											<FileText className="w-3 h-3" />
											{result.attachments.length}
										</span>
									)}
								</div>

								<h3 className="font-semibold text-slate-900 mb-2">
									{result.Patient ? `${result.Patient.firstName} ${result.Patient.lastName}` : 'Paciente desconocido'}
								</h3>

								<p className="text-sm text-slate-600 mb-2">
									<strong>Tipo:</strong> {result.result_type}
								</p>

								{result.reported_at && (
									<div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-100">
										<span className="text-xs text-slate-500">
											Reportado: {new Date(result.reported_at).toLocaleDateString('es-ES')}
										</span>
									</div>
								)}
							</motion.div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

