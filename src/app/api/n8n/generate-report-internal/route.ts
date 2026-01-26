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

		// Validar parámetros requeridos
		// transcription ya no es obligatorio porque usamos extractedFields directamente
		if (!consultationId || !doctorId) {
			return NextResponse.json(
				{ error: 'Faltan parámetros requeridos: consultationId y doctorId son obligatorios' },
				{ status: 400 }
			);
		}

		// Validar que tenemos datos para generar el informe
		if (!extractedFields || (typeof extractedFields === 'object' && Object.keys(extractedFields).length === 0)) {
			return NextResponse.json(
				{ error: 'Faltan datos extraídos del audio (extractedFields)' },
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

		if (!medicProfile) {
			return NextResponse.json(
				{ error: 'No se encontró perfil médico para este doctor' },
				{ status: 404 }
			);
		}

		// Mapeo de reportType a nombres de especialidades en español
		const REPORT_TYPE_TO_SPECIALTY: Record<string, string[]> = {
			'gynecology': ['Ginecologia', 'Ginecología', 'gynecology'],
			'obstetrics': ['Obstetricia', 'obstetrics'],
			'obstetricia': ['Obstetricia', 'obstetrics'],
			'general': ['General', 'general'],
		};

		// Obtener todas las posibles claves para buscar una especialidad
		function getSpecialtyKeys(reportType: string): string[] {
			const normalized = reportType.toLowerCase().trim();
			const mapped = REPORT_TYPE_TO_SPECIALTY[normalized] || [];
			return [
				...new Set([
					reportType, // Original
					reportType.charAt(0).toUpperCase() + reportType.slice(1), // Capitalized
					...mapped, // Mapeadas
				])
			];
		}

		// Resolver plantilla según reportType
		let templateUrl: string | null = medicProfile.report_template_url;
		let templateName: string = medicProfile.report_template_name || 'Plantilla médica';

		// Parsear report_templates_by_specialty (puede venir como string desde Supabase)
		let specialtyTemplates: Record<string, { url?: string; template_url?: string; name?: string; template_name?: string }> | null = null;
		
		if (medicProfile.report_templates_by_specialty) {
			if (typeof medicProfile.report_templates_by_specialty === 'string') {
				try {
					specialtyTemplates = JSON.parse(medicProfile.report_templates_by_specialty);
				} catch (e) {
					console.warn('[N8N Internal] Error parseando report_templates_by_specialty como string:', e);
				}
			} else if (typeof medicProfile.report_templates_by_specialty === 'object') {
				specialtyTemplates = medicProfile.report_templates_by_specialty as Record<string, any>;
			}
		}

		// Intentar buscar la plantilla con diferentes variantes del reportType
		if (specialtyTemplates && reportType) {
			const specialtyKeys = getSpecialtyKeys(reportType);
			console.log('[N8N Internal] Buscando plantilla con claves:', specialtyKeys);
			console.log('[N8N Internal] Claves disponibles en report_templates_by_specialty:', Object.keys(specialtyTemplates));

			for (const key of specialtyKeys) {
				const template = specialtyTemplates[key];
				if (template) {
					// Soportar tanto 'url' como 'template_url'
					templateUrl = template.url || template.template_url || null;
					// Soportar tanto 'name' como 'template_name'
					templateName = template.name || template.template_name || templateName;
					
					if (templateUrl) {
						console.log(`[N8N Internal] ✅ Plantilla encontrada con clave: "${key}"`);
						break;
					}
				}
			}

			if (!templateUrl) {
				console.warn('[N8N Internal] ⚠️ No se encontró plantilla para reportType:', reportType);
				console.warn('[N8N Internal] Claves disponibles:', Object.keys(specialtyTemplates));
			}
		}

		if (!templateUrl) {
			console.error('[N8N Internal] No hay plantilla configurada para reportType:', reportType);
			return NextResponse.json(
				{ error: `No hay plantilla configurada para el tipo de informe "${reportType}"` },
				{ status: 400 }
			);
		}

		console.log('[N8N Internal] Plantilla obtenida:', {
			url: templateUrl.substring(0, 100) + '...',
			name: templateName,
			reportType,
			doctorId
		});

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
		const bucket = 'report-templates';

		console.log('[N8N Internal] Descargando plantilla desde:', templateUrl?.substring(0, 100) + '...');

		let templateBuffer: Buffer;

		try {
			// 1️⃣ Si viene signed URL → extraer bucket/path y regenerar
			if (templateUrl.includes('/object/sign/')) {
				console.log('[N8N Internal] Descargando desde signed URL...');
				const signedUrl = new URL(templateUrl);
				const match = signedUrl.pathname.match(
					/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)/
				);

				if (!match) {
					console.error('[N8N Internal] Signed URL inválida:', signedUrl.pathname);
					throw new Error('Signed URL inválida');
				}

				const bucketName = match[1];
				const path = decodeURIComponent(match[2]);
				console.log('[N8N Internal] Bucket:', bucketName, 'Path:', path);

				// 🔑 Generar NUEVA signed URL con service role
				const { data, error } =
					await supabaseAdmin.storage
						.from(bucketName)
						.createSignedUrl(path, 120); // 2 minutos

				if (error || !data?.signedUrl) {
					console.error('[N8N Internal] Error generando signed URL:', error);
					throw new Error(`No se pudo regenerar signed URL: ${error?.message || 'unknown error'}`);
				}

				console.log('[N8N Internal] Nueva signed URL generada, descargando...');
				const response = await fetch(data.signedUrl, { cache: 'no-store' });

				if (!response.ok) {
					const errorText = await response.text().catch(() => '');
					console.error('[N8N Internal] Error descargando desde signed URL:', {
						status: response.status,
						statusText: response.statusText,
						error: errorText.substring(0, 200)
					});
					throw new Error(`Error descargando plantilla (signed URL): ${response.status} ${response.statusText}`);
				}

				templateBuffer = Buffer.from(await response.arrayBuffer());
				console.log('[N8N Internal] ✅ Archivo descargado desde signed URL, tamaño:', templateBuffer.length, 'bytes');
			}
			// 2️⃣ URL pública → descarga directa
			else if (templateUrl.startsWith('http://') || templateUrl.startsWith('https://')) {
				console.log('[N8N Internal] Descargando desde URL pública...');
				const response = await fetch(templateUrl, {
					cache: 'no-store',
					headers: {
						'Cache-Control': 'no-cache, no-store, must-revalidate',
						'Pragma': 'no-cache',
						'Expires': '0'
					}
				});
				
				if (!response.ok) {
					throw new Error(`Error descargando plantilla: ${response.status} ${response.statusText}`);
				}
				
				templateBuffer = Buffer.from(await response.arrayBuffer());
				console.log('[N8N Internal] ✅ Archivo descargado desde URL pública, tamaño:', templateBuffer.length, 'bytes');
			}
			// 3️⃣ Path relativo → extraer y descargar desde storage
			else {
				console.log('[N8N Internal] Descargando desde path relativo...');
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
				console.log('[N8N Internal] Bucket:', bucket, 'Path:', filePath);

				const { data, error } =
					await supabaseAdmin.storage.from(bucket).download(filePath);

				if (error) {
					console.error('[N8N Internal] Error descargando desde storage:', {
						error: error.message,
						statusCode: (error as any).statusCode,
						bucket,
						filePath
					});
					throw new Error(`Error descargando plantilla (storage): ${error.message}`);
				}

				if (!data) {
					console.error('[N8N Internal] No se recibió data del storage');
					throw new Error('Error descargando plantilla: respuesta vacía');
				}

				templateBuffer = Buffer.from(await data.arrayBuffer());
				console.log('[N8N Internal] ✅ Archivo descargado desde storage, tamaño:', templateBuffer.length, 'bytes');
			}
		} catch (downloadError: any) {
			console.error('[N8N Internal] Error completo al descargar plantilla:', {
				message: downloadError.message,
				stack: downloadError.stack,
				templateUrl: templateUrl?.substring(0, 200)
			});
			throw new Error(`Error descargando plantilla: ${downloadError.message}`);
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
		// Los datos del audio vienen estructurados en extractedFields
		const toUpper = (val: any): string => {
			if (!val || val === '' || val === null || val === undefined) return '';
			if (typeof val === 'string') return val.toUpperCase();
			if (typeof val === 'boolean') return val ? 'SÍ' : 'NO';
			return String(val).toUpperCase();
		};

		// NO construir contenido estructurado - la plantilla ya tiene su formato
		// Solo rellenar las variables {{}} de la plantilla con los datos del audio
		// NO generar texto nuevo, solo mapear datos a variables
		
		// Función para mapear recursivamente todos los campos de extractedFields a variables de plantilla
		function mapAllFieldsToTemplate(data: any, prefix: string = ''): Record<string, string> {
			const result: Record<string, string> = {};
			
			if (!data || typeof data !== 'object' || Array.isArray(data) || data instanceof Date) {
				return result;
			}
			
			for (const [key, value] of Object.entries(data)) {
				if (value === null || value === undefined) continue;
				
				const fullKey = prefix ? `${prefix}_${key}` : key;
				
				// Si es un objeto anidado, mapear recursivamente
				if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
					// Mapear recursivamente el objeto anidado
					const nested = mapAllFieldsToTemplate(value, fullKey);
					Object.assign(result, nested);
					
					// También crear variables directas para cada campo anidado
					// Ejemplo: ginecologicos.ultima_regla -> ginecologicos_ultima_regla, ultima_regla, FUR, etc.
					for (const [nestedKey, nestedValue] of Object.entries(value)) {
						if (nestedValue === null || nestedValue === undefined) continue;
						
						if (typeof nestedValue !== 'object' || Array.isArray(nestedValue) || nestedValue instanceof Date) {
							// Variable con prefijo completo (ej: ginecologicos_ultima_regla)
							result[fullKey + '_' + nestedKey] = toUpper(nestedValue);
							
							// Variable sin prefijo (ej: ultima_regla) - solo si no existe ya
							if (!result[nestedKey]) {
								result[nestedKey] = toUpper(nestedValue);
							}
							
							// Variantes en mayúsculas y minúsculas
							result[nestedKey.toUpperCase()] = toUpper(nestedValue);
							result[nestedKey.toLowerCase()] = toUpper(nestedValue);
							result[(fullKey + '_' + nestedKey).toUpperCase()] = toUpper(nestedValue);
							result[(fullKey + '_' + nestedKey).toLowerCase()] = toUpper(nestedValue);
							
							// Variantes sin guiones bajos
							const keyNoUnderscore = nestedKey.replace(/_/g, '');
							result[keyNoUnderscore] = toUpper(nestedValue);
							result[keyNoUnderscore.toUpperCase()] = toUpper(nestedValue);
							result[keyNoUnderscore.toLowerCase()] = toUpper(nestedValue);
						}
					}
				} else {
					// Variable directa (no anidada)
					result[fullKey] = toUpper(value);
					
					// Crear variantes en diferentes formatos
					result[fullKey.toUpperCase()] = toUpper(value);
					result[fullKey.toLowerCase()] = toUpper(value);
					
					// Variantes sin guiones bajos
					const keyNoUnderscore = fullKey.replace(/_/g, '');
					result[keyNoUnderscore] = toUpper(value);
					result[keyNoUnderscore.toUpperCase()] = toUpper(value);
					result[keyNoUnderscore.toLowerCase()] = toUpper(value);
				}
			}
			
			return result;
		}
		
		// Mapear TODAS las variables desde extractedFields
		const allMappedFields = mapAllFieldsToTemplate(extractedFields);
		
		// Mapeo específico para variables comunes que pueden estar en diferentes lugares
		// Esto asegura que variables como FUR, método anticonceptivo, etc. se encuentren
		// sin importar dónde estén en la estructura de datos
		const commonVariableMappings: Record<string, string> = {
			// FUR / Última regla (puede estar en ginecologicos.ultima_regla o en raíz)
			fur: toUpper(
				extractedFields?.ginecologicos?.ultima_regla ||
				extractedFields?.ultima_regla ||
				extractedFields?.fur ||
				''
			),
			FUR: toUpper(
				extractedFields?.ginecologicos?.ultima_regla ||
				extractedFields?.ultima_regla ||
				extractedFields?.fur ||
				''
			),
			ultima_regla: toUpper(
				extractedFields?.ginecologicos?.ultima_regla ||
				extractedFields?.ultima_regla ||
				extractedFields?.fur ||
				''
			),
			ULTIMA_REGLA: toUpper(
				extractedFields?.ginecologicos?.ultima_regla ||
				extractedFields?.ultima_regla ||
				extractedFields?.fur ||
				''
			),
			// Historia obstétrica / HO
			ho: toUpper(
				extractedFields?.ginecologicos?.historia_obstetrica ||
				extractedFields?.historia_obstetrica ||
				extractedFields?.ho ||
				''
			),
			HO: toUpper(
				extractedFields?.ginecologicos?.historia_obstetrica ||
				extractedFields?.historia_obstetrica ||
				extractedFields?.ho ||
				''
			),
			historia_obstetrica: toUpper(
				extractedFields?.ginecologicos?.historia_obstetrica ||
				extractedFields?.historia_obstetrica ||
				extractedFields?.ho ||
				''
			),
			HISTORIA_OBSTETRICA: toUpper(
				extractedFields?.ginecologicos?.historia_obstetrica ||
				extractedFields?.historia_obstetrica ||
				extractedFields?.ho ||
				''
			),
			// Método anticonceptivo
			metodo_anticonceptivo: toUpper(
				extractedFields?.ginecologicos?.metodo_anticonceptivo ||
				extractedFields?.metodo_anticonceptivo ||
				''
			),
			método_anticonceptivo: toUpper(
				extractedFields?.ginecologicos?.metodo_anticonceptivo ||
				extractedFields?.metodo_anticonceptivo ||
				''
			),
			METODO_ANTICONCEPTIVO: toUpper(
				extractedFields?.ginecologicos?.metodo_anticonceptivo ||
				extractedFields?.metodo_anticonceptivo ||
				''
			),
		};
		
		// Preparar datos base para plantilla
		// NO generar contenido estructurado - solo rellenar variables {{}} de la plantilla
		const baseTemplateData: Record<string, string> = {
			contenido: '', // NO usar - la plantilla tiene su propio formato
			content: '', // NO usar - la plantilla tiene su propio formato
			informe: '', // NO usar - la plantilla tiene su propio formato
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
			diagnostico: toUpper(extractedFields?.diagnosis || extractedFields?.diagnostico || ''),
			diagnosis: toUpper(extractedFields?.diagnosis || extractedFields?.diagnostico || ''),
			motivo: toUpper(extractedFields?.motivo || extractedFields?.motivo_consulta || extractedFields?.historia_enfermedad_actual || ''),
			complaint: toUpper(extractedFields?.motivo || extractedFields?.motivo_consulta || ''),
			notas: toUpper(extractedFields?.notas || extractedFields?.notes || ''),
			notes: toUpper(extractedFields?.notas || extractedFields?.notes || ''),
			// Plan de tratamiento del audio
			plan: toUpper(extractedFields?.plan || extractedFields?.plan_tratamiento || ''),
			plan_tratamiento: toUpper(extractedFields?.plan || extractedFields?.plan_tratamiento || ''),
			// Mapeo de variables comunes (tiene prioridad)
			...commonVariableMappings,
			// Incluir TODAS las variables mapeadas dinámicamente
			...allMappedFields,
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
			// Ginecología - mapear todas las variables desde extractedFields según la plantilla
			// Extraer datos anidados correctamente
			const gyn = extractedFields?.ginecologicos || {};
			const exam = extractedFields?.examen_fisico || {};
			const ant = extractedFields?.antecedentes || {};
			const eco = extractedFields?.ecografia || {};
			const mamas = exam.mamas || {};
			const tacto = exam.tacto || {};
			
			// Mapeo explícito según los nombres de variables de la plantilla del usuario
			const explicitMappings: Record<string, string> = {
				// Variables de la plantilla del usuario
				historia_enfermedad_actual: toUpper(extractedFields?.motivo_consulta || extractedFields?.historia_enfermedad_actual || ''),
				alergicos: toUpper(ant.alergias || ''),
				quirurgicos: toUpper(ant.quirurgicos || ''),
				antecedentes_madre: toUpper(ant.madre || ''),
				antecedentes_padre: toUpper(ant.padre || ''),
				antecedentes_cancer_mama: ant.cancer_mama !== undefined ? (ant.cancer_mama ? 'SÍ' : 'NO') : '',
				its: toUpper(gyn.its || ''),
				tipo_menstruacion: toUpper(gyn.menstruacion_tipo || ''),
				patron_menstruacion: toUpper(gyn.menstruacion_tipo || ''),
				dismenorrea: gyn.dismenorrea !== undefined ? (gyn.dismenorrea ? 'SÍ' : 'NO') : '',
				primera_relacion_sexual: toUpper(gyn.primera_relacion || ''),
				parejas_sexuales: gyn.parejas_sexuales !== undefined ? String(gyn.parejas_sexuales) : '',
				condiciones_generales: toUpper(exam.condiciones_generales || ''),
				tamano_mamas: toUpper(mamas.tamaño || mamas.tamano || ''),
				simetria_mamas: toUpper(mamas.simetria || ''),
				cap_mamas: toUpper(mamas.cap || ''),
				secrecion_mamas: toUpper(mamas.secrecion || ''),
				fosas_axilares: toUpper(exam.fosas_axilares || ''),
				abdomen: toUpper(exam.abdomen || ''),
				genitales_externos: toUpper(exam.genitales_externos || ''),
				especuloscopia: toUpper(exam.especuloscopia || ''),
				tacto_cervix: toUpper(tacto.cervix || ''),
				fondo_sacos: toUpper(tacto.fondo_sacos || ''),
				anexos: toUpper(tacto.anexos || ''),
				dimensiones_utero: toUpper(eco.utero_dimensiones || ''),
				interfase_endometrial: toUpper(eco.interfase_endometrial || ''),
				tipo_interfase_endometrial: toUpper(eco.interfase_endometrial || ''),
				dimensiones_ovario_izquierdo: toUpper(eco.ovario_izquierdo || ''),
				dimensiones_ovario_derecho: toUpper(eco.ovario_derecho || ''),
				liquido_fondo_saco: toUpper(eco.liquido_fondo_saco || ''),
				// Variantes comunes (FUR, método anticonceptivo, etc.)
				ultima_regla: toUpper(gyn.ultima_regla || extractedFields?.ultima_regla || extractedFields?.fur || ''),
				fur: toUpper(gyn.ultima_regla || extractedFields?.ultima_regla || extractedFields?.fur || ''),
				FUR: toUpper(gyn.ultima_regla || extractedFields?.ultima_regla || extractedFields?.fur || ''),
				ULTIMA_REGLA: toUpper(gyn.ultima_regla || extractedFields?.ultima_regla || extractedFields?.fur || ''),
				ho: toUpper(gyn.historia_obstetrica || extractedFields?.historia_obstetrica || extractedFields?.ho || ''),
				HO: toUpper(gyn.historia_obstetrica || extractedFields?.historia_obstetrica || extractedFields?.ho || ''),
				historia_obstetrica: toUpper(gyn.historia_obstetrica || extractedFields?.historia_obstetrica || ''),
				HISTORIA_OBSTETRICA: toUpper(gyn.historia_obstetrica || extractedFields?.historia_obstetrica || ''),
				metodo_anticonceptivo: toUpper(gyn.metodo_anticonceptivo || extractedFields?.metodo_anticonceptivo || ''),
				método_anticonceptivo: toUpper(gyn.metodo_anticonceptivo || extractedFields?.metodo_anticonceptivo || ''),
				METODO_ANTICONCEPTIVO: toUpper(gyn.metodo_anticonceptivo || extractedFields?.metodo_anticonceptivo || ''),
				// Variantes adicionales para compatibilidad
				mamas_tamaño: toUpper(mamas.tamaño || mamas.tamano || ''),
				mamas_tamano: toUpper(mamas.tamaño || mamas.tamano || ''),
				mamas_simetria: toUpper(mamas.simetria || ''),
				mamas_cap: toUpper(mamas.cap || ''),
				mamas_secrecion: toUpper(mamas.secrecion || ''),
				menstruacion_tipo: toUpper(gyn.menstruacion_tipo || ''),
				primera_relacion: toUpper(gyn.primera_relacion || ''),
				utero_dimensiones: toUpper(eco.utero_dimensiones || ''),
				ovario_izquierdo: toUpper(eco.ovario_izquierdo || ''),
				ovario_derecho: toUpper(eco.ovario_derecho || ''),
				// Colposcopia (si está en los datos)
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
			
			// Combinar mapeo explícito con mapeo dinámico
			templateDataObj = {
				...baseTemplateData,
				...explicitMappings,
			};
		}

		// Log para debugging: mostrar cuántas variables se mapearon
		const totalVariables = Object.keys(templateDataObj).length;
		console.log(`[N8N Internal] Total de variables mapeadas para plantilla: ${totalVariables}`);
		console.log(`[N8N Internal] Primeras 20 variables:`, Object.keys(templateDataObj).slice(0, 20).join(', '));
		
		// Verificar que tenemos las variables más comunes
		const commonVars = ['fur', 'FUR', 'ultima_regla', 'metodo_anticonceptivo', 'ho', 'HO', 'contenido'];
		const missingVars = commonVars.filter(v => !templateDataObj[v] && templateDataObj[v] !== '');
		if (missingVars.length > 0) {
			console.warn(`[N8N Internal] Variables comunes no encontradas:`, missingVars);
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

