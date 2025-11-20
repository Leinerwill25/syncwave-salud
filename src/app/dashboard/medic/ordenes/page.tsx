// app/dashboard/medic/ordenes/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Search, Filter, AlertCircle, CheckCircle, Clock } from 'lucide-react';
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
	created_at: string;
	Patient?: {
		firstName: string;
		lastName: string;
		identifier?: string;
	};
}

export default function OrdersPage() {
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'completed'>('all');
	const [searchTerm, setSearchTerm] = useState('');

	useEffect(() => {
		fetchOrders();
	}, [filter]);

	const fetchOrders = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (filter !== 'all') {
				params.append('status', filter);
			}

			const res = await fetch(`/api/medic/orders?${params.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar órdenes');

			const data = await res.json();
			setOrders(data.orders || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const filteredOrders = orders.filter((order) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			order.Patient?.firstName?.toLowerCase().includes(search) ||
			order.Patient?.lastName?.toLowerCase().includes(search) ||
			order.result_type?.toLowerCase().includes(search) ||
			order.Patient?.identifier?.toLowerCase().includes(search)
		);
	});

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'completed':
				return <CheckCircle className="w-5 h-5 text-green-600" />;
			case 'processing':
				return <Clock className="w-5 h-5 text-yellow-600" />;
			default:
				return <AlertCircle className="w-5 h-5 text-blue-600" />;
		}
	};

	const getStatusBadge = (status: string) => {
		const styles = {
			pending: 'bg-blue-100 text-blue-800',
			processing: 'bg-yellow-100 text-yellow-800',
			completed: 'bg-green-100 text-green-800',
		};
		return styles[status as keyof typeof styles] || styles.pending;
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">Órdenes Médicas</h1>
					<p className="text-slate-600 mt-1">Gestiona las solicitudes de exámenes de laboratorio</p>
				</div>
				<Link href="/dashboard/medic/ordenes/new">
					<Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
						<Plus className="w-4 h-4 mr-2" />
						Nueva Orden
					</Button>
				</Link>
			</div>

			{/* Filtros y búsqueda */}
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
						{(['all', 'pending', 'processing', 'completed'] as const).map((status) => (
							<button
								key={status}
								onClick={() => setFilter(status)}
								className={`px-4 py-2 rounded-xl font-medium transition ${
									filter === status
										? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
										: 'bg-white border border-blue-200 text-slate-700 hover:bg-blue-50'
								}`}
							>
								{status === 'all' ? 'Todas' : status === 'pending' ? 'Pendientes' : status === 'processing' ? 'En Proceso' : 'Completadas'}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Lista de órdenes */}
			{loading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{[...Array(6)].map((_, i) => (
						<div key={i} className="bg-white rounded-2xl border border-blue-100 p-6 animate-pulse">
							<div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
							<div className="h-4 bg-slate-200 rounded w-1/2"></div>
						</div>
					))}
				</div>
			) : filteredOrders.length === 0 ? (
				<div className="bg-white rounded-2xl border border-blue-100 p-12 text-center">
					<FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
					<p className="text-slate-600 text-lg">No hay órdenes médicas</p>
					<Link href="/dashboard/medic/ordenes/new" className="mt-4 inline-block">
						<Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
							Crear primera orden
						</Button>
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredOrders.map((order) => (
						<Link key={order.id} href={`/dashboard/medic/ordenes/${order.id}`}>
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								className="bg-white rounded-2xl border border-blue-100 p-6 hover:shadow-lg transition cursor-pointer"
							>
								<div className="flex items-start justify-between mb-4">
									<div className="flex items-center gap-2">
										{getStatusIcon(order.status)}
										<span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
											{order.status === 'pending' ? 'Pendiente' : order.status === 'processing' ? 'En Proceso' : 'Completada'}
										</span>
									</div>
									{order.is_critical && (
										<span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
											Crítico
										</span>
									)}
								</div>

								<h3 className="font-semibold text-slate-900 mb-2">
									{order.Patient ? `${order.Patient.firstName} ${order.Patient.lastName}` : 'Paciente desconocido'}
								</h3>

								<p className="text-sm text-slate-600 mb-2">
									<strong>Tipo:</strong> {order.result_type}
								</p>

								{order.Patient?.identifier && (
									<p className="text-xs text-slate-500 mb-2">ID: {order.Patient.identifier}</p>
								)}

								<div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-100">
									<span className="text-xs text-slate-500">
										{new Date(order.created_at).toLocaleDateString('es-ES')}
									</span>
									{order.attachments && order.attachments.length > 0 && (
										<span className="text-xs text-slate-500 flex items-center gap-1">
											<FileText className="w-3 h-3" />
											{order.attachments.length} archivo(s)
										</span>
									)}
								</div>
							</motion.div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

