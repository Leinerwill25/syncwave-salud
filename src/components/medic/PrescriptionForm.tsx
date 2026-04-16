'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Loader2, Pill, X, FileDown, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export interface PrescriptionItem {
	name: string;
	dosage: string;
	frequency: string;
	frequencyHours: number | null;
	frequencyDays: number | null;
	duration: string;
	quantity: number;
}

export interface PrescriptionFormData {
	patientId?: string;
	notes?: string;
	items?: PrescriptionItem[];
}

export default function PrescriptionForm({ 
	patients, 
	onCreated, 
	onCancel,
	initialData,
	activeTemplateUrl,
	consultationId
}: { 
	patients: any[]; 
	onCreated: (p: any) => void;
	onCancel?: () => void;
	initialData?: PrescriptionFormData;
	activeTemplateUrl?: string | null;
	consultationId?: string;
}) {
	const [patientId, setPatientId] = useState(initialData?.patientId || '');
	const [notes, setNotes] = useState(initialData?.notes || '');
	const [items, setItems] = useState<PrescriptionItem[]>(initialData?.items && initialData.items.length > 0 
		? initialData.items 
		: [{ name: '', dosage: '', frequency: '', frequencyHours: null, frequencyDays: null, duration: '', quantity: 1 }]
	);
	const [loading, setLoading] = useState(false);
	const [generatingWord, setGeneratingWord] = useState(false);
	const [wordGenerated, setWordGenerated] = useState(false);

	// Sincronizar con initialData cuando cambie (especialmente útil para plantillas)
	useEffect(() => {
		if (initialData?.patientId) setPatientId(initialData.patientId);
		if (initialData?.notes) setNotes(initialData.notes);
		if (initialData?.items && initialData.items.length > 0) {
			setItems(initialData.items);
		}
	}, [initialData]);

	useEffect(() => {
		if (patients.length > 0 && !patientId) setPatientId(patients[0].id);
	}, [patients, patientId]);

	function generateFrequencyText(hours: number | null | undefined, days: number | null | undefined): string {
		if (!hours || !days) return '';
		if (hours === 24) {
			return `1 vez al día por ${days} día${days > 1 ? 's' : ''}`;
		}
		return `Cada ${hours} hora${hours > 1 ? 's' : ''} por ${days} día${days > 1 ? 's' : ''}`;
	}

	function updateItem(idx: number, key: string, value: any) {
		setItems((arr) => {
			const updated = arr.map((it, i) => {
				if (i === idx) {
					const newItem = { ...it, [key]: value };
					if (key === 'frequencyHours' || key === 'frequencyDays') {
						const hours = key === 'frequencyHours' ? value : it.frequencyHours;
						const days = key === 'frequencyDays' ? value : it.frequencyDays;
						newItem.frequency = generateFrequencyText(hours, days);
					}
					return newItem;
				}
				return it;
			});
			return updated;
		});
	}

	function addItem() {
		setItems((arr) => [...arr, { name: '', dosage: '', frequency: '', frequencyHours: null, frequencyDays: null, duration: '', quantity: 1 }]);
	}

	function removeItem(idx: number) {
		setItems((arr) => arr.filter((_, i) => i !== idx));
	}

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (!patientId) return toast.error('Seleccione un paciente');
		setLoading(true);

		const selectedPatient = patients.find((p: any) => p.id === patientId);
		const isUnregistered = selectedPatient?.isUnregistered || false;

		const itemsToSave = items
			.filter((it) => it.name.trim() !== '')
			.map((item) => {
				const frequencyText = item.frequency || generateFrequencyText(item.frequencyHours, item.frequencyDays);
				return {
					name: item.name,
					dosage: item.dosage,
					frequency: frequencyText,
					duration: item.duration,
					quantity: item.quantity,
				};
			});

		const payload: any = {
			notes,
			items: itemsToSave,
		};

		if (isUnregistered) {
			payload.unregistered_patient_id = patientId;
		} else {
			payload.patient_id = patientId;
		}

		try {
			const res = await fetch('/api/medic/prescriptions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'No se pudo crear la receta');

			toast.success('Receta médica creada con éxito');
			setNotes('');
			setItems([{ name: '', dosage: '', frequency: '', frequencyHours: null, frequencyDays: null, duration: '', quantity: 1 }]);
			onCreated(data.prescription);
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			setLoading(false);
		}
	}

	async function handleGenerateWordDoc() {
		if (!consultationId) return toast.error('Error: No hay ID de consulta vinculado.');
		if (!activeTemplateUrl) return toast.error('Seleccione una plantilla primero.');

		setGeneratingWord(true);
		try {
			// Preparar payload mínimo para que el API use la plantilla estática con datos del paciente
			const payload = {
				template_url: activeTemplateUrl,
				items: items.filter(it => it.name.trim() !== '').map(item => ({
					name: item.name,
					dosage: item.dosage,
					frequency: item.frequency || generateFrequencyText(item.frequencyHours, item.frequencyDays),
					quantity: item.quantity
				})),
				notes: notes
			};

			const res = await fetch(`/api/consultations/${consultationId}/generate-prescription`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'No se pudo generar el Word');

			if (data.prescription_url) {
				// Crear un link temporal para forzar la descarga
				const link = document.createElement('a');
				link.href = data.prescription_url;
				link.setAttribute('download', `Receta_${consultationId}.docx`); // Nombre sugerido
				link.target = '_blank';
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);

				toast.success('Receta generada y descargada con éxito');
				setWordGenerated(true);
			}
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			setGeneratingWord(false);
		}
	}

	return (
		<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
			{/* Header */}
			<div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-6 py-4 text-white">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Pill className="w-5 h-5" />
						<h3 className="text-lg font-semibold tracking-tight">Nueva Receta Médica</h3>
					</div>
					{onCancel && (
						<button onClick={onCancel} className="text-white/80 hover:text-white">
							<X size={20} />
						</button>
					)}
				</div>
			</div>

			<form onSubmit={submit} className="p-6 space-y-5">
				<div>
					<label className="block text-sm font-semibold text-slate-700 mb-1">Paciente</label>
					<select 
						value={patientId} 
						onChange={(e) => setPatientId(e.target.value)} 
						className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-sm bg-white"
					>
						{patients.map((p) => (
							<option key={p.id} value={p.id}>
								{p.firstName} {p.lastName} {p.identifier ? `• ${p.identifier}` : ''} {p.isUnregistered ? '(No Registrado)' : ''}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="block text-sm font-semibold text-slate-700 mb-1">Observaciones / Indicaciones Adicionales</label>
					<textarea 
						value={notes} 
						onChange={(e) => setNotes(e.target.value)} 
						placeholder="Ej: Tomar con alimentos, suspender si hay reacción..." 
						rows={3} 
						className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500 text-sm" 
					/>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between mb-2">
						<h4 className="font-semibold text-slate-800">Medicamentos</h4>
						<button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-bold">
							<PlusCircle className="w-4 h-4" /> Añadir Medicamento
						</button>
					</div>

					{items.map((it, idx) => (
						<div key={idx} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 grid grid-cols-12 gap-3 relative group">
							<div className="col-span-12 md:col-span-5">
								<label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Medicamento</label>
								<input 
									value={it.name} 
									onChange={(e) => updateItem(idx, 'name', e.target.value)} 
									required 
									className="w-full p-2 rounded-md border border-slate-200 focus:ring-1 focus:ring-teal-400 text-sm" 
									placeholder="Nombre del fármaco"
								/>
							</div>
							<div className="col-span-6 md:col-span-2">
								<label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Dosis</label>
								<input 
									value={it.dosage} 
									onChange={(e) => updateItem(idx, 'dosage', e.target.value)} 
									className="w-full p-2 rounded-md border border-slate-200 focus:ring-1 focus:ring-teal-400 text-sm" 
									placeholder="Ej: 500mg"
								/>
							</div>
							<div className="col-span-6 md:col-span-4 grid grid-cols-2 gap-2">
								<div>
									<label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">C/ Horas</label>
									<input 
										type="number" 
										min="1" 
										max="24"
										value={it.frequencyHours ?? ''} 
										onChange={(e) => updateItem(idx, 'frequencyHours', e.target.value ? parseInt(e.target.value, 10) : null)} 
										className="w-full p-2 rounded-md border border-slate-200 focus:ring-1 focus:ring-teal-400 text-sm" 
										placeholder="Ej: 8"
									/>
								</div>
								<div>
									<label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Días</label>
									<input 
										type="number" 
										min="1"
										value={it.frequencyDays ?? ''} 
										onChange={(e) => updateItem(idx, 'frequencyDays', e.target.value ? parseInt(e.target.value, 10) : null)} 
										className="w-full p-2 rounded-md border border-slate-200 focus:ring-1 focus:ring-teal-400 text-sm" 
										placeholder="Ej: 7"
									/>
								</div>
							</div>
							<div className="col-span-6 md:col-span-1">
								<label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Cant.</label>
								<input 
									type="number" 
									min={1} 
									value={it.quantity} 
									onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} 
									className="w-full p-2 rounded-md border border-slate-200 focus:ring-1 focus:ring-teal-400 text-sm" 
								/>
							</div>
							<div className="col-span-6 md:col-span-12 flex justify-end md:absolute md:top-2 md:right-2">
								<button 
									type="button" 
									onClick={() => removeItem(idx)} 
									className="text-slate-400 hover:text-red-500 transition-colors"
									title="Eliminar"
								>
									<X size={16} />
								</button>
							</div>
							{it.frequency && (
								<div className="col-span-12 text-[11px] text-teal-600 font-medium italic mt-1">
									Posología: {it.frequency}
								</div>
							)}
						</div>
					))}
				</div>

				<button 
					type="submit" 
					disabled={loading} 
					className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white font-bold shadow-lg hover:shadow-xl flex justify-center items-center gap-2 transition-all active:scale-[0.98]"
				>
					{loading ? (
						<>
							<Loader2 className="w-5 h-5 animate-spin" /> Guardando Receta...
						</>
					) : (
						<>
							<Pill size={20} /> Crear Receta Médica
						</>
					)}
				</button>

				{activeTemplateUrl && (
					<div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
						<div className="flex items-center gap-2 mb-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 shadow-inner">
							<div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
							<span className="text-[11px] font-bold uppercase tracking-wider">Plantilla de Word Vinculada</span>
						</div>

						<button 
							type="button" 
							onClick={handleGenerateWordDoc} 
							disabled={generatingWord} 
							className={`w-full py-4 rounded-xl border-2 font-black text-sm uppercase tracking-[0.1em] flex justify-center items-center gap-3 transition-all transform active:scale-95 shadow-lg ${
								wordGenerated 
								? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-100'
								: 'bg-white border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white shadow-blue-100'
							}`}
						>
							{generatingWord ? (
								<Loader2 className="w-5 h-5 animate-spin" /> 
							) : (
								wordGenerated ? <CheckCircle2 size={22} className="text-emerald-500" /> : <FileDown size={22} />
							)}
							{generatingWord ? 'Procesando Documento...' : (wordGenerated ? 'Receta Generada con Éxito' : 'Generar Receta en Word')}
						</button>
						
						<p className="text-[10px] text-center text-slate-400 mt-3 font-medium flex items-center justify-center gap-1">
							<Download size={10} /> Se usará su catálogo original con los datos del paciente integrados
						</p>
					</div>
				)}
			</form>
		</motion.div>
	);
}
