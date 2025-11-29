'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Trash, Paperclip, FileText, Image as ImgIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Item = {
	id: string;
	name: string;
	dosage?: string;
	frequency?: string;
	duration?: string;
	quantity?: number | null;
	instructions?: string;
};

type ExistingPrescription = {
	id: string;
	notes: string | null;
	valid_until: string | null;
	status: string;
	issued_at: string;
	created_at: string;
	prescription_item?: Array<{
		id: string;
		name: string;
		dosage: string | null;
		form: string | null;
		frequency: string | null;
		duration: string | null;
		quantity: number | null;
		instructions: string | null;
	}>;
};

type Props = {
	consultationId: string;
	patientId?: string;
	doctorId?: string;
	existingPrescription?: ExistingPrescription | null;
};

function uid(prefix = '') {
	return prefix + Math.random().toString(36).slice(2, 9);
}

/* -------------------------
   Constants / helpers
   ------------------------- */
const ACCEPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

function humanFileSize(bytes: number) {
	if (bytes === 0) return '0 B';
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

/* -------------------------
   File preview utilities
   ------------------------- */
function getExtension(name: string) {
	const parts = name.split('.');
	return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/* -------------------------
   FileUploader component
   - Drag & drop
   - Previews for images
   - Filename + size for others
   - Validation: types / size
   ------------------------- */
function FileUploader({ files, setFiles }: { files: File[]; setFiles: (f: File[]) => void }) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [urls, setUrls] = useState<Record<string, string>>({}); // objectURL map

	useEffect(() => {
		// cleanup object URLs on unmount or files change
		return () => {
			Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function pushFiles(list: FileList | null) {
		if (!list) return;
		const accepted: File[] = [];
		for (const f of Array.from(list)) {
			if (!ACCEPT_TYPES.includes(f.type)) {
				alert(`Tipo de archivo no permitido: ${f.name}`);
				continue;
			}
			if (f.size > MAX_FILE_BYTES) {
				alert(`Archivo muy grande (máx 10MB): ${f.name}`);
				continue;
			}
			accepted.push(f);
		}

		if (accepted.length === 0) return;

		// create object URLs for images
		const newUrls = { ...urls };
		accepted.forEach((f) => {
			if (f.type.startsWith('image/')) {
				newUrls[f.name + f.size] = URL.createObjectURL(f);
			}
		});

		setUrls(newUrls);
		setFiles([...files, ...accepted]);
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		pushFiles(e.dataTransfer.files);
	}

	function removeAt(index: number) {
		const copy = [...files];
		const f = copy.splice(index, 1)[0];
		// revoke url if present
		const key = f.name + f.size;
		if (urls[key]) {
			URL.revokeObjectURL(urls[key]);
			const kcopy = { ...urls };
			delete kcopy[key];
			setUrls(kcopy);
		} else {
			setUrls({ ...urls });
		}
		setFiles(copy);
	}

	function openPicker() {
		inputRef.current?.click();
	}

	return (
		<div>
			<div className="mb-4">
				<label className="block text-sm font-semibold text-slate-900 mb-2">Adjuntar documentos médicos</label>
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
					<p className="text-sm font-medium text-slate-900 mb-2">📋 Documentos requeridos para el paciente:</p>
					<ul className="space-y-2 text-sm text-slate-800">
						<li className="flex items-start gap-2">
							<span className="text-teal-600 font-bold">•</span>
							<span><strong>Informe médico:</strong> Documento con el resumen clínico, diagnóstico y recomendaciones de la consulta.</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-teal-600 font-bold">•</span>
							<span><strong>Receta médica:</strong> Documento físico o digital de la receta que has escrito durante la consulta con el paciente.</span>
						</li>
					</ul>
					<p className="text-xs text-slate-700 mt-3 italic">Estos documentos quedarán guardados digitalmente y estarán disponibles para el paciente en su panel.</p>
				</div>
			</div>

			<div onDrop={onDrop} onDragOver={(e) => e.preventDefault()} onClick={openPicker} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openPicker()} className="group relative border-2 border-dashed border-teal-300 rounded-xl p-4 bg-gradient-to-b from-white to-teal-50/30 hover:shadow-lg hover:border-teal-400 transition cursor-pointer" aria-label="Área para arrastrar o adjuntar archivos">
				<input ref={inputRef} type="file" multiple accept={ACCEPT_TYPES.join(',')} className="hidden" onChange={(e) => pushFiles(e.target.files)} />

				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-100 text-teal-700 shadow-sm">
							<Paperclip size={18} />
						</div>

						<div>
							<p className="font-semibold text-slate-900">Arrastra o selecciona los documentos</p>
							<p className="text-xs text-slate-700">Formato: PNG, JPG, WEBP, PDF, DOC, DOCX • Máx 10 MB por archivo</p>
						</div>
					</div>

					<div>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								inputRef.current?.click();
							}}
							className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow hover:from-teal-700 hover:to-cyan-700">
							<Paperclip size={14} /> Adjuntar Documentos
						</button>
					</div>
				</div>

				{files.length > 0 && (
					<div className="mt-4">
						<div className="mb-3 flex items-center justify-between">
							<p className="text-sm font-medium text-slate-900">
								Documentos adjuntos ({files.length})
							</p>
							<p className="text-xs text-slate-600">
								El paciente podrá descargar estos documentos desde su panel
							</p>
						</div>
						<div className="grid grid-cols-1 gap-2">
							{files.map((f, i) => {
								const isImage = f.type.startsWith('image/');
								const key = f.name + f.size;
								const previewUrl = urls[key];

								return (
									<div key={i} className="flex items-center justify-between gap-3 bg-white border border-teal-200 rounded-lg p-3 hover:bg-teal-50/50 transition">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<div className="w-14 h-14 rounded-md flex items-center justify-center bg-teal-50 overflow-hidden border border-teal-100">
												{isImage && previewUrl ? (
													// eslint-disable-next-line @next/next/no-img-element
													<img src={previewUrl} alt={f.name} className="w-full h-full object-cover" />
												) : (
													<div className="flex flex-col items-center justify-center text-teal-700">
														{getExtension(f.name) === 'pdf' ? <FileText size={28} /> : <ImgIcon size={28} />}
														<span className="sr-only">{f.name}</span>
													</div>
												)}
											</div>

											<div className="min-w-0 flex-1">
												<div className="text-sm font-semibold text-slate-900 break-all">{f.name}</div>
												<div className="text-xs text-slate-700 mt-0.5">{humanFileSize(f.size)}</div>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={(ev) => {
													ev.stopPropagation();
													removeAt(i);
												}}
												className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-rose-600 border border-rose-100 hover:bg-rose-50 transition"
												aria-label={`Eliminar archivo ${f.name}`}>
												<Trash size={14} /> Eliminar
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

/* -------------------------
   PrescriptionItemsEditor
   - clean grid
   - compact controls
   ------------------------- */
function PrescriptionItemsEditor({ items, setItems }: { items: Item[]; setItems: (i: Item[]) => void }) {
	function add() {
		setItems([...items, { id: uid('it_'), name: '', dosage: '', frequency: '', duration: '', quantity: 1, instructions: '' }]);
	}
	function remove(id: string) {
		setItems(items.filter((it) => it.id !== id));
	}
	function update(id: string, patch: Partial<Item>) {
		setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
	}

	return (
		<div className="rounded-2xl bg-white border border-blue-100 p-4 space-y-4 shadow-sm">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-slate-900">Ítems de prescripción</h3>
				<button type="button" onClick={add} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow hover:from-teal-700 hover:to-cyan-700">
					<Plus size={14} /> Añadir ítem
				</button>
			</div>

			<div className="space-y-3">
				{items.length === 0 && <div className="text-sm text-slate-700">No hay ítems — añade medicamentos o instrucciones.</div>}

				{items.map((it) => (
					<div key={it.id} className="border border-blue-100 rounded-lg p-3 bg-blue-50/50 grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
						<div className="md:col-span-3">
							<label className="text-xs text-slate-800 font-medium">Medicamento</label>
							<input className="w-full mt-1 px-3 py-2 rounded-md border border-blue-200 bg-white text-slate-900" placeholder="Nombre (ej. Amoxicilina)" value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} required />
						</div>

						<div className="md:col-span-1">
							<label className="text-xs text-slate-800 font-medium">Dosis</label>
							<input className="w-full mt-1 px-3 py-2 rounded-md border border-blue-200 bg-white text-slate-900" placeholder="500 mg" value={it.dosage} onChange={(e) => update(it.id, { dosage: e.target.value })} />
						</div>

						<div className="md:col-span-1">
							<label className="text-xs text-slate-800 font-medium">Frecuencia</label>
							<input className="w-full mt-1 px-3 py-2 rounded-md border border-blue-200 bg-white text-slate-900" placeholder="8/8 hrs" value={it.frequency} onChange={(e) => update(it.id, { frequency: e.target.value })} />
						</div>

						<div className="md:col-span-1 flex flex-col items-end gap-2">
							<label className="text-xs text-slate-800 font-medium">Cant.</label>
							<div className="w-full">
								<input type="number" min={1} className="w-full mt-1 px-3 py-2 rounded-md border border-blue-200 bg-white text-slate-900 text-right" value={it.quantity ?? 1} onChange={(e) => update(it.id, { quantity: Number(e.target.value) })} />
							</div>

							<button type="button" onClick={() => remove(it.id)} className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-700" aria-label={`Eliminar item ${it.name}`}>
								<Trash size={14} /> Eliminar
							</button>
						</div>

						<div className="md:col-span-6">
							<label className="text-xs text-slate-800 font-medium">Instrucciones</label>
							<input className="w-full mt-1 px-3 py-2 rounded-md border border-blue-200 bg-white text-slate-900" placeholder="Tomar con alimentos, evitar alcohol, etc." value={it.instructions} onChange={(e) => update(it.id, { instructions: e.target.value })} />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/* -------------------------
   PrescriptionForm (principal)
   - layout with clear visual hierarchy
   ------------------------- */
export default function PrescriptionForm({ consultationId, patientId, doctorId, existingPrescription }: Props) {
	const [items, setItems] = useState<Item[]>([]);
	const [notes, setNotes] = useState('');
	const [validUntil, setValidUntil] = useState<string>('');
	const [files, setFiles] = useState<File[]>([]);
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isEditMode, setIsEditMode] = useState(false);

	// Cargar datos existentes si hay prescripción
	useEffect(() => {
		if (existingPrescription) {
			setIsEditMode(true);
			setNotes(existingPrescription.notes || '');
			setValidUntil(existingPrescription.valid_until ? new Date(existingPrescription.valid_until).toISOString().split('T')[0] : '');
			
			// Cargar items existentes
			if (existingPrescription.prescription_item && Array.isArray(existingPrescription.prescription_item)) {
				const loadedItems: Item[] = existingPrescription.prescription_item.map((item) => ({
					id: item.id,
					name: item.name || '',
					dosage: item.dosage || '',
					frequency: item.frequency || '',
					duration: item.duration || '',
					quantity: item.quantity || 1,
					instructions: item.instructions || '',
				}));
				setItems(loadedItems);
			}
		}
	}, [existingPrescription]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		if (!consultationId || !patientId || !doctorId) {
			setError('Faltan datos requeridos (consulta / paciente / doctor).');
			return;
		}

		if (items.length === 0 && !confirm('No has añadido ítems. ¿Deseas continuar con una prescripción vacía?')) {
			return;
		}

		setLoading(true);

		try {
			// Si estamos en modo edición, actualizar la prescripción existente
			if (isEditMode && existingPrescription) {
				const form = new FormData();
				form.append('prescription_id', existingPrescription.id);
				form.append('consultation_id', consultationId);
				form.append('patient_id', String(patientId));
				form.append('doctor_id', String(doctorId));
				form.append('notes', notes ?? '');
				if (validUntil) form.append('valid_until', validUntil);
				form.append('items', JSON.stringify(items));

				files.forEach((f) => form.append('files', f, f.name));

				const res = await fetch('/api/prescriptions', {
					method: 'PATCH',
					body: form,
				});

				const data = await res.json();
				if (!res.ok) throw new Error(data?.error || 'Error actualizando prescripción');

				setSuccess('Prescripción actualizada correctamente.');
				setLoading(false);

				setTimeout(() => {
					router.push(`/dashboard/medic/consultas/${consultationId}`);
				}, 800);
			} else {
				// Crear nueva prescripción
				const form = new FormData();
				form.append('consultation_id', consultationId);
				form.append('patient_id', String(patientId));
				form.append('doctor_id', String(doctorId));
				form.append('notes', notes ?? '');
				if (validUntil) form.append('valid_until', validUntil);
				form.append('items', JSON.stringify(items));

				files.forEach((f) => form.append('files', f, f.name));

				const res = await fetch('/api/prescriptions', {
					method: 'POST',
					body: form,
				});

				const data = await res.json();
				if (!res.ok) throw new Error(data?.error || 'Error creando prescripción');

				setSuccess('Prescripción creada correctamente.');
				setLoading(false);

				setTimeout(() => {
					router.push(`/dashboard/medic/consultas/${consultationId}`);
				}, 800);
			}
		} catch (err: any) {
			setError(err?.message ?? String(err));
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Header card */}
			<div className="rounded-2xl bg-gradient-to-r from-white to-blue-50 border border-blue-100 p-5 shadow-sm">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 className="text-xl md:text-2xl font-semibold text-slate-900">
							{isEditMode ? 'Editar Prescripción Médica' : 'Crear Prescripción Médica'}
						</h2>
						<p className="mt-1 text-sm text-slate-800">
							{isEditMode 
								? 'Actualiza los medicamentos prescritos y adjunta documentos adicionales si es necesario.'
								: 'Registra los medicamentos prescritos y adjunta el <strong>informe médico</strong> y la <strong>receta médica</strong> para que el paciente tenga constancia digital de su consulta.'
							}
						</p>
						{isEditMode && existingPrescription && (
							<div className="mt-2 px-3 py-1.5 bg-blue-100 border border-blue-200 rounded-lg">
								<p className="text-xs text-blue-800">
									<strong>Prescripción creada:</strong> {new Date(existingPrescription.created_at).toLocaleDateString('es-ES', {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</p>
							</div>
						)}
					</div>

					<div className="text-right">
						<div className="text-xs text-slate-700">Consulta</div>
						<div className="font-mono font-medium text-slate-900">{consultationId}</div>
					</div>
				</div>

				<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<label className="text-xs text-slate-800 font-medium">Validez (opcional)</label>
						<input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border border-blue-200 bg-white text-slate-900" />
						<p className="text-xs text-slate-700 mt-1">Fecha límite de validez de la prescripción.</p>
					</div>

					<div>
						<label className="text-xs text-slate-800 font-medium">Notas / Indicaciones generales</label>
						<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones para el paciente o instrucciones generales..." className="mt-1 w-full px-3 py-2 rounded-md border border-blue-200 bg-white text-slate-900" />
					</div>
				</div>
			</div>

			{/* Items editor */}
			<PrescriptionItemsEditor items={items} setItems={setItems} />

			{/* File uploader */}
			<div className="rounded-2xl bg-white border border-blue-100 p-5 shadow-sm">
				<FileUploader files={files} setFiles={setFiles} />
			</div>

			{/* Messages */}
			{error && <div className="rounded-md bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}
			{success && <div className="rounded-md bg-emerald-50 text-emerald-700 p-3 text-sm">{success}</div>}

			{/* Actions */}
			<div className="flex items-center gap-3">
				<button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow hover:from-teal-700 hover:to-cyan-700 hover:scale-[1.01] transition disabled:opacity-50">
					{loading ? <Loader2 className="animate-spin" /> : <span>{isEditMode ? 'Actualizar prescripción' : 'Crear prescripción'}</span>}
				</button>

				<button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-lg border border-blue-200 bg-white text-slate-800 hover:bg-blue-50 transition">
					Cancelar
				</button>

				<div className="ml-auto text-xs text-slate-800">
					<div className="hidden sm:block">Los documentos y la receta quedarán guardados digitalmente para el paciente</div>
				</div>
			</div>
		</form>
	);
}
