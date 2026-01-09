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
		const fileSizeMB = templateFile.size / (1024 * 1024);
		console.log(`[Report Template API] Tamaño del archivo: ${fileSizeMB.toFixed(2)}MB (${templateFile.size} bytes)`);
		
		if (templateFile.size > maxSizeBytes) {
			console.error(`[Report Template API] Archivo excede el límite: ${fileSizeMB.toFixed(2)}MB > ${maxSizeBytes / (1024 * 1024)}MB`);
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
		
		// Verificar que el bucket existe, si no, crearlo
		// También actualizar el fileSizeLimit si el bucket existe pero tiene un límite menor
		try {
			const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
			if (listError) {
				console.warn('[Report Template API] Error listando buckets:', listError);
			} else {
				const bucketExists = buckets?.some((b) => b.name === bucket);
				if (!bucketExists) {
					console.log(`[Report Template API] Bucket "${bucket}" no existe, creándolo...`);
					const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
						public: false,
						fileSizeLimit: 52428800, // 50MB
					});
					if (createError) {
						console.error(`[Report Template API] Error creando bucket "${bucket}":`, createError);
						return NextResponse.json({ 
							error: `Error al crear el bucket de almacenamiento. Por favor, contacta al administrador.` 
						}, { status: 500 });
					} else {
						console.log(`[Report Template API] Bucket "${bucket}" creado exitosamente con límite de 50MB`);
					}
				} else {
					// El bucket existe, verificar y actualizar el fileSizeLimit si es necesario
					const existingBucket = buckets?.find((b) => b.name === bucket);
					const desiredLimit = 52428800; // 50MB
					
					// Leer el límite actual del bucket (puede estar en diferentes campos)
					const currentLimit = (existingBucket as any)?.file_size_limit || 
					                    (existingBucket as any)?.fileSizeLimit ||
					                    (existingBucket as any)?.file_size_limit_bytes ||
					                    null;
					
					console.log(`[Report Template API] Bucket "${bucket}" existe. Información completa:`, {
						name: existingBucket?.name,
						public: existingBucket?.public,
						currentLimit: currentLimit,
						currentLimitMB: currentLimit ? `${(currentLimit / (1024 * 1024)).toFixed(2)}MB` : 'no configurado',
						desiredLimit: desiredLimit,
						desiredLimitMB: '50MB',
						allFields: Object.keys(existingBucket || {})
					});
					
					// Intentar actualizar el límite siempre (por si acaso hay caché o el límite no se reflejó)
					// Esto es seguro porque solo actualiza si es necesario
					if (!currentLimit || currentLimit < desiredLimit) {
						console.log(`[Report Template API] Intentando actualizar el límite del bucket "${bucket}" a 50MB...`);
						
						// Intentar múltiples métodos de actualización
						let updateSuccess = false;
						
						// Método 1: Actualizar con fileSizeLimit
						try {
							const { error: updateError, data: updateData } = await supabaseAdmin.storage.updateBucket(bucket, {
								public: existingBucket?.public ?? false,
								fileSizeLimit: desiredLimit,
							});
							if (!updateError) {
								console.log(`[Report Template API] ✅ Límite del bucket "${bucket}" actualizado a 50MB (método 1)`);
								updateSuccess = true;
								
								// Re-leer el bucket después de actualizar para verificar
								const { data: refreshedBuckets } = await supabaseAdmin.storage.listBuckets();
								const refreshedBucket = refreshedBuckets?.find((b) => b.name === bucket);
								const refreshedLimit = (refreshedBucket as any)?.file_size_limit || (refreshedBucket as any)?.fileSizeLimit;
								console.log(`[Report Template API] Límite después de actualizar: ${refreshedLimit ? `${(refreshedLimit / (1024 * 1024)).toFixed(2)}MB` : 'no configurado'}`);
							} else {
								console.warn(`[Report Template API] Método 1 falló:`, updateError);
							}
						} catch (updateErr: any) {
							console.warn(`[Report Template API] Método 1 error:`, updateErr?.message || updateErr);
						}
						
						// Método 2: Intentar actualizar solo con fileSizeLimit (incluyendo public que es requerido)
						if (!updateSuccess) {
							try {
								const { error: updateError2 } = await supabaseAdmin.storage.updateBucket(bucket, {
									public: existingBucket?.public ?? false,
									fileSizeLimit: desiredLimit,
								});
								if (!updateError2) {
									console.log(`[Report Template API] ✅ Límite del bucket "${bucket}" actualizado a 50MB (método 2)`);
									updateSuccess = true;
								} else {
									console.warn(`[Report Template API] Método 2 falló:`, updateError2);
								}
							} catch (updateErr2: any) {
								console.warn(`[Report Template API] Método 2 error:`, updateErr2?.message || updateErr2);
							}
						}
						
						if (!updateSuccess) {
							console.warn(`[Report Template API] ⚠️ No se pudo actualizar el límite del bucket "${bucket}" programáticamente. Continuando con el upload...`);
							console.warn(`[Report Template API] Si el límite ya fue actualizado en el dashboard, esto puede ser un problema de caché. El upload debería funcionar de todas formas.`);
						}
					} else {
						console.log(`[Report Template API] ✅ El bucket "${bucket}" ya tiene un límite adecuado (${(currentLimit / (1024 * 1024)).toFixed(2)}MB)`);
					}
					
					// Nota importante: Si el límite fue actualizado en el dashboard pero aún falla,
					// puede ser un problema de caché de Supabase. En ese caso, esperar unos minutos
					// o verificar que el límite se guardó correctamente en el dashboard.
				}
			}
		} catch (bucketErr) {
			console.error('[Report Template API] Error verificando/creando bucket:', bucketErr);
			return NextResponse.json({ 
				error: 'Error al verificar el almacenamiento. Por favor, intenta nuevamente.' 
			}, { status: 500 });
		}
		
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
		
		// Sanitizar el nombre de la especialidad para la ruta (eliminar caracteres especiales)
		const sanitizeSpecialtyForPath = (specialty: string): string => {
			return specialty
				.normalize('NFD') // Normalizar caracteres Unicode
				.replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos (í, é, á, etc.)
				.replace(/[^a-zA-Z0-9]/g, '_') // Reemplazar caracteres no alfanuméricos con _
				.replace(/_+/g, '_') // Reemplazar múltiples _ con uno solo
				.replace(/^_+|_+$/g, ''); // Eliminar _ al inicio y final
		};
		
		// Si es obstetricia y tiene variant, incluir en la ruta
		const sanitizedSpecialty = sanitizeSpecialtyForPath(targetSpecialty);
		const specialtyPath = isObstetricia && variant 
			? `${sanitizedSpecialty}/${variant}` 
			: sanitizedSpecialty;
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

		// Verificar el límite del bucket una vez más antes de subir
		// Esto ayuda a detectar si el límite se actualizó correctamente
		const fileSizeBytes = fileBuffer.length;
		let finalLimit: number | null = null;
		
		try {
			const { data: finalBuckets } = await supabaseAdmin.storage.listBuckets();
			const finalBucket = finalBuckets?.find((b) => b.name === bucket);
			finalLimit = (finalBucket as any)?.file_size_limit || (finalBucket as any)?.fileSizeLimit || null;
			
			console.log(`[Report Template API] Verificación final antes de subir:`, {
				bucket: bucket,
				fileSizeBytes: fileSizeBytes,
				fileSizeKB: (fileSizeBytes / 1024).toFixed(2),
				fileSizeMB: (fileSizeBytes / (1024 * 1024)).toFixed(2),
				bucketLimit: finalLimit,
				bucketLimitMB: finalLimit ? `${(finalLimit / (1024 * 1024)).toFixed(2)}MB` : 'no configurado',
				withinLimit: finalLimit ? fileSizeBytes <= finalLimit : 'desconocido',
				fileIsSmall: fileSizeBytes < 52428800 // 50MB
			});
			
			// Solo rechazar si el archivo claramente excede el límite detectado
			// Si el límite es NULL o el archivo es pequeño (< 50MB), intentar subir de todas formas
			// porque puede ser un problema de caché o configuración
			if (finalLimit && fileSizeBytes > finalLimit) {
				console.error(`[Report Template API] ❌ El archivo (${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB) excede el límite del bucket (${(finalLimit / (1024 * 1024)).toFixed(2)}MB)`);
				return NextResponse.json({ 
					error: `El archivo (${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB) excede el límite configurado del bucket (${(finalLimit / (1024 * 1024)).toFixed(2)}MB). Por favor, verifica el límite en el dashboard de Supabase.`,
					errorCode: 'FILE_EXCEEDS_BUCKET_LIMIT',
					fileSize: {
						bytes: fileSizeBytes,
						mb: parseFloat((fileSizeBytes / (1024 * 1024)).toFixed(2))
					},
					bucketLimit: {
						bytes: finalLimit,
						mb: parseFloat((finalLimit / (1024 * 1024)).toFixed(2))
					}
				}, { status: 413 });
			} else if (fileSizeBytes < 52428800) {
				// El archivo es menor a 50MB, debería funcionar
				// Continuar con el upload incluso si el límite no se detecta correctamente
				console.log(`[Report Template API] ✅ Archivo pequeño (${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB), continuando con el upload...`);
			}
		} catch (verifyErr) {
			console.warn(`[Report Template API] No se pudo verificar el límite final del bucket, continuando con el upload:`, verifyErr);
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

				console.log(`[Report Template API] Intento ${retryCount + 1} de subida:`, {
					fileName: fileNameUnique,
					fileSizeBytes: fileBuffer.length,
					fileSizeMB: (fileBuffer.length / (1024 * 1024)).toFixed(2),
					contentType: contentType
				});

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
				
				console.log(`[Report Template API] ✅ Archivo subido exitosamente en intento ${retryCount + 1}`);
			} catch (err: any) {
				uploadError = err;
				retryCount++;
				console.error(`[Report Template API] Error en intento ${retryCount}:`, {
					message: err?.message,
					statusCode: (err as any)?.statusCode || (err as any)?.status,
					error: err
				});
				if (retryCount <= maxRetries) {
					console.warn(`[Report Template API] Reintentando en 2 segundos...`);
					await new Promise(resolve => setTimeout(resolve, 2000));
				}
			}
		}

		if (uploadError || !uploadData) {
			console.error('[Report Template API] Error subiendo archivo después de reintentos:', uploadError);
			console.error('[Report Template API] Detalles del error:', {
				message: uploadError?.message,
				statusCode: (uploadError as any)?.statusCode || (uploadError as any)?.status,
				error: uploadError,
				fileSizeBytes: fileBuffer?.length,
				fileSizeMB: fileBuffer ? (fileBuffer.length / (1024 * 1024)).toFixed(2) : 'N/A',
				originalFileSizeBytes: templateFile.size,
				originalFileSizeMB: fileSizeMB.toFixed(2),
			});
			
			const errorMessage = uploadError?.message || String(uploadError);
			const statusCode = (uploadError as any)?.statusCode || (uploadError as any)?.status;
			
			// Mensajes de error más específicos
			if (statusCode === '404' || errorMessage.includes('not found') || errorMessage.includes('bucket')) {
				return NextResponse.json({ 
					error: 'El bucket de almacenamiento "report-templates" no existe. Por favor, contacta al administrador para crear el bucket en Supabase Storage.' 
				}, { status: 500 });
			}
			
			if (errorMessage.includes('timeout') || errorMessage.includes('closed') || errorMessage.includes('ECONNRESET')) {
				return NextResponse.json({ 
					error: 'La conexión se interrumpió durante la subida. Por favor, verifica tu conexión a internet e intenta nuevamente con un archivo más pequeño si el problema persiste.' 
				}, { status: 500 });
			}
			
			if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || errorMessage.includes('403')) {
				return NextResponse.json({ 
					error: 'No tienes permisos para subir archivos. Por favor, contacta al administrador.' 
				}, { status: 403 });
			}
			
			// Detectar error de "Invalid key" (caracteres especiales en la ruta)
			if (errorMessage.includes('Invalid key') || errorMessage.includes('invalid key')) {
				console.error(`[Report Template API] Error: La ruta del archivo contiene caracteres inválidos. Ruta intentada: ${fileNameUnique}`);
				return NextResponse.json({ 
					error: `El nombre de la especialidad contiene caracteres especiales que no son permitidos en las rutas de archivos. El sistema está corrigiendo esto automáticamente. Por favor, intenta subir el archivo nuevamente.`,
					errorCode: 'INVALID_KEY',
					filePath: fileNameUnique,
					instructions: {
						title: 'Solución:',
						steps: [
							'El nombre de la especialidad contiene caracteres especiales (como "í", "é", "á", etc.)',
							'El sistema ahora sanitiza automáticamente estos caracteres',
							'Por favor, intenta subir el archivo nuevamente',
							'Si el problema persiste, verifica que el nombre de la especialidad en tu perfil no tenga caracteres especiales'
						]
					}
				}, { status: 400 });
			}
			
			if (errorMessage.includes('413') || errorMessage.includes('too large') || errorMessage.includes('size') || errorMessage.includes('exceeds') || errorMessage.includes('File size')) {
				const actualSizeBytes = fileBuffer ? fileBuffer.length : templateFile.size;
				const actualSizeMB = (actualSizeBytes / (1024 * 1024)).toFixed(2);
				const actualSizeKB = (actualSizeBytes / 1024).toFixed(2);
				console.error(`[Report Template API] Error de tamaño detectado. Archivo: ${actualSizeMB}MB (${actualSizeKB}KB), Límite esperado: 50MB`);
				console.error(`[Report Template API] Detalles: originalSize=${templateFile.size} bytes, bufferSize=${fileBuffer?.length || 'N/A'} bytes`);
				console.error(`[Report Template API] Error completo de Supabase:`, JSON.stringify(uploadError, null, 2));
				
				// Si el archivo es menor a 50MB, el problema puede ser:
				// 1. Límite del bucket no actualizado correctamente
				// 2. Límite a nivel de proyecto
				// 3. Caché de Supabase
				if (actualSizeBytes < maxSizeBytes) {
					// Intentar leer el límite del bucket una vez más para diagnóstico
					try {
						const { data: diagnosticBuckets } = await supabaseAdmin.storage.listBuckets();
						const diagnosticBucket = diagnosticBuckets?.find((b) => b.name === bucket);
						const diagnosticLimit = (diagnosticBucket as any)?.file_size_limit || (diagnosticBucket as any)?.fileSizeLimit;
						
						console.error(`[Report Template API] Diagnóstico del bucket:`, {
							bucketName: bucket,
							detectedLimit: diagnosticLimit,
							detectedLimitMB: diagnosticLimit ? `${(diagnosticLimit / (1024 * 1024)).toFixed(2)}MB` : 'no configurado',
							fileSizeBytes: actualSizeBytes,
							fileSizeMB: actualSizeMB,
							withinDetectedLimit: diagnosticLimit ? actualSizeBytes <= diagnosticLimit : 'desconocido'
						});
						
						return NextResponse.json({ 
							error: `El archivo (${actualSizeKB}KB) es menor a 50MB, pero Supabase Storage está rechazando la subida.`,
							errorCode: 'BUCKET_SIZE_LIMIT',
							fileSize: {
								bytes: actualSizeBytes,
								kb: parseFloat(actualSizeKB),
								mb: parseFloat(actualSizeMB)
							},
							bucketInfo: {
								detectedLimit: diagnosticLimit,
								detectedLimitMB: diagnosticLimit ? parseFloat((diagnosticLimit / (1024 * 1024)).toFixed(2)) : null
							},
							instructions: {
								title: 'Posibles causas y soluciones:',
								steps: [
									'1. Verifica en el dashboard de Supabase que el límite del bucket "report-templates" sea 50MB (52428800 bytes)',
									'2. Espera 5-10 minutos después de actualizar el límite (puede haber caché)',
									'3. Verifica en Settings > Usage que no hayas alcanzado el límite de almacenamiento del proyecto',
									'4. Verifica que no haya un límite a nivel de proyecto que sea menor',
									'5. Intenta subir el archivo nuevamente después de esperar unos minutos',
									'6. Si el problema persiste, contacta al soporte de Supabase'
								],
								note: 'El límite puede estar actualizado en el dashboard pero no reflejarse inmediatamente debido a caché. Espera unos minutos e intenta nuevamente.'
							}
						}, { status: 413 });
					} catch (diagErr) {
						console.error(`[Report Template API] Error en diagnóstico:`, diagErr);
						return NextResponse.json({ 
							error: `El archivo (${actualSizeKB}KB) es menor a 50MB, pero el bucket de almacenamiento tiene un límite más bajo configurado. Por favor, verifica el límite en el dashboard de Supabase y espera unos minutos si acabas de actualizarlo.` 
						}, { status: 413 });
					}
				} else {
					return NextResponse.json({ 
						error: `El archivo es demasiado grande. El tamaño máximo permitido es 50MB. Tu archivo tiene ${actualSizeMB}MB.` 
					}, { status: 413 });
				}
			}
			
			// Error genérico con más detalles en el log
			console.error('[Report Template API] Detalles del error de subida:', {
				message: errorMessage,
				statusCode,
				error: uploadError,
			});
			
			return NextResponse.json({ 
				error: `Error al subir archivo: ${errorMessage}. Por favor, verifica tu conexión e intenta nuevamente. Si el problema persiste, contacta al administrador.` 
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

			// Obtener datos existentes de la variante para preservar template_text
			const existingVariantData = existingVariants[variant] || {};

			// Actualizar la variante específica, preservando template_text
			existingVariants[variant] = {
				template_url: templateUrl,
				template_name: templateFile.name,
				font_family: existingVariantData.font_family || existingData.font_family || 'Arial',
				// IMPORTANTE: Preservar template_text si existe
				template_text: existingVariantData.template_text || null,
			};

			// Guardar estructura de múltiples variantes, preservando otros datos de la especialidad
			templatesBySpecialty[targetSpecialty] = {
				...existingData, // Preservar otros campos si existen
				variants: existingVariants,
			};
		} else {
			// Plantilla simple (compatibilidad hacia atrás o especialidad no obstetricia)
			const existingTemplateData = templatesBySpecialty[targetSpecialty] || {};
			
			// Preservar template_text y font_family si existen
			templatesBySpecialty[targetSpecialty] = {
				template_url: templateUrl,
				template_name: templateFile.name,
				font_family: existingTemplateData.font_family || 'Arial',
				// IMPORTANTE: Preservar template_text si existe
				template_text: existingTemplateData.template_text || null,
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
				// Eliminar solo el archivo Word de la plantilla, preservando template_text y otros datos
				const templateData = templatesBySpecialty[targetSpecialty];
				
				// Verificar si es una estructura de variantes (obstetricia)
				const isObstetricia = normalizeObstetricia(targetSpecialty);
				const hasVariants = templateData.variants || templateData.trimestre1 || templateData.trimestre2_3;
				
				if (templateData.template_url || (hasVariants && !isObstetricia)) {
					try {
						const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
						const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

						if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
							const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
								auth: { persistSession: false },
							});

							const bucket = 'report-templates';
							let filePath = '';

							// Obtener la URL del archivo a eliminar
							const urlToDelete = templateData.template_url;
							if (urlToDelete) {
								if (urlToDelete.includes(bucket)) {
									const parts = urlToDelete.split(`${bucket}/`);
									if (parts.length > 1) {
										filePath = parts[1].split('?')[0];
									}
								} else {
									filePath = urlToDelete.replace(/^\/+/, '');
								}

								if (filePath) {
									const { error: deleteError } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
									if (deleteError) {
										console.warn('[Report Template API] Error eliminando archivo de Storage:', deleteError);
									}
								}
							}
						}
					} catch (storageError) {
						console.warn('[Report Template API] Error eliminando archivo de Storage:', storageError);
					}
				}

				// IMPORTANTE: Preservar template_text y otros datos, solo eliminar template_url y template_name
				// Si tiene variantes (obstetricia), no eliminar la estructura completa
				if (hasVariants && isObstetricia) {
					// Para obstetricia con variantes, mantener la estructura pero limpiar solo la URL si existe
					// (esto no debería pasar aquí, pero por seguridad)
					if (templateData.template_url) {
						templatesBySpecialty[targetSpecialty] = {
							...templateData,
							template_url: null,
							template_name: null,
							// Preservar template_text, font_family, y variants
						};
					}
				} else {
					// Para plantillas simples, preservar template_text y font_family, solo eliminar URL y nombre
					templatesBySpecialty[targetSpecialty] = {
						template_url: null,
						template_name: null,
						template_text: templateData.template_text || null, // PRESERVAR template_text
						font_family: templateData.font_family || 'Arial', // PRESERVAR font_family
					};
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
