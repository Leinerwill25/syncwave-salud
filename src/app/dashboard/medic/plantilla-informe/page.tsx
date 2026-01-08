'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileType, CheckCircle2, AlertCircle, Loader2, Download, Trash2, Stethoscope, Heart, Baby } from 'lucide-react';
import { useRouter } from 'next/navigation';

type TemplateData = {
	specialty: string;
	template_url: string | null;
	template_name: string | null;
	template_text: string | null;
	font_family: string;
	hasMultipleVariants?: boolean;
	variants?: {
		trimestre1: TemplateData | null;
		trimestre2_3: TemplateData | null;
	};
};

type TemplateResponse = {
	hasMultipleSpecialties: boolean;
	specialty1: string | null;
	specialty2: string | null;
	template1?: TemplateData;
	template2?: TemplateData;
};

// Helper para normalizar el nombre de la especialidad de obstetricia
function normalizeObstetricia(specialty: string | null): boolean {
	if (!specialty) return false;
	const normalized = specialty.toLowerCase().trim();
	return normalized === 'obstetricia' || normalized === 'obstetrics' || normalized === 'obstetra';
}

export default function ReportTemplatePage() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	
	// Datos de especialidades y plantillas
	const [specialties, setSpecialties] = useState<{ specialty1: string | null; specialty2: string | null }>({ specialty1: null, specialty2: null });
	const [hasMultipleSpecialties, setHasMultipleSpecialties] = useState(false);
	const [template1, setTemplate1] = useState<TemplateData | null>(null);
	const [template2, setTemplate2] = useState<TemplateData | null>(null);
	
	// Estado para cada sección
	const [file1, setFile1] = useState<File | null>(null);
	const [uploading1, setUploading1] = useState(false);
	const [templateText1, setTemplateText1] = useState<string>('');
	const [savingText1, setSavingText1] = useState(false);
	const [showDeleteModal1, setShowDeleteModal1] = useState(false);

	const [file2, setFile2] = useState<File | null>(null);
	const [uploading2, setUploading2] = useState(false);
	const [templateText2, setTemplateText2] = useState<string>('');
	const [savingText2, setSavingText2] = useState(false);
	const [showDeleteModal2, setShowDeleteModal2] = useState(false);

	// Estados para variantes de obstetricia (trimestre1 y trimestre2_3)
	const [file1_t1, setFile1_t1] = useState<File | null>(null);
	const [uploading1_t1, setUploading1_t1] = useState(false);
	const [templateText1_t1, setTemplateText1_t1] = useState<string>('');
	const [savingText1_t1, setSavingText1_t1] = useState(false);
	const [showDeleteModal1_t1, setShowDeleteModal1_t1] = useState(false);

	const [file1_t2_3, setFile1_t2_3] = useState<File | null>(null);
	const [uploading1_t2_3, setUploading1_t2_3] = useState(false);
	const [templateText1_t2_3, setTemplateText1_t2_3] = useState<string>('');
	const [savingText1_t2_3, setSavingText1_t2_3] = useState(false);
	const [showDeleteModal1_t2_3, setShowDeleteModal1_t2_3] = useState(false);

	useEffect(() => {
		loadCurrentTemplates();
	}, []);

	const loadCurrentTemplates = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/medic/report-template', {
				credentials: 'include',
			});
			if (res.ok) {
				const data: TemplateResponse = await res.json();
				setHasMultipleSpecialties(data.hasMultipleSpecialties || false);
				setSpecialties({
					specialty1: data.specialty1,
					specialty2: data.specialty2,
				});

				// Verificar si specialty1 es obstetricia
				const isSpecialty1Obstetricia = normalizeObstetricia(data.specialty1);
				
				if (data.template1) {
					setTemplate1(data.template1);
					// Si tiene múltiples variantes, establecer los textos de las variantes
					if (data.template1.hasMultipleVariants && data.template1.variants) {
						if (data.template1.variants.trimestre1?.template_text) {
							setTemplateText1_t1(data.template1.variants.trimestre1.template_text);
						}
						if (data.template1.variants.trimestre2_3?.template_text) {
							setTemplateText1_t2_3(data.template1.variants.trimestre2_3.template_text);
						}
					} else {
						setTemplateText1(data.template1.template_text || '');
					}
				} else if (isSpecialty1Obstetricia) {
					// Si es obstetricia pero no hay template aún, inicializar con estructura de variantes
					setTemplate1({
						specialty: data.specialty1 || '',
						template_url: null,
						template_name: null,
						template_text: null,
						font_family: 'Arial',
						hasMultipleVariants: true,
						variants: {
							trimestre1: null,
							trimestre2_3: null,
						},
					});
				}

				// Verificar si specialty2 es obstetricia
				const isSpecialty2Obstetricia = normalizeObstetricia(data.specialty2);
				
				if (data.template2) {
					setTemplate2(data.template2);
					// Si tiene múltiples variantes, establecer los textos de las variantes si es obstetricia
					if (data.template2.hasMultipleVariants && data.template2.variants && isSpecialty2Obstetricia) {
						// Nota: Para specialty2, los estados de variantes serían templateText2_t1 y templateText2_t2_3
						// Por ahora solo manejamos specialty1 con variantes, así que esto es solo para compatibilidad
					} else {
						setTemplateText2(data.template2.template_text || '');
					}
				} else if (isSpecialty2Obstetricia) {
					// Si es obstetricia pero no hay template aún, inicializar con estructura de variantes
					setTemplate2({
						specialty: data.specialty2 || '',
						template_url: null,
						template_name: null,
						template_text: null,
						font_family: 'Arial',
						hasMultipleVariants: true,
						variants: {
							trimestre1: null,
							trimestre2_3: null,
						},
					});
				}
			}
		} catch (err) {
			console.error('Error cargando plantillas:', err);
			setError('Error al cargar las plantillas');
		} finally {
			setLoading(false);
		}
	};

	const handleFileChange = (specialtyIndex: 1 | 2) => (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (!selectedFile) return;

		const validExtensions = ['.docx', '.doc'];
		const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

		if (!validExtensions.includes(fileExtension)) {
			setError('Por favor, selecciona un archivo Word (.docx o .doc)');
			if (specialtyIndex === 1) setFile1(null);
			else setFile2(null);
			return;
		}

		const maxSizeBytes = 50 * 1024 * 1024; // 50MB
		if (selectedFile.size > maxSizeBytes) {
			setError(`El archivo es demasiado grande. El tamaño máximo es ${maxSizeBytes / (1024 * 1024)}MB`);
			if (specialtyIndex === 1) setFile1(null);
			else setFile2(null);
			return;
		}

		if (specialtyIndex === 1) {
			setFile1(selectedFile);
		} else {
			setFile2(selectedFile);
		}
		setError(null);
	};

	const handleUpload = async (specialtyIndex: 1 | 2, variant?: 'trimestre1' | 'trimestre2_3') => {
		const targetSpecialty = specialtyIndex === 1 ? specialties.specialty1 : specialties.specialty2;
		const isObstetricia = normalizeObstetricia(targetSpecialty);
		
		// Si es obstetricia y tiene variant, usar los estados de la variante correspondiente
		let file: File | null;
		if (isObstetricia && variant) {
			if (variant === 'trimestre1') {
				file = file1_t1;
			} else {
				file = file1_t2_3;
			}
		} else {
			file = specialtyIndex === 1 ? file1 : file2;
		}

		if (!file || !targetSpecialty) {
			setError('Por favor, selecciona un archivo');
			return;
		}

		if (isObstetricia && !variant) {
			setError('Por favor, selecciona el trimestre para la plantilla');
			return;
		}

		// Actualizar el estado de carga correcto según si es obstetricia con variant o no
		if (isObstetricia && variant) {
			if (variant === 'trimestre1') {
				setUploading1_t1(true);
			} else {
				setUploading1_t2_3(true);
			}
		} else {
			if (specialtyIndex === 1) {
				setUploading1(true);
			} else {
				setUploading2(true);
			}
		}
		setError(null);
		setSuccess(null);

		try {
			const formData = new FormData();
			formData.append('template', file);
			// Asegurar que targetSpecialty sea una especialidad individual, no un array
			let normalizedSpecialty = targetSpecialty;
			if (targetSpecialty && (targetSpecialty.startsWith('[') || targetSpecialty.includes(','))) {
				// Si parece un array, intentar parsearlo y tomar la primera especialidad
				try {
					const parsed = JSON.parse(targetSpecialty);
					if (Array.isArray(parsed) && parsed.length > 0) {
						normalizedSpecialty = parsed[0];
					}
				} catch {
					// Si no se puede parsear, usar el valor original
				}
			}
			formData.append('specialty', normalizedSpecialty);
			
			// Si es obstetricia y se especifica variant, agregarlo
			if (isObstetricia && variant) {
				formData.append('variant', variant);
			}

			const res = await fetch('/api/medic/report-template', {
				method: 'POST',
				credentials: 'include',
				body: formData,
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al cargar la plantilla');
			}

			setSuccess(`Plantilla para ${targetSpecialty}${variant ? ` (${variant === 'trimestre1' ? 'Primer Trimestre' : 'Segundo y Tercer Trimestre'})` : ''} cargada exitosamente`);
			
			// Limpiar el archivo seleccionado según el contexto
			if (isObstetricia && variant) {
				if (variant === 'trimestre1') {
					setFile1_t1(null);
				} else {
					setFile1_t2_3(null);
				}
			} else {
				if (specialtyIndex === 1) {
					setFile1(null);
					const fileInput = document.getElementById(`template-file-1`) as HTMLInputElement;
					if (fileInput) fileInput.value = '';
				} else {
					setFile2(null);
					const fileInput = document.getElementById(`template-file-2`) as HTMLInputElement;
					if (fileInput) fileInput.value = '';
				}
			}
			await loadCurrentTemplates();
		} catch (err: any) {
			setError(err.message || 'Error al cargar la plantilla');
		} finally {
			// Actualizar el estado de carga correcto según si es obstetricia con variant o no
			if (isObstetricia && variant) {
				if (variant === 'trimestre1') {
					setUploading1_t1(false);
				} else {
					setUploading1_t2_3(false);
				}
			} else {
				if (specialtyIndex === 1) {
					setUploading1(false);
				} else {
					setUploading2(false);
				}
			}
		}
	};

	const handleDownload = (template: TemplateData | null) => {
		if (template?.template_url) {
			window.open(template.template_url, '_blank');
		}
	};

	const handleDeleteConfirm = async (specialtyIndex: 1 | 2) => {
		const targetSpecialty = specialtyIndex === 1 ? specialties.specialty1 : specialties.specialty2;
		if (!targetSpecialty) return;

		if (specialtyIndex === 1) {
			setShowDeleteModal1(false);
		} else {
			setShowDeleteModal2(false);
		}
		setError(null);
		setSuccess(null);

		try {
			const res = await fetch(`/api/medic/report-template?specialty=${encodeURIComponent(targetSpecialty)}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al eliminar la plantilla');
			}

			setSuccess(`Plantilla para ${targetSpecialty} eliminada exitosamente`);
			if (specialtyIndex === 1) {
				setTemplate1(null);
				setTemplateText1('');
			} else {
				setTemplate2(null);
				setTemplateText2('');
			}
			await loadCurrentTemplates();
		} catch (err: any) {
			setError(err.message || 'Error al eliminar la plantilla');
		}
	};

	const handleSaveTemplateText = async (specialtyIndex: 1 | 2, variant?: 'trimestre1' | 'trimestre2_3') => {
		const targetSpecialty = specialtyIndex === 1 ? specialties.specialty1 : specialties.specialty2;

		if (!targetSpecialty) return;

		const isObstetricia = normalizeObstetricia(targetSpecialty);
		
		// Si es obstetricia y tiene variant, usar los estados de la variante correspondiente
		let templateText: string;
		if (isObstetricia && variant) {
			if (variant === 'trimestre1') {
				templateText = templateText1_t1;
			} else {
				templateText = templateText1_t2_3;
			}
		} else {
			templateText = specialtyIndex === 1 ? templateText1 : templateText2;
		}

		// Actualizar el estado de guardado correcto según si es obstetricia con variant o no
		if (isObstetricia && variant) {
			if (variant === 'trimestre1') {
				setSavingText1_t1(true);
			} else {
				setSavingText1_t2_3(true);
			}
		} else {
			if (specialtyIndex === 1) {
				setSavingText1(true);
			} else {
				setSavingText2(true);
			}
		}
		setError(null);
		setSuccess(null);

		try {
			const body: any = {
				template_text: templateText,
				specialty: targetSpecialty,
			};

			// Si es obstetricia y se especifica variant, agregarlo
			if (isObstetricia && variant) {
				body.variant = variant;
			}

			const res = await fetch('/api/medic/report-template', {
				method: 'PUT',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al guardar la plantilla de texto');
			}

			setSuccess(`Plantilla de texto para ${targetSpecialty}${variant ? ` (${variant === 'trimestre1' ? 'Primer Trimestre' : 'Segundo y Tercer Trimestre'})` : ''} guardada exitosamente`);
			await loadCurrentTemplates();
		} catch (err: any) {
			setError(err.message || 'Error al guardar la plantilla de texto');
		} finally {
			// Actualizar el estado de guardado correcto según si es obstetricia con variant o no
			if (isObstetricia && variant) {
				if (variant === 'trimestre1') {
					setSavingText1_t1(false);
				} else {
					setSavingText1_t2_3(false);
				}
			} else {
				if (specialtyIndex === 1) {
					setSavingText1(false);
				} else {
					setSavingText2(false);
				}
			}
		}
	};

	const renderObstetriciaSection = (specialtyIndex: 1 | 2, targetSpecialty: string, template: TemplateData) => {
		const variant1 = template.variants?.trimestre1;
		const variant2 = template.variants?.trimestre2_3;

		const renderVariantSection = (
			variant: 'trimestre1' | 'trimestre2_3',
			variantName: string,
			variantTemplate: TemplateData | null,
			file: File | null,
			setFile: (f: File | null) => void,
			uploading: boolean,
			setUploading: (u: boolean) => void,
			templateText: string,
			setTemplateText: (t: string) => void,
			savingText: boolean,
			setSavingText: (s: boolean) => void,
			showDeleteModal: boolean,
			setShowDeleteModal: (s: boolean) => void
		) => {
			return (
				<div key={variant} className="space-y-6 border-t-2 border-pink-300 pt-6">
					<div className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 p-4 rounded-xl shadow-md border border-pink-400/50">
						<h3 className="text-lg font-bold text-white flex items-center gap-2">
							<Baby className="w-5 h-5" />
							{variantName}
						</h3>
					</div>

					{/* Plantilla actual cargada */}
					{variantTemplate?.template_url && (
						<div className="bg-white rounded-2xl border border-green-200 shadow-sm p-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<CheckCircle2 className="w-5 h-5 text-green-600" />
									<div>
										<p className="text-sm font-medium text-slate-900">Plantilla actual cargada</p>
										<p className="text-xs text-slate-500">{variantTemplate.template_name || 'Plantilla actual'}</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => handleDownload(variantTemplate)}
										className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
									>
										Descargar
									</button>
									<button
										onClick={() => setShowDeleteModal(true)}
										className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors flex items-center gap-2"
									>
										<Trash2 className="w-4 h-4" />
										Eliminar
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Cargar Plantilla Word */}
					<div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border-2 border-pink-200 shadow-lg p-6">
						<h4 className="text-md font-bold text-pink-900 mb-4 flex items-center gap-2">
							<Upload className="w-5 h-5 text-pink-600" />
							Cargar Plantilla Word - {variantName}
						</h4>

						<div className="space-y-4">
							<div>
								<label htmlFor={`template-file-${specialtyIndex}-${variant}`} className="block text-sm font-medium text-slate-700 mb-2">
									Seleccionar archivo de plantilla
								</label>
								<div className="flex items-center gap-4">
									<label
										htmlFor={`template-file-${specialtyIndex}-${variant}`}
										className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
									>
										<Upload className="w-5 h-5 text-teal-600" />
										<span className="text-sm font-medium text-slate-700">
											{file ? file.name : `Seleccionar archivo Word (.docx) para ${variantName}`}
										</span>
									</label>
									<input
										id={`template-file-${specialtyIndex}-${variant}`}
										type="file"
										accept=".docx,.doc"
										onChange={(e) => {
											const selectedFile = e.target.files?.[0];
											if (selectedFile) {
												const validExtensions = ['.docx', '.doc'];
												const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
												if (!validExtensions.includes(fileExtension)) {
													setError('Por favor, selecciona un archivo Word (.docx o .doc)');
													setFile(null);
													return;
												}
												const maxSizeBytes = 50 * 1024 * 1024;
												if (selectedFile.size > maxSizeBytes) {
													setError(`El archivo es demasiado grande. El tamaño máximo es ${maxSizeBytes / (1024 * 1024)}MB`);
													setFile(null);
													return;
												}
												setFile(selectedFile);
												setError(null);
											}
										}}
										className="hidden"
									/>
								</div>
								{file && (
									<div className="mt-2 text-xs text-slate-500">
										Tamaño: {(file.size / 1024).toFixed(2)} KB
									</div>
								)}
							</div>

							<button
								onClick={() => handleUpload(specialtyIndex, variant)}
								disabled={!file || uploading}
								className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 text-white font-semibold shadow-lg hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed border border-pink-400/50"
							>
								{uploading ? (
									<>
										<Loader2 className="w-5 h-5 animate-spin" />
										Subiendo...
									</>
								) : (
									<>
										<Upload className="w-5 h-5" />
										Subir Plantilla
									</>
								)}
							</button>
						</div>
					</div>

					{/* Modal de confirmación de eliminación */}
					{showDeleteModal && (
						<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
							<div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
								<div className="flex items-center gap-3 mb-4">
									<div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
										<Trash2 className="w-6 h-6 text-rose-600" />
									</div>
									<h3 className="text-lg font-semibold text-slate-900">Eliminar Plantilla</h3>
								</div>
								<p className="text-slate-700 mb-6">
									¿Estás seguro de que deseas eliminar la plantilla para {variantName}? Esta acción no se puede deshacer.
								</p>
								<div className="flex items-center gap-3 justify-end">
									<button
										onClick={() => setShowDeleteModal(false)}
										className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
									>
										Cancelar
									</button>
									<button
										onClick={() => handleDeleteConfirm(specialtyIndex)}
										className="px-4 py-2 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors flex items-center gap-2"
									>
										<Trash2 className="w-4 h-4" />
										Eliminar
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			);
		};

		return (
			<div className="space-y-6">
				{/* Título de la especialidad - Obstetricia con estilo distintivo */}
				<div className="bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 p-5 rounded-xl shadow-lg border-2 border-pink-400/30">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-bold text-white flex items-center gap-3">
							<Baby className="w-6 h-6" />
							Plantilla para: {targetSpecialty}
						</h2>
						<span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold uppercase tracking-wide">
							Obstetricia
						</span>
					</div>
				</div>

				{/* Separador visual para Obstetricia */}
				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t-2 border-pink-300"></div>
					</div>
					<div className="relative flex justify-center">
						<span className="bg-gradient-to-br from-pink-50 to-rose-50 px-4 py-1 rounded-full border-2 border-pink-300 text-pink-700 text-xs font-semibold uppercase tracking-wider">
							Informes de Obstetricia
						</span>
					</div>
				</div>

				{/* Variante 1: Primer Trimestre */}
				{renderVariantSection(
					'trimestre1',
					'Primer Trimestre',
					variant1 || null,
					file1_t1,
					setFile1_t1,
					uploading1_t1,
					setUploading1_t1,
					templateText1_t1 || variant1?.template_text || '',
					setTemplateText1_t1,
					savingText1_t1,
					setSavingText1_t1,
					showDeleteModal1_t1,
					setShowDeleteModal1_t1
				)}

				{/* Variante 2: Segundo y Tercer Trimestre */}
				{renderVariantSection(
					'trimestre2_3',
					'Segundo y Tercer Trimestre',
					variant2 || null,
					file1_t2_3,
					setFile1_t2_3,
					uploading1_t2_3,
					setUploading1_t2_3,
					templateText1_t2_3 || variant2?.template_text || '',
					setTemplateText1_t2_3,
					savingText1_t2_3,
					setSavingText1_t2_3,
					showDeleteModal1_t2_3,
					setShowDeleteModal1_t2_3
				)}
			</div>
		);
	};

	const renderSpecialtySection = (specialtyIndex: 1 | 2) => {
		const targetSpecialty = specialtyIndex === 1 ? specialties.specialty1 : specialties.specialty2;
		const template = specialtyIndex === 1 ? template1 : template2;

		if (!targetSpecialty) return null;

		// Si es obstetricia, SIEMPRE renderizar sección especial con múltiples variantes
		const isObstetricia = normalizeObstetricia(targetSpecialty);
		if (isObstetricia) {
			// Crear un template con estructura de variantes incluso si no existe aún
			const templateWithVariants: TemplateData = template || {
				specialty: targetSpecialty,
				template_url: null,
				template_name: null,
				template_text: null,
				font_family: 'Arial',
				hasMultipleVariants: true,
				variants: {
					trimestre1: null,
					trimestre2_3: null,
				},
			};
			// Asegurar que tenga hasMultipleVariants: true y variants
			if (!templateWithVariants.hasMultipleVariants) {
				templateWithVariants.hasMultipleVariants = true;
			}
			if (!templateWithVariants.variants) {
				templateWithVariants.variants = {
					trimestre1: null,
					trimestre2_3: null,
				};
			}
			return renderObstetriciaSection(specialtyIndex, targetSpecialty, templateWithVariants);
		}

		// Renderizado normal para especialidades sin múltiples variantes
		const file = specialtyIndex === 1 ? file1 : file2;
		const uploading = specialtyIndex === 1 ? uploading1 : uploading2;
		const templateText = specialtyIndex === 1 ? templateText1 : templateText2;
		const setTemplateText = specialtyIndex === 1 ? setTemplateText1 : setTemplateText2;
		const savingText = specialtyIndex === 1 ? savingText1 : savingText2;
		const showDeleteModal = specialtyIndex === 1 ? showDeleteModal1 : showDeleteModal2;
		const setShowDeleteModal = specialtyIndex === 1 ? setShowDeleteModal1 : setShowDeleteModal2;

		return (
			<div key={specialtyIndex} className="space-y-6">
				{/* Título de la especialidad - Ginecología con estilo distintivo */}
				<div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-5 rounded-xl shadow-lg border-2 border-cyan-400/30">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-bold text-white flex items-center gap-3">
							<Heart className="w-6 h-6" />
							Plantilla para: {targetSpecialty}
						</h2>
						<span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold uppercase tracking-wide">
							Ginecología
						</span>
					</div>
				</div>

				{/* Plantilla actual cargada */}
				{template?.template_url && (
					<div className="bg-white rounded-2xl border border-green-200 shadow-sm p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<CheckCircle2 className="w-5 h-5 text-green-600" />
								<div>
									<p className="text-sm font-medium text-slate-900">Plantilla actual cargada</p>
									<p className="text-xs text-slate-500">{template.template_name || 'Plantilla actual'}</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<button
									onClick={() => handleDownload(template)}
									className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
								>
									Descargar
								</button>
								<button
									onClick={() => setShowDeleteModal(true)}
									className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors flex items-center gap-2"
								>
									<Trash2 className="w-4 h-4" />
									Eliminar
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Plantilla de texto */}
				<div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 shadow-lg p-6">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<FileType className="w-5 h-5 text-blue-600" />
							<h3 className="text-lg font-bold text-blue-900">Plantilla de Texto del Informe</h3>
							{templateText && templateText.trim() !== '' && (
								<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
									<CheckCircle2 className="w-3.5 h-3.5" />
									Plantilla guardada
								</span>
							)}
						</div>
					</div>
					<p className="text-sm text-slate-600 mb-4">
						Escribe aquí la estructura de texto que se usará para generar automáticamente el contenido del informe para {targetSpecialty}.
					</p>

					<div className="space-y-4">
						<div>
							<label htmlFor={`template-text-${specialtyIndex}`} className="block text-sm font-medium text-slate-700 mb-2">
								Estructura del Informe
							</label>
							<textarea
								id={`template-text-${specialtyIndex}`}
								value={templateText}
								onChange={(e) => setTemplateText(e.target.value)}
								rows={15}
								className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								placeholder="Escribe aquí la plantilla de texto para esta especialidad..."
							/>
						</div>

						<button
							onClick={() => handleSaveTemplateText(specialtyIndex)}
							disabled={savingText}
							className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white font-semibold shadow-lg hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-400/50"
						>
							{savingText ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									Guardando...
								</>
							) : (
								<>
									<CheckCircle2 className="w-5 h-5" />
									Guardar Plantilla de Texto
								</>
							)}
						</button>
					</div>
				</div>

				{/* Cargar Plantilla Word */}
				<div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 shadow-lg p-6">
					<h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
						<Upload className="w-5 h-5 text-blue-600" />
						Cargar Plantilla Word
					</h3>

					<div className="space-y-4">
						<div>
							<label htmlFor={`template-file-${specialtyIndex}`} className="block text-sm font-medium text-slate-700 mb-2">
								Seleccionar archivo de plantilla
							</label>
							<div className="flex items-center gap-4">
								<label
									htmlFor={`template-file-${specialtyIndex}`}
									className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
								>
									<Upload className="w-5 h-5 text-teal-600" />
									<span className="text-sm font-medium text-slate-700">
										{file ? file.name : `Seleccionar archivo Word (.docx) para ${targetSpecialty}`}
									</span>
								</label>
								<input
									id={`template-file-${specialtyIndex}`}
									type="file"
									accept=".docx,.doc"
									onChange={handleFileChange(specialtyIndex)}
									className="hidden"
								/>
							</div>
							{file && (
								<div className="mt-2 text-xs text-slate-500">
									Tamaño: {(file.size / 1024).toFixed(2)} KB
								</div>
							)}
						</div>

						<button
							onClick={() => handleUpload(specialtyIndex)}
							disabled={!file || uploading}
							className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white font-semibold shadow-lg hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-400/50"
						>
							{uploading ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									Subiendo...
								</>
							) : (
								<>
									<Upload className="w-5 h-5" />
									Subir Plantilla
								</>
							)}
						</button>
					</div>
				</div>

				{/* Modal de confirmación de eliminación */}
				{showDeleteModal && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
						<div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
									<Trash2 className="w-6 h-6 text-rose-600" />
								</div>
								<h3 className="text-lg font-semibold text-slate-900">Eliminar Plantilla</h3>
							</div>
							<p className="text-slate-700 mb-6">
								¿Estás seguro de que deseas eliminar la plantilla para {targetSpecialty}? Esta acción no se puede deshacer.
							</p>
							<div className="flex items-center gap-3 justify-end">
								<button
									onClick={() => setShowDeleteModal(false)}
									className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
								>
									Cancelar
								</button>
								<button
									onClick={() => handleDeleteConfirm(specialtyIndex)}
									className="px-4 py-2 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors flex items-center gap-2"
								>
									<Trash2 className="w-4 h-4" />
									Eliminar
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	};

	if (loading) {
		return (
			<main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-10 px-6">
				<div className="max-w-4xl mx-auto">
					<div className="rounded-2xl bg-white border border-blue-100 shadow-md p-6">
						<div className="flex items-center justify-center gap-3">
							<Loader2 className="w-5 h-5 animate-spin text-teal-600" />
							<span className="text-slate-700">Cargando...</span>
						</div>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-10 px-6">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				<header>
					<div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 rounded-2xl shadow-lg">
						<h1 className="text-2xl md:text-3xl font-semibold text-white flex items-center gap-3">
							<FileType size={24} />
							Plantilla de Informe Médico
						</h1>
						<p className="mt-2 text-sm text-white/90">
							{hasMultipleSpecialties 
								? 'Carga plantillas de informe médico para cada una de tus especialidades. El contenido que escribas en las consultas se insertará automáticamente en la plantilla correspondiente.'
								: 'Carga tu plantilla de informe médico en formato Word (.docx). El contenido que escribas en las consultas se insertará automáticamente en esta plantilla.'
							}
						</p>
					</div>
				</header>

				{/* Instructions */}
				<div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
					<h3 className="text-sm font-semibold text-blue-900 mb-2">📋 Instrucciones:</h3>
					<ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
						<li>La plantilla debe estar en formato Word (.docx o .doc)</li>
						<li>El tamaño máximo del archivo es 50MB</li>
						<li>En tu plantilla, usa el marcador <code className="bg-blue-100 px-1 rounded">{"{{contenido}}"}</code> donde quieras que se inserte el texto del informe</li>
						<li>Puedes usar otros marcadores como <code className="bg-blue-100 px-1 rounded">{"{{fecha}}"}</code>, <code className="bg-blue-100 px-1 rounded">{"{{paciente}}"}</code>, <code className="bg-blue-100 px-1 rounded">{"{{medico}}"}</code>, etc.</li>
					</ul>
				</div>

				{/* Error/Success Messages */}
				{error && (
					<div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
						<AlertCircle className="w-5 h-5" />
						<span className="text-sm">{error}</span>
					</div>
				)}

				{success && (
					<div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
						<CheckCircle2 className="w-5 h-5" />
						<span className="text-sm">{success}</span>
					</div>
				)}

				{/* Secciones por especialidad */}
				{renderSpecialtySection(1)}
				
				{/* Separador visual entre especialidades */}
				{hasMultipleSpecialties && (
					<div className="relative my-8">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t-4 border-slate-300"></div>
						</div>
						<div className="relative flex justify-center">
							<span className="bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-2 rounded-full border-4 border-slate-300 text-slate-700 text-sm font-bold uppercase tracking-wider shadow-md">
								Otra Especialidad
							</span>
						</div>
					</div>
				)}
				
				{hasMultipleSpecialties && renderSpecialtySection(2)}
			</div>
		</main>
	);
}
