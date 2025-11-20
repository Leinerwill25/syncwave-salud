// app/dashboard/medic/tareas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Plus, Search, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
	};
}

export default function TasksPage() {
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
			setTasks(data.tasks || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const toggleComplete = async (taskId: string, currentStatus: boolean) => {
		try {
			const res = await fetch(`/api/medic/tasks/${taskId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ completed: !currentStatus }),
			});

			if (!res.ok) throw new Error('Error al actualizar tarea');

			await fetchTasks();
		} catch (err) {
			console.error('Error:', err);
			alert('Error al actualizar tarea');
		}
	};

	const filteredTasks = tasks.filter((task) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			task.title.toLowerCase().includes(search) ||
			task.description?.toLowerCase().includes(search) ||
			task.Patient?.firstName?.toLowerCase().includes(search) ||
			task.Patient?.lastName?.toLowerCase().includes(search)
		);
	});

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">Tareas</h1>
					<p className="text-slate-600 mt-1">Gestiona tus tareas y recordatorios</p>
				</div>
				<Link href="/dashboard/medic/tareas/new">
					<Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
						<Plus className="w-4 h-4 mr-2" />
						Nueva Tarea
					</Button>
				</Link>
			</div>

			{/* Filtros */}
			<div className="bg-white rounded-2xl border border-blue-100 p-4 space-y-4">
				<div className="flex flex-col sm:flex-row gap-4">
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
						<input
							type="text"
							placeholder="Buscar tareas..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
						/>
					</div>
					<div className="flex gap-2">
						{(['all', 'pending', 'completed'] as const).map((status) => (
							<button
								key={status}
								onClick={() => setFilter(status)}
								className={`px-4 py-2 rounded-xl font-medium transition ${
									filter === status
										? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
										: 'bg-white border border-blue-200 text-slate-700 hover:bg-blue-50'
								}`}
							>
								{status === 'all' ? 'Todas' : status === 'pending' ? 'Pendientes' : 'Completadas'}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Lista de tareas */}
			{loading ? (
				<div className="space-y-4">
					{[...Array(5)].map((_, i) => (
						<div key={i} className="bg-white rounded-2xl border border-blue-100 p-6 animate-pulse">
							<div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
							<div className="h-4 bg-slate-200 rounded w-1/2"></div>
						</div>
					))}
				</div>
			) : filteredTasks.length === 0 ? (
				<div className="bg-white rounded-2xl border border-blue-100 p-12 text-center">
					<CheckSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
					<p className="text-slate-600 text-lg">No hay tareas</p>
					<Link href="/dashboard/medic/tareas/new" className="mt-4 inline-block">
						<Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
							Crear primera tarea
						</Button>
					</Link>
				</div>
			) : (
				<div className="space-y-4">
					{filteredTasks.map((task) => (
						<Link key={task.id} href={`/dashboard/medic/tareas/${task.id}`}>
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								className={`bg-white rounded-2xl border p-6 hover:shadow-lg transition cursor-pointer ${
									task.completed ? 'border-green-200 bg-green-50/30' : 'border-blue-100'
								}`}
							>
								<div className="flex items-start gap-4">
									<button
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											toggleComplete(task.id, task.completed);
										}}
										className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
											task.completed
												? 'bg-teal-600 border-teal-600'
												: 'border-blue-300 hover:border-teal-600'
										}`}
									>
										{task.completed && <CheckSquare className="w-4 h-4 text-white" />}
									</button>
									<div className="flex-1">
										<h3
											className={`font-semibold mb-2 ${
												task.completed ? 'line-through text-slate-500' : 'text-slate-900'
											}`}
										>
											{task.title}
										</h3>
										{task.description && (
											<p className="text-sm text-slate-600 mb-2">{task.description}</p>
										)}
										{task.Patient && (
											<p className="text-xs text-slate-500 mb-2">
												Paciente: {task.Patient.firstName} {task.Patient.lastName}
											</p>
										)}
										<div className="flex items-center gap-4 mt-4 pt-4 border-t border-blue-100">
											{task.due_at && (
												<div className="flex items-center gap-1 text-xs text-slate-500">
													<Clock className="w-3 h-3" />
													{new Date(task.due_at).toLocaleDateString('es-ES')}
													{new Date(task.due_at) < new Date() && !task.completed && (
														<AlertCircle className="w-3 h-3 text-red-600 ml-1" />
													)}
												</div>
											)}
											<span className="text-xs text-slate-500">
												{new Date(task.created_at).toLocaleDateString('es-ES')}
											</span>
										</div>
									</div>
								</div>
							</motion.div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

