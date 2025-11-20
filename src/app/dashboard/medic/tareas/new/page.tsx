// app/dashboard/medic/tareas/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Patient {
	id: string;
	firstName: string;
	lastName: string;
}

export default function NewTaskPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [patients, setPatients] = useState<Patient[]>([]);
	const [formData, setFormData] = useState({
		title: '',
		description: '',
		patient_id: '',
		due_at: '',
	});

	useEffect(() => {
		fetchPatients();
	}, []);

	const fetchPatients = async () => {
		try {
			const res = await fetch('/api/patients?include_summary=false', {
				credentials: 'include',
			});
			if (res.ok) {
				const data = await res.json();
				setPatients(data.patients || []);
			}
		} catch (err) {
			console.error('Error cargando pacientes:', err);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.title) {
			alert('El título es requerido');
			return;
		}

		setLoading(true);
		try {
			const res = await fetch('/api/medic/tasks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					title: formData.title,
					description: formData.description || null,
					patient_id: formData.patient_id || null,
					due_at: formData.due_at || null,
				}),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || 'Error al crear tarea');
			}

			const data = await res.json();
			router.push(`/dashboard/medic/tareas/${data.task.id}`);
		} catch (err) {
			console.error('Error:', err);
			alert(err instanceof Error ? err.message : 'Error al crear tarea');
		} finally {
			setLoading(false);
		}
	};

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
					<h1 className="text-3xl font-bold text-slate-900">Nueva Tarea</h1>
					<p className="text-slate-600 mt-1">Crea una nueva tarea o recordatorio</p>
				</div>
			</div>

			<motion.form
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				onSubmit={handleSubmit}
				className="bg-white rounded-2xl border border-blue-100 p-6 space-y-6"
			>
				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">
						Título <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						required
						value={formData.title}
						onChange={(e) => setFormData({ ...formData, title: e.target.value })}
						placeholder="Ej: Revisar resultados de laboratorio"
						className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
					<textarea
						value={formData.description}
						onChange={(e) => setFormData({ ...formData, description: e.target.value })}
						rows={4}
						placeholder="Detalles adicionales..."
						className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">Paciente (opcional)</label>
					<select
						value={formData.patient_id}
						onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
						className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
					>
						<option value="">Sin paciente asociado</option>
						{patients.map((p) => (
							<option key={p.id} value={p.id}>
								{p.firstName} {p.lastName}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">Fecha de Vencimiento (opcional)</label>
					<input
						type="datetime-local"
						value={formData.due_at}
						onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
						className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
					/>
				</div>

				<div className="flex gap-4 pt-4">
					<Button
						type="submit"
						disabled={loading}
						className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
					>
						<Save className="w-4 h-4 mr-2" />
						{loading ? 'Guardando...' : 'Crear Tarea'}
					</Button>
					<Link href="/dashboard/medic/tareas">
						<Button type="button" variant="outline" className="border-blue-200 text-slate-700">
							Cancelar
						</Button>
					</Link>
				</div>
			</motion.form>
		</div>
	);
}

