'use client';

import { useState, useEffect } from 'react';
import { FlaskConical, AlertTriangle, Download, Calendar, User, FileText } from 'lucide-react';

type LabResult = {
	id: string;
	result_type: string | null;
	result: any;
	attachments: string[];
	is_critical: boolean;
	reported_at: string;
	consultation: {
		id: string;
		diagnosis: string | null;
		doctor: {
			name: string | null;
		} | null;
	} | null;
};

export default function ResultadosPage() {
	const [loading, setLoading] = useState(true);
	const [results, setResults] = useState<LabResult[]>([]);

	useEffect(() => {
		loadResults();
	}, []);

	const loadResults = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/resultados', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar resultados');

			const data = await res.json();
			setResults(data.data || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const criticalResults = results.filter(r => r.is_critical);
	const normalResults = results.filter(r => !r.is_critical);

	return (
		<div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-2xl shadow-lg p-6">
					<h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
						<FlaskConical className="w-8 h-8 text-yellow-600" />
						Resultados de Laboratorio
					</h1>
					<p className="text-gray-600">Consulta tus resultados de exámenes médicos</p>
				</div>

				{/* Alertas críticas */}
				{criticalResults.length > 0 && (
					<div className="bg-red-50 border-2 border-red-200 rounded-2xl shadow-lg p-6">
						<div className="flex items-center gap-3 mb-4">
							<AlertTriangle className="w-6 h-6 text-red-600" />
							<h2 className="text-xl font-semibold text-red-900">Resultados Críticos ({criticalResults.length})</h2>
						</div>
						<p className="text-red-800 mb-4">
							Tienes resultados que requieren atención inmediata. Por favor, contacta a tu médico.
						</p>
					</div>
				)}

				{/* Resultados */}
				{loading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
								<div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
								<div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : results.length === 0 ? (
					<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
						<FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-600 text-lg">No hay resultados de laboratorio</p>
					</div>
				) : (
					<div className="space-y-4">
						{/* Resultados críticos primero */}
						{criticalResults.map((result) => (
							<div
								key={result.id}
								className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-300"
							>
								<div className="flex items-start justify-between mb-4">
									<div className="flex items-center gap-3">
										<div className="p-3 bg-red-100 rounded-lg">
											<AlertTriangle className="w-6 h-6 text-red-600" />
										</div>
										<div>
											<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
												{result.result_type || 'Resultado de Laboratorio'}
												<span className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
													CRÍTICO
												</span>
											</h3>
											<p className="text-gray-600 flex items-center gap-2 mt-1">
												<Calendar className="w-4 h-4" />
												{new Date(result.reported_at).toLocaleDateString('es-ES', {
													year: 'numeric',
													month: 'long',
													day: 'numeric',
												})}
											</p>
										</div>
									</div>
									{result.consultation?.doctor && (
										<p className="text-gray-600 flex items-center gap-2 mb-4">
											<User className="w-4 h-4" />
											Dr. {result.consultation.doctor.name || 'Médico'}
										</p>
									)}
									{result.result && (
										<div className="mb-4">
											<p className="font-semibold text-gray-900 mb-2">Resultados</p>
											<div className="bg-red-50 rounded-lg p-4">
												<pre className="text-sm text-gray-800 whitespace-pre-wrap">
													{typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
												</pre>
											</div>
										</div>
									)}
									{result.attachments && result.attachments.length > 0 && (
										<div className="flex flex-wrap gap-2">
											{result.attachments.map((attachment, idx) => (
												<a
													key={idx}
													href={attachment}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
												>
													<Download className="w-4 h-4" />
													<span className="text-sm font-medium">Descargar PDF {idx + 1}</span>
												</a>
											))}
										</div>
									)}
								</div>
							</div>
						))}

						{/* Resultados normales */}
						{normalResults.map((result) => (
							<div key={result.id} className="bg-white rounded-xl shadow-lg p-6">
								<div className="flex items-start justify-between mb-4">
									<div className="flex items-center gap-3">
										<div className="p-3 bg-yellow-100 rounded-lg">
											<FlaskConical className="w-6 h-6 text-yellow-600" />
										</div>
										<div>
											<h3 className="text-lg font-semibold text-gray-900">
												{result.result_type || 'Resultado de Laboratorio'}
											</h3>
											<p className="text-gray-600 flex items-center gap-2 mt-1">
												<Calendar className="w-4 h-4" />
												{new Date(result.reported_at).toLocaleDateString('es-ES', {
													year: 'numeric',
													month: 'long',
													day: 'numeric',
												})}
											</p>
										</div>
									</div>
									{result.consultation?.doctor && (
										<p className="text-gray-600 flex items-center gap-2 mb-4">
											<User className="w-4 h-4" />
											Dr. {result.consultation.doctor.name || 'Médico'}
										</p>
									)}
									{result.result && (
										<div className="mb-4">
											<p className="font-semibold text-gray-900 mb-2">Resultados</p>
											<div className="bg-gray-50 rounded-lg p-4">
												<pre className="text-sm text-gray-800 whitespace-pre-wrap">
													{typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
												</pre>
											</div>
										</div>
									)}
									{result.attachments && result.attachments.length > 0 && (
										<div className="flex flex-wrap gap-2">
											{result.attachments.map((attachment, idx) => (
												<a
													key={idx}
													href={attachment}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
												>
													<Download className="w-4 h-4" />
													<span className="text-sm font-medium">Descargar PDF {idx + 1}</span>
												</a>
											))}
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
