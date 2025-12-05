// app/api/patient/resultados/upload/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const formData = await request.formData();
		const consultationId = formData.get('consultationId') as string;
		const resultType = formData.get('resultType') as string | null;
		const files = formData.getAll('files') as File[];

		if (!consultationId) {
			return NextResponse.json({ error: 'consultationId es requerido' }, { status: 400 });
		}

		if (!files || files.length === 0) {
			return NextResponse.json({ error: 'Se requiere al menos una imagen' }, { status: 400 });
		}

		// Verificar que la consulta pertenece al paciente
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select('id, patient_id, doctor_id')
			.eq('id', consultationId)
			.eq('patient_id', patient.patientId)
			.single();

		if (consultationError || !consultation) {
			return NextResponse.json({ error: 'Consulta no encontrada o no autorizada' }, { status: 403 });
		}

		// Crear cliente de Supabase con service role para subir archivos
		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

		// Verificar/crear bucket para resultados de laboratorio
		const bucket = 'lab-results';
		try {
			const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
			if (listError) {
				console.warn('[Lab Results Upload] Error listando buckets:', listError);
			} else {
				const bucketExists = buckets?.some((b) => b.name === bucket);
				if (!bucketExists) {
					console.log(`[Lab Results Upload] Bucket "${bucket}" no existe, creándolo...`);
					const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
						public: true,
						fileSizeLimit: 10485760, // 10MB
					});
					if (createError) {
						console.error(`[Lab Results Upload] Error creando bucket "${bucket}":`, createError);
					} else {
						console.log(`[Lab Results Upload] Bucket "${bucket}" creado exitosamente`);
					}
				}
			}
		} catch (bucketErr) {
			console.error('[Lab Results Upload] Error verificando/creando bucket:', bucketErr);
		}

		// Subir archivos
		const uploadedUrls: string[] = [];
		for (const file of files) {
			// Validar que sea una imagen
			if (!file.type.startsWith('image/')) {
				continue; // Saltar archivos que no sean imágenes
			}

			// Generar nombre único para el archivo
			const fileExt = file.name.split('.').pop();
			const fileName = `${patient.patientId}/${consultationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

			try {
				const arrayBuffer = await file.arrayBuffer();
				const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
					.from(bucket)
					.upload(fileName, arrayBuffer, {
						contentType: file.type,
						upsert: false,
					});

				if (uploadError) {
					console.error('[Lab Results Upload] Error subiendo archivo:', uploadError);
					continue;
				}

				// Obtener URL pública
				const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
				if (urlData?.publicUrl) {
					uploadedUrls.push(urlData.publicUrl);
				}
			} catch (fileErr) {
				console.error('[Lab Results Upload] Error procesando archivo:', fileErr);
				continue;
			}
		}

		if (uploadedUrls.length === 0) {
			return NextResponse.json({ error: 'No se pudieron subir las imágenes' }, { status: 500 });
		}

		// Crear o actualizar registro de resultado de laboratorio
		// Buscar si ya existe un resultado para esta consulta
		const { data: existingResult } = await supabase
			.from('lab_result')
			.select('id, attachments, result_type')
			.eq('consultation_id', consultationId)
			.eq('patient_id', patient.patientId)
			.maybeSingle();

		if (existingResult) {
			// Actualizar resultado existente agregando las nuevas imágenes
			const updatedAttachments = [...(existingResult.attachments || []), ...uploadedUrls];
			const { error: updateError } = await supabase
				.from('lab_result')
				.update({
					attachments: updatedAttachments,
					result_type: resultType || existingResult.result_type || 'Resultado de Laboratorio',
				})
				.eq('id', existingResult.id);

			if (updateError) {
				console.error('[Lab Results Upload] Error actualizando resultado:', updateError);
				return NextResponse.json({ error: 'Error al actualizar resultado' }, { status: 500 });
			}
		} else {
			// Crear nuevo resultado
			const { error: insertError } = await supabase
				.from('lab_result')
				.insert({
					patient_id: patient.patientId,
					consultation_id: consultationId,
					ordering_provider_id: consultation.doctor_id,
					result_type: resultType || 'Resultado de Laboratorio',
					result: {},
					attachments: uploadedUrls,
					is_critical: false,
					reported_at: new Date().toISOString(),
				});

			if (insertError) {
				console.error('[Lab Results Upload] Error creando resultado:', insertError);
				return NextResponse.json({ error: 'Error al crear resultado' }, { status: 500 });
			}
		}

		return NextResponse.json({
			success: true,
			message: 'Resultados subidos correctamente',
			urls: uploadedUrls,
		});
	} catch (err: any) {
		console.error('[Lab Results Upload] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

