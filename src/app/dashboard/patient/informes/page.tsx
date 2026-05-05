'use client';

import { useState, useEffect } from 'react';
import { Upload, Search, Filter, FolderOpen, Loader2 } from 'lucide-react';
import { PatientMedicalReport } from '@/types/medical-reports';
import { getMedicalReports, deleteMedicalReport } from '@/lib/actions/medical-reports';
import MedicalReportCard from '../components/medical-reports/MedicalReportCard';
import UploadReportModal from '../components/medical-reports/UploadReportModal';

export default function MedicalReportsPage() {
	const [reports, setReports] = useState<PatientMedicalReport[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [typeFilter, setTypeFilter] = useState('todos');
	const [uploadModalOpen, setUploadModalOpen] = useState(false);

	const loadReports = async () => {
		setLoading(true);
		try {
			const res = await getMedicalReports();
			if (res.data) {
				setReports(res.data as PatientMedicalReport[]);
			}
		} catch (error) {
			console.error('Error loading reports:', error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadReports();
	}, []);

	const handleDelete = async (id: string, fileUrl: string) => {
		try {
			const res = await deleteMedicalReport(id, fileUrl);
			if (res.success) {
				setReports(prev => prev.filter(r => r.id !== id));
			} else {
				alert(res.error || 'Error al eliminar el informe.');
			}
		} catch (error) {
			console.error('Error al eliminar:', error);
			alert('Error al eliminar el informe.');
		}
	};

	const filteredReports = reports.filter(report => {
		const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
							  (report.description?.toLowerCase().includes(searchQuery.toLowerCase()));
		const matchesType = typeFilter === 'todos' || report.report_type === typeFilter;
		return matchesSearch && matchesType;
	});

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
						<FolderOpen className="w-8 h-8 text-indigo-600" />
						Mis Informes Médicos
					</h1>
					<p className="text-gray-500 text-sm mt-1">Sube y gestiona tus resultados de laboratorio, imágenes y otros estudios médicos.</p>
				</div>
				<button 
					onClick={() => setUploadModalOpen(true)}
					className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-md transition-colors flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center"
				>
					<Upload className="w-5 h-5" />
					Subir Informe
				</button>
			</div>

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="relative flex-grow">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<Search className="h-5 w-5 text-gray-400" />
					</div>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
						placeholder="Buscar por título o descripción..."
					/>
				</div>
				<div className="relative min-w-[200px]">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<Filter className="h-5 w-5 text-gray-400" />
					</div>
					<select
						value={typeFilter}
						onChange={(e) => setTypeFilter(e.target.value)}
						className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm appearance-none"
					>
						<option value="todos">Todos los tipos</option>
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
			</div>

			{/* Content */}
			{loading ? (
				<div className="py-20 flex flex-col items-center justify-center text-gray-500 gap-4">
					<Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
					<p>Cargando tus informes...</p>
				</div>
			) : filteredReports.length > 0 ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
					{filteredReports.map(report => (
						<MedicalReportCard 
							key={report.id} 
							report={report} 
							onDelete={handleDelete}
						/>
					))}
				</div>
			) : (
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
					<div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
						<FolderOpen className="w-10 h-10 text-gray-400" />
					</div>
					<h3 className="text-lg font-bold text-gray-900 mb-2">No hay informes</h3>
					<p className="text-gray-500 max-w-md mx-auto mb-6">
						{searchQuery || typeFilter !== 'todos' 
							? 'No encontramos informes que coincidan con tu búsqueda.' 
							: 'Aún no has subido ningún informe médico. Sube tus resultados para tenerlos siempre a la mano.'}
					</p>
					{(searchQuery || typeFilter !== 'todos') ? (
						<button 
							onClick={() => { setSearchQuery(''); setTypeFilter('todos'); }}
							className="text-indigo-600 font-medium hover:text-indigo-700"
						>
							Limpiar filtros
						</button>
					) : (
						<button 
							onClick={() => setUploadModalOpen(true)}
							className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
						>
							Subir mi primer informe
						</button>
					)}
				</div>
			)}

			<UploadReportModal 
				isOpen={uploadModalOpen} 
				onClose={() => setUploadModalOpen(false)} 
				onSuccess={loadReports}
				consultations={[]} // Would fetch past consultations to link if necessary
			/>
		</div>
	);
}
