'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Loader2, Calendar, User, Search, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Task {
	id: string;
	title: string;
	description?: string;
	due_at?: string;
	completed: boolean;
	created_at: string;
	Patient?: {
		firstName: string;
		lastName: string;
		identifier?: string;
	};
}

export default function RoleUserTasksPage() {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
	const [searchTerm, setSearchTerm] = useState('');

	useEffect(() => {
		fetchTasks();
	}, [filter]);

	const fetchTasks = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (filter === 'pending') {
				params.append('completed', 'false');
			} else if (filter === 'completed') {
				params.append('completed', 'true');
			}

			const res = await fetch(`/api/medic/tasks?${params.toString()}`, {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar tareas');

			const data = await res.json();
			// Filtrar descripciones que puedan contener información médica sensible
			const sanitizedTasks = (data.tasks || []).map((task: Task) => ({
				...task,
				// Solo mostrar título y fecha, no descripciones que puedan tener datos médicos
				description: task.description ? 'Tarea asignada' : undefined,
			}));
			setTasks(sanitizedTasks);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (iso?: string | null) => {
		if (!iso) return '—';
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

	const filteredTasks = tasks.filter((task) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			task.title.toLowerCase().includes(search) ||
			task.Patient?.firstName?.toLowerCase().includes(search) ||
			task.Patient?.lastName?.toLowerCase().includes(search) ||
			task.Patient?.identifier?.toLowerCase().includes(search)
		);
	});

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
					<p className="text-slate-600">Cargando tareas...</p>
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
						<h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Tareas</h1>
						<p className="text-sm sm:text-base text-slate-600 mt-1">Gestión administrativa de tareas</p>
					</div>
					<Link href="/dashboard/role-user/tareas/new">
						<Button className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
							<Plus className="w-4 h-4 mr-2" />
							Nueva Tarea
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
							placeholder="Buscar por título o paciente..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
						/>
					</div>
					<div className="flex flex-wrap gap-2">
						{(['all', 'pending', 'completed'] as const).map((status) => (
							<button
								key={status}
								onClick={() => setFilter(status)}
								className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
									filter === status
										? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
										: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
								}`}
							>
								{status === 'all' ? 'Todas' : status === 'pending' ? 'Pendientes' : 'Completadas'}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Tasks List */}
			{filteredTasks.length === 0 ? (
				<div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
					<CheckSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
					<p className="text-slate-600">{searchTerm || filter !== 'all' ? 'No se encontraron tareas' : 'No hay tareas registradas'}</p>
				</div>
			) : (
				<div className="space-y-4">
					{filteredTasks.map((task, index) => (
						<motion.div
							key={task.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.05 }}
							className={`bg-white rounded-xl shadow-md border p-6 hover:shadow-lg transition-shadow ${task.completed ? 'border-green-200 bg-green-50/30' : 'border-slate-200'}`}
						>
							<div className="flex items-start justify-between">
								<div className="flex items-start gap-4 flex-1">
									<div className={`w-12 h-12 rounded-full flex items-center justify-center ${task.completed ? 'bg-green-500' : 'bg-gradient-to-br from-teal-500 to-cyan-500'}`}>
										<CheckSquare className={`w-6 h-6 ${task.completed ? 'text-white' : 'text-white'}`} />
									</div>
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<h3 className={`text-lg font-semibold ${task.completed ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
												{task.title}
											</h3>
											{task.completed && (
												<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
													Completada
												</span>
											)}
										</div>
										<div className="flex flex-wrap gap-4 text-sm text-slate-600">
											{task.Patient && (
												<span className="flex items-center gap-1">
													<User className="w-4 h-4" />
													{task.Patient.firstName} {task.Patient.lastName}
													{task.Patient.identifier && ` • ${task.Patient.identifier}`}
												</span>
											)}
											{task.due_at && (
												<span className="flex items-center gap-1">
													<Calendar className="w-4 h-4" />
													Vence: {formatDate(task.due_at)}
												</span>
											)}
											<span className="flex items-center gap-1">
												<Calendar className="w-4 h-4" />
												Creada: {formatDate(task.created_at)}
											</span>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					))}
				</div>
			)}
		</div>
	);
}
