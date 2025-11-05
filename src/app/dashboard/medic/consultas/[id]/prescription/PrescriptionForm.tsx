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

type Props = {
	consultationId: string;
	patientId?: string;
	doctorId?: string;
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
			<label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Adjuntar archivos</label>

			<div onDrop={onDrop} onDragOver={(e) => e.preventDefault()} onClick={openPicker} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openPicker()} className="group relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-linear-to-b from-white to-slate-50 dark:from-[#041821] dark:to-[#04111a] hover:shadow-lg transition cursor-pointer" aria-label="Área para arrastrar o adjuntar archivos">
				<input ref={inputRef} type="file" multiple accept={ACCEPT_TYPES.join(',')} className="hidden" onChange={(e) => pushFiles(e.target.files)} />

				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-700 text-teal-700 dark:text-white shadow-sm">
							<Paperclip size={18} />
						</div>

						<div>
							<p className="font-medium text-slate-800 dark:text-slate-100">Arrastra o selecciona archivos</p>
							<p className="text-xs text-slate-500 dark:text-slate-300">PNG, JPG, WEBP, PDF, DOC, DOCX • Máx 10 MB por archivo</p>
						</div>
					</div>

					<div>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								inputRef.current?.click();
							}}
							className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-linear-to-r from-teal-600 to-cyan-500 text-white shadow">
							<Paperclip size={14} /> Adjuntar
						</button>
					</div>
				</div>

				{files.length > 0 && (
					<div className="mt-4 grid grid-cols-1 gap-2">
						{files.map((f, i) => {
							const isImage = f.type.startsWith('image/');
							const key = f.name + f.size;
							const previewUrl = urls[key];

							return (
								<div key={i} className="flex items-center justify-between gap-3 bg-white dark:bg-[#04202b] border border-slate-100 dark:border-slate-800 rounded-lg p-3">
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-14 h-14 rounded-md flex items-center justify-center bg-slate-50 dark:bg-slate-800 overflow-hidden">
											{isImage && previewUrl ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img src={previewUrl} alt={f.name} className="w-full h-full object-cover" />
											) : (
												<div className="flex flex-col items-center justify-center text-slate-500">
													{getExtension(f.name) === 'pdf' ? <FileText size={28} /> : <ImgIcon size={28} />}
													<span className="sr-only">{f.name}</span>
												</div>
											)}
										</div>

										<div className="min-w-0">
											<div className="text-sm font-medium text-slate-800 dark:text-slate-100 break-all">{f.name}</div>
											<div className="text-xs text-slate-400">{humanFileSize(f.size)}</div>
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
		<div className="rounded-2xl bg-white dark:bg-[#04202b] border border-slate-100 dark:border-slate-800 p-4 space-y-4 shadow-sm">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Ítems de prescripción</h3>
				<button type="button" onClick={add} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-600 text-white shadow">
					<Plus size={14} /> Añadir ítem
				</button>
			</div>

			<div className="space-y-3">
				{items.length === 0 && <div className="text-sm text-slate-500">No hay ítems — añade medicamentos o instrucciones.</div>}

				{items.map((it) => (
					<div key={it.id} className="border rounded-lg p-3 bg-slate-50 dark:bg-transparent grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
						<div className="md:col-span-3">
							<label className="text-xs text-slate-600 dark:text-slate-300">Medicamento</label>
							<input className="w-full mt-1 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820]" placeholder="Nombre (ej. Amoxicilina)" value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} required />
						</div>

						<div className="md:col-span-1">
							<label className="text-xs text-slate-600 dark:text-slate-300">Dosis</label>
							<input className="w-full mt-1 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820]" placeholder="500 mg" value={it.dosage} onChange={(e) => update(it.id, { dosage: e.target.value })} />
						</div>

						<div className="md:col-span-1">
							<label className="text-xs text-slate-600 dark:text-slate-300">Frecuencia</label>
							<input className="w-full mt-1 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820]" placeholder="8/8 hrs" value={it.frequency} onChange={(e) => update(it.id, { frequency: e.target.value })} />
						</div>

						<div className="md:col-span-1 flex flex-col items-end gap-2">
							<label className="text-xs text-slate-600 dark:text-slate-300">Cant.</label>
							<div className="w-full">
								<input type="number" min={1} className="w-full mt-1 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820] text-right" value={it.quantity ?? 1} onChange={(e) => update(it.id, { quantity: Number(e.target.value) })} />
							</div>

							<button type="button" onClick={() => remove(it.id)} className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-rose-600 text-white" aria-label={`Eliminar item ${it.name}`}>
								<Trash size={14} /> Eliminar
							</button>
						</div>

						<div className="md:col-span-6">
							<label className="text-xs text-slate-600 dark:text-slate-300">Instrucciones</label>
							<input className="w-full mt-1 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820]" placeholder="Tomar con alimentos, evitar alcohol, etc." value={it.instructions} onChange={(e) => update(it.id, { instructions: e.target.value })} />
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
export default function PrescriptionForm({ consultationId, patientId, doctorId }: Props) {
	const [items, setItems] = useState<Item[]>([]);
	const [notes, setNotes] = useState('');
	const [validUntil, setValidUntil] = useState<string>('');
	const [files, setFiles] = useState<File[]>([]);
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

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

			// navigate back to consultation or to prescription detail if available
			setTimeout(() => {
				router.push(`/dashboard/medic/consultas/${consultationId}`);
			}, 800);
		} catch (err: any) {
			setError(err?.message ?? String(err));
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Header card */}
			<div className="rounded-2xl bg-inear-to-r from-white to-slate-50 dark:from-[#06171a] dark:to-[#031018] border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100">Crear Prescripción</h2>
						<p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Registra la prescripción para esta consulta y adjunta el informe si lo deseas.</p>
					</div>

					<div className="text-right">
						<div className="text-xs text-slate-500 dark:text-slate-400">Consulta</div>
						<div className="font-mono font-medium text-slate-800 dark:text-slate-100">{consultationId}</div>
					</div>
				</div>

				<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<label className="text-xs text-slate-600 dark:text-slate-300">Validez (opcional)</label>
						<input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820]" />
						<p className="text-xs text-slate-400 mt-1">Fecha límite de validez de la prescripción.</p>
					</div>

					<div>
						<label className="text-xs text-slate-600 dark:text-slate-300">Notas / Indicaciones generales</label>
						<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones para el paciente o instrucciones generales..." className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#031820]" />
					</div>
				</div>
			</div>

			{/* Items editor */}
			<PrescriptionItemsEditor items={items} setItems={setItems} />

			{/* File uploader */}
			<div className="rounded-2xl bg-white dark:bg-[#04202b] border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
				<FileUploader files={files} setFiles={setFiles} />
			</div>

			{/* Messages */}
			{error && <div className="rounded-md bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}
			{success && <div className="rounded-md bg-emerald-50 text-emerald-700 p-3 text-sm">{success}</div>}

			{/* Actions */}
			<div className="flex items-center gap-3">
				<button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-teal-600 to-cyan-500 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50">
					{loading ? <Loader2 className="animate-spin" /> : <span>Crea prescripción</span>}
				</button>

				<button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition dark:border-slate-800 dark:bg-[#031821] dark:text-slate-200">
					Cancelar
				</button>

				<div className="ml-auto text-xs text-slate-500 dark:text-slate-400">Guardado en la nube y accesible por especialistas autorizados</div>
			</div>
		</form>
	);
}
