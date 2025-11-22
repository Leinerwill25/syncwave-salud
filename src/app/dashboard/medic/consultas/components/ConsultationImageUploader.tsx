'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImgIcon, Loader2 } from 'lucide-react';

export interface ConsultationImage {
	id?: string;
	url: string;
	name: string;
	type: string;
	size?: number;
}

interface ConsultationImageUploaderProps {
	consultationId: string;
	initialImages?: ConsultationImage[];
	onImagesChange?: (images: ConsultationImage[]) => void;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ConsultationImageUploader({ consultationId, initialImages = [], onImagesChange }: ConsultationImageUploaderProps) {
	const [images, setImages] = useState<ConsultationImage[]>(initialImages);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (onImagesChange) {
			onImagesChange(images);
		}
	}, [images, onImagesChange]);

	const handleFileSelect = async (files: FileList | null) => {
		if (!files || files.length === 0) return;

		setError(null);
		setUploading(true);

		try {
			const newImages: ConsultationImage[] = [];

			for (const file of Array.from(files)) {
				// Validate file type
				if (!ACCEPTED_TYPES.includes(file.type)) {
					setError(`Tipo de archivo no permitido: ${file.name}. Solo se permiten imágenes y PDFs.`);
					continue;
				}

				// Validate file size
				if (file.size > MAX_FILE_SIZE) {
					setError(`Archivo muy grande: ${file.name}. Máximo 10MB.`);
					continue;
				}

				// Upload to Supabase Storage
				const formData = new FormData();
				formData.append('file', file);
				formData.append('consultation_id', consultationId);
				formData.append('file_name', file.name);

				const uploadRes = await fetch('/api/consultations/upload-image', {
					method: 'POST',
					body: formData,
				});

				if (!uploadRes.ok) {
					const errorData = await uploadRes.json().catch(() => ({}));
					throw new Error(errorData.error || 'Error al subir imagen');
				}

				const uploadData = await uploadRes.json();
				if (uploadData.url) {
					newImages.push({
						id: uploadData.id,
						url: uploadData.url,
						name: file.name,
						type: file.type,
						size: file.size,
					});
				}
			}

			if (newImages.length > 0) {
				setImages([...images, ...newImages]);
			}
		} catch (err: any) {
			setError(err.message || 'Error al subir imágenes');
		} finally {
			setUploading(false);
		}
	};

	const handleRemove = async (image: ConsultationImage) => {
		if (image.id) {
			try {
				const res = await fetch(`/api/consultations/upload-image?id=${image.id}`, {
					method: 'DELETE',
				});

				if (!res.ok) {
					throw new Error('Error al eliminar imagen');
				}
			} catch (err) {
				console.error('Error deleting image:', err);
			}
		}

		setImages(images.filter((img) => img.url !== image.url));
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		handleFileSelect(e.dataTransfer.files);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	return (
		<Card className="p-5">
			<div className="flex items-center gap-2 mb-4">
				<ImgIcon size={18} className="text-teal-600" />
				<Label className="text-lg font-semibold text-slate-900">Adjuntar Imágenes</Label>
			</div>

			<div
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50/50 hover:bg-blue-50 transition cursor-pointer"
				onClick={() => fileInputRef.current?.click()}
			>
				<input
					ref={fileInputRef}
					type="file"
					multiple
					accept={ACCEPTED_TYPES.join(',')}
					onChange={(e) => handleFileSelect(e.target.files)}
					className="hidden"
				/>

				{uploading ? (
					<div className="flex flex-col items-center gap-2">
						<Loader2 className="animate-spin text-teal-600" size={24} />
						<p className="text-sm text-slate-700">Subiendo imágenes...</p>
					</div>
				) : (
					<div className="flex flex-col items-center gap-2">
						<Upload size={32} className="text-blue-500" />
						<p className="text-sm font-medium text-slate-900">Arrastra imágenes aquí o haz clic para seleccionar</p>
						<p className="text-xs text-slate-600">PNG, JPG, WEBP, GIF o PDF (máx. 10MB cada uno)</p>
					</div>
				)}
			</div>

			{error && (
				<div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-md text-sm text-rose-700">{error}</div>
			)}

			{images.length > 0 && (
				<div className="mt-4 space-y-2">
					<Label className="text-sm font-semibold">Imágenes adjuntas ({images.length})</Label>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
						{images.map((image, index) => (
							<div key={index} className="relative group border border-blue-200 rounded-lg overflow-hidden bg-white">
								{image.type.startsWith('image/') ? (
									<img src={image.url} alt={image.name} className="w-full h-32 object-cover" />
								) : (
									<div className="w-full h-32 flex items-center justify-center bg-slate-100">
										<ImgIcon size={32} className="text-slate-400" />
									</div>
								)}
								<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
									<Button
										type="button"
										variant="destructive"
										size="sm"
										onClick={(e) => {
											e.stopPropagation();
											handleRemove(image);
										}}
										className="bg-rose-600 hover:bg-rose-700"
									>
										<X size={16} />
									</Button>
								</div>
								<div className="p-2 bg-white">
									<p className="text-xs text-slate-700 truncate" title={image.name}>
										{image.name}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</Card>
	);
}

