'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Folder, Loader2, Calendar, User, Search, AlertTriangle } from 'lucide-react';

interface LabResult {
	id: string;
	patient_id: string;
	result_type: string;
	reported_at: string;
	created_at: string;
	is_critical: boolean;
	Patient?: {
		firstName: string;
		lastName: string;
		identifier?: string;
	};
}

export default function RoleUserLabResultsPage() {
	const [results, setResults] = useState<LabResult[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');

	useEffect(() => {
		fetchResults();
	}, []);

	const fetchResults = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/medic/labs', {
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

	const formatDate = (iso: string) => {
		try {
			const d = new Date(iso);
			return d.toLocaleDateString('es-ES', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return iso;
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

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
					<p className="text-slate-600">Cargando resultados...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full">
			{/* Header */}
			<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
				<h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Resultados</h1>
				<p className="text-sm sm:text-base text-slate-600 mt-1">Registro administrativo de resultados de laboratorio</p>
			</motion.div>

			{/* Search Bar */}
			<div className="mb-6">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
					<input
						type="text"
						placeholder="Buscar por paciente o tipo de examen..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
					/>
				</div>
			</div>

			{/* Results List */}
			{filteredResults.length === 0 ? (
				<div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
					<Folder className="w-16 h-16 text-slate-400 mx-auto mb-4" />
					<p className="text-slate-600">{searchTerm ? 'No se encontraron resultados' : 'No hay resultados registrados'}</p>
				</div>
			) : (
				<div className="space-y-4">
					{filteredResults.map((result, index) => (
						<motion.div
							key={result.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.05 }}
							className="bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow"
						>
							<div className="flex items-start justify-between">
								<div className="flex items-start gap-4 flex-1">
									<div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
										<Folder className="w-6 h-6" />
									</div>
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<h3 className="text-lg font-semibold text-slate-900">
												{result.Patient?.firstName} {result.Patient?.lastName}
											</h3>
											{result.is_critical && (
												<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
													<AlertTriangle className="w-3 h-3" />
													Crítico
												</span>
											)}
										</div>
										<div className="flex flex-wrap gap-4 text-sm text-slate-600">
											{result.Patient?.identifier && <span className="flex items-center gap-1">C.I.: {result.Patient.identifier}</span>}
											<span className="flex items-center gap-1">
												<Calendar className="w-4 h-4" />
												Reportado: {formatDate(result.reported_at || result.created_at)}
											</span>
											<span className="font-medium text-slate-700">Tipo: {result.result_type || 'N/A'}</span>
										</div>
									</div>
								</div>
							</div>
							<div className="mt-4 pt-4 border-t border-slate-200">
								<p className="text-xs text-slate-500 italic">
									Nota: Los resultados médicos detallados de este examen solo son visibles para el médico especialista.
								</p>
							</div>
						</motion.div>
					))}
				</div>
			)}
		</div>
	);
}
