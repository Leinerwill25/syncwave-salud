'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash, FileDown, Save, FileCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Item = {
	id: string;
	name: string;
	dosage?: string;
	form?: string; // Forma/presentación del medicamento
	frequency?: string; // Se genera automáticamente desde frequencyHours y frequencyDays
	frequencyHours?: number | null; // Cada cuántas horas
	frequencyDays?: number | null; // Por cuántos días
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
	patientId?: string | null;
	unregisteredPatientId?: string | null;
	doctorId?: string;
	existingPrescription?: ExistingPrescription | null;
};

function uid(prefix = '') {
	return prefix + Math.random().toString(36).slice(2, 9);
}

/* -------------------------
   PrescriptionItemsEditor
   - clean grid
   - compact controls
   ------------------------- */
// Helper para generar texto descriptivo de frecuencia
function generateFrequencyText(hours: number | null | undefined, days: number | null | undefined): string {
	if (!hours || !days) return '';
	if (hours === 24) {
		return `1 vez al día por ${days} día${days > 1 ? 's' : ''}`;
	}
	return `Cada ${hours} hora${hours > 1 ? 's' : ''} por ${days} día${days > 1 ? 's' : ''}`;
}

// Helper para parsear frecuencia antigua (ej: "8/8 hrs" o "cada 8 horas por 7 días")
function parseOldFrequency(frequency: string | null | undefined): { hours: number | null; days: number | null } {
	if (!frequency) return { hours: null, days: null };

	const freqLower = frequency.toLowerCase().trim();

	// Intentar parsear formato "8/8" o "8/8 hrs"
	const slashMatch = freqLower.match(/(\d+)\s*\/\s*(\d+)/);
	if (slashMatch) {
		return { hours: parseInt(slashMatch[1], 10), days: parseInt(slashMatch[2], 10) };
	}

	// Intentar parsear formato "cada X horas por Y días"
	const cadaMatch = freqLower.match(/cada\s+(\d+)\s+horas?\s+por\s+(\d+)\s+d[ií]as?/);
	if (cadaMatch) {
		return { hours: parseInt(cadaMatch[1], 10), days: parseInt(cadaMatch[2], 10) };
	}

	// Intentar parsear solo "cada X horas" (sin días)
	const soloCadaMatch = freqLower.match(/cada\s+(\d+)\s+horas?/);
	if (soloCadaMatch) {
		return { hours: parseInt(soloCadaMatch[1], 10), days: null };
	}

	return { hours: null, days: null };
}

// Opciones de formas/presentaciones de medicamentos organizadas por categorías
const medicationForms = [
	{
		title: 'Tableta, Comprimido o Cápsula y Suspensión, Inyectable, Polvo, Ampolla',
		options: [
			{ value: 'Tableta', label: 'Tableta' },
			{ value: 'Comprimido', label: 'Comprimido' },
			{ value: 'Cápsula', label: 'Cápsula' },
			{ value: 'Suspensión', label: 'Suspensión' },
			{ value: 'Inyectable', label: 'Inyectable' },
			{ value: 'Polvo', label: 'Polvo' },
			{ value: 'Ampolla', label: 'Ampolla' },
		],
	},
	{
		title: 'Granulados',
		options: [{ value: 'Granulados', label: 'Granulados' }],
	},
	{
		title: 'Supositorios y Óvulos',
		options: [
			{ value: 'Supositorio', label: 'Supositorio' },
			{ value: 'Óvulo', label: 'Óvulo' },
		],
	},
	{
		title: 'Crema, Pomada o Geles Semi Sólidos',
		options: [
			{ value: 'Crema', label: 'Crema' },
			{ value: 'Pomada', label: 'Pomada' },
			{ value: 'Gel', label: 'Gel' },
		],
	},
	{
		title: 'Líquidos: Solución, Jarabes, Suspensión, Gotas, Lociones',
		options: [
			{ value: 'Solución', label: 'Solución' },
			{ value: 'Jarabe', label: 'Jarabe' },
			{ value: 'Suspensión Líquida', label: 'Suspensión Líquida' },
			{ value: 'Gotas', label: 'Gotas' },
			{ value: 'Loción', label: 'Loción' },
		],
	},
	{
		title: 'Aerosoles o Aerosoles',
		options: [{ value: 'Aerosol', label: 'Aerosol' }],
	},
	{
		title: 'Parches Transdérmicos',
		options: [{ value: 'Parche Transdérmico', label: 'Parche Transdérmico' }],
	},
];

function PrescriptionItemsEditor({ items, setItems }: { items: Item[]; setItems: (i: Item[]) => void }) {
	function add() {
		setItems([...items, { id: uid('it_'), name: '', dosage: '', form: '', frequency: '', frequencyHours: null, frequencyDays: null, duration: '', quantity: 1, instructions: '' }]);
	}
	function remove(id: string) {
		setItems(items.filter((it) => it.id !== id));
	}
	function update(id: string, patch: Partial<Item>) {
		const updatedItem = { ...patch };

		// Si se actualizan frequencyHours o frequencyDays, generar el texto de frequency automáticamente
		if ('frequencyHours' in patch || 'frequencyDays' in patch) {
			const item = items.find((it) => it.id === id);
			const hours = 'frequencyHours' in patch ? patch.frequencyHours : item?.frequencyHours;
			const days = 'frequencyDays' in patch ? patch.frequencyDays : item?.frequencyDays;
			updatedItem.frequency = generateFrequencyText(hours, days);
		}

		setItems(items.map((it) => (it.id === id ? { ...it, ...updatedItem } : it)));
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
						<div className="md:col-span-2">
							<label className="text-xs text-slate-800 font-medium">Medicamento</label>
							<input className="w-full mt-1 px-3 py-2 rounded-md border border-blue-200 bg-white text-slate-900" placeholder="Nombre (ej. Amoxicilina)" value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} required />
						</div>

						<div className="md:col-span-1">
							<label className="text-xs text-slate-800 font-medium">Presentación</label>
							<select className="w-full mt-1 px-3 py-2 rounded-md border border-blue-200 bg-white text-slate-900" value={it.form || ''} onChange={(e) => update(it.id, { form: e.target.value })}>
								<option value="">Seleccionar...</option>
								{medicationForms.map((group) => (
									<optgroup key={group.title} label={group.title}>
										{group.options.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</optgroup>
								))}
							</select>
						</div>

						<div className="md:col-span-1">
							<label className="text-xs text-slate-800 font-medium">Dosis</label>
							<input className="w-full mt-1 px-3 py-2 rounded-md border border-blue-200 bg-white text-slate-900" placeholder="500 mg" value={it.dosage} onChange={(e) => update(it.id, { dosage: e.target.value })} />
						</div>

						<div className="md:col-span-2 grid grid-cols-2 gap-2">
							<div>
								<label className="text-xs text-slate-800 font-medium">Cada cuántas horas</label>
								<input type="number" min="1" max="24" className="w-full mt-1 px-3 py-2 rounded-md border border-blue-200 bg-white text-slate-900" placeholder="Ej: 8" value={it.frequencyHours ?? ''} onChange={(e) => update(it.id, { frequencyHours: e.target.value ? parseInt(e.target.value, 10) : null })} />
							</div>
							<div>
								<label className="text-xs text-slate-800 font-medium">Por cuántos días</label>
								<input type="number" min="1" className="w-full mt-1 px-3 py-2 rounded-md border border-blue-200 bg-white text-slate-900" placeholder="Ej: 7" value={it.frequencyDays ?? ''} onChange={(e) => update(it.id, { frequencyDays: e.target.value ? parseInt(e.target.value, 10) : null })} />
							</div>
							{it.frequency && <div className="col-span-2 text-xs text-slate-600 mt-1 italic">{it.frequency}</div>}
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
export default function PrescriptionForm({ consultationId, patientId, unregisteredPatientId, doctorId, existingPrescription }: Props) {
	const [items, setItems] = useState<Item[]>([]);
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isEditMode, setIsEditMode] = useState(false);
	const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);
	const [generatingPrescription, setGeneratingPrescription] = useState(false);
	const [savingPrescription, setSavingPrescription] = useState(false);
	const [fontFamily, setFontFamily] = useState<string>('Arial');

	// Fuentes profesionales disponibles
	const availableFonts = [
		{ value: 'Arial', label: 'Arial' },
		{ value: 'Calibri', label: 'Calibri' },
		{ value: 'Georgia', label: 'Georgia' },
		{ value: 'Cambria', label: 'Cambria' },
		{ value: 'Garamond', label: 'Garamond' },
		{ value: 'Microsoft JhengHei', label: 'Microsoft JhengHei' },
	];

	// Función para cargar items de prescripción desde la base de datos
	const loadPrescriptionItems = async () => {
		try {
			const res = await fetch(`/api/consultations/${consultationId}/prescription-items`, {
				method: 'GET',
				credentials: 'include',
			});

			if (res.ok) {
				const data = await res.json();
				if (data.items && Array.isArray(data.items)) {
					const loadedItems: Item[] = data.items.map((item: any) => {
						// Parsear frecuencia antigua si existe
						const parsed = parseOldFrequency(item.frequency);
						return {
							id: item.id,
							name: item.name || '',
							dosage: item.dosage || '',
							form: item.form || '',
							frequency: item.frequency || '',
							frequencyHours: parsed.hours,
							frequencyDays: parsed.days,
							duration: item.duration || '',
							quantity: item.quantity || 1,
							instructions: item.instructions || '',
						};
					});
					setItems(loadedItems);
					setIsEditMode(true);
				}
			}
		} catch (err) {
			console.error('[PrescriptionForm] Error cargando items:', err);
			// No mostrar error al usuario, solo loguear
		}
	};

	// Cargar datos existentes si hay prescripción
	useEffect(() => {
		if (existingPrescription) {
			setIsEditMode(true);

			// Cargar items existentes
			if (existingPrescription.prescription_item && Array.isArray(existingPrescription.prescription_item)) {
				const loadedItems: Item[] = existingPrescription.prescription_item.map((item) => {
					// Parsear frecuencia antigua si existe
					const parsed = parseOldFrequency(item.frequency);
					return {
						id: item.id,
						name: item.name || '',
						dosage: item.dosage || '',
						form: item.form || '', // Incluir forma/presentación
						frequency: item.frequency || '',
						frequencyHours: parsed.hours,
						frequencyDays: parsed.days,
						duration: item.duration || '',
						quantity: item.quantity || 1,
						instructions: item.instructions || '',
					};
				});
				setItems(loadedItems);
			}
		}
	}, [existingPrescription]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		// Validar que haya al menos un tipo de paciente (registrado o no registrado)
		if (!consultationId || (!patientId && !unregisteredPatientId) || !doctorId) {
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
				if (patientId) {
					form.append('patient_id', String(patientId));
				}
				if (unregisteredPatientId) {
					form.append('unregistered_patient_id', String(unregisteredPatientId));
				}
				form.append('doctor_id', String(doctorId));
				// Preparar items para guardar: asegurar que frequency esté generado desde frequencyHours y frequencyDays
				const itemsToSave = items.map((item) => {
					const frequencyText = item.frequency || generateFrequencyText(item.frequencyHours, item.frequencyDays);
					return {
						...item,
						frequency: frequencyText,
						// No guardar frequencyHours y frequencyDays en la BD, solo frequency como texto
					};
				});
				form.append('items', JSON.stringify(itemsToSave));

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
				if (patientId) {
					form.append('patient_id', String(patientId));
				}
				if (unregisteredPatientId) {
					form.append('unregistered_patient_id', String(unregisteredPatientId));
				}
				form.append('doctor_id', String(doctorId));
				// Preparar items para guardar: asegurar que frequency esté generado desde frequencyHours y frequencyDays
				const itemsToSave = items.map((item) => {
					const frequencyText = item.frequency || generateFrequencyText(item.frequencyHours, item.frequencyDays);
					return {
						...item,
						frequency: frequencyText,
						// No guardar frequencyHours y frequencyDays en la BD, solo frequency como texto
					};
				});
				form.append('items', JSON.stringify(itemsToSave));

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
						<h2 className="text-xl md:text-2xl font-semibold text-slate-900">{isEditMode ? 'Editar Prescripción Médica' : 'Crear Prescripción Médica'}</h2>
						<p className="mt-1 text-sm text-slate-800">{isEditMode ? 'Actualiza los medicamentos prescritos.' : 'Registra los medicamentos prescritos para que el paciente tenga constancia digital de su consulta.'}</p>
						{isEditMode && existingPrescription && (
							<div className="mt-2 px-3 py-1.5 bg-blue-100 border border-blue-200 rounded-lg">
								<p className="text-xs text-blue-800">
									<strong>Prescripción creada:</strong>{' '}
									{new Date(existingPrescription.created_at).toLocaleDateString('es-ES', {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit',
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
			</div>

			{/* Items editor */}
			<PrescriptionItemsEditor items={items} setItems={setItems} />

			{/* Sección de medicamentos guardados - solo mostrar si hay items y estamos en modo edición */}
			{isEditMode && items.length > 0 && (
				<div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6 shadow-lg">
					<div className="flex items-center gap-3 mb-4">
						<FileCheck className="w-6 h-6 text-green-600" />
						<h3 className="text-lg font-semibold text-slate-900">Medicamentos Guardados en la Receta</h3>
					</div>
					<p className="text-sm text-slate-700 mb-4">Los siguientes medicamentos ya están guardados en la receta de esta consulta:</p>
					<div className="space-y-3">
						{items.map((item) => (
							<div key={item.id} className="bg-white rounded-lg border border-green-200 p-4 shadow-sm hover:shadow-md transition-shadow">
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											<h4 className="font-semibold text-slate-900">{item.name || 'Medicamento'}</h4>
											{item.dosage && <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">{item.dosage}</span>}
											{item.form && <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">{item.form}</span>}
										</div>
										<div className="text-sm text-slate-700 space-y-1">
											{item.frequency && (
												<div>
													<span className="font-medium">Frecuencia:</span> {item.frequency}
												</div>
											)}
											{item.duration && (
												<div>
													<span className="font-medium">Duración:</span> {item.duration}
												</div>
											)}
											{item.quantity && (
												<div>
													<span className="font-medium">Cantidad:</span> {item.quantity}
												</div>
											)}
											{item.instructions && (
												<div>
													<span className="font-medium">Instrucciones:</span> {item.instructions}
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
					<p className="text-xs text-slate-600 mt-4 italic">💡 Puedes agregar más medicamentos usando el formulario arriba y guardarlos nuevamente.</p>
				</div>
			)}

			{/* Prescription Generation Section - Always visible when there are items */}
			{items.length > 0 && (
				<div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-6 shadow-lg">
					<div className="flex items-center gap-3 mb-4">
						<FileCheck className="w-6 h-6 text-indigo-600" />
						<h3 className="text-lg font-semibold text-slate-900">Generar Receta desde Plantilla</h3>
					</div>
					<p className="text-sm text-slate-700 mb-4">
						Genera un archivo Word de la receta usando tu plantilla personalizada. El archivo contiene ambas hojas: una con el <strong>récipe completo</strong> de todos los medicamentos (variable {'{{recipe}}'}), incluyendo las <strong>instrucciones específicas</strong> de cada medicamento (variable {'{{instrucciones}}'}), y otra hoja con las <strong>indicaciones generales</strong> de la prescripción (variable {'{{indicaciones}}'}). Puedes generar la receta mientras escribes, sin necesidad de guardar primero.
					</p>

					{/* Font selector */}
					<div className="mb-4">
						<label className="block text-sm font-medium text-slate-700 mb-2">Fuente de la Receta</label>
						<select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" style={{ fontFamily: fontFamily }}>
							{availableFonts.map((font) => (
								<option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
									{font.label}
								</option>
							))}
						</select>
						<p className="mt-1 text-xs text-slate-500">La fuente seleccionada se aplicará al generar la receta.</p>
					</div>

					{/* Generate and Download buttons side by side */}
					<div className="flex flex-col sm:flex-row gap-3 mb-4">
						<button
							type="button"
							onClick={async () => {
								setGeneratingPrescription(true);
								setError(null);
								setSuccess(null);

								try {
									// Preparar items para enviar (incluyendo frequency generada si aplica)
									const itemsToSend = items.map((item) => {
										const frequencyText = item.frequency || generateFrequencyText(item.frequencyHours, item.frequencyDays);
										return {
											name: item.name,
											dosage: item.dosage,
											form: item.form || '', // Incluir forma/presentación del medicamento
											frequency: frequencyText,
											duration: item.duration,
											quantity: item.quantity,
											instructions: item.instructions,
										};
									});

									const res = await fetch(`/api/consultations/${consultationId}/generate-prescription`, {
										method: 'POST',
										credentials: 'include',
										headers: {
											'Content-Type': 'application/json',
										},
										body: JSON.stringify({
											items: itemsToSend,
											issued_at: existingPrescription?.issued_at || null,
											prescription_id: existingPrescription?.id || null,
											font_family: fontFamily,
										}),
									});

									const data = await res.json();

									if (!res.ok) {
										throw new Error(data.error || 'Error al generar receta');
									}

									setPrescriptionUrl(data.prescription_url);
									setSuccess('Receta generada exitosamente. Puedes descargarla o guardarla en la base de datos.');
								} catch (err: any) {
									setError(err.message || 'Error al generar receta');
								} finally {
									setGeneratingPrescription(false);
								}
							}}
							disabled={generatingPrescription || items.length === 0}
							className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed">
							{generatingPrescription ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									Generando...
								</>
							) : (
								<>
									<FileCheck className="w-5 h-5" />
									Generar Prescripción
								</>
							)}
						</button>

						{prescriptionUrl && (
							<button
								type="button"
								onClick={() => {
									window.open(prescriptionUrl, '_blank');
								}}
								className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow hover:scale-[1.01] transition">
								<FileDown className="w-5 h-5" />
								Descargar Receta (Word)
							</button>
						)}
					</div>

					{/* Save to database button - full width below */}
					{prescriptionUrl && (
						<button
							type="button"
							onClick={async () => {
								setSavingPrescription(true);
								setError(null);
								setSuccess(null);

								try {
									// Preparar items para enviar (incluyendo frequency generada si aplica)
									const itemsToSave = items.map((item) => {
										const frequencyText = item.frequency || generateFrequencyText(item.frequencyHours, item.frequencyDays);
										return {
											name: item.name,
											dosage: item.dosage,
											form: item.form || '',
											frequency: frequencyText,
											duration: item.duration,
											quantity: item.quantity,
											instructions: item.instructions,
										};
									});

									const res = await fetch(`/api/consultations/${consultationId}/save-prescription`, {
										method: 'POST',
										credentials: 'include',
										headers: {
											'Content-Type': 'application/json',
										},
										body: JSON.stringify({
											prescriptionUrl: prescriptionUrl,
											items: itemsToSave,
										}),
									});

									const data = await res.json();

									if (!res.ok) {
										throw new Error(data.error || 'Error al guardar receta en la base de datos');
									}

									// Recargar los items desde la base de datos para mostrarlos
									await loadPrescriptionItems();

									setSuccess('Receta guardada exitosamente en la base de datos. El paciente podrá visualizarla desde su panel.');
								} catch (err: any) {
									setError(err.message || 'Error al guardar receta');
								} finally {
									setSavingPrescription(false);
								}
							}}
							disabled={savingPrescription}
							className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed">
							{savingPrescription ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									Guardando...
								</>
							) : (
								<>
									<Save className="w-5 h-5" />
									Guardar Receta en Base de Datos
								</>
							)}
						</button>
					)}
				</div>
			)}

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
					<div className="hidden sm:block">La receta quedará guardada digitalmente para el paciente</div>
				</div>
			</div>
		</form>
	);
}
