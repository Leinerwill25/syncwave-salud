// app/dashboard/medic/tareas/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, CheckSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Task {
	id: string;
	title: string;
	description?: string;
	due_at?: string;
	completed: boolean;
	created_at: string;
	updated_at: string;
	Patient?: {
		firstName: string;
		lastName: string;
		identifier?: string;
	};
}

export default function TaskDetailPage() {
	const params = useParams();
	const router = useRouter();
	const taskId = params.id as string;
	const [task, setTask] = useState<Task | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [formData, setFormData] = useState({
		title: '',
		description: '',
		completed: false,
		due_at: '',
	});

	useEffect(() => {
		if (taskId) {
			fetchTask();
		}
	}, [taskId]);

	const fetchTask = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/medic/tasks/${taskId}`, {
				credentials: 'include',
			});

			if (!res.ok) {
				if (res.status === 404 || res.status === 403) {
					router.push('/dashboard/medic/tareas');
					return;
				}
				throw new Error('Error al cargar tarea');
			}

			const data = await res.json();
			setTask(data.task);
			setFormData({
				title: data.task.title,
				description: data.task.description || '',
				completed: data.task.completed,
				due_at: data.task.due_at ? new Date(data.task.due_at).toISOString().slice(0, 16) : '',
			});
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const res = await fetch(`/api/medic/tasks/${taskId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(formData),
			});

			if (!res.ok) throw new Error('Error al actualizar tarea');

			await fetchTask();
		} catch (err) {
			console.error('Error:', err);
			alert('Error al actualizar tarea');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;

		try {
			const res = await fetch(`/api/medic/tasks/${taskId}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al eliminar tarea');

			router.push('/dashboard/medic/tareas');
		} catch (err) {
			console.error('Error:', err);
			alert('Error al eliminar tarea');
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse"></div>
				<div className="bg-white rounded-2xl border border-blue-100 p-6 space-y-4">
					<div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
				</div>
			</div>
		);
	}

	if (!task) {
		return (
			<div className="space-y-6">
				<div className="bg-white rounded-2xl border border-blue-100 p-12 text-center">
					<p className="text-slate-600 text-lg">Tarea no encontrada</p>
					<Link href="/dashboard/medic/tareas">
						<Button className="mt-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
							Volver a tareas
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/dashboard/medic/tareas">
					<Button variant="ghost" className="text-slate-600">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Volver
					</Button>
				</Link>
				<div>
					<h1 className="text-3xl font-bold text-slate-900">Detalle de Tarea</h1>
				</div>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				className="bg-white rounded-2xl border border-blue-100 p-6 space-y-6"
			>
				<div className="flex items-center gap-2 mb-4">
					<input
						type="checkbox"
						checked={formData.completed}
						onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
						className="w-5 h-5 text-teal-600 border-blue-200 rounded focus:ring-teal-500"
					/>
					<span className="font-medium text-slate-700">
						{formData.completed ? 'Completada' : 'Pendiente'}
					</span>
				</div>

				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">Título</label>
					<input
						type="text"
						value={formData.title}
						onChange={(e) => setFormData({ ...formData, title: e.target.value })}
						className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
					<textarea
						value={formData.description}
						onChange={(e) => setFormData({ ...formData, description: e.target.value })}
						rows={6}
						className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">Fecha de Vencimiento</label>
					<input
						type="datetime-local"
						value={formData.due_at}
						onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
						className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
					/>
				</div>

				{task.Patient && (
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Paciente</label>
						<p className="text-slate-900">
							{task.Patient.firstName} {task.Patient.lastName}
							{task.Patient.identifier && ` (${task.Patient.identifier})`}
						</p>
					</div>
				)}

				<div className="flex gap-4 pt-4 border-t border-blue-100">
					<Button
						onClick={handleSave}
						disabled={saving}
						className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
					>
						<Save className="w-4 h-4 mr-2" />
						{saving ? 'Guardando...' : 'Guardar Cambios'}
					</Button>
					<Button
						onClick={handleDelete}
						variant="outline"
						className="border-red-200 text-red-700 hover:bg-red-50"
					>
						<Trash2 className="w-4 h-4 mr-2" />
						Eliminar
					</Button>
				</div>
			</motion.div>
		</div>
	);
}

