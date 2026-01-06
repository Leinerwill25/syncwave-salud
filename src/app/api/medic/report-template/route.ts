// app/api/medic/report-template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { createClient } from '@supabase/supabase-js';
import { apiRequireRole } from '@/lib/auth-guards';

// Helper para parsear especialidades que pueden venir como string, array, o JSON string
function parseSpecialtyField(value: any): string[] {
	if (!value) return [];
	if (Array.isArray(value)) {
		return value.map(String).filter(s => s.trim().length > 0);
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return [];
		// Intentar parsear como JSON
		try {
			const parsed = JSON.parse(trimmed);
			if (Array.isArray(parsed)) {
				return parsed.map(String).filter(s => s.trim().length > 0);
			}
			return [trimmed]; // Si no es array, devolver como string único
		} catch {
			// Si no es JSON válido, tratar como string simple
			return [trimmed];
		}
	}
	return [];
}

// Helper para obtener las especialidades del doctor
async function getDoctorSpecialties(doctorId: string, supabase: any): Promise<{ specialty1: string | null; specialty2: string | null }> {
	const { data: medicProfile } = await supabase
		.from('medic_profile')
		.select('specialty, private_specialty')
		.eq('doctor_id', doctorId)
		.maybeSingle();

	// Parsear especialidades (pueden venir como arrays)
	const privateSpecialties = parseSpecialtyField(medicProfile?.private_specialty);
	const clinicSpecialties = parseSpecialtyField(medicProfile?.specialty);

	// Combinar todas las especialidades únicas
	const allSpecialties = Array.from(new Set([...privateSpecialties, ...clinicSpecialties]));

	// specialty1 es la primera especialidad
	const specialty1 = allSpecialties[0] || null;
	
	// specialty2 es la segunda especialidad si existe
	const specialty2 = allSpecialties.length > 1 ? allSpecialties[1] : null;

	return { specialty1, specialty2 };
}

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

		// Obtener especialidades y plantillas del médico
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('specialty, private_specialty, report_template_url, report_template_name, report_template_text, report_font_family, report_templates_by_specialty')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError) {
			console.error('[Report Template API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener plantilla' }, { status: 500 });
		}

		// Determinar especialidades usando helper
		const { specialty1, specialty2 } = await getDoctorSpecialties(doctorId, supabase);

		const hasMultipleSpecialties = !!specialty2;

		// Parsear report_templates_by_specialty si existe (puede venir como string desde Supabase)
		let templates: any = null;
		if (medicProfile?.report_templates_by_specialty) {
			if (typeof medicProfile.report_templates_by_specialty === 'string') {
				try {
					templates = JSON.parse(medicProfile.report_templates_by_specialty);
				} catch {
					templates = null;
				}
			} else {
				templates = medicProfile.report_templates_by_specialty;
			}
		}

		// Si hay plantillas por especialidad (nuevo formato), usarlas
		if (templates && typeof templates === 'object') {
			const result: any = {
				hasMultipleSpecialties,
				specialty1,
				specialty2,
			};

			// Buscar plantilla para specialty1 (buscar en todas las claves disponibles)
			if (specialty1) {
				let templateData1 = templates[specialty1];
				// Si no se encuentra con el nombre exacto, buscar la primera clave disponible
				if (!templateData1 && Object.keys(templates).length > 0) {
					const firstKey = Object.keys(templates)[0];
					templateData1 = templates[firstKey];
				}
				
				if (templateData1) {
					result.template1 = {
						specialty: specialty1,
						template_url: templateData1.template_url || null,
						template_name: templateData1.template_name || null,
						template_text: templateData1.template_text || null,
						font_family: templateData1.font_family || 'Arial',
					};
				}
			}

			// Buscar plantilla para specialty2
			if (specialty2 && templates[specialty2]) {
				result.template2 = {
					specialty: specialty2,
					template_url: templates[specialty2].template_url || null,
					template_name: templates[specialty2].template_name || null,
					template_text: templates[specialty2].template_text || null,
					font_family: templates[specialty2].font_family || 'Arial',
				};
			}

			// Asegurar que siempre se retornen specialty1 y specialty2 incluso si no hay plantillas
			return NextResponse.json(result);
		}

		// Compatibilidad hacia atrás: usar campos antiguos si existen
		// Pero también asegurar que se retornen las especialidades
		const result: any = {
			hasMultipleSpecialties,
			specialty1,
			specialty2,
		};

		// Si hay plantillas en campos antiguos, incluirlas
		if (medicProfile?.report_template_url || medicProfile?.report_template_text) {
			result.template1 = {
				specialty: specialty1,
				template_url: medicProfile?.report_template_url || null,
				template_name: medicProfile?.report_template_name || null,
				template_text: medicProfile?.report_template_text || null,
				font_family: medicProfile?.report_font_family || 'Arial',
			};
		}

		return NextResponse.json(result);
	} catch (err) {
		console.error('[Report Template API] Error:', err);
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
		const specialty = formData.get('specialty') as string | null; // Nueva: indica para qué especialidad es la plantilla

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
			return NextResponse.json({ 
				error: `El archivo es demasiado grande. Máximo ${maxSizeBytes / (1024 * 1024)}MB` 
			}, { status: 400 });
		}

		// Obtener especialidades del doctor
		const { specialty1, specialty2 } = await getDoctorSpecialties(doctorId, supabase);
		
		// Si se especifica specialty, validar que sea una de las especialidades del doctor
		let targetSpecialty = specialty1;
		if (specialty) {
			if (specialty !== specialty1 && specialty !== specialty2) {
				return NextResponse.json({ error: 'La especialidad especificada no corresponde a las especialidades del doctor' }, { status: 400 });
			}
			targetSpecialty = specialty;
		}

		if (!targetSpecialty) {
			return NextResponse.json({ error: 'No se pudo determinar la especialidad' }, { status: 400 });
		}

		// Crear cliente admin para subir archivo (bypass RLS)
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('[Report Template API] SUPABASE_SERVICE_ROLE_KEY no configurado');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false }
		});

		// Subir archivo a Supabase Storage
		const bucket = 'report-templates';
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
		
		const fileNameUnique = `${doctorId}/${targetSpecialty}/${Date.now()}-${sanitizedFileName}`;
		
		console.log('[Report Template API] Nombre original:', templateFile.name);
		console.log('[Report Template API] Especialidad:', targetSpecialty);
		console.log('[Report Template API] Ruta completa:', fileNameUnique);

		// Convertir File a Buffer
		let fileBuffer: Buffer;
		try {
			const fileSizeMB = templateFile.size / (1024 * 1024);
			const timeoutSeconds = Math.min(Math.max(fileSizeMB * 1000, 30000), 120000);
			
			const arrayBuffer = await Promise.race([
				templateFile.arrayBuffer(),
				new Promise<never>((_, reject) => 
					setTimeout(() => reject(new Error('Timeout al leer el archivo')), timeoutSeconds)
				)
			]);
			fileBuffer = Buffer.from(arrayBuffer);
		} catch (conversionError: any) {
			console.error('[Report Template API] Error convirtiendo archivo:', conversionError);
			return NextResponse.json({ 
				error: conversionError?.message?.includes('Timeout') 
					? 'El archivo tardó demasiado en procesarse. Intenta con un archivo más pequeño o verifica tu conexión.' 
					: 'Error al procesar el archivo. Por favor, verifica que el archivo no esté corrupto e intenta nuevamente.' 
			}, { status: 500 });
		}

		// Subir archivo con reintentos
		let uploadData: any = null;
		let uploadError: any = null;
		const maxRetries = 2;
		let retryCount = 0;

		while (retryCount <= maxRetries && !uploadData) {
			try {
				const contentType = fileExtension === '.docx' 
					? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
					: 'application/msword';

				const uploadPromise = supabaseAdmin.storage
					.from(bucket)
					.upload(fileNameUnique, fileBuffer, {
						contentType: contentType,
						upsert: false,
					});

				const fileSizeMB = fileBuffer.length / (1024 * 1024);
				const uploadTimeout = Math.min(Math.max(fileSizeMB * 2000, 60000), 180000);
				
				const timeoutPromise = new Promise<never>((_, reject) => 
					setTimeout(() => reject(new Error('Upload timeout')), uploadTimeout)
				);

				const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;

				uploadData = uploadResult.data;
				uploadError = uploadResult.error;
				
				if (uploadError) {
					throw uploadError;
				}
			} catch (err: any) {
				uploadError = err;
				retryCount++;
				if (retryCount <= maxRetries) {
					console.warn(`[Report Template API] Intento ${retryCount} falló, reintentando...`, err?.message);
					await new Promise(resolve => setTimeout(resolve, 2000));
				}
			}
		}

		if (uploadError || !uploadData) {
			console.error('[Report Template API] Error subiendo archivo después de reintentos:', uploadError);
			const errorMessage = uploadError?.message || String(uploadError);
			const statusCode = (uploadError as any)?.statusCode || (uploadError as any)?.status;
			
			if (statusCode === '404' || errorMessage.includes('not found') || errorMessage.includes('bucket')) {
				return NextResponse.json({ 
					error: 'El bucket de almacenamiento "report-templates" no existe. Por favor, contacta al administrador para crear el bucket en Supabase Storage.' 
				}, { status: 500 });
			}
			
			return NextResponse.json({ 
				error: errorMessage.includes('timeout') || errorMessage.includes('closed')
					? 'La conexión se interrumpió durante la subida. Por favor, verifica tu conexión a internet e intenta nuevamente con un archivo más pequeño si el problema persiste.' 
					: 'Error al subir archivo. Por favor, verifica tu conexión e intenta nuevamente.' 
			}, { status: 500 });
		}

		// Obtener URL del archivo
		const filePath = uploadData.path;
		const { data: urlData } = await supabaseAdmin.storage
			.from(bucket)
			.createSignedUrl(filePath, 31536000); // 1 año de validez

		const templateUrl = urlData?.signedUrl || `/${bucket}/${filePath}`;

		// Obtener perfil actual para preservar datos existentes
		const { data: existingProfile } = await supabase
			.from('medic_profile')
			.select('report_templates_by_specialty')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		// Actualizar o crear plantillas por especialidad
		let templatesBySpecialty = existingProfile?.report_templates_by_specialty || {};
		if (typeof templatesBySpecialty === 'string') {
			try {
				templatesBySpecialty = JSON.parse(templatesBySpecialty);
			} catch {
				templatesBySpecialty = {};
			}
		}

		// Actualizar plantilla para la especialidad específica
		templatesBySpecialty[targetSpecialty] = {
			template_url: templateUrl,
			template_name: templateFile.name,
			font_family: templatesBySpecialty[targetSpecialty]?.font_family || 'Arial',
			// Preservar template_text si existe
			template_text: templatesBySpecialty[targetSpecialty]?.template_text || null,
		};

		// Actualizar perfil
		const { error: updateError } = await supabase
			.from('medic_profile')
			.update({
				report_templates_by_specialty: templatesBySpecialty,
			})
			.eq('doctor_id', doctorId);

		if (updateError) {
			console.error('[Report Template API] Error actualizando perfil:', updateError);
			// Intentar eliminar el archivo subido
			await supabaseAdmin.storage.from(bucket).remove([filePath]);
			return NextResponse.json({ error: 'Error al guardar plantilla' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			template_url: templateUrl,
			template_name: templateFile.name,
			specialty: targetSpecialty,
		});
	} catch (err) {
		console.error('[Report Template API] Error:', err);
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
		const { template_text, font_family, specialty } = body; // Nueva: specialty para indicar para qué especialidad

		if (template_text !== undefined && typeof template_text !== 'string') {
			return NextResponse.json({ error: 'template_text debe ser una cadena de texto' }, { status: 400 });
		}

		// Validar font_family si se proporciona
		const validFonts = ['Arial', 'Calibri', 'Georgia', 'Cambria', 'Garamond'];
		if (font_family !== undefined) {
			if (typeof font_family !== 'string' || !validFonts.includes(font_family)) {
				return NextResponse.json({ 
					error: `font_family debe ser una de las siguientes: ${validFonts.join(', ')}` 
				}, { status: 400 });
			}
		}

		// Obtener especialidades
		const { specialty1, specialty2 } = await getDoctorSpecialties(doctorId, supabase);
		
		// Si se especifica specialty, validar
		let targetSpecialty = specialty1;
		if (specialty) {
			if (specialty !== specialty1 && specialty !== specialty2) {
				return NextResponse.json({ error: 'La especialidad especificada no corresponde a las especialidades del doctor' }, { status: 400 });
			}
			targetSpecialty = specialty;
		}

		if (!targetSpecialty) {
			return NextResponse.json({ error: 'No se pudo determinar la especialidad' }, { status: 400 });
		}

		// Obtener perfil actual
		const { data: existingProfile } = await supabase
			.from('medic_profile')
			.select('report_templates_by_specialty')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		// Inicializar templatesBySpecialty
		let templatesBySpecialty = existingProfile?.report_templates_by_specialty || {};
		if (typeof templatesBySpecialty === 'string') {
			try {
				templatesBySpecialty = JSON.parse(templatesBySpecialty);
			} catch {
				templatesBySpecialty = {};
			}
		}

		// Inicializar plantilla para la especialidad si no existe
		if (!templatesBySpecialty[targetSpecialty]) {
			templatesBySpecialty[targetSpecialty] = {
				font_family: 'Arial',
			};
		}

		// Actualizar campos
		if (template_text !== undefined) {
			templatesBySpecialty[targetSpecialty].template_text = template_text;
		}
		if (font_family !== undefined) {
			templatesBySpecialty[targetSpecialty].font_family = font_family;
		}

		// Actualizar en BD
		const { error: updateError } = await supabase
			.from('medic_profile')
			.update({
				report_templates_by_specialty: templatesBySpecialty,
			})
			.eq('doctor_id', doctorId);

		if (updateError) {
			console.error('[Report Template API] Error actualizando plantilla de texto:', updateError);
			return NextResponse.json({ error: 'Error al guardar plantilla de texto' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			message: 'Plantilla de texto guardada exitosamente',
			specialty: targetSpecialty,
		});
	} catch (err) {
		console.error('[Report Template API] Error:', err);
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

		// Obtener specialty del query param o body
		const url = new URL(request.url);
		const specialty = url.searchParams.get('specialty');
		
		// Si no viene en query, intentar del body
		let bodySpecialty: string | null = null;
		try {
			const body = await request.json().catch(() => ({}));
			bodySpecialty = body.specialty || null;
		} catch {
			// Si no hay body, continuar
		}

		const targetSpecialty = specialty || bodySpecialty;

		// Obtener información de las plantillas actuales
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('report_templates_by_specialty, report_template_url, report_template_name')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError) {
			console.error('[Report Template API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener plantilla' }, { status: 500 });
		}

		// Si hay plantillas por especialidad
		if (medicProfile?.report_templates_by_specialty) {
			let templatesBySpecialty = medicProfile.report_templates_by_specialty;
			if (typeof templatesBySpecialty === 'string') {
				try {
					templatesBySpecialty = JSON.parse(templatesBySpecialty);
				} catch {
					templatesBySpecialty = {};
				}
			}

			if (targetSpecialty && templatesBySpecialty[targetSpecialty]) {
				// Eliminar archivo de Storage si existe
				const templateData = templatesBySpecialty[targetSpecialty];
				if (templateData.template_url) {
					try {
						const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
						const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

						if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
							const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
								auth: { persistSession: false },
							});

							const bucket = 'report-templates';
							let filePath = '';

							if (templateData.template_url.includes(bucket)) {
								const parts = templateData.template_url.split(`${bucket}/`);
								if (parts.length > 1) {
									filePath = parts[1].split('?')[0];
								}
							} else {
								filePath = templateData.template_url.replace(/^\/+/, '');
							}

							if (filePath) {
								const { error: deleteError } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
								if (deleteError) {
									console.warn('[Report Template API] Error eliminando archivo de Storage:', deleteError);
								}
							}
						}
					} catch (storageError) {
						console.warn('[Report Template API] Error eliminando archivo de Storage:', storageError);
					}
				}

				// Eliminar plantilla de la especialidad específica
				delete templatesBySpecialty[targetSpecialty];

				// Si no quedan plantillas, poner null
				if (Object.keys(templatesBySpecialty).length === 0) {
					templatesBySpecialty = null;
				}

				// Actualizar BD
				const { error: updateError } = await supabase
					.from('medic_profile')
					.update({
						report_templates_by_specialty: templatesBySpecialty,
					})
					.eq('doctor_id', doctorId);

				if (updateError) {
					console.error('[Report Template API] Error eliminando plantilla:', updateError);
					return NextResponse.json({ error: 'Error al eliminar plantilla' }, { status: 500 });
				}
			} else if (!targetSpecialty) {
				// Si no se especifica specialty, eliminar todas
				// Eliminar todos los archivos
				// ... (similar al código anterior pero para todas las especialidades)
				// Por ahora, solo eliminar todas las plantillas
				const { error: updateError } = await supabase
					.from('medic_profile')
					.update({
						report_templates_by_specialty: null,
					})
					.eq('doctor_id', doctorId);

				if (updateError) {
					console.error('[Report Template API] Error eliminando plantillas:', updateError);
					return NextResponse.json({ error: 'Error al eliminar plantillas' }, { status: 500 });
				}
			}

			return NextResponse.json({
				success: true,
				message: 'Plantilla eliminada exitosamente',
			});
		}

		// Compatibilidad hacia atrás: eliminar campos antiguos
		// ... (código existente para eliminar campos antiguos)
		
		if (medicProfile?.report_template_url) {
			try {
				const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
				const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

				if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
					const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
						auth: { persistSession: false },
					});

					const bucket = 'report-templates';
					let filePath = '';

					if (medicProfile.report_template_url.includes(bucket)) {
						const parts = medicProfile.report_template_url.split(`${bucket}/`);
						if (parts.length > 1) {
							filePath = parts[1].split('?')[0];
						}
					} else {
						filePath = medicProfile.report_template_url.replace(/^\/+/, '');
					}

					if (filePath) {
						const { error: deleteError } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
						if (deleteError) {
							console.warn('[Report Template API] Error eliminando archivo de Storage:', deleteError);
						}
					}
				}
			} catch (storageError) {
				console.warn('[Report Template API] Error eliminando archivo de Storage:', storageError);
			}
		}

		// Actualizar medic_profile para eliminar la plantilla (poner null en los campos)
		const { error: updateError } = await supabase
			.from('medic_profile')
			.update({
				report_template_url: null,
				report_template_name: null,
				report_template_text: null,
			})
			.eq('doctor_id', doctorId);

		if (updateError) {
			console.error('[Report Template API] Error eliminando plantilla:', updateError);
			return NextResponse.json({ error: 'Error al eliminar plantilla' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			message: 'Plantilla eliminada exitosamente',
		});
	} catch (err) {
		console.error('[Report Template API] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}
