// app/dashboard/medic/resultados/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
		dob?: string;
		gender?: string;
		phone?: string;
	};
	consultation?: {
		chief_complaint?: string;
		diagnosis?: string;
		notes?: string;
	};
}

export default function LabResultDetailPage() {
	const params = useParams();
	const router = useRouter();
	const resultId = params.id as string;
	const [result, setResult] = useState<LabResult | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (resultId) {
			fetchResult();
		}
	}, [resultId]);

	const fetchResult = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/medic/labs/${resultId}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404 || res.status === 403) {
					router.push('/dashboard/medic/resultados');
					return;
				}
				throw new Error('Error al cargar resultado');
			}

			const data = await res.json();
			setResult(data.result);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse"></div>
				<div className="bg-white rounded-2xl border border-blue-100 p-6 space-y-4">
					<div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
					<div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse"></div>
				</div>
			</div>
		);
	}

	if (!result) {
		return (
			<div className="space-y-6">
				<div className="bg-white rounded-2xl border border-blue-100 p-12 text-center">
					<AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
					<p className="text-slate-600 text-lg">Resultado no encontrado</p>
					<Link href="/dashboard/medic/resultados">
						<Button className="mt-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
							Volver a resultados
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/medic/resultados">
					<Button variant="ghost" className="text-slate-600">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Volver
					</Button>
				</Link>
				<div>
					<h1 className="text-3xl font-bold text-slate-900">Resultado de Laboratorio</h1>
					<p className="text-slate-600 mt-1">ID: {result.id.slice(0, 8)}...</p>
				</div>
			</div>

			{/* Alerta crítica */}
			{result.is_critical && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="bg-red-50 border-2 border-red-300 rounded-2xl p-6"
				>
					<div className="flex items-center gap-3">
						<AlertTriangle className="w-6 h-6 text-red-600" />
						<div>
							<h2 className="text-lg font-semibold text-red-900">Resultado Crítico</h2>
							<p className="text-sm text-red-700">Este resultado requiere atención inmediata</p>
						</div>
					</div>
				</motion.div>
			)}

			{/* Información del Paciente */}
			{result.Patient && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="bg-white rounded-2xl border border-blue-100 p-6"
				>
					<h2 className="text-lg font-semibold text-slate-900 mb-4">Información del Paciente</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p className="text-sm text-slate-600">Nombre</p>
							<p className="font-medium text-slate-900">
								{result.Patient.firstName} {result.Patient.lastName}
							</p>
						</div>
						{result.Patient.identifier && (
							<div>
								<p className="text-sm text-slate-600">Identificador</p>
								<p className="font-medium text-slate-900">{result.Patient.identifier}</p>
							</div>
						)}
						{result.Patient.dob && (
							<div>
								<p className="text-sm text-slate-600">Fecha de Nacimiento</p>
								<p className="font-medium text-slate-900">
									{new Date(result.Patient.dob).toLocaleDateString('es-ES')}
								</p>
							</div>
						)}
						{result.Patient.gender && (
							<div>
								<p className="text-sm text-slate-600">Género</p>
								<p className="font-medium text-slate-900">{result.Patient.gender}</p>
							</div>
						)}
						{result.Patient.phone && (
							<div>
								<p className="text-sm text-slate-600">Teléfono</p>
								<p className="font-medium text-slate-900">{result.Patient.phone}</p>
							</div>
						)}
					</div>
				</motion.div>
			)}

			{/* Detalles del Resultado */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="bg-white rounded-2xl border border-blue-100 p-6"
			>
				<h2 className="text-lg font-semibold text-slate-900 mb-4">Detalles del Resultado</h2>
				<div className="space-y-4">
					<div>
						<p className="text-sm text-slate-600">Tipo de Examen</p>
						<p className="font-medium text-slate-900">{result.result_type}</p>
					</div>
					{result.reported_at && (
						<div>
							<p className="text-sm text-slate-600">Fecha de Reporte</p>
							<p className="font-medium text-slate-900">
								{new Date(result.reported_at).toLocaleDateString('es-ES', { dateStyle: 'long' })}
							</p>
						</div>
					)}
					{result.consultation && (
						<div>
							<p className="text-sm text-slate-600">Consulta Asociada</p>
							{result.consultation.chief_complaint && (
								<p className="text-slate-900">
									<strong>Motivo:</strong> {result.consultation.chief_complaint}
								</p>
							)}
							{result.consultation.diagnosis && (
								<p className="text-slate-900">
									<strong>Diagnóstico:</strong> {result.consultation.diagnosis}
								</p>
							)}
						</div>
					)}
				</div>
			</motion.div>

			{/* Resultados */}
			{result.result && (() => {
				// Verificar si el result contiene información del paciente no registrado
				let resultData: any = null;
				try {
					resultData = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
				} catch {
					resultData = result.result;
				}

				// Si contiene unregistered_patient_id, es información del paciente, no un resultado de laboratorio
				if (resultData && resultData.unregistered_patient_id) {
					// No mostrar como resultado de laboratorio
					return null;
				}

				// Mostrar resultado real de laboratorio
				return (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="bg-white rounded-2xl border border-blue-100 p-6"
					>
						<h2 className="text-lg font-semibold text-slate-900 mb-4">Resultados</h2>
						{typeof resultData === 'object' && resultData !== null ? (
							<div className="bg-blue-50 p-4 rounded-xl space-y-3">
								{Object.entries(resultData).map(([key, value]) => (
									<div key={key} className="border-b border-blue-200 last:border-0 pb-2 last:pb-0">
										<p className="text-sm font-medium text-slate-700 capitalize mb-1">
											{key.replace(/_/g, ' ')}:
										</p>
										<p className="text-slate-900">
											{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
										</p>
									</div>
								))}
							</div>
						) : (
							<pre className="bg-blue-50 p-4 rounded-xl text-sm text-slate-900 overflow-auto max-h-96">
								{typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
							</pre>
						)}
					</motion.div>
				);
			})()}

			{/* Archivos Adjuntos */}
			{result.attachments && result.attachments.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="bg-white rounded-2xl border border-blue-100 p-6"
				>
					<h2 className="text-lg font-semibold text-slate-900 mb-4">Archivos Adjuntos</h2>
					<div className="space-y-2">
						{result.attachments.map((attachment, idx) => (
							<div
								key={idx}
								className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100"
							>
								<div className="flex items-center gap-3">
									<FileText className="w-5 h-5 text-teal-600" />
									<span className="text-slate-900">{attachment}</span>
								</div>
								<Button variant="ghost" size="sm" className="text-teal-600">
									<Download className="w-4 h-4" />
								</Button>
							</div>
						))}
					</div>
				</motion.div>
			)}
		</div>
	);
}

