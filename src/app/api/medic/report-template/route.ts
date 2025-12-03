// app/api/medic/report-template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { createClient } from '@supabase/supabase-js';

async function getCurrentDoctorId(supabase: ReturnType<typeof createSupabaseServerClient>['supabase'], request?: Request): Promise<string | null> {
	// Intento primario: obtener usuario por cookie (session)
	let { data: authData, error: authError } = await supabase.auth.getUser();
	
	// Si falla, intentar con token Bearer del header
	if (authError || !authData?.user) {
		if (request) {
			const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
			const maybeToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
			
			if (maybeToken) {
				const { data: authData2, error: authError2 } = await supabase.auth.getUser(maybeToken);
				if (!authError2 && authData2?.user) {
					authData = authData2;
					authError = null;
				}
			}
		}
		
		// Si aún falla, intentar restaurar desde cookies
		if (authError || !authData?.user) {
			try {
				const cookieStore = await cookies();
				const accessToken = cookieStore.get('sb-access-token')?.value ?? null;
				
				if (accessToken) {
					const { data: authData3, error: authError3 } = await supabase.auth.getUser(accessToken);
					if (!authError3 && authData3?.user) {
						authData = authData3;
						authError = null;
					}
				}
			} catch (cookieErr) {
				console.warn('[Report Template API] Error leyendo cookies:', cookieErr);
			}
		}
	}
	
	if (authError || !authData?.user) {
		return null;
	}

	const { data: appUser, error: userError } = await supabase
		.from('User')
		.select('id, role')
		.eq('authId', authData.user.id)
		.maybeSingle();

	if (userError || !appUser || appUser.role !== 'MEDICO') {
		return null;
	}

	return appUser.id;
}

export async function GET(request: Request) {
	try {
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const doctorId = await getCurrentDoctorId(supabase, request);
		if (!doctorId) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		// Obtener plantilla del médico desde medic_profile
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('report_template_url, report_template_name')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError) {
			console.error('[Report Template API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener plantilla' }, { status: 500 });
		}

		return NextResponse.json({
			template_url: medicProfile?.report_template_url || null,
			template_name: medicProfile?.report_template_name || null,
		});
	} catch (err) {
		console.error('[Report Template API] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const doctorId = await getCurrentDoctorId(supabase, request);
		if (!doctorId) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		const formData = await request.formData();
		const templateFile = formData.get('template') as File | null;

		if (!templateFile) {
			return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
		}

		// Validar solo la extensión del archivo (.docx o .doc)
		// No validamos el contenido interno, solo que sea un archivo Word válido
		const validExtensions = ['.docx', '.doc'];
		const fileName = templateFile.name.toLowerCase();
		const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

		if (!validExtensions.includes(fileExtension)) {
			return NextResponse.json({ error: 'Formato de archivo no válido. Solo se permiten archivos Word (.docx, .doc)' }, { status: 400 });
		}

		// Validar tamaño (máximo 50MB - límite global del proyecto)
		// Esto permite plantillas con imágenes, encabezados, y mucho contenido
		const maxSizeBytes = 50 * 1024 * 1024; // 50MB
		if (templateFile.size > maxSizeBytes) {
			return NextResponse.json({ 
				error: `El archivo es demasiado grande. Máximo ${maxSizeBytes / (1024 * 1024)}MB` 
			}, { status: 400 });
		}

		// No validamos el contenido interno de la plantilla
		// La plantilla puede tener cualquier contenido: encabezados, imágenes, texto, etc.
		// Solo se requiere que tenga los marcadores {{variable}} necesarios

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
		
		// Sanitizar el nombre del archivo para evitar caracteres inválidos en Supabase Storage
		// Supabase Storage solo acepta: letras, números, guiones, guiones bajos, puntos y barras
		// Reemplazar todos los caracteres no válidos con guión bajo
		let sanitizedFileName = templateFile.name
			.normalize('NFD') // Normalizar caracteres Unicode (é -> e + ´)
			.replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos
			.replace(/[^a-zA-Z0-9._-]/g, '_') // Reemplazar caracteres especiales con guión bajo
			.replace(/\s+/g, '_') // Reemplazar espacios con guión bajo
			.replace(/_{2,}/g, '_') // Reemplazar múltiples guiones bajos con uno solo
			.replace(/^_+|_+$/g, ''); // Eliminar guiones bajos al inicio y final
		
		// Asegurar que el nombre no esté vacío
		if (!sanitizedFileName || sanitizedFileName.length === 0) {
			sanitizedFileName = `template_${Date.now()}${fileExtension}`;
		}
		
		// Asegurar que tenga la extensión correcta
		if (!sanitizedFileName.endsWith(fileExtension)) {
			sanitizedFileName = sanitizedFileName.replace(/\.[^.]+$/, '') + fileExtension;
		}
		
		const fileNameUnique = `${doctorId}/${Date.now()}-${sanitizedFileName}`;
		
		console.log('[Report Template API] Nombre original:', templateFile.name);
		console.log('[Report Template API] Nombre sanitizado:', sanitizedFileName);
		console.log('[Report Template API] Ruta completa:', fileNameUnique);

		// Convertir File a Buffer con manejo robusto de errores
		// Timeout ajustado según el tamaño del archivo (más tiempo para archivos grandes)
		let fileBuffer: Buffer;
		try {
			// Calcular timeout dinámico: 1 segundo por MB, mínimo 30 segundos, máximo 120 segundos
			const fileSizeMB = templateFile.size / (1024 * 1024);
			const timeoutSeconds = Math.min(Math.max(fileSizeMB * 1000, 30000), 120000);
			
			console.log(`[Report Template API] Procesando archivo de ${fileSizeMB.toFixed(2)}MB con timeout de ${timeoutSeconds / 1000}s`);
			
			// Usar arrayBuffer con timeout dinámico
			const arrayBuffer = await Promise.race([
				templateFile.arrayBuffer(),
				new Promise<never>((_, reject) => 
					setTimeout(() => reject(new Error('Timeout al leer el archivo')), timeoutSeconds)
				)
			]);
			fileBuffer = Buffer.from(arrayBuffer);
			console.log(`[Report Template API] Archivo convertido exitosamente, tamaño: ${fileBuffer.length} bytes`);
		} catch (conversionError: any) {
			console.error('[Report Template API] Error convirtiendo archivo:', conversionError);
			return NextResponse.json({ 
				error: conversionError?.message?.includes('Timeout') 
					? 'El archivo tardó demasiado en procesarse. Intenta con un archivo más pequeño o verifica tu conexión.' 
					: 'Error al procesar el archivo. Por favor, verifica que el archivo no esté corrupto e intenta nuevamente.' 
			}, { status: 500 });
		}

		// Subir archivo con cliente admin (bypass RLS) y reintentos
		let uploadData: any = null;
		let uploadError: any = null;
		const maxRetries = 2;
		let retryCount = 0;

		while (retryCount <= maxRetries && !uploadData) {
			try {
				// Determinar el content type basado en la extensión del archivo
				// Esto evita problemas con detección incorrecta de MIME type
				const contentType = fileExtension === '.docx' 
					? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
					: 'application/msword';

				const uploadPromise = supabaseAdmin.storage
					.from(bucket)
					.upload(fileNameUnique, fileBuffer, {
						contentType: contentType,
						upsert: false,
					});

				// Timeout dinámico para subida: más tiempo para archivos grandes
				const fileSizeMB = fileBuffer.length / (1024 * 1024);
				const uploadTimeout = Math.min(Math.max(fileSizeMB * 2000, 60000), 180000); // 2s por MB, min 60s, max 180s
				
				console.log(`[Report Template API] Subiendo archivo con timeout de ${uploadTimeout / 1000}s`);
				
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
					await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos antes de reintentar
				}
			}
		}

		if (uploadError || !uploadData) {
			console.error('[Report Template API] Error subiendo archivo después de reintentos:', uploadError);
			const errorMessage = uploadError?.message || String(uploadError);
			const statusCode = (uploadError as any)?.statusCode || (uploadError as any)?.status;
			
			// Detectar si el error es por bucket no existente
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

		// Obtener URL del archivo usando cliente admin
		const filePath = uploadData.path;

		// Obtener URL pública o firmada
		const { data: urlData } = await supabaseAdmin.storage
			.from(bucket)
			.createSignedUrl(filePath, 31536000); // 1 año de validez

		const templateUrl = urlData?.signedUrl || `/${bucket}/${filePath}`;

		// Actualizar o crear registro en medic_profile
		const { data: existingProfile } = await supabase
			.from('medic_profile')
			.select('id')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (existingProfile) {
			// Actualizar perfil existente
			const { error: updateError } = await supabase
				.from('medic_profile')
				.update({
					report_template_url: templateUrl,
					report_template_name: templateFile.name,
				})
				.eq('doctor_id', doctorId);

			if (updateError) {
				console.error('[Report Template API] Error actualizando perfil:', updateError);
				// Intentar eliminar el archivo subido
				await supabaseAdmin.storage.from(bucket).remove([filePath]);
				return NextResponse.json({ error: 'Error al guardar plantilla' }, { status: 500 });
			}
		} else {
			// Crear nuevo perfil
			const { error: insertError } = await supabase
				.from('medic_profile')
				.insert({
					doctor_id: doctorId,
					report_template_url: templateUrl,
					report_template_name: templateFile.name,
				});

			if (insertError) {
				console.error('[Report Template API] Error creando perfil:', insertError);
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
		console.error('[Report Template API] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}

