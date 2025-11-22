// components/clinic/PhotoUploader.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to convert Supabase Storage path to public URL
function getPublicImageUrl(path: string): string {
	if (!path) return path;
	// Si ya es una URL completa, devolverla tal cual
	if (path.startsWith('http://') || path.startsWith('https://')) {
		return path;
	}
	// Si es un path de Supabase Storage, convertir a URL pública
	if (path.startsWith('clinic-photos/')) {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const bucket = 'clinic-photos';
		return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
	}
	// Si es un blob URL temporal, mantenerla
	if (path.startsWith('blob:')) {
		return path;
	}
	return path;
}

interface PhotoUploaderProps {
	onPhotosChange: (photos: string[]) => void;
	initialPhotos?: string[];
	maxPhotos?: number;
	minPhotos?: number;
}

export default function PhotoUploader({ 
	onPhotosChange, 
	initialPhotos = [], 
	maxPhotos = 10,
	minPhotos = 3 
}: PhotoUploaderProps) {
	const [photos, setPhotos] = useState<string[]>(initialPhotos);
	const [uploading, setUploading] = useState(false);
	const [dragActive, setDragActive] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		// Sincronizar fotos iniciales cuando cambien y convertir paths a URLs públicas
		if (initialPhotos && initialPhotos.length > 0) {
			const convertedPhotos = initialPhotos.map((photo: string) => getPublicImageUrl(photo));
			setPhotos(convertedPhotos);
		} else {
			setPhotos([]);
		}
	}, [initialPhotos]);

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		const availableSlots = maxPhotos - photos.length;
		const newFiles = Array.from(files).slice(0, availableSlots);
		
		if (newFiles.length === 0) {
			alert(`Solo puedes subir un máximo de ${maxPhotos} fotos`);
			return;
		}

		processFiles(newFiles);
	};

	const processFiles = async (files: File[]) => {
		setUploading(true);
		try {
			const newPhotoUrls: string[] = [];
			for (const file of files) {
				// Detectar tipo MIME basado en la extensión si el tipo detectado no es válido
				let fileType = file.type;
				const fileName = file.name.toLowerCase();
				const fileExt = fileName.split('.').pop() || '';
				
				// Mapeo de extensiones a tipos MIME
				const mimeTypeMap: Record<string, string> = {
					'jpg': 'image/jpeg',
					'jpeg': 'image/jpeg',
					'png': 'image/png',
					'gif': 'image/gif',
					'webp': 'image/webp',
					'bmp': 'image/bmp',
					'svg': 'image/svg+xml',
				};

				// Si el tipo MIME no es válido o es text/plain, intentar detectarlo por extensión
				if (!fileType || !fileType.startsWith('image/') || fileType.includes('text/plain')) {
					if (mimeTypeMap[fileExt]) {
						fileType = mimeTypeMap[fileExt];
						console.log(`[PhotoUploader] Tipo MIME corregido de "${file.type}" a "${fileType}" para archivo ${file.name}`);
					} else {
						alert(`${file.name}: Tipo de archivo no soportado. Extensiones permitidas: ${Object.keys(mimeTypeMap).join(', ')}`);
						continue;
					}
				}

				// Validar tipo de archivo
				if (!fileType.startsWith('image/')) {
					alert(`${file.name} no es una imagen válida`);
					continue;
				}

				// Validar tamaño (máximo 5MB)
				if (file.size > 5 * 1024 * 1024) {
					alert(`${file.name} es muy grande. Máximo 5MB`);
					continue;
				}

				// Crear URL temporal para preview inmediato
				const previewUrl = URL.createObjectURL(file);
				newPhotoUrls.push(previewUrl);

				// Subir a Supabase Storage
				try {
					const uploadFormData = new FormData();
					uploadFormData.append('file', file);
					uploadFormData.append('photo_type', 'gallery');

					const uploadRes = await fetch('/api/clinic/upload-photo', {
						method: 'POST',
						credentials: 'include',
						body: uploadFormData,
					});

					if (uploadRes.ok) {
						const uploadData = await uploadRes.json();
						// Reemplazar la URL temporal con la URL pública
						const index = newPhotoUrls.indexOf(previewUrl);
						if (index !== -1) {
							newPhotoUrls[index] = uploadData.url;
							// Revocar la URL temporal
							URL.revokeObjectURL(previewUrl);
						}
					} else {
						const errorData = await uploadRes.json().catch(() => ({ error: 'Error desconocido' }));
						console.error(`Error subiendo ${file.name}:`, errorData);
						// Revocar la URL temporal y remover de la lista
						URL.revokeObjectURL(previewUrl);
						const index = newPhotoUrls.indexOf(previewUrl);
						if (index !== -1) {
							newPhotoUrls.splice(index, 1);
						}
						alert(`Error al subir ${file.name}: ${errorData.error || 'Error desconocido'}`);
					}
				} catch (uploadErr) {
					console.error(`Error subiendo ${file.name}:`, uploadErr);
					// Mantener la URL temporal
				}
			}

			const updatedPhotos = [...photos, ...newPhotoUrls];
			setPhotos(updatedPhotos);
			onPhotosChange(updatedPhotos);
		} catch (err) {
			console.error('Error subiendo fotos:', err);
			alert('Error al subir las fotos');
		} finally {
			setUploading(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	const handleDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === 'dragenter' || e.type === 'dragover') {
			setDragActive(true);
		} else if (e.type === 'dragleave') {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (photos.length >= maxPhotos) {
			alert(`Solo puedes subir un máximo de ${maxPhotos} fotos`);
			return;
		}

		const files = Array.from(e.dataTransfer.files);
		
		// Filtrar archivos de imagen, detectando tipo MIME por extensión si es necesario
		const mimeTypeMap: Record<string, string> = {
			'jpg': 'image/jpeg',
			'jpeg': 'image/jpeg',
			'png': 'image/png',
			'gif': 'image/gif',
			'webp': 'image/webp',
			'bmp': 'image/bmp',
			'svg': 'image/svg+xml',
		};

		const imageFiles = files.filter(file => {
			let fileType = file.type;
			const fileName = file.name.toLowerCase();
			const fileExt = fileName.split('.').pop() || '';
			
			// Si el tipo MIME no es válido o es text/plain, intentar detectarlo por extensión
			if (!fileType || !fileType.startsWith('image/') || fileType.includes('text/plain')) {
				if (mimeTypeMap[fileExt]) {
					return true; // Es una imagen válida por extensión
				}
				return false;
			}
			
			return fileType.startsWith('image/');
		});
		
		if (imageFiles.length === 0) {
			alert('Por favor arrastra solo archivos de imagen');
			return;
		}

		const availableSlots = maxPhotos - photos.length;
		const filesToProcess = imageFiles.slice(0, availableSlots);
		processFiles(filesToProcess);
	};

	const removePhoto = (index: number) => {
		const updatedPhotos = photos.filter((_, i) => i !== index);
		setPhotos(updatedPhotos);
		onPhotosChange(updatedPhotos);
	};

	const meetsMinimum = photos.length >= minPhotos;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Camera className="w-5 h-5 text-teal-600" />
					<label className="block text-sm font-bold text-slate-900">
						Fotos del Consultorio
					</label>
					{meetsMinimum ? (
						<CheckCircle className="w-5 h-5 text-green-500" />
					) : (
						<AlertCircle className="w-5 h-5 text-amber-500" />
					)}
				</div>
				<div className="flex items-center gap-2">
					<span className={`text-sm font-semibold ${meetsMinimum ? 'text-green-600' : 'text-amber-600'}`}>
						{photos.length}/{maxPhotos} fotos
					</span>
					{!meetsMinimum && (
						<span className="text-xs text-amber-600 font-medium">
							(Mínimo {minPhotos} requeridas)
						</span>
					)}
				</div>
			</div>

			{/* Área de subida mejorada */}
			{photos.length < maxPhotos && (
				<div
					onDragEnter={handleDrag}
					onDragLeave={handleDrag}
					onDragOver={handleDrag}
					onDrop={handleDrop}
					onClick={() => fileInputRef.current?.click()}
					className={`border-2 border-dashed rounded-xl p-8 bg-gradient-to-br transition-all cursor-pointer ${
						dragActive
							? 'border-teal-500 bg-teal-100 scale-[1.02]'
							: 'border-teal-300 bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/20 hover:border-teal-400 hover:shadow-lg'
					}`}
				>
					<div className="text-center">
						<div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full mb-4 shadow-lg">
							<Upload className="w-8 h-8 text-white" />
						</div>
						<p className="text-base font-bold text-slate-900 mb-2">
							Haz clic para subir fotos o arrastra aquí
						</p>
						<p className="text-sm text-slate-600 mb-1">
							Sube fotos del interior y exterior de tu consultorio
						</p>
						<p className="text-xs text-slate-500">
							Mínimo {minPhotos} fotos • Máximo {maxPhotos} fotos • 5MB por foto
						</p>
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						multiple
						onChange={handleFileSelect}
						disabled={uploading}
						className="hidden"
					/>
				</div>
			)}

			{/* Fotos subidas mejoradas */}
			{photos.length > 0 && (
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					<AnimatePresence>
						{photos.map((photo, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.9 }}
								className="relative group"
							>
								<div className="aspect-square rounded-xl overflow-hidden border-2 border-teal-200 bg-slate-100 shadow-md hover:shadow-xl transition-all">
									<img
										src={photo}
										alt={`Foto ${index + 1} del consultorio`}
										className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
									/>
								</div>
								<button
									type="button"
									onClick={() => removePhoto(index)}
									className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg hover:scale-110"
								>
									<X className="w-4 h-4" />
								</button>
								<div className="absolute bottom-2 left-2 px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-xs font-bold rounded-lg">
									Foto {index + 1}
								</div>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			)}

			{/* Mensaje de validación */}
			{!meetsMinimum && photos.length > 0 && (
				<div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
						<p className="text-sm text-amber-800">
							Necesitas subir al menos <strong>{minPhotos} fotos</strong> del consultorio. 
							Actualmente tienes {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}.
						</p>
					</div>
				</div>
			)}

			{uploading && (
				<div className="text-center py-6">
					<div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full mb-3">
						<div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
					</div>
					<p className="text-sm font-medium text-slate-700">Subiendo fotos...</p>
				</div>
			)}
		</div>
	);
}
