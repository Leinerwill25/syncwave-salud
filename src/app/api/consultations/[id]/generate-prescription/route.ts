// app/api/consultations/[id]/generate-prescription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { createClient } from '@supabase/supabase-js';
import { apiRequireRole } from '@/lib/auth-guards';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

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

		// Obtener datos de la consulta
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select(
				`
				id,
				patient_id,
				unregistered_patient_id,
				doctor_id,
				started_at,
				created_at
			`
			)
			.eq('id', id)
			.single();

		if (consultationError || !consultation) {
			return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
		}

		// Verificar que el médico sea el dueño de la consulta
		if (consultation.doctor_id !== doctorId) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		// Intentar obtener datos del body (para generación en tiempo real sin guardar)
		let body: any = null;
		let fontFamilyFromRequest: string | undefined = undefined;
		try {
			body = await request.json().catch(() => null);
			if (body && body.font_family) {
				fontFamilyFromRequest = body.font_family;
			}
		} catch (e) {
			// Si no hay body, continuar con la prescripción de la BD
		}

		let prescription: any = null;
		let prescriptionItems: any[] = [];
		let prescriptionNotes = '';
		let prescriptionId: string | null = null;
		let prescriptionValidUntil: string | null = null;
		let prescriptionIssuedAt: string | null = null;

		// Si se proporcionan datos en el body, usarlos (generación en tiempo real)
		if (body && body.items && Array.isArray(body.items)) {
			console.log('[Generate Prescription API] Generando receta desde datos del formulario (sin guardar)');
			prescriptionItems = body.items;
			prescriptionNotes = body.notes || '';
			prescriptionValidUntil = body.valid_until || null;
			prescriptionIssuedAt = body.issued_at || null;
			prescriptionId = body.prescription_id || `temp-${Date.now()}`; // ID temporal para el nombre del archivo
		} else {
			// Obtener la prescripción asociada a esta consulta desde la BD
			const { data: prescriptionData, error: prescriptionError } = await supabase
				.from('prescription')
				.select(
					`
				id,
				notes,
				valid_until,
				issued_at,
				prescription_item (
					id,
					name,
					dosage,
					form,
					frequency,
					duration,
					quantity,
					instructions
				)
			`
				)
				.eq('consultation_id', id)
				.order('created_at', { ascending: false })
				.limit(1)
				.maybeSingle();

			if (prescriptionError) {
				console.error('[Generate Prescription API] Error obteniendo prescripción:', prescriptionError);
				return NextResponse.json({ error: 'Error al obtener prescripción' }, { status: 500 });
			}

			if (!prescriptionData) {
				return NextResponse.json({ error: 'No se encontró una prescripción asociada a esta consulta. Por favor, crea la prescripción primero o envía los datos del formulario en el body.' }, { status: 400 });
			}

			prescription = prescriptionData;
			prescriptionItems = prescription.prescription_item || [];
			prescriptionNotes = prescription.notes || '';
			prescriptionId = prescription.id;
			prescriptionValidUntil = prescription.valid_until;
			prescriptionIssuedAt = prescription.issued_at;
		}

		// Obtener plantilla del médico
		const { data: medicProfile, error: profileError } = await supabase.from('medic_profile').select('prescription_template_url, prescription_template_name, prescription_template_text, prescription_font_family').eq('doctor_id', doctorId).maybeSingle();

		if (profileError || !medicProfile?.prescription_template_url) {
			return NextResponse.json({ error: 'No se encontró plantilla de receta. Por favor, carga una plantilla primero en Configuración > Plantilla de Receta.' }, { status: 400 });
		}

		// Función auxiliar para calcular edad desde fecha de nacimiento
		function calculateAge(dob: string | Date | null | undefined): string {
			if (!dob) return 'N/A';

			try {
				const birthDate = dob instanceof Date ? dob : new Date(dob);
				if (isNaN(birthDate.getTime())) return 'N/A';

				const today = new Date();
				let age = today.getFullYear() - birthDate.getFullYear();
				const monthDiff = today.getMonth() - birthDate.getMonth();

				if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
					age = age - 1;
				}

				return String(age);
			} catch (error) {
				console.error('[Generate Prescription API] Error calculando edad:', error);
				return 'N/A';
			}
		}

		// Obtener datos del paciente
		let patientName = 'Paciente no registrado';
		let patientId = 'N/A';
		let patientAge = 'N/A';
		if (consultation.patient_id) {
			// Obtener datos del paciente registrado
			const { data: patientData } = await supabase.from('patient').select('firstName, lastName, identifier, dob').eq('id', consultation.patient_id).single();

			if (patientData) {
				patientName = `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Paciente';
				patientId = patientData.identifier || 'N/A';
				patientAge = calculateAge(patientData.dob);
			}
		} else if (consultation.unregistered_patient_id) {
			// Obtener datos del paciente no registrado
			const { data: unregisteredPatient } = await supabase.from('unregisteredpatients').select('first_name, last_name, identification, birth_date').eq('id', consultation.unregistered_patient_id).single();

			if (unregisteredPatient) {
				patientName = `${unregisteredPatient.first_name || ''} ${unregisteredPatient.last_name || ''}`.trim() || 'Paciente no registrado';
				patientId = unregisteredPatient.identification || 'N/A';
				patientAge = calculateAge(unregisteredPatient.birth_date);
			}
		}

		// Obtener datos del médico
		let doctorName = 'Médico';
		if (consultation.doctor_id) {
			const { data: doctorData } = await supabase.from('user').select('name, email').eq('id', consultation.doctor_id).single();

			if (doctorData) {
				doctorName = doctorData.name || doctorData.email || 'Médico';
			}
		}

		// prescriptionItems, prescriptionNotes ya están obtenidos arriba

		// Formatear todos los medicamentos para el récipe (en una sola sección)
		// SOLO el nombre del medicamento, uno por línea, sin información adicional
		const medicamentosFormateados = prescriptionItems.map((item: any) => {
			// Solo el nombre del medicamento en mayúsculas
			return `${item.name || 'Medicamento'}`.toUpperCase();
		});

		// Variable {{recipe}} o {{receta}}: todos los medicamentos juntos, uno por línea
		const recipeText = medicamentosFormateados.join('\n');

		// Variable {{instrucciones}}: nombre del medicamento seguido de dos puntos y las instrucciones
		// Formato: "NOMBRE_MEDICAMENTO: INSTRUCCIONES"
		// Ejemplo: "CIPROFLOXACINA: 1 TABLETAS CADA 12 HORAS POR 7 DÍAS"
		const instruccionesText = prescriptionItems
			.map((item: any) => {
				const nombreMedicamento = (item.name || 'Medicamento').toUpperCase();
				// Construir las instrucciones desde los campos disponibles
				const instruccionesParts: string[] = [];
				
				// Si hay instrucciones específicas, usarlas directamente
				if (item.instructions && item.instructions.trim() !== '') {
					instruccionesParts.push(item.instructions.trim());
				} else {
					// Si no hay instrucciones específicas, construir desde los campos del formulario
					// Formato: "1 TABLETAS CADA 12 HORAS POR 7 DÍAS"
					if (item.quantity) {
						instruccionesParts.push(`${item.quantity}`);
					}
					if (item.form) {
						// Convertir a mayúsculas y pluralizar si es necesario
						const forma = item.form.toUpperCase();
						instruccionesParts.push(forma);
					}
					if (item.frequency) {
						// La frecuencia ya viene formateada (ej: "CADA 12 HORAS")
						instruccionesParts.push(item.frequency.toUpperCase());
					}
					if (item.duration) {
						instruccionesParts.push(`POR ${item.duration.toUpperCase()}`);
					}
				}
				
				const instruccionesCompletas = instruccionesParts.length > 0 
					? instruccionesParts.join(' ') 
					: '';
				
				if (instruccionesCompletas) {
					return `${nombreMedicamento}: ${instruccionesCompletas}`;
				}
				// Si no hay instrucciones, solo mostrar el nombre del medicamento
				return `${nombreMedicamento}:`;
			})
			.filter((inst: string | null) => inst !== null)
			.join('\n');

		// Formatear indicaciones generales (notas de la prescripción)
		const indicacionesText = prescriptionNotes || '';

		// Preparar fecha de emisión
		const prescriptionDate = prescriptionIssuedAt
			? new Date(prescriptionIssuedAt).toLocaleDateString('es-ES', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
			  })
			: new Date().toLocaleDateString('es-ES', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
			  });

		// Preparar fecha de validez
		const validUntilText = prescriptionValidUntil
			? new Date(prescriptionValidUntil).toLocaleDateString('es-ES', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
			  })
			: 'No especificada';

		// Crear cliente admin para descargar plantilla (bypass RLS)
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('[Generate Prescription API] SUPABASE_SERVICE_ROLE_KEY no configurado');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		// Descargar plantilla desde Supabase Storage
		const templateUrl = medicProfile.prescription_template_url;
		const bucket = 'prescription-templates';

		console.log('[Generate Prescription API] URL de plantilla:', templateUrl);

		// Helper function para descargar plantilla (usa bucket del scope)
		const downloadTemplate = async (url: string): Promise<Buffer> => {
			if (url.startsWith('http://') || url.startsWith('https://')) {
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				const blob = await response.blob();
				const arrayBuffer = await blob.arrayBuffer();
				return Buffer.from(arrayBuffer);
			} else {
				let filePath = url;
				if (url.includes('/storage/v1/object/')) {
					const urlParts = url.split('/storage/v1/object/');
					if (urlParts.length > 1) {
						const pathWithQuery = urlParts[1];
						const pathOnly = pathWithQuery.split('?')[0];
						let cleanPath = pathOnly;
						if (cleanPath.startsWith('sign/')) {
							cleanPath = cleanPath.substring(5);
						}
						if (cleanPath.startsWith(bucket + '/')) {
							filePath = cleanPath.substring(bucket.length + 1);
						} else {
							filePath = cleanPath;
						}
					}
				} else if (url.includes(bucket + '/')) {
					filePath = url.split(bucket + '/')[1].split('?')[0];
				} else if (url.startsWith('/')) {
					filePath = url.substring(1).split('?')[0];
				} else {
					filePath = url.split('?')[0];
				}

				try {
					filePath = decodeURIComponent(filePath);
				} catch (e) {
					console.warn('[Generate Prescription API] Error decodificando path:', e);
				}

				const { data: templateData, error: downloadError } = await supabaseAdmin.storage.from(bucket).download(filePath);
				if (downloadError || !templateData) {
					throw new Error(`Error descargando plantilla: ${downloadError?.message || 'No se pudo descargar'}`);
				}
				const arrayBuffer = await templateData.arrayBuffer();
				return Buffer.from(arrayBuffer);
			}
		};

		// Descargar plantilla base
		let templateBuffer: Buffer;
		try {
			templateBuffer = await downloadTemplate(templateUrl);
			console.log('[Generate Prescription API] Plantilla descargada exitosamente, tamaño:', templateBuffer.length, 'bytes');
		} catch (templateError: any) {
			console.error('[Generate Prescription API] Error descargando plantilla:', templateError);
			return NextResponse.json(
				{
					error: 'Error al descargar plantilla. Verifica que la plantilla exista y que tengas permisos para acceder a ella.',
				},
				{ status: 500 }
			);
		}

		// Obtener la fuente seleccionada (del request tiene prioridad, si no, del perfil, si no, Arial por defecto)
		const selectedFont = fontFamilyFromRequest || medicProfile?.prescription_font_family || 'Arial';

		// Helper function para renderizar una plantilla con datos y devolver un Buffer completo del documento Word
		const renderTemplateToBuffer = (buffer: Buffer, data: Record<string, string>): Buffer => {
			const zip = new PizZip(buffer);
			const doc = new Docxtemplater(zip, {
				paragraphLoop: true,
				linebreaks: true,
				delimiters: {
					start: '{{',
					end: '}}',
				},
			});

			try {
				doc.render(data);
			} catch (error: any) {
				console.error('[Generate Prescription API] Error renderizando plantilla:', error);
				throw error;
			}

			// Aplicar formato: tamaño de fuente 11pt (22 half-points)
			const zipAfterRender = doc.getZip();
			const documentXml = zipAfterRender.files['word/document.xml'];
			if (documentXml) {
				let xmlContent = documentXml.asText();
				// Cambiar tamaño de fuente a 11pt (22 half-points)
				xmlContent = xmlContent.replace(/<w:sz\s+w:val="\d+"/g, '<w:sz w:val="22"');
				xmlContent = xmlContent.replace(/(<w:rPr[^>]*>)(?![^<]*<w:sz)/g, '$1<w:sz w:val="22"/>');
				xmlContent = xmlContent.replace(/<w:rFonts[^>]*>/g, `<w:rFonts w:ascii="${selectedFont}" w:hAnsi="${selectedFont}" w:cs="${selectedFont}"/>`);
				xmlContent = xmlContent.replace(/(<w:rPr[^>]*>)(?![^<]*<w:rFonts)/g, `$1<w:rFonts w:ascii="${selectedFont}" w:hAnsi="${selectedFont}" w:cs="${selectedFont}"/>`);
				xmlContent = xmlContent.replace(/<w:jc\s+w:val="both"/g, '<w:jc w:val="left"');
				xmlContent = xmlContent.replace(/<w:jc\s+w:val="(center|right|distribute|distributeAll)"/g, '<w:jc w:val="left"');
				xmlContent = xmlContent.replace(/(<w:pPr[^>]*>)(?![^<]*<w:jc)/g, '$1<w:jc w:val="left"/>');
				zipAfterRender.file('word/document.xml', xmlContent);
			}

			// Generar el buffer completo del documento Word
			return zipAfterRender.generate({
				type: 'nodebuffer',
				compression: 'DEFLATE',
			}) as Buffer;
		};

		// Datos base comunes para todas las plantillas
		const baseData: Record<string, string> = {
			paciente: patientName,
			patient: patientName,
			edad: patientAge,
			age: patientAge,
			cedula: patientId,
			identificacion: patientId,
			cedula_identidad: patientId,
			medico: doctorName,
			doctor: doctorName,
			fecha: prescriptionDate,
			date: prescriptionDate,
			validez: validUntilText,
			valid_until: validUntilText,
			valido_hasta: validUntilText,
		};

		// Generar UN SOLO archivo Word con ambas hojas (récipe e indicaciones)
		// La plantilla debe tener ambas hojas, y se rellenan ambas secciones
		const prescriptionData = {
			...baseData,
			// Variable {{recipe}}, {{receta}}, {{RECIPES}} o {{RECIPE}}: todos los medicamentos juntos
			recipe: recipeText,
			receta: recipeText,
			RECIPES: recipeText,
			RECIPE: recipeText,
			medicamento: recipeText,
			// Variable {{instrucciones}} o {{instructions}}: solo las instrucciones específicas de cada medicamento
			instrucciones: instruccionesText,
			instructions: instruccionesText,
			// Variable {{indicaciones}} o {{INDICACIONES}}: indicaciones generales de la prescripción
			indicaciones: indicacionesText,
			INDICACIONES: indicacionesText,
			indications: indicacionesText,
		};

		let docBuffer: Buffer;
		try {
			docBuffer = renderTemplateToBuffer(templateBuffer, prescriptionData);
			console.log('[Generate Prescription API] Archivo Word generado exitosamente con ambas hojas (récipe e indicaciones)');
		} catch (error: any) {
			console.error('[Generate Prescription API] Error generando receta:', error);
			return NextResponse.json(
				{
					error: 'Error al generar receta. Verifica que los marcadores en la plantilla sean correctos.',
					detail: error.message,
				},
				{ status: 500 }
			);
		}

		// Subir archivo Word generado a Supabase Storage usando cliente admin
		const prescriptionsBucket = 'consultation-prescriptions';

		// Verificar si el bucket existe, si no, crearlo
		try {
			const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
			if (listError) {
				console.warn('[Generate Prescription API] Error listando buckets:', listError);
			} else {
				const bucketExists = buckets?.some((b) => b.name === prescriptionsBucket);
				if (!bucketExists) {
					console.log(`[Generate Prescription API] Bucket "${prescriptionsBucket}" no existe, creándolo...`);
					// Crear bucket para recetas generadas
					const { error: createError } = await supabaseAdmin.storage.createBucket(prescriptionsBucket, {
						public: false, // Privado, requiere autenticación
						fileSizeLimit: 52428800, // 50MB para archivos Word
						allowedMimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
					});
					if (createError) {
						console.error(`[Generate Prescription API] Error creando bucket "${prescriptionsBucket}":`, createError);
					} else {
						console.log(`[Generate Prescription API] Bucket "${prescriptionsBucket}" creado exitosamente`);
					}
				}
			}
		} catch (bucketErr) {
			console.error('[Generate Prescription API] Error verificando/creando bucket:', bucketErr);
		}

		const prescriptionFileName = `${prescriptionId}/${Date.now()}-receta-${prescriptionId}.docx`;

		// Subir archivo Word usando cliente admin (bypass RLS)
		const { data: uploadData, error: uploadError } = await supabaseAdmin.storage.from(prescriptionsBucket).upload(prescriptionFileName, docBuffer, {
			contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			upsert: false,
		});

		if (uploadError) {
			console.error('[Generate Prescription API] Error subiendo receta:', uploadError);
			const statusCode = (uploadError as any)?.statusCode || (uploadError as any)?.status;
			const errorMessage = uploadError.message || String(uploadError);

			// Si el error es porque el bucket no existe (404), informar al usuario
			if (statusCode === '404' || statusCode === 404 || errorMessage.includes('not found') || errorMessage.includes('Bucket not found')) {
				return NextResponse.json(
					{
						error: 'El bucket "consultation-prescriptions" no está configurado. Por favor, crea el bucket en Supabase Storage Dashboard o contacta al administrador.',
					},
					{ status: 500 }
				);
			}
			return NextResponse.json({ error: 'Error al guardar receta' }, { status: 500 });
		}

		// Obtener URL de la receta usando cliente admin
		const { data: urlData } = await supabaseAdmin.storage.from(prescriptionsBucket).createSignedUrl(prescriptionFileName, 31536000); // 1 año de validez

		const prescriptionUrl = urlData?.signedUrl || `/${prescriptionsBucket}/${prescriptionFileName}`;

		return NextResponse.json({
			success: true,
			prescription_url: prescriptionUrl,
			message: `Receta generada exitosamente. El archivo Word contiene ambas hojas: récipe con todos los medicamentos e indicaciones generales.`,
		});
	} catch (err) {
		console.error('[Generate Prescription API] Error:', err);
		return NextResponse.json(
			{
				error: 'Error interno al generar receta',
				detail: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 }
		);
	}
}
