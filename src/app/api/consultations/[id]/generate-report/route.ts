// app/api/consultations/[id]/generate-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { createClient } from '@supabase/supabase-js';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

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
				console.warn('[Generate Report API] Error leyendo cookies:', cookieErr);
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

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const doctorId = await getCurrentDoctorId(supabase, request);
		if (!doctorId) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		// Obtener datos de la consulta
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select(`
				id,
				patient_id,
				unregistered_patient_id,
				doctor_id,
				chief_complaint,
				diagnosis,
				notes,
				started_at,
				created_at,
				patient:patient_id(firstName, lastName, identifier, dob),
				doctor:doctor_id(name, email)
			`)
			.eq('id', id)
			.single();

		if (consultationError || !consultation) {
			return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
		}

		// Verificar que el médico sea el dueño de la consulta
		if (consultation.doctor_id !== doctorId) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		// Obtener contenido del informe del body
		const body = await request.json();
		const reportContent = body.content || '';

		console.log('[Generate Report API] Contenido recibido del frontend:', reportContent);
		console.log('[Generate Report API] Longitud del contenido:', reportContent.length);

		if (!reportContent.trim()) {
			return NextResponse.json({ error: 'El contenido del informe no puede estar vacío' }, { status: 400 });
		}

		// Obtener plantilla del médico
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('report_template_url, report_template_name')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError || !medicProfile?.report_template_url) {
			return NextResponse.json({ error: 'No se encontró plantilla de informe. Por favor, carga una plantilla primero.' }, { status: 400 });
		}

		// Crear cliente admin para descargar plantilla (bypass RLS)
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('[Generate Report API] SUPABASE_SERVICE_ROLE_KEY no configurado');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false }
		});

		// Descargar plantilla desde Supabase Storage
		const templateUrl = medicProfile.report_template_url;
		const bucket = 'report-templates';
		
		console.log('[Generate Report API] URL de plantilla:', templateUrl);
		console.log('[Generate Report API] Es URL HTTP?', templateUrl.startsWith('http://') || templateUrl.startsWith('https://'));
		
		let templateBuffer: Buffer;
		
		// Si la URL es una URL HTTP completa (URL firmada), descargar directamente con fetch
		if (templateUrl.startsWith('http://') || templateUrl.startsWith('https://')) {
			console.log('[Generate Report API] Descargando plantilla desde URL firmada...');
			try {
				const response = await fetch(templateUrl);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				const blob = await response.blob();
				const arrayBuffer = await blob.arrayBuffer();
				templateBuffer = Buffer.from(arrayBuffer);
				console.log('[Generate Report API] Plantilla descargada exitosamente, tamaño:', templateBuffer.length, 'bytes');
			} catch (fetchError: any) {
				console.error('[Generate Report API] Error descargando desde URL firmada:', fetchError);
				return NextResponse.json({ 
					error: 'Error al descargar plantilla. Verifica que la plantilla exista y que tengas permisos para acceder a ella.' 
				}, { status: 500 });
			}
		} else {
			// Si es un path, extraer el path correcto y usar el cliente admin
			let filePath = templateUrl;
			
			// Si es una URL firmada de Supabase Storage (path con /storage/v1/object/)
			if (templateUrl.includes('/storage/v1/object/')) {
				const urlParts = templateUrl.split('/storage/v1/object/');
				if (urlParts.length > 1) {
					const pathWithQuery = urlParts[1];
					const pathOnly = pathWithQuery.split('?')[0];
					
					// Remover "sign/" si existe
					let cleanPath = pathOnly;
					if (cleanPath.startsWith('sign/')) {
						cleanPath = cleanPath.substring(5);
					}
					
					// Remover el bucket del inicio
					if (cleanPath.startsWith(bucket + '/')) {
						filePath = cleanPath.substring(bucket.length + 1);
					} else {
						filePath = cleanPath;
					}
				}
			} else if (templateUrl.includes(bucket + '/')) {
				filePath = templateUrl.split(bucket + '/')[1].split('?')[0];
			} else if (templateUrl.startsWith('/')) {
				filePath = templateUrl.substring(1).split('?')[0];
			} else {
				filePath = templateUrl.split('?')[0];
			}
			
			// Decodificar URL encoding
			try {
				filePath = decodeURIComponent(filePath);
			} catch (e) {
				console.warn('[Generate Report API] Error decodificando path:', e);
			}

			console.log('[Generate Report API] Descargando plantilla desde path:', filePath);
			
			// Descargar archivo usando cliente admin
			const { data: templateData, error: downloadError } = await supabaseAdmin.storage
				.from(bucket)
				.download(filePath);

			if (downloadError || !templateData) {
				console.error('[Generate Report API] Error descargando plantilla:', downloadError);
				console.error('[Generate Report API] Path intentado:', filePath);
				return NextResponse.json({ error: 'Error al descargar plantilla. Verifica que la plantilla exista.' }, { status: 500 });
			}

			// Convertir Blob a Buffer
			const arrayBuffer = await templateData.arrayBuffer();
			templateBuffer = Buffer.from(arrayBuffer);
		}

		// Procesar plantilla con docxtemplater
		const zip = new PizZip(templateBuffer);
		
		// Configurar delimitadores personalizados para soportar {{variable}} en lugar de {variable}
		// Esto permite usar {{contenido}} en la plantilla de Word
		const doc = new Docxtemplater(zip, {
			paragraphLoop: true,
			linebreaks: true,
			delimiters: {
				start: '{{',
				end: '}}'
			}
		});

		// Obtener datos del paciente
		let patientName = 'Paciente no registrado';
		let patientId = 'N/A';
		if (consultation.patient_id && consultation.patient) {
			const patient = Array.isArray(consultation.patient) ? consultation.patient[0] : consultation.patient;
			patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Paciente';
			patientId = patient.identifier || 'N/A';
		} else if (consultation.unregistered_patient_id) {
			const { data: unregisteredPatient } = await supabase
				.from('unregisteredpatients')
				.select('first_name, last_name, identification')
				.eq('id', consultation.unregistered_patient_id)
				.single();
			
			if (unregisteredPatient) {
				patientName = `${unregisteredPatient.first_name || ''} ${unregisteredPatient.last_name || ''}`.trim() || 'Paciente no registrado';
				patientId = unregisteredPatient.identification || 'N/A';
			}
		}

		// Obtener datos del médico
		const doctor = Array.isArray(consultation.doctor) ? consultation.doctor[0] : consultation.doctor;
		const doctorName = doctor?.name || doctor?.email || 'Médico';

		// Preparar datos para la plantilla
		const consultationDate = consultation.started_at 
			? new Date(consultation.started_at).toLocaleDateString('es-ES', { 
				year: 'numeric', 
				month: 'long', 
				day: 'numeric' 
			})
			: consultation.created_at 
				? new Date(consultation.created_at).toLocaleDateString('es-ES', { 
					year: 'numeric', 
					month: 'long', 
					day: 'numeric' 
				})
				: new Date().toLocaleDateString('es-ES');

		// Preparar datos para la plantilla
		// Nota: Los nombres de las claves deben coincidir EXACTAMENTE con los marcadores en la plantilla Word
		// Por ejemplo, si en Word tienes {contenido}, aquí debe ser 'contenido'
		const templateDataObj: Record<string, string> = {
			contenido: reportContent,
			content: reportContent, // Variante en inglés por si acaso
			informe: reportContent, // Otra variante posible
			fecha: consultationDate,
			date: consultationDate, // Variante en inglés
			paciente: patientName,
			patient: patientName, // Variante en inglés
			medico: doctorName,
			doctor: doctorName, // Variante en inglés
			diagnostico: consultation.diagnosis || 'No especificado',
			diagnosis: consultation.diagnosis || 'No especificado', // Variante en inglés
			motivo: consultation.chief_complaint || 'No especificado',
			complaint: consultation.chief_complaint || 'No especificado', // Variante en inglés
			notas: consultation.notes || '',
			notes: consultation.notes || '', // Variante en inglés
		};

		console.log('[Generate Report API] Datos que se pasarán a la plantilla:', {
			contenido: reportContent.substring(0, 100) + (reportContent.length > 100 ? '...' : ''),
			contenido_completo_length: reportContent.length,
			fecha: consultationDate,
			paciente: patientName,
			medico: doctorName,
			diagnostico: consultation.diagnosis || 'No especificado',
			motivo: consultation.chief_complaint || 'No especificado',
			notas: consultation.notes || '',
		});
		console.log('[Generate Report API] Claves disponibles en templateDataObj:', Object.keys(templateDataObj));

		// Renderizar plantilla usando la nueva API de docxtemplater (v3.40+)
		try {
			doc.render(templateDataObj);
			console.log('[Generate Report API] Plantilla renderizada exitosamente');
		} catch (error: any) {
			console.error('[Generate Report API] Error renderizando plantilla:', error);
			console.error('[Generate Report API] Detalles del error:', {
				message: error.message,
				name: error.name,
				properties: error.properties,
			});
			return NextResponse.json({ 
				error: 'Error al procesar plantilla. Verifica que los marcadores en la plantilla sean correctos.',
				detail: error.message 
			}, { status: 500 });
		}

		// Generar documento final
		const generatedBuffer = doc.getZip().generate({
			type: 'nodebuffer',
			compression: 'DEFLATE',
		});

		// Subir informe generado a Supabase Storage usando cliente admin
		const reportsBucket = 'consultation-reports';
		const reportFileName = `${id}/${Date.now()}-informe-${id}.docx`;

		// Subir informe usando cliente admin (bypass RLS)
		const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
			.from(reportsBucket)
			.upload(reportFileName, generatedBuffer, {
				contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				upsert: false,
			});

		if (uploadError) {
			console.error('[Generate Report API] Error subiendo informe:', uploadError);
			const statusCode = (uploadError as any)?.statusCode || (uploadError as any)?.status;
			const errorMessage = uploadError.message || String(uploadError);
			
			// Si el error es porque el bucket no existe (404), informar al usuario
			if (statusCode === '404' || statusCode === 404 || errorMessage.includes('not found') || errorMessage.includes('Bucket not found')) {
				return NextResponse.json({ 
					error: 'El bucket "consultation-reports" no está configurado. Por favor, crea el bucket en Supabase Storage Dashboard o contacta al administrador.' 
				}, { status: 500 });
			}
			return NextResponse.json({ error: 'Error al guardar informe' }, { status: 500 });
		}

		// Obtener URL del informe usando cliente admin
		const { data: urlData } = await supabaseAdmin.storage
			.from(reportsBucket)
			.createSignedUrl(reportFileName, 31536000); // 1 año de validez

		const reportUrl = urlData?.signedUrl || `/${reportsBucket}/${reportFileName}`;

		// Actualizar consulta con URL del informe
		const { error: updateError } = await supabase
			.from('consultation')
			.update({ report_url: reportUrl })
			.eq('id', id);

		if (updateError) {
			console.error('[Generate Report API] Error actualizando consulta:', updateError);
			// No fallar, el informe ya está generado
		}

		return NextResponse.json({
			success: true,
			report_url: reportUrl,
			message: 'Informe generado exitosamente',
		});
	} catch (err) {
		console.error('[Generate Report API] Error:', err);
		return NextResponse.json({ 
			error: 'Error interno al generar informe',
			detail: err instanceof Error ? err.message : String(err)
		}, { status: 500 });
	}
}

