'use client';

import { useState, useEffect } from 'react';
import { X, Download, Loader2, FileText, AlertCircle } from 'lucide-react';
import { PatientMedicalReport } from '@/types/medical-reports';
import { getMedicalReportSignedUrl } from '@/lib/actions/medical-reports';

interface ReportPreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	report: PatientMedicalReport;
}

export default function ReportPreviewModal({ isOpen, onClose, report }: ReportPreviewModalProps) {
	const [signedUrl, setSignedUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen && report) {
			loadSignedUrl();
		} else {
			setSignedUrl(null);
			setError(null);
		}
	}, [isOpen, report]);

	const loadSignedUrl = async () => {
		setLoading(true);
		setError(null);
		try {
			// Extract relative path from stored file_url
			let filePath = report.file_url;
			if (filePath.includes('medical-reports/')) {
				filePath = filePath.split('medical-reports/')[1].split('?')[0];
			}

			const res = await getMedicalReportSignedUrl(filePath);
			if (res.error) throw new Error(res.error);
			setSignedUrl(res.signedUrl || null);
		} catch (err: any) {
			console.error(err);
			setError('No se pudo cargar la vista previa del archivo.');
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	const isImage = report.file_name.match(/\.(jpg|jpeg|png|heic)$/i) || report.file_type?.startsWith('image/');
	const isPdf = report.file_name.match(/\.(pdf)$/i) || report.file_type === 'application/pdf';

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
			<div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
				{/* Header */}
				<div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
					<div className="flex items-center gap-3 overflow-hidden">
						<div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
							{isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
						</div>
						<div className="min-w-0">
							<h3 className="font-bold text-gray-900 truncate">{report.title}</h3>
							<p className="text-xs text-gray-500 truncate">{report.file_name}</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{signedUrl && (
							<a 
								href={signedUrl} 
								download={report.file_name}
								target="_blank"
								rel="noreferrer"
								className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
							>
								<Download className="w-4 h-4" />
								<span className="hidden sm:inline">Descargar</span>
							</a>
						)}
						<button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4 relative">
					{loading && (
						<div className="flex flex-col items-center justify-center text-gray-500 gap-3">
							<Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
							<p className="text-sm font-medium">Cargando vista previa...</p>
						</div>
					)}

					{!loading && error && (
						<div className="flex flex-col items-center justify-center text-red-500 gap-3 p-6 bg-white rounded-xl shadow-sm text-center max-w-sm">
							<AlertCircle className="w-10 h-10" />
							<div>
								<p className="font-bold text-gray-900 mb-1">Error de carga</p>
								<p className="text-sm text-gray-600">{error}</p>
							</div>
						</div>
					)}

					{!loading && !error && signedUrl && (
						<div className="w-full h-full bg-white shadow-sm rounded-lg overflow-hidden flex items-center justify-center">
							{isImage ? (
								<img 
									src={signedUrl} 
									alt={report.title} 
									className="max-w-full max-h-full object-contain"
								/>
							) : isPdf ? (
								<iframe 
									src={`${signedUrl}#view=FitH`} 
									title={report.title}
									className="w-full h-full border-0"
								/>
							) : (
								<div className="text-center p-8">
									<FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
									<p className="text-gray-900 font-medium mb-2">Vista previa no disponible</p>
									<p className="text-sm text-gray-500 mb-6">Este tipo de archivo no se puede previsualizar en el navegador.</p>
									<a 
										href={signedUrl} 
										download={report.file_name}
										className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
									>
										<Download className="w-4 h-4" />
										Descargar archivo
									</a>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// Stub for ImageIcon since it wasn't imported properly above.
function ImageIcon(props: any) {
	return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
}
