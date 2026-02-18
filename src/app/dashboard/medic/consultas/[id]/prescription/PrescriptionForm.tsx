'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash, FileDown, Save, FileCheck, FileText, Eye, Printer } from 'lucide-react';
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
	existingPrescription?: ExistingPrescription | null; // Mantener por compatibilidad o eliminar si ya no se usa
	prescriptions?: any[]; // Lista de prescripciones
};

function uid(prefix = '') {
	return prefix + Math.random().toString(36).slice(2, 9);
}

// ... existing helper functions ...

/* -------------------------
   PrescriptionForm (principal)
   - layout with clear visual hierarchy
   ------------------------- */
export default function PrescriptionForm({ consultationId, patientId, unregisteredPatientId, doctorId, existingPrescription, prescriptions = [] }: Props) {
	const [items, setItems] = useState<Item[]>([]);
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	
	// Estado para manejar múltiples prescripciones
	const [prescriptionList, setPrescriptionList] = useState<any[]>(prescriptions);
	const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
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

	// Ref for the preview container
	const previewRef = React.useRef<HTMLDivElement>(null);

	// ... (inside component)

	// Handle Template Selection
	const handleTemplateSelect = async (templateId: string) => {
		setSelectedTemplateId(templateId);
		
		// Limpiar si se deselecciona
		if (!templateId) {
			// Solo limpiar si no estamos editando una receta con contenido
			if (!recipeBody && previewRef.current) {
				previewRef.current.innerHTML = '';
			}
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
			if (previewRef.current) {
				// Limpiar contenedor
				previewRef.current.innerHTML = '';
				// Renderizar usando docx-preview
				await renderAsync(blob, previewRef.current, previewRef.current, {
					className: 'docx-preview',
					inWrapper: false,
					ignoreWidth: false,
					ignoreHeight: false,
                    experimental: true,
				});
			}

			// 2. Extract Text
			// SOLO sobreescribir si el body está vacío o el usuario confirma (podríamos agregar confirmación)
			if (!recipeBody || recipeBody.trim() === '') {
				const text = await extractTextFromDocx(arrayBuffer);
				setRecipeBody(text);
			}
			
		} catch (err: any) {
			console.error('Error processing template:', err);
			setError(err.message || 'Error al procesar la plantilla.');
		} finally {
			setExtractingText(false);
		}
	};

	// Cargar datos de una prescripción seleccionada
	const handleSelectPrescription = async (pres: any) => {
		setSelectedPrescriptionId(pres.id);
		setIsEditMode(true);
		setSuccess(null);
		setError(null);
		setPrescriptionUrl(null); // Reset URL initially
		
		// 1. Cargar items
		if (pres.prescription_item && Array.isArray(pres.prescription_item)) {
			const loadedItems: Item[] = pres.prescription_item.map((item: any) => {
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
		} else {
			setItems([]);
		}

		// 2. Cargar texto
		if (pres.recipe_text) {
			setRecipeBody(pres.recipe_text);
		} else {
			setRecipeBody('');
		}

		// 3. Cargar archivo generado existente (Visualización)
		// Buscar el archivo docx más reciente
		let fileUrl = null;
		if (pres.files && pres.files.length > 0) {
			// Priorizar docx (case insensitive)
			const docxFile = pres.files.find((f: any) => 
                f.name.toLowerCase().endsWith('.docx') || 
                f.type?.includes('word') ||
                f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            );
			if (docxFile) {
				fileUrl = docxFile.url;
				setPrescriptionUrl(fileUrl);
			} else {
				// Fallback a cualquier archivo
				fileUrl = pres.files[0].url;
				setPrescriptionUrl(fileUrl);
			}
		}

		// Renderizar vista previa si hay archivo DOCX
		if (previewRef.current) {
			previewRef.current.innerHTML = ''; // Limpiar previo
			
            // Check robusto para intentar renderizar siempre que parezca un docx o sea el fallback
			if (fileUrl) {
				try {
					setExtractingText(true); // Usar indicador de carga visual
                    
                    // Mostrar loader temporalmente en el contenedor
                    previewRef.current.innerHTML = '<div class="flex flex-col items-center justify-center p-10 text-indigo-600"><div class="animate-spin mb-2 h-6 w-6 border-4 border-indigo-500 border-t-transparent rounded-full"></div><p class="text-xs">Cargando vista previa...</p></div>';

					const res = await fetch(fileUrl);
					if (res.ok) {
						const blob = await res.blob();
                        
                        // Limpiar loader
                        if (previewRef.current) previewRef.current.innerHTML = '';

						await renderAsync(blob, previewRef.current!, previewRef.current!, {
							className: 'docx-preview',
							inWrapper: false,
							ignoreWidth: false,
							ignoreHeight: false,
                            experimental: true,
						});
					} else {
                        throw new Error(`Error fetching file: ${res.statusText}`);
                    }
				} catch (err: any) {
					console.error('Error cargando vista previa del archivo existente:', err);
                    if (previewRef.current) {
					    previewRef.current.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-rose-500 p-8 text-center"><p class="font-medium">No se pudo cargar la vista previa.</p><p class="text-xs mt-1 text-slate-500">${err?.message || 'Error desconocido'}</p></div>`;
                    }
				} finally {
					setExtractingText(false);
				}
			} else {
                 // Si no hay archivo, mostrar mensaje vacío
                 previewRef.current.innerHTML = '';
            }
		}

		// Scroll al formulario
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

    // ... (rest of code)



	// Resetear formulario para nueva prescripción
	const handleNewPrescription = () => {
		setSelectedPrescriptionId(null);
		setIsEditMode(false);
		setItems([]);
		setRecipeBody('');
		setSuccess(null);
		setError(null);
		setPrescriptionUrl(null);
		// No reseteamos el template seleccionado para facilitar crear varias iguales
	};

    // Actualizar la lista si llegan nuevas props
    useEffect(() => {
        if (prescriptions) {
            setPrescriptionList(prescriptions);
        }
    }, [prescriptions]);

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



	// Función auxiliar para generar y descargar la receta
	const generateAndDownload = async (savedItems: any[], savedRecipeBody: string, overridePrescriptionId: string | null = null) => {
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

            const targetPrescriptionId = overridePrescriptionId || existingPrescription?.id || null;

			const res = await fetch(`/api/consultations/${consultationId}/generate-prescription`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					items: itemsToSend,
					recipe_body: savedRecipeBody,
					issued_at: new Date().toISOString(), // Usar fecha actual para la generación
					prescription_id: targetPrescriptionId,
					font_family: fontFamily,
					template_url: templates.find(t => t.id === selectedTemplateId)?.file_url,
				}),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Error al generar documento de receta');

			// Guardar URL y descargar automáticamente
			setPrescriptionUrl(data.prescription_url);
			if (data.prescription_url) {
                // Crear elemento link temporal para forzar la descarga
                const link = document.createElement('a');
                link.href = data.prescription_url;
                link.download = `Receta_${new Date().toISOString().split('T')[0]}.docx`; // Nombre sugerido
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
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

			let savedPrescriptionData: any;

			// 1. Guardar o Actualizar en BD
			if (isEditMode && selectedPrescriptionId) {
				const form = new FormData();
				form.append('prescription_id', selectedPrescriptionId);
				form.append('consultation_id', consultationId);
				if (patientId) form.append('patient_id', String(patientId));
				if (unregisteredPatientId) form.append('unregistered_patient_id', String(unregisteredPatientId));
				form.append('doctor_id', String(doctorId));
				form.append('items', JSON.stringify(itemsToSave));
				if (recipeBody) form.append('recipe_body', recipeBody);

				const res = await fetch('/api/prescriptions', { method: 'PATCH', body: form });
				const data = await res.json();
				if (!res.ok) throw new Error(data?.error || 'Error actualizando prescripción');
				
				savedPrescriptionData = data.prescription; 
                
                // Actualizar lista local
                setPrescriptionList(prev => prev.map(p => p.id === savedPrescriptionData.id ? {...p, ...savedPrescriptionData} : p));

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

                // Agregar a lista local
                 setPrescriptionList(prev => [savedPrescriptionData, ...prev]);
                 setSelectedPrescriptionId(savedPrescriptionData.id);
			}

			// 2. Generar y Descargar Documento Automáticamente (Pasando el ID correcto)
			const generated = await generateAndDownload(items, recipeBody, savedPrescriptionData.id);

			setSuccess(`Prescripción ${isEditMode ? 'actualizada' : 'creada'} y descargada correctamente.`);
			setLoading(false);

			// 3. NO Redireccionar - Actualizar estado local
			if (savedPrescriptionData) {
				// Forzamos modo edición
				setIsEditMode(true);
                
                // Recargar para ver el archivo generado en la lista
                 setTimeout(() => {
                     window.location.reload(); 
                 }, 1000); // Pequeño delay para asegurar que el archivo se procesó
			}

		} catch (err: any) {
			console.error(err);
			setError(err?.message ?? String(err));
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Guía Paso a Paso */}
			<div className="rounded-xl bg-blue-50 border border-blue-100 p-4 mb-6">
				<h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
					<span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">i</span>
					¿Cómo crear y gestionar recetas?
				</h3>
				<ol className="list-decimal list-inside text-sm text-blue-800 space-y-1 ml-1">
					<li><strong>Seleccione una plantilla</strong> (opcional) para cargar un formato predefinido.</li>
					<li><strong>Edite el contenido</strong> en el cuadro de texto si es necesario. Lo que escriba allí aparecerá tal cual en el documento.</li>
					<li><strong>Agregue medicamentos</strong> manualmente en la sección inferior si desea detallar ítems específicos (estos se listarán al final).</li>
					<li>Haga clic en <strong>"Guardar y Generar"</strong>. El documento se descargará automáticamente y quedará guardado en el historial.</li>
                    <li><strong>Para editar:</strong> Haga clic en "Editar" en la lista inferior o "Regenerar" para volver a crear el archivo si hizo cambios.</li>
                    <li><strong>Para imprimir:</strong> Haga clic en el botón "Imprimir" de la lista para descargar la versión lista para imprimir.</li>
				</ol>
			</div>

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
					<div className="flex flex-col gap-2">
						{/* Botón para nueva prescripción si estamos en modo edición */}
						{isEditMode && (
							<button
								type="button"
								onClick={handleNewPrescription}
								className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors text-sm font-medium"
							>
								<Plus size={16} />
								Nueva Receta
							</button>
						)}
					</div>
				</div>
			</div>



			{/* Template Selection & Preview Section - STACKED LAYOUT */}
			<div className="flex flex-col gap-6">
				{/* Template Selector & Editor (TOP) */}
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
						
						{(true) && ( // Siempre mostrar el editor si se quiere (o condicional a recipeBody)
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

				{/* Live Preview (DOCX Render) (BOTTOM) */}
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
								<div ref={previewRef} id="docx-preview-container">
									{!selectedTemplateId && !prescriptionUrl && (
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
			<div className="relative my-8">
				<div className="absolute inset-0 flex items-center" aria-hidden="true">
					<div className="w-full border-t border-slate-200"></div>
				</div>
				<div className="relative flex justify-center">
					<span className="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 px-2 text-sm text-slate-500">Agregar medicamentos manualmente</span>
				</div>
			</div>

            {/* Manual Items Editor */}
            <PrescriptionItemsEditor items={items} setItems={setItems} />

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                {isEditMode && (
					<button
						type="button"
						onClick={handleNewPrescription}
						className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
					>
						Cancelar Edición / Nueva
					</button>
				)}
				<button
					type="submit"
					disabled={loading || generatingPrescription}
					className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
				>
					{loading || generatingPrescription ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            {generatingPrescription ? 'Generando documento...' : 'Guardando...'}
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            {isEditMode ? 'Actualizar y Generar' : 'Guardar y Generar'}
                        </>
                    )}
				</button>
			</div>

            {/* PRESCRIPTION LIST */}
            <div className="mt-12">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileCheck className="text-teal-600" />
                    Historial de Prescripciones
                </h3>

                {prescriptionList.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                        <p className="text-slate-500">No hay prescripciones guardadas para esta consulta.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {prescriptionList.map((pres) => {
                            // Buscar archivo principal
                            const mainFile = pres.files && pres.files.length > 0 ? pres.files[0] : null;

                            return (
                                <li key={pres.id} className={`p-4 hover:bg-blue-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${pres.id === selectedPrescriptionId ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                             <span className="text-sm font-semibold text-slate-900">
                                                Receta del {new Date(pres.created_at).toLocaleDateString()}
                                             </span>
                                             {pres.id === selectedPrescriptionId && (
                                                 <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Editando</span>
                                             )}
                                        </div>
                                        <div className="text-xs text-slate-500 line-clamp-2">
                                            {pres.prescription_item && pres.prescription_item.length > 0 
                                                ? pres.prescription_item.map((i: any) => i.name).join(', ') 
                                                : (pres.recipe_text ? 'Texto personalizado' : 'Sin items')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleSelectPrescription(pres)}
                                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                            title="Editar / Ver"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        
                                        {mainFile ? (
                                            <>
                                            <a 
                                                href={mainFile.url} 
                                                download 
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-1"
                                                title="Descargar Documento"
                                            >
                                                <FileDown size={18} />
                                            </a>
                                            <button
                                                type="button"
                                                disabled={true}
                                                className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 cursor-not-allowed rounded-md transition-colors flex items-center gap-2 border border-slate-200"
                                                title="Esta función está deshabilitada temporalmente por mantenimiento"
                                            >
                                                <Printer size={14} />
                                                Imprimir
                                            </button>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic px-2">Sin archivo</span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </div>
                )}
            </div>



            {/* Contenedor oculto para impresión */}
            <div id="print-container" style={{ display: 'none' }}></div>
		</form>
	);
}
