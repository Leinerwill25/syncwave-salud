// app/api/successive-consultations/upload-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiRequireRole } from '@/lib/auth-guards';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
	auth: { persistSession: false },
});

export async function POST(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const formData = await req.formData();
		const file = formData.get('file') as File;
		const fileType = formData.get('fileType') as string; // 'image', 'xray', 'document'
		const successiveConsultationId = formData.get('successiveConsultationId') as string;

		if (!file) {
			return NextResponse.json({ error: 'No se proporcionó un archivo' }, { status: 400 });
		}

		if (!fileType || !['image', 'xray', 'document'].includes(fileType)) {
			return NextResponse.json({ error: 'Tipo de archivo inválido. Debe ser: image, xray o document' }, { status: 400 });
		}

		// Validar tamaño del archivo (máximo 10MB)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			return NextResponse.json({ error: 'El archivo es demasiado grande. Máximo 10MB' }, { status: 400 });
		}

		// Determinar el bucket según el tipo de archivo
		const bucketName = 'successive-consultations';

		// Verificar/crear bucket
		try {
			const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
			if (listError) {
				console.warn('Error listando buckets:', listError);
			} else {
				const bucketExists = buckets?.some((b) => b.name === bucketName);
				if (!bucketExists) {
					const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
						public: true,
						fileSizeLimit: maxSize,
					});
					if (createError) {
						console.error(`Error creando bucket "${bucketName}":`, createError);
					}
				}
			}
		} catch (bucketErr) {
			console.error('Error verificando/creando bucket:', bucketErr);
		}

		// Generar nombre único para el archivo
		const fileExt = file.name.split('.').pop();
		const fileName = `${user.userId}/${successiveConsultationId || 'temp'}/${fileType}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

		// Convertir File a ArrayBuffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Subir archivo a Supabase Storage
		const { data: uploadData, error: uploadError } = await supabaseAdmin.storage.from(bucketName).upload(fileName, buffer, {
			contentType: file.type,
			upsert: false,
		});

		if (uploadError) {
			console.error('Error subiendo archivo:', uploadError);
			return NextResponse.json({ error: 'Error al subir archivo', detail: uploadError.message }, { status: 500 });
		}

		// Obtener URL pública del archivo
		const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName);

		return NextResponse.json(
			{
				success: true,
				url: urlData.publicUrl,
				path: fileName,
				fileName: file.name,
				fileType,
				size: file.size,
			},
			{ status: 200 }
		);
	} catch (error: any) {
		console.error('Error en POST /api/successive-consultations/upload-file:', error);
		return NextResponse.json({ error: 'Error interno del servidor', detail: error.message }, { status: 500 });
	}
}

// DELETE: Eliminar un archivo
export async function DELETE(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const path = searchParams.get('path');

		if (!path) {
			return NextResponse.json({ error: 'Path del archivo no proporcionado' }, { status: 400 });
		}

		const bucketName = 'successive-consultations';

		// Verificar que el archivo pertenece al usuario
		if (!path.startsWith(`${user.userId}/`)) {
			return NextResponse.json({ error: 'No autorizado para eliminar este archivo' }, { status: 403 });
		}

		const { error: deleteError } = await supabaseAdmin.storage.from(bucketName).remove([path]);

		if (deleteError) {
			console.error('Error eliminando archivo:', deleteError);
			return NextResponse.json({ error: 'Error al eliminar archivo', detail: deleteError.message }, { status: 500 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error: any) {
		console.error('Error en DELETE /api/successive-consultations/upload-file:', error);
		return NextResponse.json({ error: 'Error interno del servidor', detail: error.message }, { status: 500 });
	}
}

