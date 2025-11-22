// app/dashboard/medic/ordenes/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, AlertCircle, CheckCircle, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Order {
	id: string;
	patient_id: string;
	consultation_id?: string;
	result_type: string;
	status: 'pending' | 'processing' | 'completed';
	attachments: string[];
	is_critical: boolean;
	reported_at?: string;
	created_at: string;
	result?: unknown;
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

export default function OrderDetailPage() {
	const params = useParams();
	const router = useRouter();
	const orderId = params.id as string;
	const [order, setOrder] = useState<Order | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (orderId) {
			fetchOrder();
		}
	}, [orderId]);

	const fetchOrder = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/medic/orders/${orderId}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404) {
					router.push('/dashboard/medic/ordenes');
					return;
				}
				throw new Error('Error al cargar orden');
			}

			const data = await res.json();
			setOrder(data.order);
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

	if (!order) {
		return (
			<div className="space-y-6">
				<div className="bg-white rounded-2xl border border-blue-100 p-12 text-center">
					<AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
					<p className="text-slate-600 text-lg">Orden no encontrada</p>
					<Link href="/dashboard/medic/ordenes">
						<Button className="mt-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
							Volver a órdenes
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	const getStatusIcon = () => {
		switch (order.status) {
			case 'completed':
				return <CheckCircle className="w-6 h-6 text-green-600" />;
			case 'processing':
				return <Clock className="w-6 h-6 text-yellow-600" />;
			default:
				return <AlertCircle className="w-6 h-6 text-blue-600" />;
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/medic/ordenes">
					<Button variant="ghost" className="text-slate-600">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Volver
					</Button>
				</Link>
				<div>
					<h1 className="text-3xl font-bold text-slate-900">Detalle de Orden Médica</h1>
					<p className="text-slate-600 mt-1">ID: {order.id.slice(0, 8)}...</p>
				</div>
			</div>

			{/* Estado */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				className="bg-white rounded-2xl border border-blue-100 p-6"
			>
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						{getStatusIcon()}
						<div>
							<h2 className="text-lg font-semibold text-slate-900">
								Estado: {order.status === 'pending' ? 'Pendiente' : order.status === 'processing' ? 'En Proceso' : 'Completada'}
							</h2>
							<p className="text-sm text-slate-600">
								Creada el {new Date(order.created_at).toLocaleDateString('es-ES', { dateStyle: 'long' })}
							</p>
						</div>
					</div>
					{order.is_critical && (
						<span className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
							Resultado Crítico
						</span>
					)}
				</div>
			</motion.div>

			{/* Información del Paciente */}
			{order.Patient && (
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
								{order.Patient.firstName} {order.Patient.lastName}
							</p>
						</div>
						{order.Patient.identifier && (
							<div>
								<p className="text-sm text-slate-600">Identificador</p>
								<p className="font-medium text-slate-900">{order.Patient.identifier}</p>
							</div>
						)}
						{order.Patient.dob && (
							<div>
								<p className="text-sm text-slate-600">Fecha de Nacimiento</p>
								<p className="font-medium text-slate-900">
									{new Date(order.Patient.dob).toLocaleDateString('es-ES')}
								</p>
							</div>
						)}
						{order.Patient.gender && (
							<div>
								<p className="text-sm text-slate-600">Género</p>
								<p className="font-medium text-slate-900">{order.Patient.gender}</p>
							</div>
						)}
						{order.Patient.phone && (
							<div>
								<p className="text-sm text-slate-600">Teléfono</p>
								<p className="font-medium text-slate-900">{order.Patient.phone}</p>
							</div>
						)}
					</div>
				</motion.div>
			)}

			{/* Detalles de la Orden */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="bg-white rounded-2xl border border-blue-100 p-6"
			>
				<h2 className="text-lg font-semibold text-slate-900 mb-4">Detalles de la Orden</h2>
				<div className="space-y-4">
					<div>
						<p className="text-sm text-slate-600">Tipo de Examen</p>
						<p className="font-medium text-slate-900">{order.result_type}</p>
					</div>
					{order.consultation && (
						<div>
							<p className="text-sm text-slate-600">Consulta Asociada</p>
							{order.consultation.chief_complaint && (
								<p className="text-slate-900">
									<strong>Motivo:</strong> {order.consultation.chief_complaint}
								</p>
							)}
							{order.consultation.diagnosis && (
								<p className="text-slate-900">
									<strong>Diagnóstico:</strong> {order.consultation.diagnosis}
								</p>
							)}
						</div>
					)}
					{order.reported_at && (
						<div>
							<p className="text-sm text-slate-600">Fecha de Reporte</p>
							<p className="font-medium text-slate-900">
								{new Date(order.reported_at).toLocaleDateString('es-ES', { dateStyle: 'long' })}
							</p>
						</div>
					)}
				</div>
			</motion.div>

			{/* Resultados */}
			{order.status === 'completed' && order.result && (() => {
				// Verificar si el result contiene información del paciente no registrado
				let resultData: any = null;
				try {
					resultData = typeof order.result === 'string' ? JSON.parse(order.result) : order.result;
				} catch {
					resultData = order.result;
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
							<pre className="bg-blue-50 p-4 rounded-xl text-sm text-slate-900 overflow-auto">
								{typeof order.result === 'string' ? order.result : JSON.stringify(order.result, null, 2)}
							</pre>
						)}
					</motion.div>
				);
			})()}

			{/* Archivos Adjuntos */}
			{order.attachments && order.attachments.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="bg-white rounded-2xl border border-blue-100 p-6"
				>
					<h2 className="text-lg font-semibold text-slate-900 mb-4">Archivos Adjuntos</h2>
					<div className="space-y-2">
						{order.attachments.map((attachment, idx) => (
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

