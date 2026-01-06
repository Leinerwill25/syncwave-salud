'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileType, CheckCircle2, AlertCircle, Loader2, Download, Trash2, Stethoscope } from 'lucide-react';
import { useRouter } from 'next/navigation';

type TemplateData = {
	specialty: string;
	template_url: string | null;
	template_name: string | null;
	template_text: string | null;
	font_family: string;
};

type TemplateResponse = {
	hasMultipleSpecialties: boolean;
	specialty1: string | null;
	specialty2: string | null;
	template1?: TemplateData;
	template2?: TemplateData;
};

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

				if (data.template1) {
					setTemplate1(data.template1);
					setTemplateText1(data.template1.template_text || '');
				}

				if (data.template2) {
					setTemplate2(data.template2);
					setTemplateText2(data.template2.template_text || '');
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

	const handleUpload = async (specialtyIndex: 1 | 2) => {
		const file = specialtyIndex === 1 ? file1 : file2;
		const targetSpecialty = specialtyIndex === 1 ? specialties.specialty1 : specialties.specialty2;

		if (!file || !targetSpecialty) {
			setError('Por favor, selecciona un archivo');
			return;
		}

		if (specialtyIndex === 1) {
			setUploading1(true);
		} else {
			setUploading2(true);
		}
		setError(null);
		setSuccess(null);

		try {
			const formData = new FormData();
			formData.append('template', file);
			formData.append('specialty', targetSpecialty);

			const res = await fetch('/api/medic/report-template', {
				method: 'POST',
				credentials: 'include',
				body: formData,
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al cargar la plantilla');
			}

			setSuccess(`Plantilla para ${targetSpecialty} cargada exitosamente`);
			if (specialtyIndex === 1) {
				setFile1(null);
				const fileInput = document.getElementById(`template-file-1`) as HTMLInputElement;
				if (fileInput) fileInput.value = '';
			} else {
				setFile2(null);
				const fileInput = document.getElementById(`template-file-2`) as HTMLInputElement;
				if (fileInput) fileInput.value = '';
			}
			await loadCurrentTemplates();
		} catch (err: any) {
			setError(err.message || 'Error al cargar la plantilla');
		} finally {
			if (specialtyIndex === 1) {
				setUploading1(false);
			} else {
				setUploading2(false);
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

	const handleSaveTemplateText = async (specialtyIndex: 1 | 2) => {
		const templateText = specialtyIndex === 1 ? templateText1 : templateText2;
		const targetSpecialty = specialtyIndex === 1 ? specialties.specialty1 : specialties.specialty2;

		if (!targetSpecialty) return;

		if (specialtyIndex === 1) {
			setSavingText1(true);
		} else {
			setSavingText2(true);
		}
		setError(null);
		setSuccess(null);

		try {
			const res = await fetch('/api/medic/report-template', {
				method: 'PUT',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					template_text: templateText,
					specialty: targetSpecialty,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al guardar la plantilla de texto');
			}

			setSuccess(`Plantilla de texto para ${targetSpecialty} guardada exitosamente`);
			await loadCurrentTemplates();
		} catch (err: any) {
			setError(err.message || 'Error al guardar la plantilla de texto');
		} finally {
			if (specialtyIndex === 1) {
				setSavingText1(false);
			} else {
				setSavingText2(false);
			}
		}
	};

	const renderSpecialtySection = (specialtyIndex: 1 | 2) => {
		const targetSpecialty = specialtyIndex === 1 ? specialties.specialty1 : specialties.specialty2;
		const template = specialtyIndex === 1 ? template1 : template2;
		const file = specialtyIndex === 1 ? file1 : file2;
		const uploading = specialtyIndex === 1 ? uploading1 : uploading2;
		const templateText = specialtyIndex === 1 ? templateText1 : templateText2;
		const setTemplateText = specialtyIndex === 1 ? setTemplateText1 : setTemplateText2;
		const savingText = specialtyIndex === 1 ? savingText1 : savingText2;
		const showDeleteModal = specialtyIndex === 1 ? showDeleteModal1 : showDeleteModal2;
		const setShowDeleteModal = specialtyIndex === 1 ? setShowDeleteModal1 : setShowDeleteModal2;

		if (!targetSpecialty) return null;

		return (
			<div key={specialtyIndex} className="space-y-6">
				{/* Título de la especialidad */}
				<div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-xl shadow-md">
					<h2 className="text-xl font-semibold text-white flex items-center gap-2">
						<Stethoscope className="w-5 h-5" />
						Plantilla para: {targetSpecialty}
					</h2>
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
				<div className="bg-white rounded-2xl border border-blue-100 shadow-lg p-6">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<h3 className="text-lg font-semibold text-slate-900">Plantilla de Texto del Informe</h3>
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
							className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed"
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
				<div className="bg-white rounded-2xl border border-blue-100 shadow-lg p-6">
					<h3 className="text-lg font-semibold text-slate-900 mb-4">Cargar Plantilla Word</h3>

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
							className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed"
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
				{hasMultipleSpecialties && renderSpecialtySection(2)}
			</div>
		</main>
	);
}
