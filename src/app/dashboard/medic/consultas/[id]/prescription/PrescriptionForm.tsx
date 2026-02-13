'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash, FileDown, Save, FileCheck, FileText, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { extractTextFromDocx } from '@/lib/docx-parser';
import { renderAsync } from 'docx-preview'; // <--- Import docx-preview

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

type Template = {
	id: string;
	name: string;
	file_path: string;
	file_url?: string;
};

type ExistingPrescription = {
	id: string;
	notes: string | null;
	recipe_text?: string | null; // <--- Add this
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

// ... existing helper functions ...

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

	// Template States
	const [templates, setTemplates] = useState<Template[]>([]);
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
	const [recipeBody, setRecipeBody] = useState<string>('');
	const [loadingTemplates, setLoadingTemplates] = useState(false);
	const [extractingText, setExtractingText] = useState(false);
	const [zoom, setZoom] = useState(0.6); // Zoom inicial mas pequeño para ver hoja completa

	// Drag to Scroll Logic
	const previewContainerRef = React.useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [startX, setStartX] = useState(0);
	const [startY, setStartY] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const [scrollTop, setScrollTop] = useState(0);

	const handleMouseDown = (e: React.MouseEvent) => {
		if (!previewContainerRef.current) return;
		setIsDragging(true);
		setStartX(e.pageX - previewContainerRef.current.offsetLeft);
		setStartY(e.pageY - previewContainerRef.current.offsetTop);
		setScrollLeft(previewContainerRef.current.scrollLeft);
		setScrollTop(previewContainerRef.current.scrollTop);
	};

	const handleMouseLeave = () => {
		setIsDragging(false);
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDragging || !previewContainerRef.current) return;
		e.preventDefault();
		const x = e.pageX - previewContainerRef.current.offsetLeft;
		const y = e.pageY - previewContainerRef.current.offsetTop;
		const walkX = (x - startX) * 1.5; // Velocidad de scroll
		const walkY = (y - startY) * 1.5;
		previewContainerRef.current.scrollLeft = scrollLeft - walkX;
		previewContainerRef.current.scrollTop = scrollTop - walkY;
	};

	// Load templates on mount
	useEffect(() => {
		const loadTemplates = async () => {
			try {
				setLoadingTemplates(true);
				const res = await fetch('/api/medic/prescription-templates');
				if (res.ok) {
					const data = await res.json();
					setTemplates(data.templates || []);
				}
			} catch (err) {
				console.error('Error loading templates:', err);
			} finally {
				setLoadingTemplates(false);
			}
		};
		loadTemplates();
	}, []);

	// Handle Template Selection
	const handleTemplateSelect = async (templateId: string) => {
		setSelectedTemplateId(templateId);
		
		// Limpiar si se deselecciona
		if (!templateId) {
			setRecipeBody('');
			const container = document.getElementById('docx-preview-container');
			if (container) container.innerHTML = '';
			return;
		}

		const template = templates.find((t) => t.id === templateId);
		if (!template) return;

		try {
			setExtractingText(true);
			
			// Si no hay URL (raro), intentar recargar o avisar
			if (!template.file_url && template.file_path) {
				// Aquí podríamos intentar obtener la URL de nuevo si fuera necesario
				console.warn('Template has path but no URL:', template);
			}
			
			const fileUrl = template.file_url;
			if (!fileUrl) throw new Error('No se pudo obtener la URL del archivo de la plantilla.');

			// Download file
			const res = await fetch(fileUrl);
			if (!res.ok) throw new Error('Error descargando archivo de plantilla');
			
			const blob = await res.blob();
			const arrayBuffer = await blob.arrayBuffer();
			
			// 1. Render Preview
			const container = document.getElementById('docx-preview-container');
			if (container) {
				// Limpiar contenedor
				container.innerHTML = '';
				// Renderizar usando docx-preview
				await renderAsync(blob, container, container, {
					className: 'docx-preview',
					inWrapper: false,
					ignoreWidth: false,
					ignoreHeight: false,
				});
			}

			// 2. Extract Text
			const text = await extractTextFromDocx(arrayBuffer);
			setRecipeBody(text);
			
		} catch (err: any) {
			console.error('Error processing template:', err);
			setError(err.message || 'Error al procesar la plantilla.');
		} finally {
			setExtractingText(false);
		}
	};

	// Fuentes profesionales disponibles
	const availableFonts = [
		{ value: 'Arial', label: 'Arial' },
		{ value: 'Calibri', label: 'Calibri' },
		{ value: 'Georgia', label: 'Georgia' },
		{ value: 'Cambria', label: 'Cambria' },
		{ value: 'Garamond', label: 'Garamond' },
		{ value: 'Microsoft JhengHei', label: 'Microsoft JhengHei' },
	];

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

				{items.map((it) => {
					// Detectar si el item está guardado en BD (tiene ID de UUID, no temporal)
					const isSaved = it.id && it.id.length > 10 && !it.id.startsWith('it_');
					return (
						<div key={it.id} className={`border rounded-lg p-3 grid grid-cols-1 md:grid-cols-6 gap-3 items-start ${isSaved ? 'border-green-300 bg-green-50/50' : 'border-blue-100 bg-blue-50/50'}`}>
							{isSaved && (
								<div className="md:col-span-6 mb-2">
									<span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium">
										<FileCheck size={12} /> Guardado en base de datos
									</span>
								</div>
							)}
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
					);
				})}
			</div>
		</div>
	);
}

	// Función para cargar items de prescripción desde la base de datos
	const loadPrescriptionItems = async (preserveNewItems = false) => {
		try {
			const res = await fetch(`/api/consultations/${consultationId}/prescription-items`, {
				method: 'GET',
				credentials: 'include',
			});

			if (res.ok) {
				const data = await res.json();
				if (data.items && Array.isArray(data.items) && data.items.length > 0) {
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

					if (preserveNewItems) {
						// Si se debe preservar items nuevos, combinar (evitar duplicados por ID)
						const existingIds = new Set(loadedItems.map((i) => i.id));
						const newItems = items.filter((i) => !i.id || i.id.startsWith('it_') || !existingIds.has(i.id));
						setItems([...loadedItems, ...newItems]);
					} else {
						// Reemplazar completamente (carga inicial)
						setItems(loadedItems);
					}
					setIsEditMode(true);
				}
			}
		} catch (err) {
			console.error('[PrescriptionForm] Error cargando items:', err);
			// No mostrar error al usuario, solo loguear
		}
	};

	// Cargar datos existentes si hay prescripción o al montar el componente
	useEffect(() => {
		// Cargar items guardados automáticamente al montar el componente
		if (consultationId) {
			loadPrescriptionItems();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [consultationId]);

	// También cargar si hay prescripción existente pasada como prop
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
			
			// Cargar texto de la receta si existe
			if (existingPrescription.recipe_text) {
				setRecipeBody(existingPrescription.recipe_text);
			}
		}
	}, [existingPrescription]);

	// Función auxiliar para generar y descargar la receta
	const generateAndDownload = async (savedItems: any[], savedRecipeBody: string) => {
		try {
			setGeneratingPrescription(true);
			
			const itemsToSend = savedItems.map((item) => {
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

			const res = await fetch(`/api/consultations/${consultationId}/generate-prescription`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					items: itemsToSend,
					recipe_body: savedRecipeBody,
					issued_at: new Date().toISOString(), // Usar fecha actual para la generación
					prescription_id: existingPrescription?.id || null, // Si ya existía, usar su ID
					font_family: fontFamily,
					template_url: templates.find(t => t.id === selectedTemplateId)?.file_url, // <--- Add this
				}),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Error al generar documento de receta');

			// Guardar URL y abrir en nueva pestaña
			setPrescriptionUrl(data.prescription_url);
			if (data.prescription_url) {
				window.open(data.prescription_url, '_blank');
			}
			
			return true;
		} catch (err: any) {
			console.error('Error generando documento:', err);
			setError('Prescripción guardada, pero hubo un error generando el documento: ' + err.message);
			return false;
		} finally {
			setGeneratingPrescription(false);
		}
	};

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		// Validar que haya al menos un tipo de paciente
		if (!consultationId || (!patientId && !unregisteredPatientId) || !doctorId) {
			setError('Faltan datos requeridos (consulta / paciente / doctor).');
			return;
		}

		// Validar items o texto
		if (items.length === 0 && (!recipeBody || recipeBody.trim() === '') && !confirm('No has añadido ítems ni texto en la receta. ¿Deseas continuar con una prescripción vacía?')) {
			return;
		}

		setLoading(true);

		try {
			// Preparar items para guardar
			const itemsToSave = items.map((item) => {
				const frequencyText = item.frequency || generateFrequencyText(item.frequencyHours, item.frequencyDays);
				return {
					...item,
					frequency: frequencyText,
				};
			});

			let savedPrescriptionData;

			// 1. Guardar o Actualizar en BD
			if (isEditMode && existingPrescription) {
				const form = new FormData();
				form.append('prescription_id', existingPrescription.id);
				form.append('consultation_id', consultationId);
				if (patientId) form.append('patient_id', String(patientId));
				if (unregisteredPatientId) form.append('unregistered_patient_id', String(unregisteredPatientId));
				form.append('doctor_id', String(doctorId));
				form.append('items', JSON.stringify(itemsToSave));
				if (recipeBody) form.append('recipe_body', recipeBody);

				const res = await fetch('/api/prescriptions', { method: 'PATCH', body: form });
				const data = await res.json();
				if (!res.ok) throw new Error(data?.error || 'Error actualizando prescripción');
				
				savedPrescriptionData = data.prescription; // Asumimos que la API devuelve la prescripción actualizada
			} else {
				const form = new FormData();
				form.append('consultation_id', consultationId);
				if (patientId) form.append('patient_id', String(patientId));
				if (unregisteredPatientId) form.append('unregistered_patient_id', String(unregisteredPatientId));
				form.append('doctor_id', String(doctorId));
				form.append('items', JSON.stringify(itemsToSave));
				if (recipeBody) form.append('recipe_body', recipeBody);

				const res = await fetch('/api/prescriptions', { method: 'POST', body: form });
				const data = await res.json();
				if (!res.ok) throw new Error(data?.error || 'Error creando prescripción');
				
				savedPrescriptionData = data.prescription;
			}

			// 2. Generar y Descargar Documento Automáticamente
			const generated = await generateAndDownload(items, recipeBody);

			setSuccess(`Prescripción ${isEditMode ? 'actualizada' : 'creada'} y descargada correctamente.`);
			setLoading(false);

			// 3. NO Redireccionar - Actualizar estado local
			if (savedPrescriptionData) {
				// Actualizar existingPrescription para pasar a modo edición y mostrar datos guardados
				// OJO: Necesitamos asegurarnos que existingPrescription tenga el formato correcto
				// Si la API devuelve el objeto prescription completo, lo usamos.
				// Si no, recargamos los items o usamos lo que tenemos.
				
				// Forzamos modo edición
				setIsEditMode(true);
				
				// Recargar la página o actualizar el estado para reflejar cambios podría ser ideal, 
				// pero por ahora actualizaremos la UI lo mejor posible.
				// Una opción limpia es hacer router.refresh() para que Next.js revalide datos del servidor si usas server components,
				// pero aquí estamos en create client.
				
				// Vamos a simular que se cargó
				// window.location.reload(); // Un poco brusco
			}

		} catch (err: any) {
			console.error(err);
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

			{/* Template Selection & Preview Section */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Template Selector */}
				<div className="rounded-2xl bg-white border border-indigo-100 p-5 shadow-sm">
					<div className="flex items-center gap-2 mb-4">
						<FileText className="w-5 h-5 text-indigo-600" />
						<h3 className="text-lg font-semibold text-slate-900">Plantilla de Receta</h3>
					</div>

					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-1">Cargar desde mis plantillas</label>
							<select
								value={selectedTemplateId}
								onChange={(e) => handleTemplateSelect(e.target.value)}
								className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								disabled={loadingTemplates || extractingText}
							>
								<option value="">-- Seleccionar Plantilla --</option>
								{templates.map((t) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</select>
							{loadingTemplates && <p className="text-xs text-slate-500 mt-1">Cargando plantillas...</p>}
							{extractingText && (
								<div className="flex items-center gap-2 mt-2 text-indigo-600 text-xs font-medium">
									<Loader2 className="w-3 h-3 animate-spin" />
									Extrayendo texto de la plantilla...
								</div>
							)}
						</div>
						
						{recipeBody && (
							<div>
								<div className="flex items-center justify-between mb-1">
									<label className="block text-sm font-medium text-slate-700">Contenido de la Receta (Editable)</label>
									<span className="text-xs text-slate-500">Lo que escribas aquí aparecerá en el documento.</span>
								</div>
								<textarea
									value={recipeBody}
									onChange={(e) => setRecipeBody(e.target.value)}
									rows={12}
									className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
									placeholder="El contenido de la receta aparecerá aquí..."
								/>
							</div>
						)}
					</div>
				</div>

				{/* Live Preview (DOCX Render) */}
				<div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 shadow-inner flex flex-col h-[700px]">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<Eye className="w-5 h-5 text-indigo-600" />
							<h3 className="text-lg font-semibold text-slate-900">Vista Previa</h3>
						</div>
						
						{/* Zoom Controls */}
						<div className="flex items-center gap-2 bg-white rounded-lg border border-slate-300 p-1">
							<button
								type="button"
								onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}
								className="p-1 hover:bg-slate-100 rounded text-slate-600"
								title="Reducir"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
							</button>
							<span className="text-xs font-mono w-12 text-center text-slate-700">{Math.round(zoom * 100)}%</span>
							<button
								type="button"
								onClick={() => setZoom((prev) => Math.min(2.0, prev + 0.1))}
								className="p-1 hover:bg-slate-100 rounded text-slate-600"
								title="Aumentar"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
							</button>
						</div>
					</div>
					
					<div className="flex-1 bg-slate-200/50 border border-slate-300 rounded-lg overflow-hidden relative">
						<div 
							ref={previewContainerRef}
							onMouseDown={handleMouseDown}
							onMouseLeave={handleMouseLeave}
							onMouseUp={handleMouseUp}
							onMouseMove={handleMouseMove}
							className={`absolute inset-0 overflow-auto flex p-8 cursor-${isDragging ? 'grabbing' : 'grab'}`}
						>
							<div 
								style={{ 
									// @ts-ignore
									zoom: zoom,
									width: 'fit-content',
									margin: 'auto',
									pointerEvents: 'none', // Allow clicks to pass through to drag container
								}}
								className="bg-white shadow-lg origin-top-left"
							>
								<div id="docx-preview-container">
									{!selectedTemplateId && (
										<div className="min-h-[500px] w-[600px] flex flex-col items-center justify-center text-slate-400">
											<FileText className="w-16 h-16 mb-4 opacity-30" />
											<p>Selecciona una plantilla para visualizarla aquí</p>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
					<p className="mt-3 text-center text-xs text-slate-500">
						Usa los controles de zoom o arrastra el documento para navegar.
					</p>
				</div>
			</div>

			{/* Separator / Divider */}
			<div className="relative">
				<div className="absolute inset-0 flex items-center" aria-hidden="true">
					<div className="w-full border-t border-slate-200"></div>
				</div>
				<div className="relative flex justify-center">
					<span className="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 px-2 text-sm text-slate-500">O agregar medicamentos manualmente</span>
				</div>
			</div>

			{/* Items editor - muestra todos los items (guardados + nuevos) como cards editables */}
			<PrescriptionItemsEditor items={items} setItems={setItems} />

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
											recipe_body: recipeBody, // <--- Added this
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
									// Preservar cualquier item nuevo que el usuario haya agregado
									await loadPrescriptionItems(true);

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
