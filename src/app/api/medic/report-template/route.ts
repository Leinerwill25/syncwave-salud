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

		// Helper para normalizar el nombre de obstetricia
		const normalizeObstetricia = (specialty: string | null): boolean => {
			if (!specialty) return false;
			const normalized = specialty.toLowerCase().trim();
			return normalized === 'obstetricia' || normalized === 'obstétricia' || normalized === 'obstetrics';
		};

		// Si hay plantillas por especialidad (nuevo formato), usarlas
		if (templates && typeof templates === 'object') {
			const result: any = {
				hasMultipleSpecialties,
				specialty1,
				specialty2,
			};

			// Buscar plantilla para specialty1 (buscar en todas las claves disponibles)
			if (specialty1) {
				const isObstetricia = normalizeObstetricia(specialty1);
				let templateData1 = templates[specialty1];
				
				// Si no se encuentra con el nombre exacto, buscar en claves que puedan contener esta especialidad
				// (por ejemplo, si hay una clave como "[\"Ginecología\",\"Obstetricia\"]")
				if (!templateData1) {
					for (const key in templates) {
						// Si la clave es un array stringificado, intentar parsearlo
						if (key.startsWith('[') && key.endsWith(']')) {
							try {
								const parsedArray = JSON.parse(key);
								if (Array.isArray(parsedArray) && parsedArray.includes(specialty1)) {
									templateData1 = templates[key];
									console.log(`[Report Template API] Encontrada plantilla para "${specialty1}" en clave array: "${key}"`);
									break;
								}
							} catch {
								// Continuar buscando
							}
						}
					}
				}

				// Si es obstetricia, SIEMPRE devolver estructura con múltiples variantes
				if (isObstetricia) {
					if (templateData1 && typeof templateData1 === 'object') {
						// Verificar si tiene estructura de múltiples plantillas (trimestres)
						if (templateData1.trimestre1 || templateData1.trimestre2_3 || templateData1.variants) {
							// Es un objeto con múltiples variantes
							const variants = templateData1.variants || {
								trimestre1: templateData1.trimestre1,
								trimestre2_3: templateData1.trimestre2_3,
							};
							
							result.template1 = {
								specialty: specialty1,
								hasMultipleVariants: true,
								variants: {
									trimestre1: variants.trimestre1 ? {
										template_url: variants.trimestre1.template_url || null,
										template_name: variants.trimestre1.template_name || null,
										template_text: variants.trimestre1.template_text || null,
										font_family: variants.trimestre1.font_family || 'Arial',
									} : null,
									trimestre2_3: variants.trimestre2_3 ? {
										template_url: variants.trimestre2_3.template_url || null,
										template_name: variants.trimestre2_3.template_name || null,
										template_text: variants.trimestre2_3.template_text || null,
										font_family: variants.trimestre2_3.font_family || 'Arial',
									} : null,
								},
							};
						} else {
							// Es una plantilla simple (compatibilidad hacia atrás), pero convertir a estructura de variantes
							result.template1 = {
								specialty: specialty1,
								hasMultipleVariants: true,
								variants: {
									trimestre1: null,
									trimestre2_3: null,
								},
							};
						}
					} else {
						// No hay plantillas guardadas aún, pero es obstetricia, devolver estructura de variantes vacía
						result.template1 = {
							specialty: specialty1,
							hasMultipleVariants: true,
							variants: {
								trimestre1: null,
								trimestre2_3: null,
							},
						};
					}
				} else {
					// No es obstetricia, manejo normal
					// Si no se encuentra con el nombre exacto, buscar la primera clave disponible
					if (!templateData1 && Object.keys(templates).length > 0) {
						const firstKey = Object.keys(templates)[0];
						templateData1 = templates[firstKey];
					}
					
					if (templateData1 && typeof templateData1 === 'object' && !Array.isArray(templateData1)) {
						// Plantilla simple
						result.template1 = {
							specialty: specialty1,
							hasMultipleVariants: false,
							template_url: templateData1.template_url || null,
							template_name: templateData1.template_name || null,
							template_text: templateData1.template_text || null,
							font_family: templateData1.font_family || 'Arial',
						};
					}
				}
			}

			// Buscar plantilla para specialty2 (similar lógica)
			if (specialty2) {
				const isObstetricia = normalizeObstetricia(specialty2);
				let templateData2 = templates[specialty2];
				
				// Si no se encuentra con el nombre exacto, buscar en claves que puedan contener esta especialidad
				if (!templateData2) {
					for (const key in templates) {
						// Si la clave es un array stringificado, intentar parsearlo
						if (key.startsWith('[') && key.endsWith(']')) {
							try {
								const parsedArray = JSON.parse(key);
								if (Array.isArray(parsedArray) && parsedArray.includes(specialty2)) {
									templateData2 = templates[key];
									console.log(`[Report Template API] Encontrada plantilla para "${specialty2}" en clave array: "${key}"`);
									break;
								}
							} catch {
								// Continuar buscando
							}
						}
					}
				}

				// Si es obstetricia, SIEMPRE devolver estructura con múltiples variantes
				if (isObstetricia) {
					if (templateData2 && typeof templateData2 === 'object') {
						if (templateData2.trimestre1 || templateData2.trimestre2_3 || templateData2.variants) {
							const variants = templateData2.variants || {
								trimestre1: templateData2.trimestre1,
								trimestre2_3: templateData2.trimestre2_3,
							};
							
							result.template2 = {
								specialty: specialty2,
								hasMultipleVariants: true,
								variants: {
									trimestre1: variants.trimestre1 ? {
										template_url: variants.trimestre1.template_url || null,
										template_name: variants.trimestre1.template_name || null,
										template_text: variants.trimestre1.template_text || null,
										font_family: variants.trimestre1.font_family || 'Arial',
									} : null,
									trimestre2_3: variants.trimestre2_3 ? {
										template_url: variants.trimestre2_3.template_url || null,
										template_name: variants.trimestre2_3.template_name || null,
										template_text: variants.trimestre2_3.template_text || null,
										font_family: variants.trimestre2_3.font_family || 'Arial',
									} : null,
								},
							};
						} else {
							// Es una plantilla simple (compatibilidad hacia atrás), pero convertir a estructura de variantes
							result.template2 = {
								specialty: specialty2,
								hasMultipleVariants: true,
								variants: {
									trimestre1: null,
									trimestre2_3: null,
								},
							};
						}
					} else {
						// No hay plantillas guardadas aún, pero es obstetricia, devolver estructura de variantes vacía
						result.template2 = {
							specialty: specialty2,
							hasMultipleVariants: true,
							variants: {
								trimestre1: null,
								trimestre2_3: null,
							},
						};
					}
				} else if (templateData2 && typeof templateData2 === 'object' && !Array.isArray(templateData2)) {
					result.template2 = {
						specialty: specialty2,
						hasMultipleVariants: false,
						template_url: templateData2.template_url || null,
						template_name: templateData2.template_name || null,
						template_text: templateData2.template_text || null,
						font_family: templateData2.font_family || 'Arial',
					};
				}
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
		const variant = formData.get('variant') as string | null; // Nueva: indica la variante (trimestre1, trimestre2_3) para obstetricia

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

		// Helper para normalizar el nombre de obstetricia
		const normalizeObstetricia = (specialty: string | null): boolean => {
			if (!specialty) return false;
			const normalized = specialty.toLowerCase().trim();
			return normalized === 'obstetricia' || normalized === 'obstétricia' || normalized === 'obstetrics';
		};

		// Obtener especialidades del doctor
		const { specialty1, specialty2 } = await getDoctorSpecialties(doctorId, supabase);
		
		// Obtener todas las especialidades del doctor para validación
		const { data: medicProfileForSpecialties } = await supabase
			.from('medic_profile')
			.select('specialty, private_specialty')
			.eq('doctor_id', doctorId)
			.maybeSingle();
		
		const allDoctorSpecialties = Array.from(new Set([
			...parseSpecialtyField(medicProfileForSpecialties?.private_specialty),
			...parseSpecialtyField(medicProfileForSpecialties?.specialty)
		]));
		
		// Si se especifica specialty, validar y normalizar
		let targetSpecialty = specialty1;
		if (specialty) {
			// Normalizar: si viene como array stringificado, parsearlo
			let normalizedSpecialty = specialty;
			if (specialty.startsWith('[') && specialty.endsWith(']')) {
				try {
					const parsed = JSON.parse(specialty);
					if (Array.isArray(parsed) && parsed.length > 0) {
						normalizedSpecialty = parsed[0]; // Usar la primera especialidad del array
					}
				} catch {
					// Si no se puede parsear, usar el valor original
				}
			}
			
			// Validar que la especialidad normalizada sea una de las especialidades del doctor
			if (!allDoctorSpecialties.includes(normalizedSpecialty)) {
				return NextResponse.json({ 
					error: `La especialidad especificada "${normalizedSpecialty}" no corresponde a las especialidades del doctor: ${allDoctorSpecialties.join(', ')}` 
				}, { status: 400 });
			}
			targetSpecialty = normalizedSpecialty;
		}

		if (!targetSpecialty) {
			return NextResponse.json({ error: 'No se pudo determinar la especialidad' }, { status: 400 });
		}
		
		// Log para debugging
		console.log('[Report Template API] Especialidad objetivo:', targetSpecialty);
		console.log('[Report Template API] Todas las especialidades del doctor:', allDoctorSpecialties);

		// Validar variant si es obstetricia
		const isObstetricia = normalizeObstetricia(targetSpecialty);
		if (isObstetricia && variant) {
			const validVariants = ['trimestre1', 'trimestre2_3'];
			if (!validVariants.includes(variant)) {
				return NextResponse.json({ error: `Variante inválida. Debe ser una de: ${validVariants.join(', ')}` }, { status: 400 });
			}
		} else if (isObstetricia && !variant) {
			// Si es obstetricia pero no se especifica variant, usar trimestre1 por defecto
			// o permitir guardar como plantilla simple (compatibilidad)
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
		
		// Si es obstetricia y tiene variant, incluir en la ruta
		const specialtyPath = isObstetricia && variant 
			? `${targetSpecialty}/${variant}` 
			: targetSpecialty;
		const fileNameUnique = `${doctorId}/${specialtyPath}/${Date.now()}-${sanitizedFileName}`;
		
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
		// IMPORTANTE: Preservar todas las especialidades existentes
		let templatesBySpecialty: Record<string, any> = {};
		if (existingProfile?.report_templates_by_specialty) {
			if (typeof existingProfile.report_templates_by_specialty === 'string') {
				try {
					templatesBySpecialty = JSON.parse(existingProfile.report_templates_by_specialty);
				} catch {
					templatesBySpecialty = {};
				}
			} else if (typeof existingProfile.report_templates_by_specialty === 'object' && existingProfile.report_templates_by_specialty !== null) {
				// Asegurar que es un objeto y hacer una copia profunda para no mutar el original
				templatesBySpecialty = JSON.parse(JSON.stringify(existingProfile.report_templates_by_specialty));
			}
		}
		
		// Log para debugging (puede removerse en producción)
		console.log('[Report Template API] Templates existentes antes de actualizar:', JSON.stringify(templatesBySpecialty, null, 2));

		// Si es obstetricia con variant, crear estructura de múltiples variantes
		if (isObstetricia && variant) {
			const existingData = templatesBySpecialty[targetSpecialty] || {};
			const existingVariants = existingData.variants || {
				trimestre1: existingData.trimestre1 || null,
				trimestre2_3: existingData.trimestre2_3 || null,
			};

			// Actualizar la variante específica
			existingVariants[variant] = {
				template_url: templateUrl,
				template_name: templateFile.name,
				font_family: existingVariants[variant]?.font_family || 'Arial',
				// Preservar template_text si existe
				template_text: existingVariants[variant]?.template_text || null,
			};

			// Guardar estructura de múltiples variantes
			templatesBySpecialty[targetSpecialty] = {
				variants: existingVariants,
			};
		} else {
			// Plantilla simple (compatibilidad hacia atrás o especialidad no obstetricia)
			templatesBySpecialty[targetSpecialty] = {
				template_url: templateUrl,
				template_name: templateFile.name,
				font_family: templatesBySpecialty[targetSpecialty]?.font_family || 'Arial',
				// Preservar template_text si existe
				template_text: templatesBySpecialty[targetSpecialty]?.template_text || null,
			};
		}

		// Log para debugging (puede removerse en producción)
		console.log('[Report Template API] Templates después de actualizar:', JSON.stringify(templatesBySpecialty, null, 2));
		console.log('[Report Template API] Especialidades en el objeto:', Object.keys(templatesBySpecialty));

		// Actualizar perfil
		// IMPORTANTE: Usar JSON.stringify para asegurar que Supabase reciba el JSON correctamente
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
		const { template_text, font_family, specialty, variant } = body; // Nueva: specialty y variant para indicar para qué especialidad y variante

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

		// Helper para normalizar el nombre de obstetricia
		const normalizeObstetricia = (specialty: string | null): boolean => {
			if (!specialty) return false;
			const normalized = specialty.toLowerCase().trim();
			return normalized === 'obstetricia' || normalized === 'obstétricia' || normalized === 'obstetrics';
		};

		// Obtener especialidades
		const { specialty1, specialty2 } = await getDoctorSpecialties(doctorId, supabase);
		
		// Obtener todas las especialidades del doctor para validación
		const { data: medicProfileForSpecialties } = await supabase
			.from('medic_profile')
			.select('specialty, private_specialty')
			.eq('doctor_id', doctorId)
			.maybeSingle();
		
		const allDoctorSpecialties = Array.from(new Set([
			...parseSpecialtyField(medicProfileForSpecialties?.private_specialty),
			...parseSpecialtyField(medicProfileForSpecialties?.specialty)
		]));
		
		// Si se especifica specialty, validar y normalizar
		let targetSpecialty = specialty1;
		if (specialty) {
			// Normalizar: si viene como array stringificado, parsearlo
			let normalizedSpecialty = specialty;
			if (specialty.startsWith('[') && specialty.endsWith(']')) {
				try {
					const parsed = JSON.parse(specialty);
					if (Array.isArray(parsed) && parsed.length > 0) {
						normalizedSpecialty = parsed[0]; // Usar la primera especialidad del array
					}
				} catch {
					// Si no se puede parsear, usar el valor original
				}
			}
			
			// Validar que la especialidad normalizada sea una de las especialidades del doctor
			if (!allDoctorSpecialties.includes(normalizedSpecialty)) {
				return NextResponse.json({ 
					error: `La especialidad especificada "${normalizedSpecialty}" no corresponde a las especialidades del doctor: ${allDoctorSpecialties.join(', ')}` 
				}, { status: 400 });
			}
			targetSpecialty = normalizedSpecialty;
		}

		if (!targetSpecialty) {
			return NextResponse.json({ error: 'No se pudo determinar la especialidad' }, { status: 400 });
		}

		// Validar variant si es obstetricia
		const isObstetricia = normalizeObstetricia(targetSpecialty);
		if (isObstetricia && variant) {
			const validVariants = ['trimestre1', 'trimestre2_3'];
			if (!validVariants.includes(variant)) {
				return NextResponse.json({ error: `Variante inválida. Debe ser una de: ${validVariants.join(', ')}` }, { status: 400 });
			}
		}

		// Obtener perfil actual
		const { data: existingProfile } = await supabase
			.from('medic_profile')
			.select('report_templates_by_specialty')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		// Inicializar templatesBySpecialty
		// IMPORTANTE: Preservar todas las especialidades existentes
		let templatesBySpecialty: Record<string, any> = {};
		if (existingProfile?.report_templates_by_specialty) {
			if (typeof existingProfile.report_templates_by_specialty === 'string') {
				try {
					templatesBySpecialty = JSON.parse(existingProfile.report_templates_by_specialty);
				} catch {
					templatesBySpecialty = {};
				}
			} else if (typeof existingProfile.report_templates_by_specialty === 'object' && existingProfile.report_templates_by_specialty !== null) {
				// Asegurar que es un objeto y hacer una copia profunda para no mutar el original
				templatesBySpecialty = JSON.parse(JSON.stringify(existingProfile.report_templates_by_specialty));
			}
		}

		// Si es obstetricia con variant, usar estructura de múltiples variantes
		if (isObstetricia && variant) {
			const existingData = templatesBySpecialty[targetSpecialty] || {};
			const existingVariants = existingData.variants || {
				trimestre1: existingData.trimestre1 || null,
				trimestre2_3: existingData.trimestre2_3 || null,
			};

			// Inicializar variante si no existe
			if (!existingVariants[variant]) {
				existingVariants[variant] = {
					font_family: 'Arial',
				};
			}

			// Actualizar campos de la variante específica
			if (template_text !== undefined) {
				existingVariants[variant].template_text = template_text;
			}
			if (font_family !== undefined) {
				existingVariants[variant].font_family = font_family;
			}

			// Guardar estructura de múltiples variantes
			templatesBySpecialty[targetSpecialty] = {
				variants: existingVariants,
			};
		} else {
			// Plantilla simple (compatibilidad hacia atrás o especialidad no obstetricia)
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

		// Helper para normalizar el nombre de obstetricia
		const normalizeObstetricia = (specialty: string | null): boolean => {
			if (!specialty) return false;
			const normalized = specialty.toLowerCase().trim();
			return normalized === 'obstetricia' || normalized === 'obstétricia' || normalized === 'obstetrics';
		};

		// Obtener specialty y variant del query param o body
		const url = new URL(request.url);
		const specialty = url.searchParams.get('specialty');
		const variant = url.searchParams.get('variant');
		
		// Si no viene en query, intentar del body
		let bodySpecialty: string | null = null;
		let bodyVariant: string | null = null;
		try {
			const body = await request.json().catch(() => ({}));
			bodySpecialty = body.specialty || null;
			bodyVariant = body.variant || null;
		} catch {
			// Si no hay body, continuar
		}

		const targetSpecialty = specialty || bodySpecialty;
		const targetVariant = variant || bodyVariant;

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

			const isObstetricia = normalizeObstetricia(targetSpecialty);

			// Si es obstetricia con variant, eliminar solo la variante específica
			if (isObstetricia && targetVariant && targetSpecialty && templatesBySpecialty[targetSpecialty]) {
				const existingData = templatesBySpecialty[targetSpecialty];
				const existingVariants = existingData.variants || {
					trimestre1: existingData.trimestre1 || null,
					trimestre2_3: existingData.trimestre2_3 || null,
				};

				const variantData = existingVariants[targetVariant];
				if (variantData && variantData.template_url) {
					try {
						const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
						const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

						if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
							const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
								auth: { persistSession: false },
							});

							const bucket = 'report-templates';
							let filePath = '';

							if (variantData.template_url.includes(bucket)) {
								const parts = variantData.template_url.split(`${bucket}/`);
								if (parts.length > 1) {
									filePath = parts[1].split('?')[0];
								}
							} else {
								filePath = variantData.template_url.replace(/^\/+/, '');
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

				// Eliminar solo la variante específica
				delete existingVariants[targetVariant];

				// Actualizar estructura de variantes
				if (Object.keys(existingVariants).length > 0) {
					templatesBySpecialty[targetSpecialty] = {
						variants: existingVariants,
					};
				} else {
					// Si no quedan variantes, eliminar toda la especialidad
					delete templatesBySpecialty[targetSpecialty];
				}
			} else if (targetSpecialty && templatesBySpecialty[targetSpecialty]) {
				// Eliminar toda la plantilla de la especialidad (comportamiento original)
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
