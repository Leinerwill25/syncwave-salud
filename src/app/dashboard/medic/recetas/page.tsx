'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import { motion } from 'framer-motion';
import { PlusCircle, ClipboardList, Loader2, Pill, FileText } from 'lucide-react';

// ---------- Formulario para crear receta ----------
function NewPrescriptionForm({ patients, onCreated }: { patients: any[]; onCreated: (p: any) => void }) {
	const [patientId, setPatientId] = useState('');
	const [notes, setNotes] = useState('');
	const [items, setItems] = useState([{ name: '', dosage: '', frequency: '', duration: '', quantity: 1 }]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (patients.length > 0) setPatientId(patients[0].id);
	}, [patients]);

	function updateItem(idx: number, key: string, value: any) {
		setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
	}

	function addItem() {
		setItems((arr) => [...arr, { name: '', dosage: '', frequency: '', duration: '', quantity: 1 }]);
	}

	function removeItem(idx: number) {
		setItems((arr) => arr.filter((_, i) => i !== idx));
	}

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (!patientId) return alert('Seleccione un paciente');
		setLoading(true);

		const payload = {
			patient_id: patientId,
			notes,
			items: items.filter((it) => it.name.trim() !== ''),
		};

		const res = await fetch('/api/medic/prescriptions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		const data = await res.json();
		setLoading(false);

		if (!res.ok) return alert('Error: ' + (data?.error ?? 'No se pudo crear la receta'));

		setNotes('');
		setItems([{ name: '', dosage: '', frequency: '', duration: '', quantity: 1 }]);
		onCreated(data.prescription);
	}

	return (
		<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
			{/* Header */}
			<div className="bg-gradient-to-r from-violet-500/90 to-indigo-600/90 px-6 py-4 text-white">
				<div className="flex items-center gap-2">
					<Pill className="w-5 h-5" />
					<h3 className="text-lg font-semibold tracking-tight">Nueva Receta Médica</h3>
				</div>
			</div>

			{/* Form content */}
			<form onSubmit={submit} className="p-6 space-y-5">
				{/* Paciente */}
				<div>
					<label className="block text-sm font-semibold text-gray-800 mb-1">Paciente</label>
					<select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm">
						{patients.map((p) => (
							<option key={p.id} value={p.id}>
								{p.firstName} {p.lastName} {p.identifier ? `• ${p.identifier}` : ''}
							</option>
						))}
					</select>
				</div>

				{/* Notas */}
				<div>
					<label className="block text-sm font-semibold text-gray-800 mb-1">Observaciones (opcional)</label>
					<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Tomar con alimentos, controlar presión cada 8h..." rows={3} className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
				</div>

				{/* Medicamentos */}
				<div className="space-y-2">
					<div className="flex items-center justify-between mb-2">
						<h4 className="font-semibold text-gray-800">Medicamentos</h4>
						<button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
							<PlusCircle className="w-4 h-4" /> Añadir
						</button>
					</div>

					{items.map((it, idx) => (
						<motion.div key={idx} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 border border-gray-100 rounded-xl bg-gray-50/60 grid grid-cols-12 gap-2">
							<div className="col-span-6">
								<label className="text-xs text-gray-600">Medicamento</label>
								<input value={it.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} required className="w-full p-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-indigo-400 text-sm" />
							</div>
							<div className="col-span-2">
								<label className="text-xs text-gray-600">Dosis</label>
								<input value={it.dosage} onChange={(e) => updateItem(idx, 'dosage', e.target.value)} className="w-full p-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-indigo-400 text-sm" />
							</div>
							<div className="col-span-2">
								<label className="text-xs text-gray-600">Frecuencia</label>
								<input value={it.frequency} onChange={(e) => updateItem(idx, 'frequency', e.target.value)} className="w-full p-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-indigo-400 text-sm" />
							</div>
							<div className="col-span-1">
								<label className="text-xs text-gray-600">Cant.</label>
								<input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} className="w-full p-2 rounded-md border border-gray-200 focus:ring-1 focus:ring-indigo-400 text-sm" />
							</div>
							<div className="col-span-1 flex justify-center items-end">
								<button type="button" onClick={() => removeItem(idx)} className="text-sm text-red-500 hover:text-red-700 font-medium">
									✕
								</button>
							</div>
						</motion.div>
					))}
				</div>

				<button type="submit" disabled={loading} className="w-full py-2.5 mt-4 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-medium shadow hover:shadow-lg flex justify-center items-center gap-2 transition">
					{loading ? (
						<>
							<Loader2 className="w-4 h-4 animate-spin" /> Guardando...
						</>
					) : (
						'Crear Receta'
					)}
				</button>
			</form>
		</motion.div>
	);
}

// ---------- Página principal ----------
export default function PrescriptionsPage() {
	const supabase = createSupabaseBrowserClient();
	const [prescriptions, setPrescriptions] = useState<any[]>([]);
	const [patients, setPatients] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			const [presRes, patRes] = await Promise.all([fetch('/api/medic/prescriptions'), supabase.from('Patient').select('id, firstName, lastName, identifier')]);

			const presData = await presRes.json();
			setPrescriptions(presData.prescriptions ?? []);
			setPatients(patRes.data ?? []);
			setLoading(false);
		};
		fetchData();
	}, [supabase]);

	const patientMap = useMemo(() => {
		const map: Record<string, string> = {};
		patients.forEach((p) => {
			map[p.id] = `${p.firstName} ${p.lastName}`;
		});
		return map;
	}, [patients]);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-[70vh] text-gray-500">
				<Loader2 className="w-5 h-5 mr-2 animate-spin" /> Cargando datos...
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 p-4 sm:p-6 md:p-8 lg:p-10">
			{/* Header */}
			<motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8 md:mb-10">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Recetas Médicas</h1>
					<p className="text-gray-600 text-xs sm:text-sm mt-1">Administra, crea y visualiza las recetas de tus pacientes.</p>
				</div>
				<div className="hidden md:flex items-center gap-2 text-indigo-600">
					<ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
				</div>
			</motion.div>

			{/* Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-1 gap-6 sm:gap-8 md:gap-10">
				{/* Lista de recetas */}
				<div className="lg:col-span-2">
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/90 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
						<div className="flex items-center gap-2 mb-6">
							<FileText className="w-5 h-5 text-indigo-600" />
							<h2 className="text-xl font-semibold text-gray-900">Recetas recientes</h2>
						</div>

						{prescriptions.length === 0 ? (
							<p className="text-gray-500 text-sm">No hay recetas registradas aún.</p>
						) : (
							<ul className="space-y-4">
								{prescriptions.map((r) => (
									<motion.li key={r.id} whileHover={{ scale: 1.01 }} className="p-5 border border-gray-100 rounded-xl shadow-sm bg-gradient-to-r from-violet-50 to-indigo-50 hover:shadow-md transition">
										<div className="flex justify-between">
											<div>
												<h4 className="font-semibold text-gray-800">Paciente: {patientMap[r.patient_id] || 'Desconocido'}</h4>
												<p className="text-xs text-gray-500 mb-2">Emitida el {new Date(r.issued_at).toLocaleString()}</p>

												{r.notes && <p className="text-sm text-gray-700 italic mb-2">“{r.notes}”</p>}

												<div>
													<span className="text-sm font-medium text-gray-800">Medicamentos:</span>
													<ul className="list-disc ml-5 mt-1 text-sm text-gray-700">
														{(r.prescription_item ?? []).map((it: any) => (
															<li key={it.id}>
																{it.name}
																{it.dosage ? ` · ${it.dosage}` : ''}
																{it.quantity ? ` · x${it.quantity}` : ''}
															</li>
														))}
													</ul>
												</div>
											</div>

											<div className="text-right text-xs">
												<div className={`px-3 py-1 rounded-full font-semibold ${r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{r.status}</div>
												<div className="mt-2 text-gray-400">{new Date(r.created_at).toLocaleDateString()}</div>
											</div>
										</div>
									</motion.li>
								))}
							</ul>
						)}
					</motion.div>
				</div>
			</div>
		</div>
	);
}
