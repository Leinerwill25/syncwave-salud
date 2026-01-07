// API endpoint to upload images for consultations
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

export async function POST(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();
		const formData = await req.formData();
		const file = formData.get('file') as File;
		const consultationId = formData.get('consultation_id') as string;
		const fileName = formData.get('file_name') as string;

		if (!file || !consultationId) {
			return NextResponse.json({ error: 'Archivo y consultation_id son requeridos' }, { status: 400 });
		}

		// Generate unique file path
		const fileExt = file.name.split('.').pop();
		const filePath = `consultations/${consultationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

		// Upload to Supabase Storage
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from('consultation-images')
			.upload(filePath, file, {
				cacheControl: '3600',
				upsert: false,
			});

		if (uploadError) {
			console.error('Error uploading to storage:', uploadError);
			return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 });
		}

		// Get public URL
		const { data: urlData } = supabase.storage.from('consultation-images').getPublicUrl(filePath);
		const publicURL = urlData?.publicUrl || null;

		// Guardar referencia en la tabla consultation_files (si existe)
		try {
			await supabase.from('consultation_files').insert([
				{
					consultation_id: consultationId,
					file_name: fileName || file.name,
					path: filePath,
					url: publicURL,
					size: file.size,
					content_type: file.type,
					created_at: new Date().toISOString(),
				},
			]);
		} catch (err) {
			// Si la tabla no existe todavía, continuar sin error (la migración se puede ejecutar después)
			console.warn('No se pudo insertar en consultation_files (tabla puede no existir aún):', err);
		}

		// También guardar referencia en consultation vitals para compatibilidad con código existente
		const { data: consultation } = await supabase.from('consultation').select('vitals, medical_record_id, patient_id').eq('id', consultationId).single();

		if (consultation) {
			const vitals = consultation?.vitals || {};
			const images = vitals.images || [];
			images.push({
				id: uploadData.path,
				url: publicURL,
				name: fileName || file.name,
				type: file.type,
				size: file.size,
				uploadedAt: new Date().toISOString(),
			});

			const { error: updateError } = await supabase
				.from('consultation')
				.update({ vitals: { ...vitals, images } })
				.eq('id', consultationId);

			if (updateError) {
				console.error('Error updating consultation vitals:', updateError);
			}

			// También actualizar MedicalRecord.attachments si existe
			if (consultation.medical_record_id && publicURL) {
				const { data: medicalRecord } = await supabase
					.from('medicalrecord')
					.select('attachments')
					.eq('id', consultation.medical_record_id)
					.single();

				if (medicalRecord) {
					const attachments = Array.isArray(medicalRecord.attachments) ? medicalRecord.attachments : [];
					if (!attachments.includes(publicURL)) {
						const updatedAttachments = [...attachments, publicURL];
						await supabase
							.from('medicalrecord')
							.update({ attachments: updatedAttachments })
							.eq('id', consultation.medical_record_id);
					}
				}
			}
		}

		return NextResponse.json(
			{
				id: uploadData.path,
				url: publicURL,
				name: fileName || file.name,
			},
			{ status: 200 }
		);
	} catch (error: any) {
		console.error('❌ Error POST /consultations/upload-image:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();
		const url = new URL(req.url);
		const imageId = url.searchParams.get('id'); // imageId es el path en storage
		const consultationId = url.searchParams.get('consultation_id');

		if (!imageId) {
			return NextResponse.json({ error: 'ID de imagen requerido' }, { status: 400 });
		}

		let fileUrl: string | null = null;
		let fileConsultationId: string | null = consultationId || null;

		// Obtener información del archivo antes de eliminarlo
		if (fileConsultationId) {
			try {
				// Buscar el archivo por path (imageId es el path en storage)
				const { data: files } = await supabase
					.from('consultation_files')
					.select('id, url, consultation_id')
					.eq('path', imageId);
				
				if (files && files.length > 0) {
					fileUrl = files[0].url;
					if (!fileConsultationId) {
						fileConsultationId = files[0].consultation_id;
					}
					
					// Eliminar de la tabla
					await supabase
						.from('consultation_files')
						.delete()
						.in('id', files.map((f) => f.id));
				}
			} catch (err) {
				console.warn('No se pudo obtener/eliminar de consultation_files (tabla puede no existir):', err);
			}
		}

		// Si no encontramos el consultationId en la tabla, intentar obtenerlo desde vitals
		if (!fileConsultationId && !fileUrl) {
			// Buscar en todas las consultas que tengan este archivo en vitals.images
			const { data: allConsultations } = await supabase
				.from('consultation')
				.select('id, vitals, medical_record_id');
			
			if (allConsultations) {
				for (const cons of allConsultations) {
					if (cons.vitals && typeof cons.vitals === 'object') {
						const vitals = cons.vitals as any;
						if (vitals.images && Array.isArray(vitals.images)) {
							const image = vitals.images.find((img: any) => img.id === imageId);
							if (image) {
								fileConsultationId = cons.id;
								fileUrl = image.url;
								break;
							}
						}
					}
				}
			}
		}

		// Eliminar de vitals.images si existe
		if (fileConsultationId) {
			const { data: consultation } = await supabase
				.from('consultation')
				.select('vitals, medical_record_id')
				.eq('id', fileConsultationId)
				.single();

			if (consultation && consultation.vitals) {
				const vitals = consultation.vitals as any;
				if (vitals.images && Array.isArray(vitals.images)) {
					const updatedImages = vitals.images.filter((img: any) => img.id !== imageId);
					await supabase
						.from('consultation')
						.update({ vitals: { ...vitals, images: updatedImages } })
						.eq('id', fileConsultationId);
				}
			}

			// Eliminar de MedicalRecord.attachments si existe y tenemos la URL
			if (consultation?.medical_record_id && fileUrl) {
				const { data: medicalRecord } = await supabase
					.from('medicalrecord')
					.select('attachments')
					.eq('id', consultation.medical_record_id)
					.single();

				if (medicalRecord && medicalRecord.attachments) {
					const attachments = Array.isArray(medicalRecord.attachments) ? medicalRecord.attachments : [];
					const updatedAttachments = attachments.filter((url: string) => url !== fileUrl);
					await supabase
						.from('medicalrecord')
						.update({ attachments: updatedAttachments })
						.eq('id', consultation.medical_record_id);
				}
			}
		}

		// Eliminar del storage
		const { error: deleteError } = await supabase.storage.from('consultation-images').remove([imageId]);

		if (deleteError) {
			console.error('Error deleting from storage:', deleteError);
			return NextResponse.json({ error: 'Error al eliminar archivo del almacenamiento' }, { status: 500 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error: any) {
		console.error('❌ Error DELETE /consultations/upload-image:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}

