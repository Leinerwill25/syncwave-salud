// app/api/medic/report-template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';

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

		// Validar tipo de archivo
		const validTypes = [
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/msword',
		];
		const validExtensions = ['.docx', '.doc'];
		const fileName = templateFile.name.toLowerCase();
		const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

		if (!validExtensions.includes(fileExtension) && !validTypes.includes(templateFile.type)) {
			return NextResponse.json({ error: 'Formato de archivo no válido. Solo se permiten archivos Word (.docx, .doc)' }, { status: 400 });
		}

		// Validar tamaño (máximo 10MB)
		if (templateFile.size > 10 * 1024 * 1024) {
			return NextResponse.json({ error: 'El archivo es demasiado grande. Máximo 10MB' }, { status: 400 });
		}

		// Subir archivo a Supabase Storage
		const bucket = 'report-templates';
		const fileExt = fileExtension;
		const fileNameUnique = `${doctorId}/${Date.now()}-${templateFile.name}`;

		// Verificar si el bucket existe, si no, crearlo
		try {
			const { data: buckets, error: listError } = await supabase.storage.listBuckets();
			if (listError) {
				console.warn('Error listando buckets:', listError);
			} else {
				const bucketExists = buckets?.some((b) => b.name === bucket);
				if (!bucketExists) {
					console.log(`Bucket "${bucket}" no existe, creándolo...`);
					const { error: createError } = await supabase.storage.createBucket(bucket, {
						public: false,
						fileSizeLimit: 10485760, // 10MB
					});
					if (createError) {
						console.error(`Error creando bucket "${bucket}":`, createError);
					}
				}
			}
		} catch (bucketErr) {
			console.error('Error verificando/creando bucket:', bucketErr);
		}

		// Convertir File a ArrayBuffer
		const arrayBuffer = await templateFile.arrayBuffer();
		const fileBuffer = Buffer.from(arrayBuffer);

		// Subir archivo
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from(bucket)
			.upload(fileNameUnique, fileBuffer, {
				contentType: templateFile.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				upsert: false,
			});

		if (uploadError) {
			console.error('[Report Template API] Error subiendo archivo:', uploadError);
			return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 });
		}

		// Obtener URL del archivo (necesitamos usar el cliente admin para obtener URL privada)
		// Por ahora, guardamos la ruta y construimos la URL cuando sea necesario
		const filePath = uploadData.path;

		// Obtener URL pública o firmada
		const { data: urlData } = await supabase.storage
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
				await supabase.storage.from(bucket).remove([filePath]);
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
				await supabase.storage.from(bucket).remove([filePath]);
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

