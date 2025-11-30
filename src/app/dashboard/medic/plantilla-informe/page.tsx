'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileType, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReportTemplatePage() {
	const router = useRouter();
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [currentTemplate, setCurrentTemplate] = useState<{ url: string; name: string } | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadCurrentTemplate();
	}, []);

	const loadCurrentTemplate = async () => {
		try {
			const res = await fetch('/api/medic/report-template', {
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

		// Validar tamaño (máximo 10MB)
		if (selectedFile.size > 10 * 1024 * 1024) {
			setError('El archivo es demasiado grande. El tamaño máximo es 10MB');
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

			const res = await fetch('/api/medic/report-template', {
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
							Carga tu plantilla de informe médico en formato Word (.docx). El contenido que escribas en las consultas se insertará automáticamente en esta plantilla.
						</p>
					</div>
				</header>

				{/* Instructions */}
				<div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
					<h3 className="text-sm font-semibold text-blue-900 mb-2">📋 Instrucciones:</h3>
					<ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
						<li>La plantilla debe estar en formato Word (.docx o .doc)</li>
						<li>El tamaño máximo del archivo es 10MB</li>
						<li>En tu plantilla, usa el marcador <code className="bg-blue-100 px-1 rounded">{"{{contenido}}"}</code> donde quieras que se inserte el texto del informe</li>
						<li>Puedes usar otros marcadores como <code className="bg-blue-100 px-1 rounded">{"{{fecha}}"}</code>, <code className="bg-blue-100 px-1 rounded">{"{{paciente}}"}</code>, <code className="bg-blue-100 px-1 rounded">{"{{medico}}"}</code> para datos adicionales</li>
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
							<button
								onClick={handleDownload}
								className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
							>
								Descargar
							</button>
						</div>
					</div>
				)}

				{/* Upload Section */}
				<div className="bg-white rounded-2xl border border-blue-100 shadow-lg p-6">
					<h2 className="text-lg font-semibold text-slate-900 mb-4">Cargar Plantilla</h2>

					<div className="space-y-4">
						{/* File Input */}
						<div>
							<label htmlFor="template-file" className="block text-sm font-medium text-slate-700 mb-2">
								Seleccionar archivo de plantilla
							</label>
							<div className="flex items-center gap-4">
								<label
									htmlFor="template-file"
									className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
								>
									<Upload className="w-5 h-5 text-teal-600" />
									<span className="text-sm font-medium text-slate-700">
										{file ? file.name : 'Seleccionar archivo Word (.docx)'}
									</span>
								</label>
								<input
									id="template-file"
									type="file"
									accept=".docx,.doc"
									onChange={handleFileChange}
									className="hidden"
								/>
							</div>
							{file && (
								<div className="mt-2 text-xs text-slate-500">
									Tamaño: {(file.size / 1024).toFixed(2)} KB
								</div>
							)}
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
						<button
							onClick={handleUpload}
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
			</div>
		</main>
	);
}

