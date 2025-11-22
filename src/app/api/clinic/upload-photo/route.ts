// API endpoint to upload clinic photos to Supabase Storage
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-guards';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
	try {
		const authenticatedUser = await getAuthenticatedUser();
		
		if (!authenticatedUser) {
			return NextResponse.json({ error: 'Usuario no autenticado.' }, { status: 401 });
		}

		const orgId = authenticatedUser.organizationId;
		if (!orgId) {
			return NextResponse.json({ error: 'El usuario no está asignado a una organización.' }, { status: 404 });
		}

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('Supabase service role client not configured');
			return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
		}

		// Usar cliente admin para tener permisos de escritura en Storage
		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		const formData = await req.formData();
		const file = formData.get('file') as File;
		const photoType = formData.get('photo_type') as string; // 'profile' or 'gallery'

		if (!file) {
			return NextResponse.json({ error: 'Archivo es requerido' }, { status: 400 });
		}

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
				console.log(`[Clinic Upload Photo] Tipo MIME corregido de "${file.type}" a "${fileType}" para archivo ${file.name}`);
			} else {
				return NextResponse.json({ 
					error: `Tipo de archivo no soportado. Extensiones permitidas: ${Object.keys(mimeTypeMap).join(', ')}` 
				}, { status: 400 });
			}
		}

		// Validar tipo de archivo
		if (!fileType.startsWith('image/')) {
			return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
		}

		// Validar tamaño (máximo 5MB)
		if (file.size > 5 * 1024 * 1024) {
			return NextResponse.json({ error: 'La imagen es muy grande. Máximo 5MB' }, { status: 400 });
		}

		// Generate unique file path con extensión correcta
		const fileExtension = fileExt || 'jpg';
		const timestamp = Date.now();
		const randomStr = Math.random().toString(36).substring(7);
		const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
		const filePath = `clinic-photos/${orgId}/${photoType || 'gallery'}/${timestamp}-${randomStr}-${safeFileName}`;

		// Convert file to buffer
		const arrayBuffer = await file.arrayBuffer();
		let uploadBody: any;
		if (typeof Buffer !== 'undefined') {
			uploadBody = Buffer.from(arrayBuffer);
		} else {
			uploadBody = new Uint8Array(arrayBuffer);
		}

		// Determinar content type para el upload
		const contentType = fileType;

		// Verificar que el bucket existe, si no, intentar crearlo
		const bucketName = 'clinic-photos';
		const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
		
		if (!listError && buckets) {
			const bucketExists = buckets.some(b => b.name === bucketName);
			if (!bucketExists) {
				// Intentar crear el bucket sin restricciones de MIME types (validamos en el código)
				const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
					public: true,
					fileSizeLimit: 5242880, // 5MB
					// No especificar allowedMimeTypes para evitar problemas con detección incorrecta de MIME types
				});
				
				if (createError) {
					console.error('[Clinic Upload Photo] Error creando bucket:', createError);
					return NextResponse.json({ 
						error: `El bucket "${bucketName}" no existe y no se pudo crear. Por favor, créalo manualmente en Supabase Storage con permisos públicos.` 
					}, { status: 500 });
				}
			} else {
				// El bucket existe, intentar actualizar para remover restricciones de MIME types si es posible
				// Esto ayuda si el bucket fue creado con restricciones que causan problemas
				try {
					// Obtener la configuración actual del bucket para preservar otras propiedades
					const existingBucket = buckets.find(b => b.name === bucketName);
					await supabaseAdmin.storage.updateBucket(bucketName, {
						public: existingBucket?.public ?? true, // Preservar o establecer como público
						allowedMimeTypes: null, // Remover restricciones de MIME types
					});
					console.log('[Clinic Upload Photo] Política del bucket actualizada para remover restricciones de MIME types');
				} catch (updateError: any) {
					// Si no se puede actualizar, continuar de todas formas
					console.warn('[Clinic Upload Photo] No se pudo actualizar la política del bucket (puede requerir permisos adicionales):', updateError?.message);
				}
			}
		}

		// Upload to Supabase Storage con content type explícito
		const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
			.from(bucketName)
			.upload(filePath, uploadBody, {
				cacheControl: '3600',
				upsert: false,
				contentType: contentType,
			});

		if (uploadError) {
			console.error('[Clinic Upload Photo] Error uploading to storage:', uploadError);
			// Si el bucket no existe, dar un mensaje más claro
			if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
				return NextResponse.json({ 
					error: `El bucket "${bucketName}" no existe en Supabase Storage. Por favor, créalo en la configuración de Storage con permisos públicos.` 
				}, { status: 500 });
			}
			// Si es un error de MIME type no soportado
			if (uploadError.message?.includes('mime type') && uploadError.message?.includes('not supported')) {
				return NextResponse.json({ 
					error: `El bucket tiene restricciones de tipo MIME. Por favor, actualiza la política del bucket "${bucketName}" en Supabase Storage para permitir tipos de imagen, o remueve las restricciones de MIME types. El archivo es una imagen válida (${contentType}).` 
				}, { status: 400 });
			}
			// Si es un error de permisos
			if (uploadError.message?.includes('permission') || uploadError.message?.includes('unauthorized')) {
				return NextResponse.json({ 
					error: 'No tienes permisos para subir archivos. Verifica la configuración de Storage.' 
				}, { status: 403 });
			}
			return NextResponse.json({ 
				error: `Error al subir archivo: ${uploadError.message || 'Error desconocido'}` 
			}, { status: 500 });
		}

		if (!uploadData) {
			return NextResponse.json({ error: 'No se recibieron datos del upload' }, { status: 500 });
		}

		// Get public URL
		const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);

		if (!urlData?.publicUrl) {
			console.error('[Clinic Upload Photo] No se pudo obtener publicUrl');
			return NextResponse.json({ error: 'Error al obtener URL pública de la imagen' }, { status: 500 });
		}

		return NextResponse.json(
			{
				path: uploadData.path,
				url: urlData.publicUrl,
				name: file.name,
			},
			{ status: 200 }
		);
	} catch (error: any) {
		console.error('❌ Error POST /clinic/upload-photo:', error?.message ?? error);
		return NextResponse.json({ 
			error: error?.message ?? 'Error interno al procesar la imagen' 
		}, { status: 500 });
	}
}

