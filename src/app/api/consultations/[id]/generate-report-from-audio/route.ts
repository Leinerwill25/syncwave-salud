// app/api/consultations/[id]/generate-report-from-audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

/**
 * Endpoint para generar informe médico desde audio usando n8n
 * 
 * Flujo:
 * 1. Recibe audio (formato web - webm, mp4, etc.)
 * 2. Convierte a formato compatible (mp3)
 * 3. Envía a n8n webhook
 * 4. n8n procesa: transcripción Groq -> limpieza -> análisis -> generación informe
 * 5. Retorna URL del informe generado
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		
		if (!id) {
			return NextResponse.json({ error: 'ID de consulta no proporcionado' }, { status: 400 });
		}

		// Verificar autenticación y rol PRIMERO (esto restaura la sesión si es necesario)
		const authCheck = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authCheck.response) {
			return authCheck.response;
		}

		const user = authCheck.user;
		if (!user) {
			return NextResponse.json({ error: 'No se pudo identificar al médico' }, { status: 401 });
		}

		// Usar userId como doctorId (el userId es el id de la tabla user, que es lo que se guarda en consultation.doctor_id)
		const doctorId = user.userId;

		// Crear cliente de Supabase DESPUÉS de la autenticación (esto asegura que la sesión esté activa)
		const supabase = await createSupabaseServerClient();

		// Obtener datos del formulario
		const formData = await request.formData();
		const audioFile = formData.get('audio') as File;
		const reportType = formData.get('reportType') as string || 'gynecology';
		const specialty = formData.get('specialty') as string || '';

		if (!audioFile) {
			return NextResponse.json({ error: 'No se proporcionó archivo de audio' }, { status: 400 });
		}

		// Validar que es un archivo de audio
		const validAudioTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'video/webm', 'video/mp4'];
		const fileExtension = audioFile.name.split('.').pop()?.toLowerCase();
		const validExtensions = ['webm', 'mp4', 'mp3', 'wav', 'ogg', 'm4a'];
		
		if (!validAudioTypes.includes(audioFile.type) && !validExtensions.includes(fileExtension || '')) {
			return NextResponse.json(
				{ error: 'Formato de audio no soportado. Use: webm, mp4, mp3, wav u ogg' },
				{ status: 400 }
			);
		}

		// Verificar sesión antes de consultar (necesario para RLS)
		const { data: sessionCheck } = await supabase.auth.getSession();
		console.debug('[Audio Report] Sesión activa antes de consultar:', !!sessionCheck?.session, 'doctorId:', doctorId);

		// Obtener consulta
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select('*, patient_id, unregistered_patient_id, doctor_id, organization_id')
			.eq('id', id)
			.maybeSingle();

		if (consultationError) {
			console.error('[Audio Report] Error al buscar consulta:', consultationError);
			return NextResponse.json(
				{ error: 'Error al buscar consulta', detail: consultationError.message },
				{ status: 500 }
			);
		}

		if (!consultation) {
			console.warn('[Audio Report] Consulta no encontrada:', id, 'doctorId:', doctorId);
			return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
		}

		// Verificar que el médico es el dueño de la consulta
		if (consultation.doctor_id !== doctorId) {
			return NextResponse.json({ error: 'No tienes permisos para esta consulta' }, { status: 403 });
		}

		// Obtener perfil del médico para la plantilla
		const { data: medicProfile } = await supabase
			.from('medic_profile')
			.select('report_template_url, report_template_name, report_templates_by_specialty, specialty, private_specialty')
			.eq('doctor_id', doctorId)
			.maybeSingle();

        // Obtener configuración del informe genérico (texto, colores, etc.)
        const { data: genericConfig } = await supabase
            .from('medical_report_templates')
            .select('*')
            .eq('user_id', doctorId)
            .maybeSingle();

		// Obtener datos del paciente
		let patientData: any = null;
		if (consultation.patient_id) {
			const { data } = await supabase
				.from('patient')
				.select('id, firstName, lastName, dob, gender, identifier')
				.eq('id', consultation.patient_id)
				.maybeSingle();
			patientData = data;
		} else if (consultation.unregistered_patient_id) {
			const { data } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, birth_date, sex, identification')
				.eq('id', consultation.unregistered_patient_id)
				.maybeSingle();
			patientData = data;
		}

		// Convertir audio a Buffer
		const arrayBuffer = await audioFile.arrayBuffer();
		const audioBuffer = Buffer.from(arrayBuffer);

		// Subir audio temporalmente a Supabase Storage para que n8n lo procese
		const audioBucket = 'temp-audio';
		const audioFileName = `${id}/${Date.now()}-${audioFile.name}`;

		// Crear cliente admin para subir archivo
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const { createClient } = await import('@supabase/supabase-js');
		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		// Subir audio
		const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
			.from(audioBucket)
			.upload(audioFileName, audioBuffer, {
				contentType: audioFile.type,
				upsert: false,
			});

		if (uploadError) {
			console.error('[Audio Report] Error subiendo audio:', uploadError);
			return NextResponse.json({ error: 'Error al subir audio' }, { status: 500 });
		}

		// Obtener URL pública del audio
		const { data: { publicUrl } } = supabaseAdmin.storage
			.from(audioBucket)
			.getPublicUrl(audioFileName);

		// Obtener URL del webhook de n8n desde variables de entorno
		const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/generate-report-from-audio';
		const GROQ_API_KEY = process.env.API_GROQ || process.env.GROQ_API_KEY;
		const N8N_API_KEY = process.env.N8N_API_KEY || 'change-this-secret-key';

		if (!GROQ_API_KEY) {
			return NextResponse.json({ error: 'API de Groq no configurada' }, { status: 500 });
		}

		// Obtener URLs de la aplicación
		const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

		// Preparar datos para n8n - Incluir TODAS las variables necesarias para evitar usar Environment Variables premium
		const n8nPayload = {
			audioUrl: publicUrl,
			audioFileName: audioFile.name,
			audioType: audioFile.type,
			consultationId: id,
			doctorId: doctorId,
			reportType: reportType,
			specialty: specialty || medicProfile?.specialty?.[0] || '',
			patientData: patientData,
			consultationData: {
				vitals: consultation.vitals || {},
				diagnosis: consultation.diagnosis || '',
				chief_complaint: consultation.chief_complaint || '',
				notes: consultation.notes || '',
			},
			medicProfile: {
				report_template_url: medicProfile?.report_template_url || null,
				report_template_name: medicProfile?.report_template_name || null,
				report_templates_by_specialty: medicProfile?.report_templates_by_specialty || null,
			},
            genericConfig: genericConfig || null,
			// Variables de configuración (pasar desde Next.js para evitar usar Environment Variables premium)
			groqApiKey: GROQ_API_KEY,
			n8nApiKey: N8N_API_KEY,
			nextAppUrl: NEXT_PUBLIC_APP_URL,
			supabaseUrl: SUPABASE_URL,
			supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
			callbackUrl: `${NEXT_PUBLIC_APP_URL}/api/n8n/callback/report-generated`,
		};

		// Enviar a n8n webhook
		console.log('[Audio Report] Enviando a n8n webhook:', N8N_WEBHOOK_URL);
		
		// Timeout más largo para procesamiento de audio (puede tardar varios minutos)
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutos
		
		let n8nResponse: Response;
		try {
			n8nResponse = await fetch(N8N_WEBHOOK_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(n8nPayload),
				signal: controller.signal,
			});
		} catch (fetchError: any) {
			clearTimeout(timeoutId);
			if (fetchError.name === 'AbortError') {
				console.error('[Audio Report] Timeout esperando respuesta de n8n (>5 minutos)');
				await supabaseAdmin.storage.from(audioBucket).remove([audioFileName]).catch(console.error);
				return NextResponse.json(
					{ error: 'El procesamiento de audio está tomando más tiempo del esperado. Por favor, intenta nuevamente.' },
					{ status: 504 }
				);
			}
			console.error('[Audio Report] Error en fetch a n8n:', fetchError);
			await supabaseAdmin.storage.from(audioBucket).remove([audioFileName]).catch(console.error);
			return NextResponse.json(
				{ error: 'Error al comunicarse con n8n', detail: fetchError.message },
				{ status: 500 }
			);
		}
		clearTimeout(timeoutId);

		if (!n8nResponse.ok) {
			const errorText = await n8nResponse.text();
			console.error('[Audio Report] Error en n8n:', errorText);
			
			// Limpiar audio temporal
			await supabaseAdmin.storage.from(audioBucket).remove([audioFileName]);
			
			return NextResponse.json(
				{ error: 'Error al procesar audio en n8n', detail: errorText },
				{ status: 500 }
			);
		}

		// Intentar parsear la respuesta como JSON directamente
		let n8nResult: any;
		try {
			// Clonar la respuesta para poder leerla múltiples veces si es necesario
			const responseClone = n8nResponse.clone();
			
			// Primero intentar como JSON
			const contentType = n8nResponse.headers.get('content-type') || '';
			console.log('[Audio Report] Content-Type de respuesta:', contentType);
			console.log('[Audio Report] Status de respuesta:', n8nResponse.status);
			
			if (contentType.includes('application/json')) {
				n8nResult = await n8nResponse.json();
				console.log('[Audio Report] Respuesta JSON parseada:', JSON.stringify(n8nResult).substring(0, 500));
			} else {
				// Si no es JSON, intentar parsear como texto
				const responseText = await n8nResponse.text();
				console.log('[Audio Report] Respuesta de n8n (primeros 500 chars):', responseText.substring(0, 500));
				console.log('[Audio Report] Longitud total de respuesta:', responseText.length);

				if (!responseText || responseText.trim() === '') {
					console.error('[Audio Report] Respuesta vacía de n8n');
					// No retornar error aquí, permitir que el flujo continúe
					// El informe puede haberse generado correctamente aunque la respuesta esté vacía
					// En su lugar, intentar obtener el report_url de la base de datos
					const { data: consultationData } = await supabase
						.from('consultation')
						.select('report_url')
						.eq('id', id)
						.single();
					
					if (consultationData?.report_url) {
						console.log('[Audio Report] Informe encontrado en BD:', consultationData.report_url);
						await supabaseAdmin.storage.from(audioBucket).remove([audioFileName]).catch(console.error);
						return NextResponse.json({
							success: true,
							report_url: consultationData.report_url,
							reportUrl: consultationData.report_url,
							transcription: '',
							message: 'Informe generado exitosamente desde audio',
						});
					}
					
					await supabaseAdmin.storage.from(audioBucket).remove([audioFileName]);
					return NextResponse.json(
						{ error: 'Respuesta vacía de n8n' },
						{ status: 500 }
					);
				}

				n8nResult = JSON.parse(responseText);
			}
		} catch (parseError: any) {
			console.error('[Audio Report] Error parseando respuesta de n8n:', parseError);
			// Intentar obtener el texto de la respuesta para debugging
			try {
				const responseText = await n8nResponse.text();
				console.error('[Audio Report] Respuesta completa:', responseText);
			} catch (e) {
				console.error('[Audio Report] No se pudo leer la respuesta como texto');
			}
			
			// Intentar obtener el report_url de la base de datos como fallback
			const { data: consultationData } = await supabase
				.from('consultation')
				.select('report_url')
				.eq('id', id)
				.single();
			
			if (consultationData?.report_url) {
				console.log('[Audio Report] Informe encontrado en BD después de error de parseo:', consultationData.report_url);
				await supabaseAdmin.storage.from(audioBucket).remove([audioFileName]).catch(console.error);
				return NextResponse.json({
					success: true,
					report_url: consultationData.report_url,
					reportUrl: consultationData.report_url,
					transcription: '',
					message: 'Informe generado exitosamente desde audio',
				});
			}
			
			await supabaseAdmin.storage.from(audioBucket).remove([audioFileName]);
			return NextResponse.json(
				{ error: 'Error al parsear respuesta de n8n', detail: parseError.message },
				{ status: 500 }
			);
		}

		// Validar que la respuesta tiene los datos esperados
		if (!n8nResult || (!n8nResult.reportUrl && !n8nResult.report_url)) {
			console.error('[Audio Report] Respuesta de n8n no contiene reportUrl:', n8nResult);
			
			// Intentar obtener el report_url de la base de datos como fallback
			const { data: consultationData } = await supabase
				.from('consultation')
				.select('report_url')
				.eq('id', id)
				.single();
			
			if (consultationData?.report_url) {
				console.log('[Audio Report] Informe encontrado en BD después de validación:', consultationData.report_url);
				await supabaseAdmin.storage.from(audioBucket).remove([audioFileName]).catch(console.error);
				return NextResponse.json({
					success: true,
					report_url: consultationData.report_url,
					reportUrl: consultationData.report_url,
					transcription: n8nResult?.transcription || '',
					message: 'Informe generado exitosamente desde audio',
				});
			}
			
			await supabaseAdmin.storage.from(audioBucket).remove([audioFileName]);
			return NextResponse.json(
				{ error: 'La respuesta de n8n no contiene la URL del informe', detail: JSON.stringify(n8nResult) },
				{ status: 500 }
			);
		}

		// Limpiar audio temporal después de procesar
		await supabaseAdmin.storage.from(audioBucket).remove([audioFileName]).catch(console.error);

		// Obtener reportUrl (puede venir como reportUrl o report_url)
		const reportUrl = n8nResult.reportUrl || n8nResult.report_url || '';

		// Actualizar consulta con la URL del informe generado
		if (reportUrl) {
			await supabase
				.from('consultation')
				.update({ report_url: reportUrl })
				.eq('id', id);
		}

		return NextResponse.json({
			success: true,
			report_url: reportUrl,
			reportUrl: reportUrl, // También incluir en camelCase para compatibilidad
			transcription: n8nResult.transcription || '',
			message: 'Informe generado exitosamente desde audio',
		});

	} catch (error: any) {
		console.error('[Audio Report] Error:', error);
		return NextResponse.json(
			{ error: 'Error interno del servidor', detail: error.message },
			{ status: 500 }
		);
	}
}

