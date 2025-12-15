'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileType, CheckCircle2, AlertCircle, Loader2, Download, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrescriptionTemplatePage() {
	const router = useRouter();
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [currentTemplate, setCurrentTemplate] = useState<{ url: string; name: string } | null>(null);
	const [templateText, setTemplateText] = useState<string>('');
	const [savingText, setSavingText] = useState(false);
	const [loading, setLoading] = useState(true);
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	useEffect(() => {
		loadCurrentTemplate();
	}, []);

	const loadCurrentTemplate = async () => {
		try {
			const res = await fetch('/api/medic/prescription-template', {
				credentials: 'include',
			});
			if (res.ok) {
				const data = await res.json();
				if (data.template_url) {
					setCurrentTemplate({
						url: data.template_url,
						name: data.template_name || 'Plantilla actual',
					});
				}
				// Cargar plantilla de texto si existe
				if (data.template_text && typeof data.template_text === 'string' && data.template_text.trim() !== '') {
					setTemplateText(data.template_text);
				} else {
					setTemplateText('');
				}
			}
		} catch (err) {
			console.error('Error cargando plantilla:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (!selectedFile) return;

		// Validar que sea un archivo Word (.docx)
		const validExtensions = ['.docx', '.doc'];
		const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

		if (!validExtensions.includes(fileExtension)) {
			setError('Por favor, selecciona un archivo Word (.docx o .doc)');
			setFile(null);
			return;
		}

		// Validar tamaño (máximo 50MB)
		const maxSizeBytes = 50 * 1024 * 1024; // 50MB
		if (selectedFile.size > maxSizeBytes) {
			setError(`El archivo es demasiado grande. El tamaño máximo es ${maxSizeBytes / (1024 * 1024)}MB`);
			setFile(null);
			return;
		}

		setFile(selectedFile);
		setError(null);
	};

	const handleUpload = async () => {
		if (!file) {
			setError('Por favor, selecciona un archivo');
			return;
		}

		setUploading(true);
		setError(null);
		setSuccess(null);

		try {
			const formData = new FormData();
			formData.append('template', file);

			const res = await fetch('/api/medic/prescription-template', {
				method: 'POST',
				credentials: 'include',
				body: formData,
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al cargar la plantilla');
			}

			setSuccess('Plantilla cargada exitosamente');
			setFile(null);
			await loadCurrentTemplate();

			// Reset file input
			const fileInput = document.getElementById('template-file') as HTMLInputElement;
			if (fileInput) fileInput.value = '';
		} catch (err: any) {
			setError(err.message || 'Error al cargar la plantilla');
		} finally {
			setUploading(false);
		}
	};

	const handleDownload = () => {
		if (currentTemplate?.url) {
			window.open(currentTemplate.url, '_blank');
		}
	};

	const handleDeleteClick = () => {
		setShowDeleteModal(true);
	};

	const handleDeleteConfirm = async () => {
		if (!currentTemplate) return;

		setShowDeleteModal(false);
		setError(null);
		setSuccess(null);

		try {
			const res = await fetch('/api/medic/prescription-template', {
				method: 'DELETE',
				credentials: 'include',
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al eliminar la plantilla');
			}

			setSuccess('Plantilla eliminada exitosamente');
			setCurrentTemplate(null);
			setTemplateText('');
		} catch (err: any) {
			setError(err.message || 'Error al eliminar la plantilla');
		}
	};

	const handleSaveTemplateText = async () => {
		setSavingText(true);
		setError(null);
		setSuccess(null);

		try {
			const res = await fetch('/api/medic/prescription-template', {
				method: 'PUT',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					template_text: templateText,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al guardar la plantilla de texto');
			}

			setSuccess('Plantilla de texto guardada exitosamente');
		} catch (err: any) {
			setError(err.message || 'Error al guardar la plantilla de texto');
		} finally {
			setSavingText(false);
		}
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
							Plantilla de Receta Médica
						</h1>
						<p className="mt-2 text-sm text-white/90">Carga tu plantilla de receta médica en formato Word (.docx). Los medicamentos que escribas en las prescripciones se insertarán automáticamente en esta plantilla.</p>
					</div>
				</header>

				{/* Instructions */}
				<div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
					<h3 className="text-sm font-semibold text-blue-900 mb-2">📋 Instrucciones:</h3>
					<ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
						<li>La plantilla debe estar en formato Word (.docx o .doc)</li>
						<li>El tamaño máximo del archivo es 50MB (permite plantillas con imágenes, encabezados y mucho contenido)</li>
						<li>Tu plantilla puede tener cualquier contenido adicional: encabezados, imágenes, texto, tablas, etc.</li>
						<li>En tu plantilla, usa los marcadores disponibles para insertar datos:</li>
						<li className="ml-4">
							<ul className="list-disc list-inside space-y-1">
								<li>
									<code className="bg-blue-100 px-1 rounded">{'{{paciente}}'}</code> - Nombre del paciente
								</li>
								<li>
									<code className="bg-blue-100 px-1 rounded">{'{{edad}}'}</code> - Edad del paciente
								</li>
								<li>
									<code className="bg-blue-100 px-1 rounded">{'{{cedula}}'}</code> o <code className="bg-blue-100 px-1 rounded">{'{{cedula_identidad}}'}</code> - Cédula/ID del paciente
								</li>
								<li>
									<code className="bg-blue-100 px-1 rounded">{'{{medico}}'}</code> o <code className="bg-blue-100 px-1 rounded">{'{{doctor}}'}</code> - Nombre del médico
								</li>
								<li>
									<code className="bg-blue-100 px-1 rounded">{'{{fecha}}'}</code> o <code className="bg-blue-100 px-1 rounded">{'{{date}}'}</code> - Fecha de emisión
								</li>
								<li>
									<code className="bg-blue-100 px-1 rounded">{'{{recipe}}'}</code> o <code className="bg-blue-100 px-1 rounded">{'{{receta}}'}</code> - <strong>Récipe completo:</strong> Contiene todos los medicamentos con su información completa (nombre, dosis, frecuencia, duración, cantidad). <strong>NO incluye las instrucciones específicas</strong>, esas van en la variable {'{{instrucciones}}'}. Esta variable va en la primera hoja del documento.
								</li>
								<li>
									<code className="bg-blue-100 px-1 rounded">{'{{instrucciones}}'}</code> o <code className="bg-blue-100 px-1 rounded">{'{{instructions}}'}</code> - <strong>Instrucciones específicas:</strong> Contiene solo las instrucciones específicas de cada medicamento, agrupadas por medicamento. Útil si quieres mostrar las instrucciones por separado. Esta variable puede ir en la misma hoja del récipe o en una sección separada.
								</li>
								<li>
									<code className="bg-blue-100 px-1 rounded">{'{{indicaciones}}'}</code> o <code className="bg-blue-100 px-1 rounded">{'{{indications}}'}</code> - <strong>Indicaciones generales:</strong> Contiene las notas generales de la prescripción (no las instrucciones específicas de cada medicamento, esas van en {'{{instrucciones}}'} o en {'{{recipe}}'}). Esta variable va en la segunda hoja del documento.
								</li>
								<li>
									<code className="bg-blue-100 px-1 rounded">{'{{validez}}'}</code> o <code className="bg-blue-100 px-1 rounded">{'{{valid_until}}'}</code> - Fecha de validez de la receta
								</li>
							</ul>
						</li>
						<li className="mt-2">
							<strong>Nota importante:</strong> La plantilla debe tener DOS hojas: una para récipe y otra para indicaciones. El sistema genera UN SOLO archivo Word con ambas hojas rellenadas:
							<ul className="list-disc list-inside ml-4 mt-1 space-y-1">
								<li>
									<strong>Primera hoja (Récipe):</strong> Se rellena <code className="bg-blue-100 px-1 rounded">{'{{recipe}}'}</code> con todos los medicamentos (nombre, dosis, frecuencia, duración, cantidad). Las instrucciones específicas van en la variable <code className="bg-blue-100 px-1 rounded">{'{{instrucciones}}'}</code> en la siguiente hoja.
								</li>
								<li>
									<strong>Segunda hoja (Indicaciones):</strong> Se rellena <code className="bg-blue-100 px-1 rounded">{'{{indicaciones}}'}</code> con las notas generales de la prescripción.
								</li>
								<li>El archivo se genera en tiempo real mientras escribes, sin necesidad de guardar primero.</li>
							</ul>
						</li>
						<li>
							<strong>Importante:</strong> Solo se valida que el archivo sea .docx o .doc. El contenido interno puede ser cualquier cosa, siempre que incluya los marcadores necesarios.
						</li>
					</ul>
				</div>

				{/* Current Template */}
				{currentTemplate && (
					<div className="bg-white rounded-2xl border border-green-200 shadow-sm p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<CheckCircle2 className="w-5 h-5 text-green-600" />
								<div>
									<p className="text-sm font-medium text-slate-900">Plantilla actual cargada</p>
									<p className="text-xs text-slate-500">{currentTemplate.name}</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<button onClick={handleDownload} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors">
									Descargar
								</button>
								<button onClick={handleDeleteClick} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors flex items-center gap-2">
									<Trash2 className="w-4 h-4" />
									Eliminar
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Template Text Section */}
				<div className="bg-white rounded-2xl border border-blue-100 shadow-lg p-6">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<h2 className="text-lg font-semibold text-slate-900">Plantilla de Texto de la Receta</h2>
							{templateText && templateText.trim() !== '' && (
								<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
									<CheckCircle2 className="w-3.5 h-3.5" />
									Plantilla guardada
								</span>
							)}
						</div>
					</div>
					<p className="text-sm text-slate-600 mb-4">
						Escribe aquí la estructura de texto que se usará para generar automáticamente el contenido de la receta. Usa marcadores como {'{{paciente}}'}, {'{{recipe}}'}, {'{{indicaciones}}'}, {'{{fecha}}'}, etc. para insertar los datos automáticamente.
						<br />
						<strong className="text-slate-800">Importante:</strong> Usa {'{{recipe}}'} para los récipes individuales y {'{{indicaciones}}'} para las indicaciones generales.
						{templateText && templateText.trim() !== '' && <span className="block mt-2 text-xs text-green-600 font-medium">✓ Hay una plantilla guardada. Puedes editarla aquí y guardar los cambios.</span>}
					</p>

					<div className="space-y-4">
						<div>
							<label htmlFor="template-text" className="block text-sm font-medium text-slate-700 mb-2">
								Estructura de la Receta
							</label>
							<textarea
								id="template-text"
								value={templateText}
								onChange={(e) => setTemplateText(e.target.value)}
								rows={20}
								className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								placeholder={`RECETA MÉDICA

Paciente: {{paciente}}
Edad: {{edad}} años
Cédula: {{cedula}}
Fecha: {{fecha}}

Récipe:
{{recipe}}

O si es para indicaciones:

Indicaciones:
{{indicaciones}}

Válido hasta: {{validez}}

Dr./Dra. {{medico}}`}
							/>
							<p className="mt-2 text-xs text-slate-500">
								Usa marcadores como {'{{paciente}}'}, {'{{recipe}}'} o {'{{receta}}'} para récipes, {'{{indicaciones}}'} para indicaciones, {'{{fecha}}'}, etc. para insertar los datos automáticamente.
							</p>
						</div>

						<button onClick={handleSaveTemplateText} disabled={savingText} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed">
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

				{/* Upload Section */}
				<div className="bg-white rounded-2xl border border-blue-100 shadow-lg p-6">
					<h2 className="text-lg font-semibold text-slate-900 mb-4">Cargar Plantilla Word</h2>

					<div className="space-y-4">
						{/* File Input */}
						<div>
							<label htmlFor="template-file" className="block text-sm font-medium text-slate-700 mb-2">
								Seleccionar archivo de plantilla
							</label>
							<div className="flex items-center gap-4">
								<label htmlFor="template-file" className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
									<Upload className="w-5 h-5 text-teal-600" />
									<span className="text-sm font-medium text-slate-700">{file ? file.name : 'Seleccionar archivo Word (.docx)'}</span>
								</label>
								<input id="template-file" type="file" accept=".docx,.doc" onChange={handleFileChange} className="hidden" />
							</div>
							{file && <div className="mt-2 text-xs text-slate-500">Tamaño: {(file.size / 1024).toFixed(2)} KB</div>}
						</div>

						{/* Error Message */}
						{error && (
							<div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
								<AlertCircle className="w-5 h-5" />
								<span className="text-sm">{error}</span>
							</div>
						)}

						{/* Success Message */}
						{success && (
							<div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
								<CheckCircle2 className="w-5 h-5" />
								<span className="text-sm">{success}</span>
							</div>
						)}

						{/* Upload Button */}
						<button onClick={handleUpload} disabled={!file || uploading} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed">
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
			</div>

			{/* Delete Confirmation Modal */}
			{showDeleteModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
								<Trash2 className="w-6 h-6 text-rose-600" />
							</div>
							<h3 className="text-lg font-semibold text-slate-900">Eliminar Plantilla</h3>
						</div>
						<p className="text-slate-700 mb-6">¿Estás seguro de que deseas eliminar esta plantilla? Esta acción no se puede deshacer.</p>
						<div className="flex items-center gap-3 justify-end">
							<button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors">
								Cancelar
							</button>
							<button onClick={handleDeleteConfirm} className="px-4 py-2 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors flex items-center gap-2">
								<Trash2 className="w-4 h-4" />
								Eliminar
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}
