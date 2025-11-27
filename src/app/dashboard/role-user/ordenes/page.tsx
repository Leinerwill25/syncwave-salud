'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileCheck, Loader2, Calendar, User, Search, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Order {
	id: string;
	patient_id: string;
	result_type: string;
	status: 'pending' | 'processing' | 'completed';
	created_at: string;
	Patient?: {
		firstName: string;
		lastName: string;
		identifier?: string;
	};
}

export default function RoleUserOrdersPage() {
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

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'completed':
				return (
					<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
						<CheckCircle className="w-3 h-3" />
						Completada
					</span>
				);
			case 'processing':
				return (
					<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
						<Clock className="w-3 h-3" />
						En Proceso
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
						<AlertCircle className="w-3 h-3" />
						Pendiente
					</span>
				);
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

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
					<p className="text-slate-600">Cargando órdenes médicas...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full">
			{/* Header */}
			<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Órdenes Médicas</h1>
						<p className="text-sm sm:text-base text-slate-600 mt-1">Registro administrativo de órdenes médicas</p>
					</div>
					<Link href="/dashboard/role-user/ordenes/new">
						<Button className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
							<FileCheck className="w-4 h-4 mr-2" />
							Nueva Orden
						</Button>
					</Link>
				</div>
			</motion.div>

			{/* Filters */}
			<div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
				<div className="flex flex-col sm:flex-row gap-4">
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
						<input
							type="text"
							placeholder="Buscar por paciente o tipo de examen..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
						/>
					</div>
					<div className="flex flex-wrap gap-2">
						{(['all', 'pending', 'processing', 'completed'] as const).map((status) => (
							<button
								key={status}
								onClick={() => setFilter(status)}
								className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
									filter === status
										? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
										: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
								}`}
							>
								{status === 'all' ? 'Todas' : status === 'pending' ? 'Pendientes' : status === 'processing' ? 'En Proceso' : 'Completadas'}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Orders List */}
			{filteredOrders.length === 0 ? (
				<div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
					<FileCheck className="w-16 h-16 text-slate-400 mx-auto mb-4" />
					<p className="text-slate-600">{searchTerm || filter !== 'all' ? 'No se encontraron órdenes' : 'No hay órdenes médicas registradas'}</p>
				</div>
			) : (
				<div className="space-y-4">
					{filteredOrders.map((order, index) => (
						<motion.div
							key={order.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.05 }}
							className="bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow"
						>
							<div className="flex items-start justify-between">
								<div className="flex items-start gap-4 flex-1">
									<div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
										<FileCheck className="w-6 h-6" />
									</div>
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<h3 className="text-lg font-semibold text-slate-900">
												{order.Patient?.firstName} {order.Patient?.lastName}
											</h3>
											{getStatusBadge(order.status)}
										</div>
										<div className="flex flex-wrap gap-4 text-sm text-slate-600">
											{order.Patient?.identifier && <span className="flex items-center gap-1">C.I.: {order.Patient.identifier}</span>}
											<span className="flex items-center gap-1">
												<Calendar className="w-4 h-4" />
												{formatDate(order.created_at)}
											</span>
											<span className="font-medium text-slate-700">Tipo: {order.result_type || 'N/A'}</span>
										</div>
									</div>
								</div>
							</div>
							<div className="mt-4 pt-4 border-t border-slate-200">
								<p className="text-xs text-slate-500 italic">
									Nota: Los resultados médicos detallados de esta orden solo son visibles para el médico especialista.
								</p>
							</div>
						</motion.div>
					))}
				</div>
			)}
		</div>
	);
}
