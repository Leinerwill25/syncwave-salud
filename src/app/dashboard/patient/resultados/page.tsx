'use client';

import { useState, useEffect, useRef } from 'react';
import { FlaskConical, AlertTriangle, Download, Calendar, User, FileText, Upload, X, Image as ImageIcon, Plus } from 'lucide-react';

type Consultation = {
	id: string;
	created_at: string;
	diagnosis: string | null;
	doctor: {
		name: string | null;
	} | null;
};

type LabResult = {
	id: string;
	result_type: string | null;
	result: any;
	attachments: string[];
	is_critical: boolean;
	reported_at: string;
	consultation: {
		id: string;
		diagnosis: string | null;
		doctor: {
			name: string | null;
		} | null;
	} | null;
};

export default function ResultadosPage() {
	const [loading, setLoading] = useState(true);
	const [results, setResults] = useState<LabResult[]>([]);
	const [showUploadForm, setShowUploadForm] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [selectedConsultationId, setSelectedConsultationId] = useState<string>('');
	const [consultations, setConsultations] = useState<Consultation[]>([]);
	const [loadingConsultations, setLoadingConsultations] = useState(false);
	const [resultType, setResultType] = useState('');
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		loadResults();
		loadConsultations();
	}, []);

	const loadConsultations = async () => {
		try {
			setLoadingConsultations(true);
			const res = await fetch('/api/patient/consultations', {
				credentials: 'include',
			});

			if (res.ok) {
				const data = await res.json();
				setConsultations(data.consultations || []);
			}
		} catch (err) {
			console.error('Error cargando consultas:', err);
		} finally {
			setLoadingConsultations(false);
		}
	};

	const loadResults = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/patient/resultados', {
				credentials: 'include',
			});

			if (!res.ok) throw new Error('Error al cargar resultados');

			const data = await res.json();
			setResults(data.data || []);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		const imageFiles = files.filter(file => file.type.startsWith('image/'));
		if (imageFiles.length !== files.length) {
			alert('Solo se permiten archivos de imagen (JPG, PNG, etc.)');
		}
		setSelectedFiles(prev => [...prev, ...imageFiles]);
	};

	const removeFile = (index: number) => {
		setSelectedFiles(prev => prev.filter((_, i) => i !== index));
	};

	const handleUpload = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (selectedFiles.length === 0) {
			alert('Por favor selecciona al menos una imagen');
			return;
		}

		if (!selectedConsultationId) {
			alert('Por favor selecciona una consulta relacionada');
			return;
		}

		try {
			setUploading(true);
			const formData = new FormData();
			selectedFiles.forEach(file => {
				formData.append('files', file);
			});
			formData.append('consultationId', selectedConsultationId);
			if (resultType) {
				formData.append('resultType', resultType);
			}

			const res = await fetch('/api/patient/resultados/upload', {
				method: 'POST',
				credentials: 'include',
				body: formData,
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || 'Error al subir resultados');
			}

			// Limpiar formulario
			setSelectedFiles([]);
			setSelectedConsultationId('');
			setResultType('');
			setShowUploadForm(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}

			// Recargar resultados
			loadResults();
			alert('Resultados subidos correctamente');
		} catch (err: any) {
			console.error('Error:', err);
			alert(err.message || 'Error al subir resultados');
		} finally {
			setUploading(false);
		}
	};

	const criticalResults = results.filter(r => r.is_critical);
	const normalResults = results.filter(r => !r.is_critical);

	return (
		<div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50 p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
						<div>
							<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
								<FlaskConical className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-yellow-600 flex-shrink-0" />
								<span className="truncate">Resultados de Laboratorio</span>
							</h1>
							<p className="text-xs sm:text-sm md:text-base text-gray-600">Consulta tus resultados de exámenes médicos</p>
						</div>
						<button
							onClick={() => setShowUploadForm(!showUploadForm)}
							className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-yellow-600 to-amber-600 text-white rounded-lg font-semibold hover:from-yellow-700 hover:to-amber-700 transition-all shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base"
						>
							{showUploadForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
							<span>{showUploadForm ? 'Cancelar' : 'Subir Resultados'}</span>
						</button>
					</div>
				</div>

				{/* Formulario de subida */}
				{showUploadForm && (
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
						<h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<Upload className="w-5 h-5 text-yellow-600" />
							<span>Subir Resultados de Laboratorio</span>
						</h2>
						<form onSubmit={handleUpload} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Consulta relacionada <span className="text-red-500">*</span>
								</label>
								<select
									required
									value={selectedConsultationId}
									onChange={(e) => setSelectedConsultationId(e.target.value)}
									className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm sm:text-base"
									disabled={loadingConsultations}
								>
									<option value="">Seleccionar consulta...</option>
									{consultations.map((consultation) => (
										<option key={consultation.id} value={consultation.id}>
											{new Date(consultation.created_at).toLocaleDateString('es-ES')} - {consultation.doctor?.name || 'Médico'} {consultation.diagnosis ? `- ${consultation.diagnosis}` : ''}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Tipo de resultado (opcional)
								</label>
								<input
									type="text"
									value={resultType}
									onChange={(e) => setResultType(e.target.value)}
									placeholder="Ej: Hemograma, Química sanguínea, etc."
									className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm sm:text-base"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Imágenes de resultados <span className="text-red-500">*</span>
								</label>
								<div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-yellow-500 transition-colors">
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*"
										multiple
										onChange={handleFileSelect}
										className="hidden"
										id="file-upload"
									/>
									<label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
										<ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
										<span className="text-sm text-gray-600">
											Haz clic para seleccionar imágenes o arrastra aquí
										</span>
										<span className="text-xs text-gray-500">Solo imágenes (JPG, PNG, etc.)</span>
									</label>
								</div>

								{selectedFiles.length > 0 && (
									<div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
										{selectedFiles.map((file, index) => (
											<div key={index} className="relative group">
												<img
													src={URL.createObjectURL(file)}
													alt={file.name}
													className="w-full h-32 object-cover rounded-lg border border-gray-200"
												/>
												<button
													type="button"
													onClick={() => removeFile(index)}
													className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100"
												>
													<X className="w-4 h-4" />
												</button>
												<p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
											</div>
										))}
									</div>
								)}
							</div>

							<div className="flex flex-col sm:flex-row gap-3 justify-end">
								<button
									type="button"
									onClick={() => {
										setShowUploadForm(false);
										setSelectedFiles([]);
										setSelectedConsultationId('');
										setResultType('');
										if (fileInputRef.current) {
											fileInputRef.current.value = '';
										}
									}}
									className="px-4 sm:px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={uploading || selectedFiles.length === 0 || !selectedConsultationId}
									className="px-4 sm:px-6 py-2 bg-gradient-to-r from-yellow-600 to-amber-600 text-white rounded-lg font-semibold hover:from-yellow-700 hover:to-amber-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
								>
									{uploading ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											<span>Subiendo...</span>
										</>
									) : (
										<>
											<Upload className="w-4 h-4" />
											<span>Subir Resultados</span>
										</>
									)}
								</button>
							</div>
						</form>
					</div>
				)}

				{/* Alertas críticas */}
				{criticalResults.length > 0 && (
					<div className="bg-red-50 border-2 border-red-200 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6">
						<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
							<AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
							<h2 className="text-base sm:text-lg md:text-xl font-semibold text-red-900 truncate">Resultados Críticos ({criticalResults.length})</h2>
						</div>
						<p className="text-xs sm:text-sm md:text-base text-red-800 mb-3 sm:mb-4 break-words">
							Tienes resultados que requieren atención inmediata. Por favor, contacta a tu médico.
						</p>
					</div>
				)}

				{/* Resultados */}
				{loading ? (
					<div className="space-y-3 sm:space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-5 md:p-6 animate-pulse">
								<div className="h-5 sm:h-6 bg-gray-200 rounded w-1/2 sm:w-1/3 mb-3 sm:mb-4"></div>
								<div className="h-3 sm:h-4 bg-gray-200 rounded w-full mb-2"></div>
							</div>
						))}
					</div>
				) : results.length === 0 ? (
					<div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-10 md:p-12 text-center">
						<FlaskConical className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
						<p className="text-gray-600 text-sm sm:text-base md:text-lg">No hay resultados de laboratorio</p>
					</div>
				) : (
					<div className="space-y-4">
						{/* Resultados críticos primero */}
						{criticalResults.map((result) => (
							<div
								key={result.id}
								className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-300"
							>
								<div className="flex items-start justify-between mb-4">
									<div className="flex items-center gap-3">
										<div className="p-3 bg-red-100 rounded-lg">
											<AlertTriangle className="w-6 h-6 text-red-600" />
										</div>
										<div>
											<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
												{result.result_type || 'Resultado de Laboratorio'}
												<span className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
													CRÍTICO
												</span>
											</h3>
											<p className="text-gray-600 flex items-center gap-2 mt-1">
												<Calendar className="w-4 h-4" />
												{new Date(result.reported_at).toLocaleDateString('es-ES', {
													year: 'numeric',
													month: 'long',
													day: 'numeric',
												})}
											</p>
										</div>
									</div>
								</div>
								{result.consultation?.doctor && (
									<p className="text-gray-600 flex items-center gap-2 mb-4">
										<User className="w-4 h-4" />
										Dr. {result.consultation.doctor.name || 'Médico'}
									</p>
								)}
								{result.result && (
									<div className="mb-4">
										<p className="font-semibold text-gray-900 mb-2">Resultados</p>
										<div className="bg-red-50 rounded-lg p-4">
											<pre className="text-sm text-gray-800 whitespace-pre-wrap">
												{typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
											</pre>
										</div>
									</div>
								)}
								{result.attachments && result.attachments.length > 0 && (
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
										{result.attachments.map((attachment, idx) => (
											<div key={idx} className="relative group">
												<a
													href={attachment}
													target="_blank"
													rel="noopener noreferrer"
													className="block"
												>
													<img
														src={attachment}
														alt={`Resultado ${idx + 1}`}
														className="w-full h-32 object-cover rounded-lg border-2 border-red-300 hover:border-red-500 transition-colors"
													/>
												</a>
											</div>
										))}
									</div>
								)}
							</div>
						))}

						{/* Resultados normales */}
						{normalResults.map((result) => (
							<div key={result.id} className="bg-white rounded-xl shadow-lg p-6">
								<div className="flex items-start justify-between mb-4">
									<div className="flex items-center gap-3">
										<div className="p-3 bg-yellow-100 rounded-lg">
											<FlaskConical className="w-6 h-6 text-yellow-600" />
										</div>
										<div>
											<h3 className="text-lg font-semibold text-gray-900">
												{result.result_type || 'Resultado de Laboratorio'}
											</h3>
											<p className="text-gray-600 flex items-center gap-2 mt-1">
												<Calendar className="w-4 h-4" />
												{new Date(result.reported_at).toLocaleDateString('es-ES', {
													year: 'numeric',
													month: 'long',
													day: 'numeric',
												})}
											</p>
										</div>
									</div>
								</div>
								{result.consultation?.doctor && (
									<p className="text-gray-600 flex items-center gap-2 mb-4">
										<User className="w-4 h-4" />
										Dr. {result.consultation.doctor.name || 'Médico'}
									</p>
								)}
								{result.result && (
									<div className="mb-4">
										<p className="font-semibold text-gray-900 mb-2">Resultados</p>
										<div className="bg-gray-50 rounded-lg p-4">
											<pre className="text-sm text-gray-800 whitespace-pre-wrap">
												{typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
											</pre>
										</div>
									</div>
								)}
								{result.attachments && result.attachments.length > 0 && (
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
										{result.attachments.map((attachment, idx) => (
											<div key={idx} className="relative group">
												<a
													href={attachment}
													target="_blank"
													rel="noopener noreferrer"
													className="block"
												>
													<img
														src={attachment}
														alt={`Resultado ${idx + 1}`}
														className="w-full h-32 object-cover rounded-lg border-2 border-yellow-300 hover:border-yellow-500 transition-colors"
													/>
												</a>
											</div>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
