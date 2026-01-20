// app/api/n8n/generate-report-internal/route.ts
// Endpoint interno para que n8n genere el informe después de procesar el audio
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

/**
 * Endpoint interno para que n8n genere el informe
 * Este endpoint no requiere autenticación del usuario, sino una clave secreta
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			consultationId,
			doctorId,
			reportType,
			transcription,
			extractedFields,
			updatedVitals,
			apiKey, // Clave secreta para autenticación
		} = body;

		// Validar clave secreta
		const N8N_API_KEY = process.env.N8N_API_KEY || 'change-this-secret-key';
		if (apiKey !== N8N_API_KEY) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!consultationId || !doctorId || !transcription) {
			return NextResponse.json(
				{ error: 'Faltan parámetros requeridos' },
				{ status: 400 }
			);
		}

		// Inicializar cliente admin de Supabase
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			return NextResponse.json({ error: 'Error de configuración' }, { status: 500 });
		}

		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		// Obtener consulta
		const { data: consultation, error: consultationError } = await supabaseAdmin
			.from('consultation')
			.select('*, patient_id, unregistered_patient_id')
			.eq('id', consultationId)
			.maybeSingle();

		if (consultationError || !consultation) {
			return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
		}

		// Obtener perfil del médico para la plantilla
		// Usar .select() sin caché para obtener la versión más reciente
		const { data: medicProfile, error: medicProfileError } = await supabaseAdmin
			.from('medic_profile')
			.select('report_template_url, report_template_name, report_templates_by_specialty, report_font_family')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (medicProfileError) {
			console.error('[N8N Internal] Error obteniendo perfil médico:', medicProfileError);
			return NextResponse.json(
				{ error: 'Error al obtener perfil del médico', detail: medicProfileError.message },
				{ status: 500 }
			);
		}

		if (!medicProfile?.report_template_url) {
			return NextResponse.json(
				{ error: 'No se encontró plantilla de informe para este médico' },
				{ status: 400 }
			);
		}

		console.log('[N8N Internal] Plantilla obtenida:', {
			url: medicProfile.report_template_url,
			name: medicProfile.report_template_name,
			hasTemplatesBySpecialty: !!medicProfile.report_templates_by_specialty
		});

		// Verificar que se use la plantilla correcta
		if (medicProfile.report_template_name && !medicProfile.report_template_name.includes('INFORME_MEDICO_DRA_CARWIN')) {
			console.warn('[N8N Internal] Advertencia: La plantilla no coincide con INFORME_MEDICO_DRA_CARWIN.docx. Nombre actual:', medicProfile.report_template_name);
		}

		// IMPORTANTE: NO actualizar vitals de la consulta con datos del audio
		// Solo usar extractedFields del audio para generar el informe
		// No mezclar con datos predeterminados del formulario

		// Obtener datos del paciente
		let patientName = 'Paciente no registrado';
		let patientId = 'N/A';
		let patientPhone = 'N/A';
		let patientAge = 'N/A';
		let patientGender = '';

		if (consultation.patient_id) {
			const { data: patientData } = await supabaseAdmin
				.from('patient')
				.select('firstName, lastName, identifier, phone, dob, gender')
				.eq('id', consultation.patient_id)
				.maybeSingle();

			if (patientData) {
				patientName = `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Paciente';
				patientId = patientData.identifier || 'N/A';
				patientPhone = patientData.phone || 'N/A';
				patientGender = patientData.gender || '';
				patientAge = calculateAge(patientData.dob);
			}
		} else if (consultation.unregistered_patient_id) {
			const { data: unregisteredPatient } = await supabaseAdmin
				.from('unregisteredpatients')
				.select('first_name, last_name, identification, phone, birth_date, sex')
				.eq('id', consultation.unregistered_patient_id)
				.maybeSingle();

			if (unregisteredPatient) {
				patientName = `${unregisteredPatient.first_name || ''} ${unregisteredPatient.last_name || ''}`.trim() || 'Paciente no registrado';
				patientId = unregisteredPatient.identification || 'N/A';
				patientPhone = unregisteredPatient.phone || 'N/A';
				patientGender = unregisteredPatient.sex || '';
				patientAge = calculateAge(unregisteredPatient.birth_date);
			}
		}

		// Obtener datos del médico
		let doctorName = 'Médico';
		const { data: doctorData } = await supabaseAdmin
			.from('user')
			.select('name, email')
			.eq('id', doctorId)
			.maybeSingle();

		if (doctorData) {
			doctorName = doctorData.name || doctorData.email || 'Médico';
		}

		// Función auxiliar para calcular edad
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
			} catch {
				return 'N/A';
			}
		}

		// Preparar fecha de consulta
		const consultationDate = consultation.started_at
			? new Date(consultation.started_at).toLocaleDateString('es-ES', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
			  })
			: consultation.created_at
			? new Date(consultation.created_at).toLocaleDateString('es-ES', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
			  })
			: new Date().toLocaleDateString('es-ES');

		// Descargar plantilla Word
		// Usar URL directamente sin caché para obtener la versión más reciente
		const templateUrl = medicProfile.report_template_url;
		const bucket = 'report-templates';

		console.log('[N8N Internal] Descargando plantilla desde:', templateUrl);

		let templateBuffer: Buffer;
		if (templateUrl.startsWith('http://') || templateUrl.startsWith('https://')) {
			// Agregar timestamp para evitar caché
			const urlWithCacheBuster = templateUrl.includes('?') 
				? `${templateUrl}&t=${Date.now()}` 
				: `${templateUrl}?t=${Date.now()}`;
			
			const response = await fetch(urlWithCacheBuster, {
				cache: 'no-store',
				headers: {
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'Pragma': 'no-cache',
					'Expires': '0'
				}
			});
			if (!response.ok) {
				throw new Error(`Error descargando plantilla: ${response.statusText}`);
			}
			const blob = await response.blob();
			const arrayBuffer = await blob.arrayBuffer();
			templateBuffer = Buffer.from(arrayBuffer);
			console.log('[N8N Internal] Plantilla descargada desde URL externa, tamaño:', templateBuffer.length);
		} else {
			let filePath = templateUrl;
			if (templateUrl.includes('/storage/v1/object/')) {
				const urlParts = templateUrl.split('/storage/v1/object/');
				if (urlParts.length > 1) {
					filePath = urlParts[1].split('?')[0];
					if (filePath.startsWith('sign/')) filePath = filePath.substring(5);
					if (filePath.startsWith(bucket + '/')) filePath = filePath.substring(bucket.length + 1);
				}
			}
			filePath = decodeURIComponent(filePath);

			// Descargar sin caché usando signed URL con timestamp
			const { data: signedUrlData } = await supabaseAdmin.storage
				.from(bucket)
				.createSignedUrl(filePath, 60); // URL válida por 60 segundos
			
			if (signedUrlData?.signedUrl) {
				const response = await fetch(signedUrlData.signedUrl, {
					cache: 'no-store',
					headers: {
						'Cache-Control': 'no-cache, no-store, must-revalidate',
						'Pragma': 'no-cache',
						'Expires': '0'
					}
				});
				if (!response.ok) {
					throw new Error(`Error descargando plantilla desde Supabase: ${response.statusText}`);
				}
				const blob = await response.blob();
				const arrayBuffer = await blob.arrayBuffer();
				templateBuffer = Buffer.from(arrayBuffer);
				console.log('[N8N Internal] Plantilla descargada desde Supabase Storage, tamaño:', templateBuffer.length);
			} else {
				// Fallback al método anterior
				const { data: templateData, error: downloadError } = await supabaseAdmin.storage
					.from(bucket)
					.download(filePath);

				if (downloadError || !templateData) {
					throw new Error('Error descargando plantilla');
				}

				const arrayBuffer = await templateData.arrayBuffer();
				templateBuffer = Buffer.from(arrayBuffer);
				console.log('[N8N Internal] Plantilla descargada usando método fallback, tamaño:', templateBuffer.length);
			}
		}

		// Procesar plantilla
		const zip = new PizZip(templateBuffer);
		const doc = new Docxtemplater(zip, {
			paragraphLoop: true,
			linebreaks: true,
			delimiters: {
				start: '{{',
				end: '}}',
			},
		});

		// Obtener datos SOLO del audio (extractedFields) - NO usar vitals del formulario
		// Los datos del audio vienen en updatedVitals, pero debemos usar extractedFields directamente
		const gyn = (updatedVitals?.gynecology || {}) as any;
		const colposcopy = (gyn.colposcopy || {}) as any;
		const obst = (updatedVitals?.obstetrics || {}) as any;
		const firstTrim = (obst.first_trimester || {}) as any;
		const secondTrim = (obst.second_third_trimester || {}) as any;

		// Convertir transcripción a mayúsculas si no lo está ya
		const transcriptionUpper = transcription ? transcription.toUpperCase() : '';
		
		// Preparar datos para plantilla (similar a generate-report/route.ts)
		const baseTemplateData: Record<string, string> = {
			contenido: transcriptionUpper, // Usar transcripción en MAYÚSCULAS como contenido
			content: transcriptionUpper,
			informe: transcriptionUpper,
			fecha: consultationDate,
			date: consultationDate,
			paciente: patientName.toUpperCase(),
			patient: patientName.toUpperCase(),
			edad: patientAge,
			age: patientAge,
			cedula: patientId,
			identificacion: patientId,
			telefono: patientPhone,
			phone: patientPhone,
			medico: doctorName.toUpperCase(),
			doctor: doctorName.toUpperCase(),
			// Usar SOLO datos del audio (extractedFields) - NO datos del formulario
			diagnostico: (extractedFields?.diagnosis || extractedFields?.diagnostico || '').toUpperCase(),
			diagnosis: (extractedFields?.diagnosis || extractedFields?.diagnostico || '').toUpperCase(),
			motivo: (extractedFields?.motivo || extractedFields?.motivo_consulta || extractedFields?.historia_enfermedad_actual || '').toUpperCase(),
			complaint: (extractedFields?.motivo || extractedFields?.motivo_consulta || '').toUpperCase(),
			notas: (extractedFields?.notas || extractedFields?.notes || '').toUpperCase(),
			notes: (extractedFields?.notas || extractedFields?.notes || '').toUpperCase(),
		};

		// Construir templateDataObj según tipo de informe
		let templateDataObj: Record<string, string>;
		if (reportType === 'first_trimester') {
			// Usar SOLO datos del audio (extractedFields) - NO datos de firstTrim del formulario
			templateDataObj = {
				...baseTemplateData,
				edad_gestacional: extractedFields?.edad_gestacional || '',
				fur: extractedFields?.fur || extractedFields?.ultima_regla || '',
				fpp: extractedFields?.fpp || '',
				gestas: extractedFields?.gestas || '',
				paras: extractedFields?.paras || '',
				cesareas: extractedFields?.cesareas || '',
				abortos: extractedFields?.abortos || '',
				otros: extractedFields?.otros || '',
				motivo_consulta: extractedFields?.motivo_consulta || extractedFields?.motivo || baseTemplateData.motivo,
				referencia: extractedFields?.referencia || '',
				posicion: extractedFields?.posicion || '',
				superficie: extractedFields?.superficie || '',
				miometrio: extractedFields?.miometrio || '',
				endometrio: extractedFields?.endometrio || '',
				ovario_derecho: extractedFields?.ovario_derecho || '',
				ovario_izquierdo: extractedFields?.ovario_izquierdo || '',
				anexos_ecopatron: extractedFields?.anexos_ecopatron || '',
				fondo_de_saco: extractedFields?.fondo_de_saco || '',
				cuerpo_luteo: extractedFields?.cuerpo_luteo || '',
				gestacion: extractedFields?.gestacion || '',
				localizacion: extractedFields?.localizacion || '',
				vesicula: extractedFields?.vesicula || '',
				cavidad_exocelomica: extractedFields?.cavidad_exocelomica || '',
				embrion_visto: extractedFields?.embrion_visto || '',
				ecoanatomia: extractedFields?.ecoanatomia || '',
				lcr: extractedFields?.lcr || '',
				acorde_a: extractedFields?.acorde_a || '',
				actividad_cardiaca: extractedFields?.actividad_cardiaca || '',
				movimientos_embrionarios: extractedFields?.movimientos_embrionarios || '',
				conclusiones: extractedFields?.conclusiones || '',
			};
		} else if (reportType === 'second_third_trimester') {
			// Usar SOLO datos del audio (extractedFields) - NO datos de secondTrim del formulario
			templateDataObj = {
				...baseTemplateData,
				edad_gestacional: extractedFields?.edad_gestacional || '',
				fur: extractedFields?.fur || extractedFields?.ultima_regla || '',
				fpp: extractedFields?.fpp || '',
				gestas: extractedFields?.gestas || '',
				paras: extractedFields?.paras || '',
				cesareas: extractedFields?.cesareas || '',
				abortos: extractedFields?.abortos || '',
				otros: extractedFields?.otros || '',
				motivo_consulta: extractedFields?.motivo_consulta || extractedFields?.motivo || baseTemplateData.motivo,
				referencia: extractedFields?.referencia || '',
				num_fetos: extractedFields?.num_fetos || '',
				actividad_cardiaca: extractedFields?.actividad_cardiaca || '',
				situacion: extractedFields?.situacion || '',
				presentacion: extractedFields?.presentacion || '',
				dorso: extractedFields?.dorso || '',
				dbp: extractedFields?.dbp || '',
				cc: extractedFields?.cc || '',
				ca: extractedFields?.ca || '',
				lf: extractedFields?.lf || '',
				peso_estimado_fetal: extractedFields?.peso_estimado_fetal || '',
				para: extractedFields?.para || '',
				placenta: extractedFields?.placenta || '',
				ubi: extractedFields?.ubi || '',
				insercion: extractedFields?.insercion || '',
				grado: extractedFields?.grado || '',
				cordon_umbilical: extractedFields?.cordon_umbilical || '',
				liqu_amniotico: extractedFields?.liqu_amniotico || '',
				p: extractedFields?.p || '',
				ila: extractedFields?.ila || '',
				craneo: extractedFields?.craneo || '',
				corazon: extractedFields?.corazon || '',
				fcf: extractedFields?.fcf || '',
				pulmones: extractedFields?.pulmones || '',
				situs_visceral: extractedFields?.situs_visceral || '',
				intestino: extractedFields?.intestino || '',
				vejiga: extractedFields?.vejiga || '',
				vejiga_extra: extractedFields?.vejiga_extra || '',
				estomago: extractedFields?.estomago || '',
				estomago_extra: extractedFields?.estomago_extra || '',
				rinones: extractedFields?.rinones || '',
				rinones_extra: extractedFields?.rinones_extra || '',
				genitales: extractedFields?.genitales || '',
				miembros_superiores: extractedFields?.miembros_superiores || '',
				manos: extractedFields?.manos || '',
				miembros_inferiores: extractedFields?.miembros_inferiores || '',
				pies: extractedFields?.pies || '',
				conclusiones: extractedFields?.conclusiones || '',
			};
		} else {
			// Ginecología - convertir valores a mayúsculas
			const toUpper = (val: any) => {
				if (!val || val === '') return '';
				if (typeof val === 'string') return val.toUpperCase();
				return String(val).toUpperCase();
			};
			
			// Extraer FUR, HO y método anticonceptivo SOLO del audio (extractedFields)
			// NO usar datos de gyn (vitals del formulario)
			const ultimaRegla = extractedFields?.ultima_regla || extractedFields?.fur || extractedFields?.FUR || extractedFields?.ULTIMA_REGLA || '';
			const ho = extractedFields?.ho || extractedFields?.HO || extractedFields?.historia_obstetrica || extractedFields?.HISTORIA_OBSTETRICA || '';
			const metodoAnticonceptivo = extractedFields?.metodo_anticonceptivo || extractedFields?.METODO_ANTICONCEPTIVO || extractedFields?.contraceptive || extractedFields?.anticonceptivo || '';
			
			templateDataObj = {
				...baseTemplateData,
				ultima_regla: toUpper(ultimaRegla),
				ho: toUpper(ho),
				metodo_anticonceptivo: toUpper(metodoAnticonceptivo),
				método_anticonceptivo: toUpper(metodoAnticonceptivo),
				// Usar SOLO datos del audio (extractedFields) - NO datos de gyn o colposcopy del formulario
				test_hinselmann: toUpper(extractedFields?.test_hinselmann || extractedFields?.hinselmann_test || ''),
				test_schiller: toUpper(extractedFields?.test_schiller || extractedFields?.schiller_test || ''),
				colposcopia_acetico_5: toUpper(extractedFields?.colposcopia_acetico_5 || extractedFields?.acetico_5 || ''),
				colposcopia_ectocervix: toUpper(extractedFields?.colposcopia_ectocervix || extractedFields?.ectocervix || ''),
				colposcopia_tipo: toUpper(extractedFields?.colposcopia_tipo || extractedFields?.tipo_colposcopia || ''),
				colposcopia_extension: toUpper(extractedFields?.colposcopia_extension || extractedFields?.extension_colposcopia || ''),
				colposcopia_descripcion: toUpper(extractedFields?.colposcopia_descripcion || extractedFields?.descripcion_colposcopia || ''),
				colposcopia_localizacion: toUpper(extractedFields?.colposcopia_localizacion || extractedFields?.localizacion_colposcopia || ''),
				colposcopia_acetowhite: toUpper(extractedFields?.colposcopia_acetowhite || extractedFields?.acetowhite || ''),
				colposcopia_acetowhite_detalles: toUpper(extractedFields?.colposcopia_acetowhite_detalles || extractedFields?.acetowhite_detalles || ''),
				colposcopia_mosaico: toUpper(extractedFields?.colposcopia_mosaico || extractedFields?.mosaico || ''),
				colposcopia_punteado: toUpper(extractedFields?.colposcopia_punteado || extractedFields?.punteado || ''),
				colposcopia_vasos_atipicos: toUpper(extractedFields?.colposcopia_vasos_atipicos || extractedFields?.vasos_atipicos || ''),
				colposcopia_carcinoma_invasivo: toUpper(extractedFields?.colposcopia_carcinoma_invasivo || extractedFields?.carcinoma_invasivo || ''),
				colposcopia_bordes: toUpper(extractedFields?.colposcopia_bordes || extractedFields?.bordes_colposcopia || ''),
				colposcopia_situacion: toUpper(extractedFields?.colposcopia_situacion || extractedFields?.situacion_colposcopia || ''),
				colposcopia_elevacion: toUpper(extractedFields?.colposcopia_elevacion || extractedFields?.elevacion_colposcopia || ''),
				colposcopia_biopsia: toUpper(extractedFields?.colposcopia_biopsia || extractedFields?.biopsia || ''),
				colposcopia_biopsia_localizacion: toUpper(extractedFields?.colposcopia_biopsia_localizacion || extractedFields?.biopsia_localizacion || ''),
				colposcopia_lugol: toUpper(extractedFields?.colposcopia_lugol || extractedFields?.lugol || ''),
			};
		}

		// Renderizar plantilla
		doc.render(templateDataObj);

		// Aplicar formato
		try {
			const zip = doc.getZip();
			const documentXml = zip.files['word/document.xml'];
			if (documentXml) {
				let xmlContent = documentXml.asText();
				const selectedFont = medicProfile.report_font_family || 'Arial';
				xmlContent = xmlContent.replace(/<w:sz\s+w:val="\d+"/g, '<w:sz w:val="18"');
				xmlContent = xmlContent.replace(/(<w:rPr[^>]*>)(?![^<]*<w:sz)/g, '$1<w:sz w:val="18"/>');
				xmlContent = xmlContent.replace(/<w:rFonts[^>]*>/g, `<w:rFonts w:ascii="${selectedFont}" w:hAnsi="${selectedFont}" w:cs="${selectedFont}"/>`);
				xmlContent = xmlContent.replace(/(<w:rPr[^>]*>)(?![^<]*<w:rFonts)/g, `$1<w:rFonts w:ascii="${selectedFont}" w:hAnsi="${selectedFont}" w:cs="${selectedFont}"/>`);
				zip.file('word/document.xml', xmlContent);
			}
		} catch (formatError) {
			console.warn('Error aplicando formato:', formatError);
		}

		// Generar documento
		const generatedBuffer = doc.getZip().generate({
			type: 'nodebuffer',
			compression: 'DEFLATE',
		});

		// Subir informe a Supabase Storage
		const reportsBucket = 'consultation-reports';
		const reportFileName = `${consultationId}/${Date.now()}-informe-${consultationId}.docx`;

		const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
			.from(reportsBucket)
			.upload(reportFileName, generatedBuffer, {
				contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				upsert: false,
			});

		if (uploadError) {
			console.error('[N8N Internal] Error subiendo informe:', uploadError);
			return NextResponse.json({ error: 'Error al guardar informe' }, { status: 500 });
		}

		// Obtener URL firmada
		const { data: urlData } = await supabaseAdmin.storage
			.from(reportsBucket)
			.createSignedUrl(reportFileName, 31536000);

		const reportUrl = urlData?.signedUrl || `/${reportsBucket}/${reportFileName}`;

		// Actualizar consulta
		await supabaseAdmin
			.from('consultation')
			.update({ report_url: reportUrl })
			.eq('id', consultationId);

		return NextResponse.json({
			success: true,
			report_url: reportUrl,
			message: 'Informe generado exitosamente',
		});

	} catch (error: any) {
		console.error('[N8N Internal] Error:', error);
		return NextResponse.json(
			{ error: 'Error interno', detail: error.message },
			{ status: 500 }
		);
	}
}

