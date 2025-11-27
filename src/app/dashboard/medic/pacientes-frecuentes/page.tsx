'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, FileText, X, Save, Trash2, Loader2, CheckCircle, AlertCircle, Users } from 'lucide-react';
import axios from 'axios';

interface ExtractedPatient {
	id: string; // ID temporal para identificar filas
	first_name: string;
	last_name: string;
	identification: string;
	email: string;
	phone?: string;
}

export default function PacientesFrecuentesPage() {
	const [file, setFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [extractedPatients, setExtractedPatients] = useState<ExtractedPatient[]>([]);
	const [saving, setSaving] = useState(false);
	const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (!selectedFile) return;

		// Validar tipo de archivo
		const validTypes = [
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
			'application/vnd.ms-excel', // .xls
			'application/msword', // .doc
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
		];

		const validExtensions = ['.xlsx', '.xls', '.doc', '.docx'];
		const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

		if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
			alert('Por favor, selecciona un archivo Excel (.xlsx, .xls) o Word (.doc, .docx)');
			return;
		}

		setFile(selectedFile);
		setLoading(true);
		setSaveMessage(null);

		try {
			const formData = new FormData();
			formData.append('file', selectedFile);

			const response = await axios.post('/api/medic/pacientes-frecuentes/extract', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
				withCredentials: true,
			});

			if (response.data.success && Array.isArray(response.data.patients)) {
				// Agregar IDs temporales a cada paciente
				const patientsWithIds = response.data.patients.map((p: any, index: number) => ({
					id: `temp-${Date.now()}-${index}`,
					first_name: p.first_name || '',
					last_name: p.last_name || '',
					identification: p.identification || '',
					email: p.email || '',
					phone: p.phone || '',
				}));

				setExtractedPatients(patientsWithIds);
			} else {
				throw new Error('Formato de respuesta inválido');
			}
		} catch (error: any) {
			console.error('Error extrayendo datos:', error);
			alert(error.response?.data?.error || 'Error al procesar el archivo. Por favor, verifica el formato.');
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (id: string, field: keyof ExtractedPatient, value: string) => {
		setExtractedPatients((prev) =>
			prev.map((patient) => (patient.id === id ? { ...patient, [field]: value } : patient))
		);
	};

	const handleRemovePatient = (id: string) => {
		setExtractedPatients((prev) => prev.filter((patient) => patient.id !== id));
	};

	const handleSave = async () => {
		if (extractedPatients.length === 0) {
			alert('No hay pacientes para guardar');
			return;
		}

		setSaving(true);
		setSaveMessage(null);

		try {
			const response = await axios.post(
				'/api/medic/pacientes-frecuentes/save',
				{ patients: extractedPatients },
				{ withCredentials: true }
			);

			if (response.data.success) {
				setSaveMessage({ type: 'success', text: `Se guardaron ${response.data.saved} pacientes exitosamente` });
				setExtractedPatients([]);
				setFile(null);
				if (fileInputRef.current) {
					fileInputRef.current.value = '';
				}
			} else {
				throw new Error(response.data.error || 'Error al guardar pacientes');
			}
		} catch (error: any) {
			console.error('Error guardando pacientes:', error);
			setSaveMessage({
				type: 'error',
				text: error.response?.data?.error || 'Error al guardar los pacientes. Por favor, intenta nuevamente.',
			});
		} finally {
			setSaving(false);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();

		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile) {
			const fakeEvent = {
				target: { files: [droppedFile] },
			} as any;
			handleFileSelect(fakeEvent);
		}
	};

	return (
		<div className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 min-h-screen">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="max-w-7xl mx-auto space-y-6"
			>
				{/* Header */}
				<div className="flex items-center gap-4">
					<div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
						<Users className="w-7 h-7 text-white" />
					</div>
					<div>
						<h1 className="text-3xl font-bold text-slate-900">Pacientes Frecuentes</h1>
						<p className="text-md text-slate-600 mt-1">Carga archivos Excel o Word para importar pacientes de forma rápida</p>
					</div>
				</div>

				{/* File Upload Section */}
				<motion.div
					initial={{ opacity: 0, scale: 0.98 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.1, duration: 0.5 }}
					className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6"
				>
					<h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
						<Upload className="w-5 h-5 text-teal-600" /> Cargar Archivo
					</h2>

					<div
						onDragOver={handleDragOver}
						onDrop={handleDrop}
						className="border-2 border-dashed border-teal-300 rounded-xl p-8 bg-gradient-to-b from-white to-teal-50/30 hover:shadow-lg hover:border-teal-400 transition cursor-pointer"
						onClick={() => fileInputRef.current?.click()}
					>
						<input
							ref={fileInputRef}
							type="file"
							accept=".xlsx,.xls,.doc,.docx"
							onChange={handleFileSelect}
							className="hidden"
						/>

						<div className="flex flex-col items-center justify-center gap-4 text-center">
							<div className="flex items-center gap-3">
								<FileSpreadsheet className="w-12 h-12 text-teal-600" />
								<FileText className="w-12 h-12 text-teal-600" />
							</div>
							<div>
								<p className="font-semibold text-slate-900 text-lg">Arrastra o selecciona un archivo</p>
								<p className="text-sm text-slate-600 mt-1">Formatos soportados: Excel (.xlsx, .xls) o Word (.doc, .docx)</p>
							</div>
							{file && (
								<div className="mt-2 flex items-center gap-2 text-sm text-teal-700 bg-teal-50 px-4 py-2 rounded-lg">
									<CheckCircle className="w-4 h-4" />
									<span>{file.name}</span>
									<button
										onClick={(e) => {
											e.stopPropagation();
											setFile(null);
											setExtractedPatients([]);
											if (fileInputRef.current) {
												fileInputRef.current.value = '';
											}
										}}
										className="ml-2 text-red-600 hover:text-red-700"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
							)}
						</div>
					</div>

					{loading && (
						<div className="mt-4 flex items-center justify-center gap-2 text-teal-600">
							<Loader2 className="w-5 h-5 animate-spin" />
							<span>Procesando archivo...</span>
						</div>
					)}
				</motion.div>

				{/* Extracted Patients Table */}
				{extractedPatients.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2, duration: 0.5 }}
						className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6"
					>
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
								<Users className="w-5 h-5 text-teal-600" /> Pacientes Extraídos ({extractedPatients.length})
							</h2>
							<button
								onClick={handleSave}
								disabled={saving || extractedPatients.length === 0}
								className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{saving ? (
									<>
										<Loader2 className="w-5 h-5 animate-spin" />
										Guardando...
									</>
								) : (
									<>
										<Save className="w-5 h-5" />
										Guardar Todos
									</>
								)}
							</button>
						</div>

						{saveMessage && (
							<div
								className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
									saveMessage.type === 'success'
										? 'bg-green-50 border border-green-200 text-green-800'
										: 'bg-red-50 border border-red-200 text-red-800'
								}`}
							>
								{saveMessage.type === 'success' ? (
									<CheckCircle className="w-5 h-5" />
								) : (
									<AlertCircle className="w-5 h-5" />
								)}
								<span>{saveMessage.text}</span>
							</div>
						)}

						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-slate-50 border-b border-slate-200">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Nombre</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Apellido</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Cédula</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Email</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Teléfono</th>
										<th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Acciones</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-200">
									{extractedPatients.map((patient) => (
										<tr key={patient.id} className="hover:bg-slate-50 transition">
											<td className="px-4 py-3">
												<input
													type="text"
													value={patient.first_name}
													onChange={(e) => handleInputChange(patient.id, 'first_name', e.target.value)}
													className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
													placeholder="Nombre"
												/>
											</td>
											<td className="px-4 py-3">
												<input
													type="text"
													value={patient.last_name}
													onChange={(e) => handleInputChange(patient.id, 'last_name', e.target.value)}
													className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
													placeholder="Apellido"
												/>
											</td>
											<td className="px-4 py-3">
												<input
													type="text"
													value={patient.identification}
													onChange={(e) => handleInputChange(patient.id, 'identification', e.target.value)}
													className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
													placeholder="Cédula"
												/>
											</td>
											<td className="px-4 py-3">
												<input
													type="email"
													value={patient.email}
													onChange={(e) => handleInputChange(patient.id, 'email', e.target.value)}
													className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
													placeholder="Email"
												/>
											</td>
											<td className="px-4 py-3">
												<input
													type="text"
													value={patient.phone || ''}
													onChange={(e) => handleInputChange(patient.id, 'phone', e.target.value)}
													className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
													placeholder="Teléfono"
												/>
											</td>
											<td className="px-4 py-3 text-center">
												<button
													onClick={() => handleRemovePatient(patient.id)}
													className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
													title="Eliminar"
												>
													<Trash2 className="w-5 h-5" />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</motion.div>
				)}
			</motion.div>
		</div>
	);
}

