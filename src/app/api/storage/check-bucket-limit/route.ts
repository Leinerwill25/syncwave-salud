import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
	try {
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			return NextResponse.json({ 
				error: 'Configuración de Supabase no encontrada' 
			}, { status: 500 });
		}

		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false }
		});

		const { searchParams } = new URL(request.url);
		const bucketName = searchParams.get('bucket') || 'report-templates';

		// Listar buckets
		const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
		
		if (listError) {
			return NextResponse.json({ 
				error: 'Error al listar buckets',
				details: listError.message 
			}, { status: 500 });
		}

		const bucket = buckets?.find((b) => b.name === bucketName);

		if (!bucket) {
			return NextResponse.json({ 
				exists: false,
				bucket: bucketName,
				message: `El bucket "${bucketName}" no existe. Se creará automáticamente con límite de 50MB cuando se suba el primer archivo.`
			});
		}

		const currentLimit = (bucket as any)?.file_size_limit || (bucket as any)?.fileSizeLimit;
		const currentLimitMB = currentLimit ? (currentLimit / (1024 * 1024)).toFixed(2) : null;
		const desiredLimit = 52428800; // 50MB
		const needsUpdate = !currentLimit || currentLimit < desiredLimit;

		// Intentar actualizar si es necesario
		let updateAttempted = false;
		let updateSuccess = false;
		let updateError = null;

		if (needsUpdate) {
			updateAttempted = true;
			try {
				const { error: updateErr } = await supabaseAdmin.storage.updateBucket(bucketName, {
					public: bucket.public ?? false,
					fileSizeLimit: desiredLimit,
				});
				
				if (!updateErr) {
					updateSuccess = true;
				} else {
					updateError = updateErr.message || String(updateErr);
				}
			} catch (err: any) {
				updateError = err?.message || String(err);
			}
		}

		return NextResponse.json({
			exists: true,
			bucket: bucketName,
			currentLimit: currentLimit ? {
				bytes: currentLimit,
				mb: parseFloat(currentLimitMB || '0'),
				formatted: `${currentLimitMB}MB`
			} : null,
			desiredLimit: {
				bytes: desiredLimit,
				mb: 50,
				formatted: '50MB'
			},
			needsUpdate,
			updateAttempted,
			updateSuccess,
			updateError,
			instructions: needsUpdate && !updateSuccess ? {
				title: 'Actualización manual requerida',
				steps: [
					'1. Ve al dashboard de Supabase (https://supabase.com/dashboard)',
					`2. Selecciona tu proyecto`,
					'3. Ve a Storage > Buckets',
					`4. Haz clic en el bucket "${bucketName}"`,
					'5. Ve a la pestaña "Settings"',
					'6. Busca "File size limit" o "Límite de tamaño de archivo"',
					'7. Cambia el valor a 52428800 (50MB en bytes) o simplemente escribe "50MB"',
					'8. Guarda los cambios',
					'9. Intenta subir el archivo nuevamente'
				]
			} : null
		});
	} catch (error: any) {
		console.error('[Check Bucket Limit API] Error:', error);
		return NextResponse.json({ 
			error: 'Error al verificar el bucket',
			details: error?.message || String(error)
		}, { status: 500 });
	}
}

