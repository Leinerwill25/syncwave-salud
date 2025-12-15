// app/api/medic/prescription-template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { createClient } from '@supabase/supabase-js';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(request: Request) {
	try {
		// 1️⃣ Autenticación usando apiRequireRole (maneja correctamente la restauración de sesión)
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		const doctorId = user.userId;
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Obtener plantilla del médico desde medic_profile
		const { data: medicProfile, error: profileError } = await supabase.from('medic_profile').select('prescription_template_url, prescription_template_name, prescription_template_text, prescription_font_family').eq('doctor_id', doctorId).maybeSingle();

		if (profileError) {
			console.error('[Prescription Template API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener plantilla' }, { status: 500 });
		}

		return NextResponse.json({
			template_url: medicProfile?.prescription_template_url || null,
			template_name: medicProfile?.prescription_template_name || null,
			template_text: medicProfile?.prescription_template_text || null,
			font_family: medicProfile?.prescription_font_family || 'Arial',
		});
	} catch (err) {
		console.error('[Prescription Template API] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		// 1️⃣ Autenticación usando apiRequireRole (maneja correctamente la restauración de sesión)
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		const doctorId = user.userId;
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const formData = await request.formData();
		const templateFile = formData.get('template') as File | null;

		if (!templateFile) {
			return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
		}

		// Validar solo la extensión del archivo (.docx o .doc)
		const validExtensions = ['.docx', '.doc'];
		const fileName = templateFile.name.toLowerCase();
		const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

		if (!validExtensions.includes(fileExtension)) {
			return NextResponse.json({ error: 'Formato de archivo no válido. Solo se permiten archivos Word (.docx, .doc)' }, { status: 400 });
		}

		// Validar tamaño (máximo 50MB)
		const maxSizeBytes = 50 * 1024 * 1024; // 50MB
		if (templateFile.size > maxSizeBytes) {
			return NextResponse.json(
				{
					error: `El archivo es demasiado grande. Máximo ${maxSizeBytes / (1024 * 1024)}MB`,
				},
				{ status: 400 }
			);
		}

		// Crear cliente admin para subir archivo (bypass RLS)
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('[Prescription Template API] SUPABASE_SERVICE_ROLE_KEY no configurado');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		// Subir archivo a Supabase Storage
		const bucket = 'prescription-templates';

		// Verificar si el bucket existe, si no, crearlo
		try {
			const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
			if (listError) {
				console.warn('[Prescription Template API] Error listando buckets:', listError);
			} else {
				const bucketExists = buckets?.some((b) => b.name === bucket);
				if (!bucketExists) {
					console.log(`[Prescription Template API] Bucket "${bucket}" no existe, creándolo...`);
					// Crear bucket para plantillas de recetas
					const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
						public: false, // Privado, requiere autenticación
						fileSizeLimit: 52428800, // 50MB
						allowedMimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'], // .docx y .doc
					});
					if (createError) {
						console.error(`[Prescription Template API] Error creando bucket "${bucket}":`, createError);
					} else {
						console.log(`[Prescription Template API] Bucket "${bucket}" creado exitosamente`);
					}
				}
			}
		} catch (bucketErr) {
			console.error('[Prescription Template API] Error verificando/creando bucket:', bucketErr);
		}

		const fileExt = fileExtension;

		// Sanitizar el nombre del archivo
		let sanitizedFileName = templateFile.name
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-zA-Z0-9._-]/g, '_')
			.replace(/\s+/g, '_')
			.replace(/_{2,}/g, '_')
			.replace(/^_+|_+$/g, '');

		if (!sanitizedFileName || sanitizedFileName.length === 0) {
			sanitizedFileName = `template_${Date.now()}${fileExtension}`;
		}

		if (!sanitizedFileName.endsWith(fileExtension)) {
			sanitizedFileName = sanitizedFileName.replace(/\.[^.]+$/, '') + fileExtension;
		}

		const fileNameUnique = `${doctorId}/${Date.now()}-${sanitizedFileName}`;

		console.log('[Prescription Template API] Nombre original:', templateFile.name);
		console.log('[Prescription Template API] Nombre sanitizado:', sanitizedFileName);
		console.log('[Prescription Template API] Ruta completa:', fileNameUnique);

		// Convertir File a Buffer
		let fileBuffer: Buffer;
		try {
			const fileSizeMB = templateFile.size / (1024 * 1024);
			const timeoutSeconds = Math.min(Math.max(fileSizeMB * 1000, 30000), 120000);

			console.log(`[Prescription Template API] Procesando archivo de ${fileSizeMB.toFixed(2)}MB con timeout de ${timeoutSeconds / 1000}s`);

			const arrayBuffer = await Promise.race([templateFile.arrayBuffer(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout al leer el archivo')), timeoutSeconds))]);
			fileBuffer = Buffer.from(arrayBuffer);
			console.log(`[Prescription Template API] Archivo convertido exitosamente, tamaño: ${fileBuffer.length} bytes`);
		} catch (conversionError: any) {
			console.error('[Prescription Template API] Error convirtiendo archivo:', conversionError);
			return NextResponse.json(
				{
					error: conversionError?.message?.includes('Timeout') ? 'El archivo tardó demasiado en procesarse. Intenta con un archivo más pequeño o verifica tu conexión.' : 'Error al procesar el archivo. Por favor, verifica que el archivo no esté corrupto e intenta nuevamente.',
				},
				{ status: 500 }
			);
		}

		// Subir archivo con cliente admin (bypass RLS) y reintentos
		let uploadData: any = null;
		let uploadError: any = null;
		const maxRetries = 2;
		let retryCount = 0;

		while (retryCount <= maxRetries && !uploadData) {
			try {
				const contentType = fileExtension === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/msword';

				const uploadPromise = supabaseAdmin.storage.from(bucket).upload(fileNameUnique, fileBuffer, {
					contentType: contentType,
					upsert: false,
				});

				const fileSizeMB = fileBuffer.length / (1024 * 1024);
				const uploadTimeout = Math.min(Math.max(fileSizeMB * 2000, 60000), 180000);

				console.log(`[Prescription Template API] Subiendo archivo con timeout de ${uploadTimeout / 1000}s`);

				const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), uploadTimeout));

				const uploadResult = (await Promise.race([uploadPromise, timeoutPromise])) as any;

				uploadData = uploadResult.data;
				uploadError = uploadResult.error;

				if (uploadError) {
					throw uploadError;
				}
			} catch (err: any) {
				uploadError = err;
				retryCount++;
				if (retryCount <= maxRetries) {
					console.warn(`[Prescription Template API] Intento ${retryCount} falló, reintentando...`, err?.message);
					await new Promise((resolve) => setTimeout(resolve, 2000));
				}
			}
		}

		if (uploadError || !uploadData) {
			console.error('[Prescription Template API] Error subiendo archivo después de reintentos:', uploadError);
			const errorMessage = uploadError?.message || String(uploadError);
			const statusCode = (uploadError as any)?.statusCode || (uploadError as any)?.status;

			if (statusCode === '404' || errorMessage.includes('not found') || errorMessage.includes('bucket')) {
				return NextResponse.json(
					{
						error: 'El bucket de almacenamiento "prescription-templates" no existe. Por favor, contacta al administrador para crear el bucket en Supabase Storage.',
					},
					{ status: 500 }
				);
			}

			return NextResponse.json(
				{
					error: errorMessage.includes('timeout') || errorMessage.includes('closed') ? 'La conexión se interrumpió durante la subida. Por favor, verifica tu conexión a internet e intenta nuevamente con un archivo más pequeño si el problema persiste.' : 'Error al subir archivo. Por favor, verifica tu conexión e intenta nuevamente.',
				},
				{ status: 500 }
			);
		}

		// Obtener URL del archivo usando cliente admin
		const filePath = uploadData.path;

		// Obtener URL pública o firmada
		const { data: urlData } = await supabaseAdmin.storage.from(bucket).createSignedUrl(filePath, 31536000); // 1 año de validez

		const templateUrl = urlData?.signedUrl || `/${bucket}/${filePath}`;

		// Actualizar o crear registro en medic_profile
		const { data: existingProfile } = await supabase.from('medic_profile').select('id').eq('doctor_id', doctorId).maybeSingle();

		if (existingProfile) {
			// Actualizar perfil existente (mantener prescription_template_text si existe)
			const { error: updateError } = await supabase
				.from('medic_profile')
				.update({
					prescription_template_url: templateUrl,
					prescription_template_name: templateFile.name,
					// No sobrescribir prescription_template_text si ya existe
				})
				.eq('doctor_id', doctorId);

			if (updateError) {
				console.error('[Prescription Template API] Error actualizando perfil:', updateError);
				// Intentar eliminar el archivo subido
				await supabaseAdmin.storage.from(bucket).remove([filePath]);
				return NextResponse.json({ error: 'Error al guardar plantilla' }, { status: 500 });
			}
		} else {
			// Crear nuevo perfil
			const { error: insertError } = await supabase.from('medic_profile').insert({
				doctor_id: doctorId,
				prescription_template_url: templateUrl,
				prescription_template_name: templateFile.name,
			});

			if (insertError) {
				console.error('[Prescription Template API] Error creando perfil:', insertError);
				// Intentar eliminar el archivo subido
				await supabaseAdmin.storage.from(bucket).remove([filePath]);
				return NextResponse.json({ error: 'Error al guardar plantilla' }, { status: 500 });
			}
		}

		return NextResponse.json({
			success: true,
			template_url: templateUrl,
			template_name: templateFile.name,
		});
	} catch (err) {
		console.error('[Prescription Template API] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}

export async function PUT(request: NextRequest) {
	try {
		// 1️⃣ Autenticación usando apiRequireRole (maneja correctamente la restauración de sesión)
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		const doctorId = user.userId;
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const { template_text, font_family } = body;

		if (template_text !== undefined && typeof template_text !== 'string') {
			return NextResponse.json({ error: 'template_text debe ser una cadena de texto' }, { status: 400 });
		}

		// Validar font_family si se proporciona
		const validFonts = ['Arial', 'Calibri', 'Georgia', 'Cambria', 'Garamond', 'Microsoft JhengHei'];
		if (font_family !== undefined) {
			if (typeof font_family !== 'string' || !validFonts.includes(font_family)) {
				return NextResponse.json(
					{
						error: `font_family debe ser una de las siguientes: ${validFonts.join(', ')}`,
					},
					{ status: 400 }
				);
			}
		}

		// Actualizar o crear registro en medic_profile
		const { data: existingProfile } = await supabase.from('medic_profile').select('id').eq('doctor_id', doctorId).maybeSingle();

		if (existingProfile) {
			// Actualizar perfil existente
			const updateData: any = {};
			if (template_text !== undefined) {
				updateData.prescription_template_text = template_text;
			}
			if (font_family !== undefined) {
				updateData.prescription_font_family = font_family;
			}

			const { error: updateError } = await supabase.from('medic_profile').update(updateData).eq('doctor_id', doctorId);

			if (updateError) {
				console.error('[Prescription Template API] Error actualizando plantilla de texto:', updateError);
				return NextResponse.json({ error: 'Error al guardar plantilla de texto' }, { status: 500 });
			}
		} else {
			// Crear nuevo perfil
			const insertData: any = {
				doctor_id: doctorId,
			};
			if (template_text !== undefined) {
				insertData.prescription_template_text = template_text;
			}
			if (font_family !== undefined) {
				insertData.prescription_font_family = font_family;
			} else {
				insertData.prescription_font_family = 'Arial'; // Valor por defecto
			}

			const { error: insertError } = await supabase.from('medic_profile').insert(insertData);

			if (insertError) {
				console.error('[Prescription Template API] Error creando perfil con plantilla de texto:', insertError);
				return NextResponse.json({ error: 'Error al guardar plantilla de texto' }, { status: 500 });
			}
		}

		return NextResponse.json({
			success: true,
			message: 'Plantilla de texto guardada exitosamente',
		});
	} catch (err) {
		console.error('[Prescription Template API] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest) {
	try {
		// 1️⃣ Autenticación usando apiRequireRole (maneja correctamente la restauración de sesión)
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		const doctorId = user.userId;
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Obtener información de la plantilla actual antes de eliminar
		const { data: medicProfile, error: profileError } = await supabase.from('medic_profile').select('prescription_template_url, prescription_template_name').eq('doctor_id', doctorId).maybeSingle();

		if (profileError) {
			console.error('[Prescription Template API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener plantilla' }, { status: 500 });
		}

		// Si hay una plantilla en Storage, eliminarla
		if (medicProfile?.prescription_template_url) {
			try {
				const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
				const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

				if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
					const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
						auth: { persistSession: false },
					});

					// Extraer la ruta del archivo desde la URL
					// La URL puede ser una signed URL o una ruta relativa
					const bucket = 'prescription-templates';
					let filePath = '';

					if (medicProfile.prescription_template_url.includes(bucket)) {
						// Extraer la ruta después del bucket
						const parts = medicProfile.prescription_template_url.split(`${bucket}/`);
						if (parts.length > 1) {
							// Puede haber query parameters, eliminarlos
							filePath = parts[1].split('?')[0];
						}
					} else {
						// Si es una ruta relativa, intentar extraer directamente
						filePath = medicProfile.prescription_template_url.replace(/^\/+/, '');
					}

					if (filePath) {
						const { error: deleteError } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
						if (deleteError) {
							console.warn('[Prescription Template API] Error eliminando archivo de Storage:', deleteError);
							// Continuar con la eliminación de la BD aunque falle el Storage
						}
					}
				}
			} catch (storageError) {
				console.warn('[Prescription Template API] Error eliminando archivo de Storage:', storageError);
				// Continuar con la eliminación de la BD aunque falle el Storage
			}
		}

		// Actualizar medic_profile para eliminar la plantilla (poner null en los campos)
		const { error: updateError } = await supabase
			.from('medic_profile')
			.update({
				prescription_template_url: null,
				prescription_template_name: null,
				prescription_template_text: null,
			})
			.eq('doctor_id', doctorId);

		if (updateError) {
			console.error('[Prescription Template API] Error eliminando plantilla:', updateError);
			return NextResponse.json({ error: 'Error al eliminar plantilla' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			message: 'Plantilla eliminada exitosamente',
		});
	} catch (err) {
		console.error('[Prescription Template API] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}
