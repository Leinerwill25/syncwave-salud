'use client';

import { useState } from 'react';
import { UploadCloud, X, Loader2, FileText, ImageIcon } from 'lucide-react';
import { ReportType } from '@/types/medical-reports';
import { createSupabaseBrowserClient } from '@/app/adapters/client';
import { createMedicalReport } from '@/lib/actions/medical-reports';

interface UploadReportModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	consultations: any[]; // Used for linking if needed
}

export default function UploadReportModal({ isOpen, onClose, onSuccess, consultations }: UploadReportModalProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const [file, setFile] = useState<File | null>(null);
	const [title, setTitle] = useState('');
	const [reportType, setReportType] = useState<ReportType>('otro');
	const [description, setDescription] = useState('');
	const [consultationId, setConsultationId] = useState('');
	const [isShared, setIsShared] = useState(true);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const selected = e.target.files[0];
			// Validar tamaño 20MB
			if (selected.size > 20 * 1024 * 1024) {
				setError('El archivo excede el límite de 20MB.');
				return;
			}
			setFile(selected);
			if (!title) {
				setTitle(selected.name.split('.')[0]);
			}
			setError(null);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file || !title) return;

		setIsUploading(true);
		setError(null);
		setProgress(10);

		try {
			const supabase = createSupabaseBrowserClient();
			const { data: userData } = await supabase.auth.getUser();
			if (!userData?.user) throw new Error('No autorizado');

			const fileExt = file.name.split('.').pop();
			const fileName = `${crypto.randomUUID()}.${fileExt}`;
			const year = new Date().getFullYear();
			const filePath = `${userData.user.id}/${year}/${fileName}`;

			setProgress(30);

			// Upload to Storage
			const { error: uploadError } = await supabase.storage
				.from('medical-reports')
				.upload(filePath, file, {
					cacheControl: '3600',
					upsert: false,
				});

			if (uploadError) throw new Error(uploadError.message);

			setProgress(80);

			// Construct URL or path (storing path is better, but we'll store path as file_url so we can generate signed URLs later)
			// Wait, the action expects file_url to be used later. We will store the path.
			
			// Save to DB via Action
			const result = await createMedicalReport({
				title,
				description: description || null,
				report_type: reportType,
				file_url: filePath,
				file_name: file.name,
				file_size: file.size,
				file_type: file.type,
				consultation_id: consultationId || null,
				is_shared_with_doctor: isShared,
			});

			if (result.error) throw new Error(result.error);

			setProgress(100);
			onSuccess();
			onClose();
			
			// Reset
			setFile(null);
			setTitle('');
			setDescription('');
			setConsultationId('');
			setReportType('otro');
			
		} catch (err: any) {
			console.error(err);
			setError(err.message || 'Error al subir el archivo');
		} finally {
			setIsUploading(false);
			setProgress(0);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
			<div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
				<div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
					<h2 className="text-lg font-bold text-gray-900">Subir Informe Médico</h2>
					<button onClick={onClose} disabled={isUploading} className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
						<X className="w-5 h-5" />
					</button>
				</div>
				
				<div className="p-4 sm:p-6 overflow-y-auto">
					{error && (
						<div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
							{error}
						</div>
					)}
					
					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Drag & Drop Area */}
						{!file ? (
							<div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 hover:border-indigo-400 transition-colors relative">
								<input 
									type="file" 
									className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
									accept=".pdf,.jpg,.jpeg,.png,.dcm,.heic"
									onChange={handleFileChange}
								/>
								<UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-3" />
								<p className="text-sm font-medium text-gray-700">Haz clic o arrastra un archivo aquí</p>
								<p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, DICOM hasta 20MB</p>
							</div>
						) : (
							<div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-4 flex items-center justify-between">
								<div className="flex items-center gap-3 overflow-hidden">
									<div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 flex-shrink-0">
										{file.type.includes('pdf') ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
									</div>
									<div className="truncate">
										<p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
										<p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
									</div>
								</div>
								<button 
									type="button" 
									onClick={() => setFile(null)}
									disabled={isUploading}
									className="text-gray-400 hover:text-red-500 p-1"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						)}

						{isUploading && progress > 0 && (
							<div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
								<div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
							</div>
						)}

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Título del informe <span className="text-red-500">*</span></label>
								<input 
									type="text" 
									required
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm px-3 py-2 border"
									placeholder="Ej: Análisis de sangre general"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Tipo de informe <span className="text-red-500">*</span></label>
								<select 
									value={reportType}
									onChange={(e) => setReportType(e.target.value as ReportType)}
									className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm px-3 py-2 border"
								>
									<option value="laboratorio">Laboratorio</option>
									<option value="imagen">Imagen General</option>
									<option value="ecografia">Ecografía</option>
									<option value="resonancia">Resonancia</option>
									<option value="rayos_x">Rayos X</option>
									<option value="tomografia">Tomografía</option>
									<option value="electrocardiograma">Electrocardiograma</option>
									<option value="biopsia">Biopsia</option>
									<option value="otro">Otro</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Descripción (Opcional)</label>
								<textarea 
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm px-3 py-2 border h-20 resize-none"
									placeholder="Añade notas o comentarios sobre este informe..."
								/>
							</div>

							<div className="flex items-center gap-2">
								<input 
									type="checkbox" 
									id="share-doc"
									checked={isShared}
									onChange={(e) => setIsShared(e.target.checked)}
									className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-gray-300"
								/>
								<label htmlFor="share-doc" className="text-sm text-gray-700">
									Compartir automáticamente con mis médicos
								</label>
							</div>
						</div>

						<div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
							<button 
								type="button" 
								onClick={onClose}
								disabled={isUploading}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
							>
								Cancelar
							</button>
							<button 
								type="submit" 
								disabled={!file || !title || isUploading}
								className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								{isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
								Subir Informe
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
