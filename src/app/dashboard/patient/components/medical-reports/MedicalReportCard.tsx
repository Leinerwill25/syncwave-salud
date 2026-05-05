'use client';

import { FileText, Image as ImageIcon, Activity, Scan, Droplets, Microscope, Plus, Search, Filter, Loader2 } from 'lucide-react';
import { PatientMedicalReport } from '@/types/medical-reports';
import { useState } from 'react';
import ReportPreviewModal from './ReportPreviewModal';

const REPORT_TYPE_ICONS: Record<string, any> = {
	laboratorio: Droplets,
	imagen: ImageIcon,
	ecografia: Scan,
	resonancia: Activity,
	rayos_x: FileText,
	tomografia: Scan,
	electrocardiograma: Activity,
	biopsia: Microscope,
	otro: FileText,
};

const REPORT_TYPE_COLORS: Record<string, string> = {
	laboratorio: 'bg-blue-100 text-blue-700',
	imagen: 'bg-purple-100 text-purple-700',
	ecografia: 'bg-teal-100 text-teal-700',
	resonancia: 'bg-indigo-100 text-indigo-700',
	rayos_x: 'bg-gray-100 text-gray-700',
	tomografia: 'bg-orange-100 text-orange-700',
	electrocardiograma: 'bg-red-100 text-red-700',
	biopsia: 'bg-pink-100 text-pink-700',
	otro: 'bg-gray-100 text-gray-700',
};

export default function MedicalReportCard({ report, onDelete }: { report: PatientMedicalReport, onDelete: (id: string, url: string) => void }) {
	const [previewOpen, setPreviewOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	
	const Icon = REPORT_TYPE_ICONS[report.report_type] || FileText;
	const colorClass = REPORT_TYPE_COLORS[report.report_type] || 'bg-gray-100 text-gray-700';

	const formatSize = (bytes: number | null) => {
		if (!bytes) return '';
		const mb = bytes / (1024 * 1024);
		if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
		return `${mb.toFixed(2)} MB`;
	};

	const handleDelete = async () => {
		if (!confirm('¿Estás seguro de que deseas eliminar este informe? Esta acción no se puede deshacer.')) return;
		setIsDeleting(true);
		await onDelete(report.id, report.file_url);
		setIsDeleting(false);
	};

	return (
		<>
			<div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-100 p-4 sm:p-5 hover:shadow-lg transition-all flex flex-col h-full">
				<div className="flex justify-between items-start mb-3">
					<div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
						<Icon className="w-5 h-5" />
					</div>
					{report.is_shared_with_doctor && (
						<span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full flex items-center gap-1 border border-green-100">
							<span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
							Compartido
						</span>
					)}
				</div>
				
				<h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 mb-1">{report.title}</h3>
				
				<div className="flex flex-wrap gap-2 mb-3">
					<span className="text-xs text-gray-500 capitalize">{report.report_type.replace('_', ' ')}</span>
					<span className="text-xs text-gray-400">•</span>
					<span className="text-xs text-gray-500">
						{new Date(report.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
					</span>
				</div>
				
				{report.description && (
					<p className="text-xs text-gray-600 line-clamp-2 mb-4 flex-grow">{report.description}</p>
				)}
				{!report.description && <div className="flex-grow"></div>}

				<div className="mt-auto pt-4 border-t border-gray-100">
					<div className="flex items-center justify-between">
						<span className="text-xs text-gray-400 truncate max-w-[50%]">{formatSize(report.file_size)}</span>
						<div className="flex gap-2">
							<button 
								onClick={() => setPreviewOpen(true)}
								className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 hover:bg-indigo-50 rounded"
							>
								Ver
							</button>
							<button 
								onClick={handleDelete}
								disabled={isDeleting}
								className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors px-2 py-1 hover:bg-red-50 rounded disabled:opacity-50 flex items-center"
							>
								{isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Eliminar'}
							</button>
						</div>
					</div>
				</div>
			</div>

			<ReportPreviewModal 
				isOpen={previewOpen} 
				onClose={() => setPreviewOpen(false)} 
				report={report} 
			/>
		</>
	);
}
