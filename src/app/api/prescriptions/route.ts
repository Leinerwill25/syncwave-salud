// app/api/prescriptions/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createNotification } from '@/lib/notifications';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
	console.error('Missing Supabase env vars NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request) {
	try {
		const form = await req.formData();

		const consultation_id = (form.get('consultation_id') as string) ?? null;
		const patient_id = (form.get('patient_id') as string) ?? null;
		const doctor_id = (form.get('doctor_id') as string) ?? null;
		const notes = (form.get('notes') as string) ?? null;
		const valid_until = (form.get('valid_until') as string) ?? null;
		const itemsRaw = (form.get('items') as string) ?? '[]';

		// parse items safely
		let items: any[] = [];
		try {
			items = JSON.parse(itemsRaw);
			if (!Array.isArray(items)) items = [];
		} catch {
			items = [];
		}

		if (!consultation_id || !patient_id || !doctor_id) {
			return NextResponse.json({ error: 'Faltan campos requeridos (consultation_id | patient_id | doctor_id).' }, { status: 400 });
		}

		// 1) Crear la prescripción (usar issued_at/created_at defaults en DB)
		const prescriptionPayload: any = {
			patient_id,
			doctor_id,
			consultation_id,
			notes,
			valid_until: valid_until || null,
			status: 'ACTIVE',
			// avoid writing updated_at (no existe en tu schema). created_at y issued_at tienen default DB.
		};

		const { data: presCreated, error: presErr } = await supabaseAdmin.from('prescription').insert([prescriptionPayload]).select().single();

		if (presErr) {
			console.error('Error al crear prescription:', presErr);
			return NextResponse.json({ error: presErr.message ?? 'Error creando prescription' }, { status: 500 });
		}

		const prescriptionId = presCreated.id;

		// 2) Insertar items de prescripción (si hay)
		if (Array.isArray(items) && items.length > 0) {
			const itemsPayload = items.map((it: any) => ({
				prescription_id: prescriptionId,
				medication_id: it.medication_id ?? null,
				name: it.name ?? null,
				dosage: it.dosage ?? null,
				form: it.form ?? null,
				frequency: it.frequency ?? null,
				duration: it.duration ?? null,
				quantity: it.quantity ?? null,
				instructions: it.instructions ?? null,
				// prescription_item.created_at tiene DEFAULT now() en tu schema
			}));

			const { error: itemsErr } = await supabaseAdmin.from('prescription_item').insert(itemsPayload);
			if (itemsErr) {
				console.error('Error al insertar prescription items:', itemsErr);
				// no abortamos la creación principal; informamos en logs
			}
		}

		// 3) Subir archivos adjuntos (si hay)
		const uploadedFiles: Array<{ name: string; path: string; url: string | null }> = [];
		const bucket = 'prescriptions';
		
		// Verificar si el bucket existe, si no, crearlo (sin restricciones de MIME types)
		try {
			const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
			if (listError) {
				console.warn('Error listando buckets:', listError);
			} else {
				const bucketExists = buckets?.some((b) => b.name === bucket);
				if (!bucketExists) {
					console.log(`Bucket "${bucket}" no existe, creándolo...`);
					// Crear sin restricciones de MIME types (validamos en el código)
					const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
						public: true,
						fileSizeLimit: 10485760, // 10MB
						// No especificar allowedMimeTypes para evitar problemas con detección incorrecta
					});
					if (createError) {
						console.error(`Error creando bucket "${bucket}":`, createError);
					} else {
						console.log(`Bucket "${bucket}" creado exitosamente`);
					}
				} else {
					// El bucket existe, intentar actualizar para remover restricciones de MIME types
					try {
						const existingBucket = buckets.find((b) => b.name === bucket);
						await supabaseAdmin.storage.updateBucket(bucket, {
							public: existingBucket?.public ?? true,
							allowedMimeTypes: null, // Remover restricciones
						});
						console.log(`Política del bucket "${bucket}" actualizada para remover restricciones de MIME types`);
					} catch (updateError: any) {
						console.warn(`No se pudo actualizar la política del bucket "${bucket}":`, updateError?.message);
					}
				}
			}
		} catch (bucketErr) {
			console.error('Error verificando/creando bucket:', bucketErr);
		}
		
		const rawFiles = form.getAll('files') ?? [];

		for (const raw of rawFiles) {
			// validar que sea un File (en runtimes web)
			if (!raw || typeof (raw as any).arrayBuffer !== 'function') {
				console.warn('Archivo inválido o no soportado en formData, se ignora:', raw);
				continue;
			}

			const f = raw as File;
			try {
				const arrayBuffer = await f.arrayBuffer();

				// Mapeo de extensiones a tipos MIME
				const mimeTypeMap: Record<string, string> = {
					'jpg': 'image/jpeg',
					'jpeg': 'image/jpeg',
					'png': 'image/png',
					'gif': 'image/gif',
					'webp': 'image/webp',
					'pdf': 'application/pdf',
					'doc': 'application/msword',
					'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				};

				// Detectar extensión del archivo
				const fileExt = f.name.split('.').pop()?.toLowerCase() || '';
				let fileType = f.type;

				// Si el tipo MIME no es válido o es text/plain, detectarlo por extensión
				if (!fileType || fileType.includes('text/plain') || !mimeTypeMap[fileExt]) {
					if (mimeTypeMap[fileExt]) {
						fileType = mimeTypeMap[fileExt];
						console.log(`Tipo MIME corregido de "${f.type}" a "${fileType}" para archivo ${f.name}`);
					} else {
						console.warn(`No se pudo determinar el tipo MIME para archivo ${f.name}, usando el tipo reportado: ${f.type}`);
					}
				}

				// convertir a Buffer o Uint8Array dependiendo del runtime
				let uploadBody: any;
				if (typeof Buffer !== 'undefined') {
					uploadBody = Buffer.from(arrayBuffer);
				} else {
					uploadBody = new Uint8Array(arrayBuffer);
				}

				const timestamp = Date.now();
				const safeName = encodeURIComponent(f.name.replace(/\s+/g, '_'));
				const path = `${prescriptionId}/${timestamp}_${safeName}`;

				const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
					.from(bucket)
					.upload(path, uploadBody, { 
						upsert: false,
						contentType: fileType || f.type,
					});

				if (uploadErr) {
					console.error('Error subiendo archivo al bucket:', uploadErr);
					continue;
				}

				// obtener public URL correctamente
				let publicURL: string | null = null;
				try {
					const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
					publicURL = urlData?.publicUrl ?? null;
					
					// Corregir encoding doble si existe (ej: %252C -> %2C)
					if (publicURL && publicURL.includes('%25')) {
						publicURL = publicURL.replace(/%25([0-9A-F]{2})/gi, '%$1');
						console.log(`URL corregida (encoding doble): ${publicURL.substring(0, 100)}...`);
					}
				} catch (err) {
					console.warn('No se pudo obtener publicUrl (bucket privado o error):', err);
					publicURL = null;
				}

				uploadedFiles.push({ name: f.name, path, url: publicURL });

				// Intentar insertar metadata en prescription_files si existe (opcional)
				try {
					await supabaseAdmin.from('prescription_files').insert([
						{
							prescription_id: prescriptionId,
							file_name: f.name,
							path,
							url: publicURL,
							size: f.size,
							content_type: fileType || f.type, // Usar el tipo MIME corregido
							created_at: new Date().toISOString(),
						},
					]);
				} catch (err) {
					// Si la tabla no existe o falla, lo ignoramos (pero lo registramos)
					// console.warn('No se pudo insertar metadata en prescription_files:', err);
				}

				// También guardar en consultation_files para que aparezcan en la página de compartir consulta
				if (consultation_id && publicURL) {
					try {
						// Guardar el path real del archivo en el bucket prescriptions
						// El path es: prescriptionId/timestamp_filename
						// Guardamos también una referencia organizada para facilitar la consulta
						const prescriptionFilePath = path; // Path real: prescriptionId/timestamp_filename
						const consultationFilePath = `consultations/${consultation_id}/${timestamp}_${safeName}`; // Path organizado para referencia
						
						console.log('📝 Guardando en consultation_files:', {
							consultation_id,
							file_name: f.name,
							path: prescriptionFilePath, // Path real en bucket prescriptions
							url: publicURL.substring(0, 80) + '...',
							size: f.size,
							content_type: fileType || f.type, // Usar el tipo MIME corregido
						});

						const { data: insertedFile, error: insertErr } = await supabaseAdmin
							.from('consultation_files')
							.insert([
								{
									consultation_id: consultation_id,
									file_name: f.name,
									path: prescriptionFilePath, // Path real en bucket prescriptions (prescriptionId/timestamp_filename)
									url: publicURL, // URL completa del bucket prescriptions
									size: f.size,
									content_type: fileType || f.type, // Usar el tipo MIME corregido
									created_at: new Date().toISOString(),
								},
							])
							.select()
							.single();

						if (insertErr) {
							console.error('❌ Error insertando en consultation_files:', {
								error: insertErr.message,
								code: insertErr.code,
								details: insertErr.details,
								hint: insertErr.hint,
								consultation_id,
								file_name: f.name,
								path: consultationFilePath,
							});
						} else {
							console.log('✅ Archivo guardado exitosamente en consultation_files:', {
								id: insertedFile?.id,
								consultation_id,
								file_name: f.name,
							});
						}
					} catch (err: any) {
						console.error('❌ Excepción al guardar archivo en consultation_files:', {
							message: err?.message,
							code: err?.code,
							stack: err?.stack?.substring(0, 500),
							consultation_id,
							file_name: f.name,
						});
					}
				} else {
					console.warn('⚠️ No se puede guardar en consultation_files - datos faltantes:', {
						consultation_id: consultation_id || 'null',
						publicURL: publicURL ? publicURL.substring(0, 50) + '...' : 'null',
						file_name: f.name,
					});
				}
			} catch (err) {
				console.error('Error procesando archivo:', err);
				continue;
			}
		}

		// 4) Crear notificación y enviar email al paciente
		try {
			// Obtener información del paciente y doctor
			const [patientRes, doctorRes] = await Promise.all([
				supabaseAdmin.from('Patient').select('firstName, lastName').eq('id', patient_id).maybeSingle(),
				supabaseAdmin.from('User').select('name, organizationId').eq('id', doctor_id).maybeSingle(),
			]);

			const patientName = patientRes.data ? `${patientRes.data.firstName} ${patientRes.data.lastName}` : undefined;
			const doctorName = doctorRes.data?.name || undefined;
			const organizationId = doctorRes.data?.organizationId || null;

			const prescriptionDate = presCreated.issued_at 
				? new Date(presCreated.issued_at).toLocaleDateString('es-ES', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric',
				})
				: new Date().toLocaleDateString('es-ES');

			// Obtener userId del paciente (si existe en User table)
			let patientUserId: string | null = null;
			try {
				const { data: patientUser } = await supabaseAdmin
					.from('User')
					.select('id')
					.eq('patientProfileId', patient_id)
					.maybeSingle();
				patientUserId = patientUser?.id || null;
			} catch {
				// Ignorar error
			}

			const prescriptionUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'}/dashboard/patient/recetas`;

			if (patientUserId) {
				await createNotification({
					userId: patientUserId,
					organizationId,
					type: 'PRESCRIPTION',
					title: 'Nueva Receta Médica',
					message: `El Dr./Dra. ${doctorName || 'tu médico'} ha emitido una nueva receta médica para ti.`,
					payload: {
						prescriptionId: prescriptionId,
						prescription_id: prescriptionId,
						patient_id,
						patientName,
						doctorName,
						prescriptionDate,
						prescriptionUrl,
					},
					sendEmail: true,
				});
			}
		} catch (notifErr) {
			console.error('Error creando notificación/email para receta:', notifErr);
			// No fallar la creación de la receta si la notificación falla
		}

		return NextResponse.json({ success: true, prescription: presCreated, files: uploadedFiles }, { status: 201 });
	} catch (err) {
		console.error('Error POST /api/prescriptions:', err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

export async function PATCH(req: Request) {
	try {
		const form = await req.formData();

		const prescription_id = (form.get('prescription_id') as string) ?? null;
		const consultation_id = (form.get('consultation_id') as string) ?? null;
		const patient_id = (form.get('patient_id') as string) ?? null;
		const doctor_id = (form.get('doctor_id') as string) ?? null;
		const notes = (form.get('notes') as string) ?? null;
		const valid_until = (form.get('valid_until') as string) ?? null;
		const itemsRaw = (form.get('items') as string) ?? '[]';

		if (!prescription_id) {
			return NextResponse.json({ error: 'Falta el prescription_id requerido para actualizar.' }, { status: 400 });
		}

		// Verificar que la prescripción existe
		const { data: existingPres, error: fetchErr } = await supabaseAdmin
			.from('prescription')
			.select('id, consultation_id')
			.eq('id', prescription_id)
			.single();

		if (fetchErr || !existingPres) {
			return NextResponse.json({ error: 'Prescripción no encontrada.' }, { status: 404 });
		}

		// Actualizar la prescripción
		const updatePayload: any = {};
		if (notes !== null) updatePayload.notes = notes;
		if (valid_until !== null) updatePayload.valid_until = valid_until || null;

		if (Object.keys(updatePayload).length > 0) {
			const { error: updateErr } = await supabaseAdmin
				.from('prescription')
				.update(updatePayload)
				.eq('id', prescription_id);

			if (updateErr) {
				console.error('Error al actualizar prescription:', updateErr);
				return NextResponse.json({ error: updateErr.message ?? 'Error actualizando prescription' }, { status: 500 });
			}
		}

		// Parsear items
		let items: any[] = [];
		try {
			items = JSON.parse(itemsRaw);
			if (!Array.isArray(items)) items = [];
		} catch {
			items = [];
		}

		// Eliminar items existentes y crear nuevos
		if (items.length >= 0) {
			// Eliminar items existentes
			const { error: deleteErr } = await supabaseAdmin
				.from('prescription_item')
				.delete()
				.eq('prescription_id', prescription_id);

			if (deleteErr) {
				console.warn('Error eliminando items antiguos:', deleteErr);
			}

			// Insertar nuevos items
			if (items.length > 0) {
				const itemsPayload = items.map((it: any) => ({
					prescription_id: prescription_id,
					medication_id: it.medication_id ?? null,
					name: it.name ?? null,
					dosage: it.dosage ?? null,
					form: it.form ?? null,
					frequency: it.frequency ?? null,
					duration: it.duration ?? null,
					quantity: it.quantity ?? null,
					instructions: it.instructions ?? null,
				}));

				const { error: itemsErr } = await supabaseAdmin.from('prescription_item').insert(itemsPayload);
				if (itemsErr) {
					console.error('Error al insertar prescription items:', itemsErr);
					// Continuar aunque falle la inserción de items
				}
			}
		}

		// Subir archivos adicionales (si hay)
		const uploadedFiles: Array<{ name: string; path: string; url: string | null }> = [];
		const bucket = 'prescriptions';
		
		// Verificar si el bucket existe, si no, crearlo (PATCH - sin restricciones de MIME types)
		try {
			const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
			if (listError) {
				console.warn('Error listando buckets (PATCH):', listError);
			} else {
				const bucketExists = buckets?.some((b) => b.name === bucket);
				if (!bucketExists) {
					console.log(`Bucket "${bucket}" no existe, creándolo... (PATCH)`);
					// Crear sin restricciones de MIME types (validamos en el código)
					const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
						public: true,
						fileSizeLimit: 10485760, // 10MB
						// No especificar allowedMimeTypes para evitar problemas con detección incorrecta
					});
					if (createError) {
						console.error(`Error creando bucket "${bucket}" (PATCH):`, createError);
					} else {
						console.log(`Bucket "${bucket}" creado exitosamente (PATCH)`);
					}
				} else {
					// El bucket existe, intentar actualizar para remover restricciones de MIME types
					try {
						const existingBucket = buckets.find((b) => b.name === bucket);
						await supabaseAdmin.storage.updateBucket(bucket, {
							public: existingBucket?.public ?? true,
							allowedMimeTypes: null, // Remover restricciones
						});
						console.log(`Política del bucket "${bucket}" actualizada para remover restricciones de MIME types (PATCH)`);
					} catch (updateError: any) {
						console.warn(`No se pudo actualizar la política del bucket "${bucket}" (PATCH):`, updateError?.message);
					}
				}
			}
		} catch (bucketErr) {
			console.error('Error verificando/creando bucket (PATCH):', bucketErr);
		}
		
		const rawFiles = form.getAll('files') ?? [];

		for (const raw of rawFiles) {
			if (!raw || typeof (raw as any).arrayBuffer !== 'function') {
				console.warn('Archivo inválido o no soportado en formData, se ignora:', raw);
				continue;
			}

			const f = raw as File;
			try {
				const arrayBuffer = await f.arrayBuffer();

				// Mapeo de extensiones a tipos MIME
				const mimeTypeMap: Record<string, string> = {
					'jpg': 'image/jpeg',
					'jpeg': 'image/jpeg',
					'png': 'image/png',
					'gif': 'image/gif',
					'webp': 'image/webp',
					'pdf': 'application/pdf',
					'doc': 'application/msword',
					'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				};

				// Detectar extensión del archivo
				const fileExt = f.name.split('.').pop()?.toLowerCase() || '';
				let fileType = f.type;

				// Si el tipo MIME no es válido o es text/plain, detectarlo por extensión
				if (!fileType || fileType.includes('text/plain') || !mimeTypeMap[fileExt]) {
					if (mimeTypeMap[fileExt]) {
						fileType = mimeTypeMap[fileExt];
						console.log(`Tipo MIME corregido de "${f.type}" a "${fileType}" para archivo ${f.name} (PATCH)`);
					} else {
						console.warn(`No se pudo determinar el tipo MIME para archivo ${f.name}, usando el tipo reportado: ${f.type} (PATCH)`);
					}
				}

				let uploadBody: any;
				if (typeof Buffer !== 'undefined') {
					uploadBody = Buffer.from(arrayBuffer);
				} else {
					uploadBody = new Uint8Array(arrayBuffer);
				}

				const timestamp = Date.now();
				const safeName = encodeURIComponent(f.name.replace(/\s+/g, '_'));
				const path = `${prescription_id}/${timestamp}_${safeName}`;

				const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
					.from(bucket)
					.upload(path, uploadBody, { 
						upsert: false,
						contentType: fileType || f.type,
					});

				if (uploadErr) {
					console.error('Error subiendo archivo al bucket:', uploadErr);
					continue;
				}

				let publicURL: string | null = null;
				try {
					const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
					publicURL = urlData?.publicUrl ?? null;
					
					// Corregir encoding doble si existe (ej: %252C -> %2C)
					if (publicURL && publicURL.includes('%25')) {
						publicURL = publicURL.replace(/%25([0-9A-F]{2})/gi, '%$1');
						console.log(`URL corregida (encoding doble) [PATCH]: ${publicURL.substring(0, 100)}...`);
					}
				} catch (err) {
					console.warn('No se pudo obtener publicUrl (bucket privado o error):', err);
					publicURL = null;
				}

				uploadedFiles.push({ name: f.name, path, url: publicURL });

				// Insertar metadata en prescription_files
				try {
					await supabaseAdmin.from('prescription_files').insert([
						{
							prescription_id: prescription_id,
							file_name: f.name,
							path,
							url: publicURL,
							size: f.size,
							content_type: fileType || f.type, // Usar el tipo MIME corregido
							created_at: new Date().toISOString(),
						},
					]);
				} catch (err) {
					console.warn('No se pudo insertar metadata en prescription_files:', err);
				}

				// También guardar en consultation_files para que aparezcan en la página de compartir consulta
				if (consultation_id && publicURL) {
					try {
						// Guardar el path real del archivo en el bucket prescriptions
						// El path es: prescriptionId/timestamp_filename
						const prescriptionFilePath = path; // Path real: prescriptionId/timestamp_filename
						
						console.log('📝 Guardando en consultation_files (PATCH):', {
							consultation_id,
							file_name: f.name,
							path: prescriptionFilePath, // Path real en bucket prescriptions
							url: publicURL.substring(0, 80) + '...',
							size: f.size,
							content_type: fileType || f.type, // Usar el tipo MIME corregido
						});

						const { data: insertedFile, error: insertErr } = await supabaseAdmin
							.from('consultation_files')
							.insert([
								{
									consultation_id: consultation_id,
									file_name: f.name,
									path: prescriptionFilePath, // Path real en bucket prescriptions (prescriptionId/timestamp_filename)
									url: publicURL, // URL completa del bucket prescriptions
									size: f.size,
									content_type: fileType || f.type, // Usar el tipo MIME corregido
									created_at: new Date().toISOString(),
								},
							])
							.select()
							.single();

						if (insertErr) {
							console.error('❌ Error insertando en consultation_files (PATCH):', {
								error: insertErr.message,
								code: insertErr.code,
								details: insertErr.details,
								hint: insertErr.hint,
								consultation_id,
								file_name: f.name,
								path: consultationFilePath,
							});
						} else {
							console.log('✅ Archivo guardado exitosamente en consultation_files (PATCH):', {
								id: insertedFile?.id,
								consultation_id,
								file_name: f.name,
							});
						}
					} catch (err: any) {
						console.error('❌ Excepción al guardar archivo en consultation_files (PATCH):', {
							message: err?.message,
							code: err?.code,
							stack: err?.stack?.substring(0, 500),
							consultation_id,
							file_name: f.name,
						});
					}
				} else {
					console.warn('⚠️ No se puede guardar en consultation_files (PATCH) - datos faltantes:', {
						consultation_id: consultation_id || 'null',
						publicURL: publicURL ? publicURL.substring(0, 50) + '...' : 'null',
						file_name: f.name,
					});
				}
			} catch (err) {
				console.error('Error procesando archivo:', err);
				continue;
			}
		}

		// Obtener la prescripción actualizada
		const { data: updatedPres, error: getErr } = await supabaseAdmin
			.from('prescription')
			.select('*')
			.eq('id', prescription_id)
			.single();

		if (getErr) {
			console.error('Error obteniendo prescripción actualizada:', getErr);
		}

		return NextResponse.json({ success: true, prescription: updatedPres, files: uploadedFiles }, { status: 200 });
	} catch (err) {
		console.error('Error PATCH /api/prescriptions:', err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}