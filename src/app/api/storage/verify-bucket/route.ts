// API endpoint para verificar el estado del bucket prescriptions
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
	console.error('Missing Supabase env vars');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
	auth: { persistSession: false },
});

export async function GET() {
	try {
		const bucketName = 'prescriptions';

		// 1. Listar todos los buckets
		const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

		if (listError) {
			return NextResponse.json(
				{
					error: 'Error listando buckets',
					details: listError.message,
				},
				{ status: 500 }
			);
		}

		// 2. Buscar el bucket prescriptions
		const prescriptionsBucket = buckets?.find((b) => b.name === bucketName);

		if (!prescriptionsBucket) {
			return NextResponse.json(
				{
					exists: false,
					message: `El bucket "${bucketName}" no existe. Se debe crear.`,
					buckets: buckets?.map((b) => ({ name: b.name, public: b.public })),
				},
				{ status: 404 }
			);
		}

		// 3. Listar algunos archivos del bucket para verificar que es accesible
		const { data: files, error: filesError } = await supabaseAdmin.storage
			.from(bucketName)
			.list('', {
				limit: 10,
				offset: 0,
				sortBy: { column: 'created_at', order: 'desc' },
			});

		// 4. Obtener información del bucket
		const bucketInfo = {
			name: prescriptionsBucket.name,
			public: prescriptionsBucket.public,
			file_size_limit: (prescriptionsBucket as any).file_size_limit ?? (prescriptionsBucket as any).fileSizeLimit ?? null,
			allowed_mime_types: (prescriptionsBucket as any).allowed_mime_types ?? (prescriptionsBucket as any).allowedMimeTypes ?? null,
			created_at: prescriptionsBucket.created_at,
			updated_at: prescriptionsBucket.updated_at,
		};

		return NextResponse.json({
			exists: true,
			bucket: bucketInfo,
			fileCount: files?.length || 0,
			sampleFiles: files?.map((f) => ({
				name: f.name,
				size: (f as any).size ?? (f as any).metadata?.size ?? null,
				updated_at: f.updated_at,
			})),
			error: filesError ? filesError.message : null,
			message: prescriptionsBucket.public
				? '✅ El bucket es público - las URLs deberían funcionar'
				: '⚠️ El bucket NO es público - las URLs no serán accesibles sin autenticación',
		});
	} catch (err: any) {
		return NextResponse.json(
			{
				error: 'Error verificando bucket',
				details: err.message,
			},
			{ status: 500 }
		);
	}
}

