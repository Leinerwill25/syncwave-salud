// app/api/n8n/generate-report-internal/route.ts
// Endpoint interno para que n8n genere el informe después de procesar el audio
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign, HeadingLevel } from 'docx';

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
		console.log('[N8N Internal] Recibido extractedFields:', JSON.stringify(extractedFields).substring(0, 1000));
		console.log('[N8N Internal] Structure check:', Object.keys(extractedFields).map(k => `${k}: ${typeof extractedFields[k]} ${JSON.stringify(extractedFields[k]).substring(0, 50)}`));
		console.log('[N8N Internal] Recibido transcription length:', transcription?.length || 0);

		if (!extractedFields || (typeof extractedFields === 'object' && Object.keys(extractedFields).length === 0)) {
			console.error('[N8N Internal] extractedFields está vacío o es inválido');
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
			.select('report_template_url, report_template_name, report_template_text, report_templates_by_specialty, report_font_family')
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

		// Obtener configuración de informe genérico (nueva tabla)
		const { data: genericConfig } = await supabaseAdmin
			.from('medical_report_templates')
			.select('template_text, logo_url, header_text, footer_text, primary_color, secondary_color, font_family')
			.eq('user_id', doctorId)
			.maybeSingle();

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
		let templateText: string | null = medicProfile.report_template_text || null;

		// Prioridad: 1. genericConfig.template_text, 2. medicProfile.report_template_text
		if (genericConfig?.template_text) {
			templateText = genericConfig.template_text;
		}

		// Parsear report_templates_by_specialty (puede venir como string desde Supabase)
		let specialtyTemplates: Record<string, { url?: string; template_url?: string; name?: string; template_name?: string; template_text?: string }> | null = null;
		
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
					// Extraer template_text si existe (tiene prioridad sobre el del nivel superior)
					if (template.template_text) {
						templateText = template.template_text;
						console.log(`[N8N Internal] ✅ Template text encontrado en especialidad "${key}" (primeros 100 chars):`, templateText.substring(0, 100));
					}
					
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
			// Si hay texto de plantilla, permitimos continuar (generaremos un DOCX base)
			if (templateText) {
				console.log('[N8N Internal] No hay URL de plantilla, pero hay texto de plantilla. Se generará DOCX base.');
			} else {
				console.error('[N8N Internal] No hay plantilla configurada para reportType:', reportType);
				return NextResponse.json(
					{ error: `No hay plantilla configurada para el tipo de informe "${reportType}"` },
					{ status: 400 }
				);
			}
		}

		console.log('[N8N Internal] Plantilla obtenida:', {
			url: templateUrl?.substring(0, 100) + '...' || 'Sin URL (Texto)',
			name: templateName,
			reportType,
			doctorId,
			hasTemplateText: !!templateText,
			templateTextLength: templateText?.length || 0,
			templateTextPreview: templateText ? templateText.substring(0, 150) + '...' : 'No disponible'
		});

		// IMPORTANTE: NO actualizar vitals de la consulta con datos del audio
		// Solo usar extractedFields del audio para generar el informe
		// No mezclar con datos predeterminados del formulario

		// Obtener datos del paciente
		let patientName = 'Paciente no registrado';
		let patientId = 'N/A';
		let patientPhone = 'N/A';
		let patientEmail = 'N/A';
		let patientAge = 'N/A';
		let patientGender = '';

		if (consultation.patient_id) {
			const { data: patientData } = await supabaseAdmin
				.from('patient')
				.select('firstName, lastName, identifier, phone, dob, gender, email')
				.eq('id', consultation.patient_id)
				.maybeSingle();

			if (patientData) {
				patientName = `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Paciente';
				patientId = patientData.identifier || 'N/A';
				patientPhone = patientData.phone || 'N/A';
				patientEmail = patientData.email || 'N/A';
				patientGender = patientData.gender || '';
				patientAge = calculateAge(patientData.dob);
			}
		} else if (consultation.unregistered_patient_id) {
			const { data: unregisteredPatient } = await supabaseAdmin
				.from('unregisteredpatients')
				.select('first_name, last_name, identification, phone, birth_date, sex, email')
				.eq('id', consultation.unregistered_patient_id)
				.maybeSingle();

			if (unregisteredPatient) {
				patientName = `${unregisteredPatient.first_name || ''} ${unregisteredPatient.last_name || ''}`.trim() || 'Paciente no registrado';
				patientId = unregisteredPatient.identification || 'N/A';
				patientPhone = unregisteredPatient.phone || 'N/A';
				patientEmail = unregisteredPatient.email || 'N/A';
				patientGender = unregisteredPatient.sex || '';
				patientAge = calculateAge(unregisteredPatient.birth_date);
			}
		}

		// Obtener datos del médico
		let doctorName = 'Médico';
		const { data: doctorData } = await supabaseAdmin
			.from('users')
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

		// Preparar fecha del informe (hoy) y de consulta
		const reportDate = new Date().toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});

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
			: reportDate;

		// Descargar plantilla Word
		const bucket = 'report-templates';

		console.log('[N8N Internal] Descargando plantilla desde:', templateUrl?.substring(0, 100) + '...');

		let templateBuffer: Buffer = Buffer.alloc(0);


		// Consolidar estilos y textos desde la configuración - Sincronizado con dashboard
		const primaryColor = (genericConfig?.primary_color || "#0F172A").replace('#', '');
		const secondaryColor = (genericConfig?.secondary_color || "#3B82F6").replace('#', '');
		const fontFamily = genericConfig?.font_family || medicProfile.report_font_family || "Arial";
		const headerText = genericConfig?.header_text || doctorName || "INFORME MÉDICO";
		const footerText = genericConfig?.footer_text || `Generado el ${reportDate}`;

		// Función auxiliar robusta para convertir a string
		const toUpper = (val: any): string => {
			if (val === null || val === undefined) return '';
			if (typeof val === 'string') return val.toUpperCase();
			if (typeof val === 'boolean') return val ? 'SÍ' : 'NO';
            if (Array.isArray(val)) {
                return val.map((item: any) => toUpper(item)).join(', ');
            }
			if (typeof val === 'object') {
				// Intentar extraer texto de objetos comunes de N8N/AI
				if (val.text) return String(val.text).toUpperCase();
				if (val.content) return String(val.content).toUpperCase();
				if (val.value) return String(val.value).toUpperCase();
                if (val.json) return toUpper(val.json);
                
				try {
					const str = JSON.stringify(val);
					if (str === '{}' || str === '[]') return '';
					return Object.values(val)
                        .map(v => {
                            if (typeof v === 'object' && v !== null) return ''; 
                            return String(v);
                        })
                        .filter(v => v !== '')
                        .join(', ')
                        .toUpperCase();
				} catch {
					return '';
				}
			}
			return String(val).toUpperCase();
		};

		try {


		// 0️⃣ Si no hay URL pero si texto → Generar DOCX base al vuelo con estilos
		// 0️⃣ Si no hay URL pero si texto → Generar DOCX base al vuelo con estilos
        if (!templateUrl && templateText) {
			console.log('[N8N Internal] Generando DOCX base al vuelo con estilos y logo (Layout Mejorado V2)...');
			
            // Utilizar constantes consolidadas arriba

            // --- HEADER CONSTRUCTION ---
			const headerChildren: any[] = [];
            
            // Header Text Components
            const doctorNameText = new TextRun({
                text: headerText,
                bold: true,
                font: fontFamily,
                size: 28, // 14pt
            });
            
            const dateText = new TextRun({
                text: new Date().toLocaleDateString('es-ES'),
                font: fontFamily,
                color: "666666",
                size: 20, // 10pt
            });

            // Logica del Logo
            let logoImageRun: ImageRun | undefined;
			if (genericConfig?.logo_url) {
                try {
                    console.log('[N8N Internal] Descargando logo para cabecera:', genericConfig.logo_url);
                    const logoResp = await fetch(genericConfig.logo_url);
                    if (logoResp.ok) {
                        const logoBuffer = await logoResp.arrayBuffer();
                        logoImageRun = new ImageRun({
                            data: logoBuffer,
                            transformation: {
                                width: 80,
                                height: 80,
                            },
                            type: "png",
                        });
                    }
                } catch (e) {
                    console.error('[N8N Internal] Error descargando logo:', e);
                }
            }

            // Header Grid: 
            // Left Column: Logo (if exists) stacked with Doctor Name
            // Right Column: Date
            const headerRows = [];
            
            if (logoImageRun) {
                 headerRows.push(
                    new TableRow({
                        children: [
                            // Left Cell: Logo + Doctor Name
                            new TableCell({
                                children: [
                                    new Paragraph({ children: [logoImageRun] }),
                                    new Paragraph({ spacing: { before: 100 }, children: [doctorNameText] })
                                ],
                                width: { size: 70, type: WidthType.PERCENTAGE },
                                verticalAlign: VerticalAlign.BOTTOM,
                                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, color: secondaryColor, size: 6 }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                            }),
                            // Right Cell: Date
                            new TableCell({
                                children: [
                                    new Paragraph({ alignment: AlignmentType.RIGHT, children: [dateText] })
                                ],
                                width: { size: 30, type: WidthType.PERCENTAGE },
                                verticalAlign: VerticalAlign.BOTTOM,
                                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, color: secondaryColor, size: 6 }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                            }),
                        ]
                    })
                );
            } else {
                 headerRows.push(
                    new TableRow({
                        children: [
                            // Left Cell: Just Doctor Name
                            new TableCell({
                                children: [
                                    new Paragraph({ children: [doctorNameText] })
                                ],
                                width: { size: 70, type: WidthType.PERCENTAGE },
                                verticalAlign: VerticalAlign.BOTTOM,
                                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, color: secondaryColor, size: 6 }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                            }),
                            // Right Cell: Date
                            new TableCell({
                                children: [
                                    new Paragraph({ alignment: AlignmentType.RIGHT, children: [dateText] })
                                ],
                                width: { size: 30, type: WidthType.PERCENTAGE },
                                verticalAlign: VerticalAlign.BOTTOM,
                                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, color: secondaryColor, size: 6 }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                            }),
                        ]
                    })
                );
            }

            headerChildren.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                rows: headerRows
            }));
            
            // Spacer
            headerChildren.push(new Paragraph({ spacing: { after: 200 } }));

			const headers = {
				default: new Header({
					children: headerChildren
				})
			};

			// Configurar Footer
			const footers = {
				default: new Footer({
					children: [
						new Paragraph({
                            border: {
                                top: { color: "E5E7EB", space: 10, style: BorderStyle.SINGLE, size: 6 }
                            },
							alignment: AlignmentType.CENTER,
							children: [
								new TextRun({
									text: footerText,
									font: fontFamily,
									size: 16, // 8pt
									color: "666666"
								})
							]
						})
					]
				})
			};

            // --- BODY CONSTRUCTION ---
			const children: any[] = [];
            
            // 1. Title
            children.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 400 },
                children: [
                    new TextRun({
                        text: "INFORME MÉDICO",
                        bold: true,
                        font: fontFamily,
                        color: primaryColor,
                        size: 32, // 16pt
                    })
                ]
            }));

            // 2. Patient Info Grid (2x2)
            // Paciente: {{paciente}}   Edad: {{edad}}
            // Cédula: {{cedula}}       Fecha: {{fecha}}
            children.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE } },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: "Paciente: ", bold: true, color: primaryColor, font: fontFamily }),
                                            new TextRun({ text: "{{paciente}}", font: fontFamily })
                                        ]
                                    })
                                ],
                                width: { size: 50, type: WidthType.PERCENTAGE }
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: "Edad: ", bold: true, color: primaryColor, font: fontFamily }),
                                            new TextRun({ text: "{{edad}}", font: fontFamily })
                                        ]
                                    })
                                ],
                                width: { size: 50, type: WidthType.PERCENTAGE }
                            })
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: "Cédula: ", bold: true, color: primaryColor, font: fontFamily }),
                                            new TextRun({ text: "{{cedula}}", font: fontFamily })
                                        ]
                                    })
                                ],
                                width: { size: 50, type: WidthType.PERCENTAGE }
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: "Fecha: ", bold: true, color: primaryColor, font: fontFamily }),
                                            new TextRun({ text: "{{fecha}}", font: fontFamily })
                                        ]
                                    })
                                ],
                                width: { size: 50, type: WidthType.PERCENTAGE }
                            })
                        ]
                    })
                ]
            }));

            children.push(new Paragraph({ spacing: { after: 400 } })); // Spacer after grid

            // 3. Smart Body Parser
            // Split templateText by lines. If line has {{var}}, it's content. If not, it's a Title.
            const lines = templateText.split('\n');
            
            for (const line of lines) {
                if (!line.trim()) {
                    children.push(new Paragraph({ spacing: { after: 100 } })); // Empty line spacing
                    continue;
                }

                if (line.includes('{{')) {
                    // Content Line (Normal Text)
                    children.push(new Paragraph({
                        children: [
                            new TextRun({
                                text: line,
                                font: fontFamily,
                                size: 24, // 12pt
                            })
                        ],
                        spacing: { after: 200 }
                    }));
                } else {
                    // Title Line (Styled: Blue + Bottom Border)
                    children.push(new Paragraph({
                        children: [
                            new TextRun({
                                text: line,
                                bold: true,
                                color: primaryColor,
                                font: fontFamily,
                                size: 24 // 12pt
                            })
                        ],
                        border: {
                            bottom: { color: secondaryColor, space: 1, style: BorderStyle.SINGLE, size: 6 }
                        },
                        spacing: { before: 200, after: 100 }
                    }));
                }
            }

			const doc = new Document({
				sections: [{
					properties: {},
					headers: headers,
					footers: footers,
					children: children
				}]
			});
			
			const buffer = await Packer.toBuffer(doc);
			templateBuffer = buffer as Buffer;
			console.log('[N8N Internal] ✅ DOCX base generado con estilos (Enhanced), tamaño:', templateBuffer.length);
		}
			// 1️⃣ Si viene signed URL → extraer bucket/path y regenerar
			else if (templateUrl && templateUrl.includes('/object/sign/')) {
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
			else if (templateUrl && (templateUrl.startsWith('http://') || templateUrl.startsWith('https://'))) {
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
			else if (templateUrl) {
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
						}
					}

                    // ✨ MAGIA: Si el objeto tiene una propiedad "descripcion", usarla como valor directo
                    // Esto arregla el problema de [OBJECT OBJECT] para motivo_de_consulta: { descripcion: "..." }
                    if (value && typeof value === 'object' && 'descripcion' in value) {
                        const desc = (value as any).descripcion;
                        result[fullKey] = toUpper(desc);
                        // Si es una variable clave, mapearla sin prefijo también
                        if (!result[key]) result[key] = toUpper(desc);
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
		
		// Mapeos adicionales para Ginecología y Signos Vitales
		const extraGynecologyMappings: Record<string, string> = {
			// Hipersensibilidad
			hipersensibilidad: toUpper(extractedFields?.ginecologicos?.hypersensitivity || extractedFields?.hypersensitivity || ''),
			
			// Hábitos Psicobiológicos
			habitos_psicobiologicos: toUpper(extractedFields?.ginecologicos?.psychobiological_habits || extractedFields?.psychobiological_habits || ''),
			
			// Menarquía
			menarquia: toUpper(extractedFields?.ginecologicos?.menarche || extractedFields?.menarche || ''),
			
			// Última Citología
			ultima_citologia: toUpper(extractedFields?.ginecologicos?.last_cytology || extractedFields?.last_cytology || ''),
			
			// Mastopatías
			mastopatias: toUpper(extractedFields?.ginecologicos?.mastopathies || extractedFields?.mastopathies || ''),
			
			// Pareja Actual
			pareja_actual: toUpper(extractedFields?.ginecologicos?.current_partner || extractedFields?.current_partner || ''),
			
			// Gardasil / VPH
			gardasil: toUpper(extractedFields?.ginecologicos?.gardasil || extractedFields?.gardasil || ''),
			
			// Peso (Buscar en vitals o raíz)
			peso: toUpper(extractedFields?.vitals?.weight || extractedFields?.weight || extractedFields?.peso || ''),
			
			// Tensión Arterial (Buscar en vitals o raíz)
			tension_arterial: toUpper(extractedFields?.vitals?.bloodPressure || extractedFields?.bloodPressure || extractedFields?.tension_arterial || extractedFields?.ta || ''),
			
			// Secreción Mamas
			secrecion_mamas: toUpper(extractedFields?.ginecologicos?.breast_secretion || extractedFields?.breast_secretion || extractedFields?.secrecion_mamas || ''),
			
			// Colposcopia Realizada (Check if colposcopy data exists)
			colposcopia_realizada: (extractedFields?.ginecologicos?.colposcopy || extractedFields?.colposcopy) ? 'SÍ' : 'NO',
		};

        const allCustomMappings = { ...commonVariableMappings, ...extraGynecologyMappings };
		
		// Plantilla de texto para construir {{contenido}}
		// Función para reemplazar variables en una plantilla de texto
		function replaceTemplateVars(template: string, data: Record<string, string>): string {
			return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
				return data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
			});
		}

		// Preparar datos base para plantilla
		// NOTA: contenido se construirá después de mapear todas las variables
		const baseTemplateData: Record<string, string> = {
			// Mapeos de variables comunes (pueden ser sobrescritos si están en la BD)
			...allCustomMappings,
			// Incluir TODAS las variables mapeadas dinámicamente desde el audio
			...allMappedFields,
			
            // --- PRIORIDAD: Datos del sistema/BD que NO deben ser sobrescritos por la IA ---
			contenido: '', 
			content: '', 
			informe: '', 
			fecha: reportDate, // Fecha de emisión del informe (hoy)
			fecha_consulta: consultationDate, // Fecha en que ocurrió la consulta
			date: reportDate,
			paciente: patientName.toUpperCase(),
			patient: patientName.toUpperCase(),
			edad: patientAge,
			age: patientAge,
			cedula: patientId,
			identificacion: patientId,
			telefono: patientPhone,
			phone: patientPhone,
			email: patientEmail,
			correo: patientEmail,
			medico: doctorName.toUpperCase(),
			doctor: doctorName.toUpperCase(),
			
			// Variables de configuración de informe
			header_text: headerText,
			footer_text: footerText,
			header: headerText,
			footer: footerText,
			font_family: fontFamily,
			primary_color: `#${primaryColor}`,
			secondary_color: `#${secondaryColor}`,
			
			// Motivo y Plan: Se extraen del audio pero tienen fallback en baseTemplateData
			diagnostico: allMappedFields['diagnosis'] || allMappedFields['diagnostico'] || '',
			diagnosis: allMappedFields['diagnosis'] || allMappedFields['diagnostico'] || '',
			
			motivo: allMappedFields['motivo'] || allMappedFields['motivo_consulta'] || allMappedFields['complaint'] || allMappedFields['historia_enfermedad_actual'] || allMappedFields['presentacion'] || '',
			complaint: allMappedFields['motivo'] || allMappedFields['motivo_consulta'] || allMappedFields['complaint'] || allMappedFields['historia_enfermedad_actual'] || allMappedFields['presentacion'] || '',
			
			notas: allMappedFields['notas'] || allMappedFields['notes'] || '',
			notes: allMappedFields['notas'] || allMappedFields['notes'] || '',
			
			plan: allMappedFields['plan'] || allMappedFields['plan_tratamiento'] || allMappedFields['tratamiento'] || '',
			plan_tratamiento: allMappedFields['plan'] || allMappedFields['plan_tratamiento'] || allMappedFields['tratamiento'] || '',
			tratamiento: allMappedFields['tratamiento'] || allMappedFields['treatment'] || allMappedFields['plan'] || allMappedFields['plan_tratamiento'] || '',
			treatment: allMappedFields['tratamiento'] || allMappedFields['treatment'] || allMappedFields['plan'] || allMappedFields['plan_tratamiento'] || '',
		};

		// Construir templateDataObj según tipo de informe
		let templateDataObj: Record<string, string>;
		if (reportType === 'first_trimester') {
			// Usar datos procesados de allMappedFields
			templateDataObj = {
				...baseTemplateData,
				edad_gestacional: allMappedFields['edad_gestacional'] || '',
				fur: allMappedFields['fur'] || allMappedFields['ultima_regla'] || '',
				fpp: allMappedFields['fpp'] || '',
				gestas: allMappedFields['gestas'] || '',
				paras: allMappedFields['paras'] || '',
				cesareas: allMappedFields['cesareas'] || '',
				abortos: allMappedFields['abortos'] || '',
				otros: allMappedFields['otros'] || '',
				motivo_consulta: allMappedFields['motivo_consulta'] || allMappedFields['motivo'] || baseTemplateData.motivo || '',
				referencia: allMappedFields['referencia'] || '',
				posicion: allMappedFields['posicion'] || '',
				superficie: allMappedFields['superficie'] || '',
				miometrio: allMappedFields['miometrio'] || '',
				endometrio: allMappedFields['endometrio'] || '',
				ovario_derecho: allMappedFields['ovario_derecho'] || '',
				ovario_izquierdo: allMappedFields['ovario_izquierdo'] || '',
				anexos_ecopatron: allMappedFields['anexos_ecopatron'] || '',
				fondo_de_saco: allMappedFields['fondo_de_saco'] || '',
				cuerpo_luteo: allMappedFields['cuerpo_luteo'] || '',
				gestacion: allMappedFields['gestacion'] || '',
				localizacion: allMappedFields['localizacion'] || '',
				vesicula: allMappedFields['vesicula'] || '',
				cavidad_exocelomica: allMappedFields['cavidad_exocelomica'] || '',
				embrion_visto: allMappedFields['embrion_visto'] || '',
				ecoanatomia: allMappedFields['ecoanatomia'] || '',
				lcr: allMappedFields['lcr'] || '',
				acorde_a: allMappedFields['acorde_a'] || '',
				actividad_cardiaca: allMappedFields['actividad_cardiaca'] || '',
				movimientos_embrionarios: allMappedFields['movimientos_embrionarios'] || '',
				conclusiones: allMappedFields['conclusiones'] || '',
			};
		} else if (reportType === 'second_third_trimester') {
			// Usar datos procesados de allMappedFields
			templateDataObj = {
				...baseTemplateData,
				edad_gestacional: allMappedFields['edad_gestacional'] || '',
				fur: allMappedFields['fur'] || allMappedFields['ultima_regla'] || '',
				fpp: allMappedFields['fpp'] || '',
				gestas: allMappedFields['gestas'] || '',
				paras: allMappedFields['paras'] || '',
				cesareas: allMappedFields['cesareas'] || '',
				abortos: allMappedFields['abortos'] || '',
				otros: allMappedFields['otros'] || '',
				motivo_consulta: allMappedFields['motivo_consulta'] || allMappedFields['motivo'] || baseTemplateData.motivo || '',
				referencia: allMappedFields['referencia'] || '',
				num_fetos: allMappedFields['num_fetos'] || '',
				actividad_cardiaca: allMappedFields['actividad_cardiaca'] || '',
				situacion: allMappedFields['situacion'] || '',
				presentacion: allMappedFields['presentacion'] || '',
				dorso: allMappedFields['dorso'] || '',
				dbp: allMappedFields['dbp'] || '',
				cc: allMappedFields['cc'] || '',
				ca: allMappedFields['ca'] || '',
				lf: allMappedFields['lf'] || '',
				peso_estimado_fetal: allMappedFields['peso_estimado_fetal'] || '',
				para: allMappedFields['para'] || '',
				placenta: allMappedFields['placenta'] || '',
				ubi: allMappedFields['ubi'] || '',
				insercion: allMappedFields['insercion'] || '',
				grado: allMappedFields['grado'] || '',
				cordon_umbilical: allMappedFields['cordon_umbilical'] || '',
				liqu_amniotico: allMappedFields['liqu_amniotico'] || '',
				p: allMappedFields['p'] || '',
				ila: allMappedFields['ila'] || '',
				craneo: allMappedFields['craneo'] || '',
				corazon: allMappedFields['corazon'] || '',
				fcf: allMappedFields['fcf'] || '',
				pulmones: allMappedFields['pulmones'] || '',
				situs_visceral: allMappedFields['situs_visceral'] || '',
				intestino: allMappedFields['intestino'] || '',
				vejiga: allMappedFields['vejiga'] || '',
				vejiga_extra: allMappedFields['vejiga_extra'] || '',
				estomago: allMappedFields['estomago'] || '',
				estomago_extra: allMappedFields['estomago_extra'] || '',
				rinones: allMappedFields['rinones'] || '',
				rinones_extra: allMappedFields['rinones_extra'] || '',
				genitales: allMappedFields['genitales'] || '',
				miembros_superiores: allMappedFields['miembros_superiores'] || '',
				manos: allMappedFields['manos'] || '',
				miembros_inferiores: allMappedFields['miembros_inferiores'] || '',
				pies: allMappedFields['pies'] || '',
				conclusiones: allMappedFields['conclusiones'] || '',
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
			
			// Log para debugging
			console.log('[N8N Internal] Datos extraídos:', {
				motivo_consulta: extractedFields?.motivo_consulta,
				alergias: ant.alergias,
				quirurgicos: ant.quirurgicos,
				tamano_mamas: mamas.tamaño || mamas.tamano,
				simetria_mamas: mamas.simetria,
				ultima_regla: gyn.ultima_regla,
			});
			
			// Mapeo explícito según los nombres de variables de la plantilla del usuario
			const explicitMappings: Record<string, string> = {
				// Variables de la plantilla del usuario
				historia_enfermedad_actual: allMappedFields['motivo_consulta'] || allMappedFields['historia_enfermedad_actual'] || allMappedFields['motivo'] || allMappedFields['presentacion'] || '',
				alergicos: allMappedFields['alergias'] || allMappedFields['alergicos'] || '',
				quirurgicos: allMappedFields['quirurgicos'] || '',
				antecedentes_madre: allMappedFields['antecedentes_madre'] || allMappedFields['madre'] || '',
				antecedentes_padre: allMappedFields['antecedentes_padre'] || allMappedFields['padre'] || '',
				antecedentes_cancer_mama: allMappedFields['antecedentes_cancer_mama'] || allMappedFields['cancer_mama'] || '',
				its: allMappedFields['its'] || '',
				tipo_menstruacion: allMappedFields['menstruacion_tipo'] || allMappedFields['tipo_menstruacion'] || '',
				patron_menstruacion: allMappedFields['menstruacion_tipo'] || allMappedFields['patron_menstruacion'] || '',
				dismenorrea: allMappedFields['dismenorrea'] || '',
				primera_relacion_sexual: allMappedFields['primera_relacion'] || allMappedFields['primera_relacion_sexual'] || '',
				parejas_sexuales: allMappedFields['parejas_sexuales'] || '',
				condiciones_generales: allMappedFields['condiciones_generales'] || '',
				tamano_mamas: allMappedFields['tamano'] || allMappedFields['tamano_mamas'] || allMappedFields['tamaño'] || '',
				simetria_mamas: allMappedFields['simetria'] || allMappedFields['simetria_mamas'] || '',
				cap_mamas: allMappedFields['cap'] || allMappedFields['cap_mamas'] || '',
				secrecion_mamas: allMappedFields['secrecion'] || allMappedFields['secrecion_mamas'] || '',
				fosas_axilares: allMappedFields['fosas_axilares'] || '',
				abdomen: allMappedFields['abdomen'] || '',
				genitales_externos: allMappedFields['genitales_externos'] || '',
				especuloscopia: allMappedFields['especuloscopia'] || '',
				tacto_cervix: allMappedFields['cervix'] || allMappedFields['tacto_cervix'] || '',
				fondo_sacos: allMappedFields['fondo_sacos'] || '',
				anexos: allMappedFields['anexos'] || '',
				dimensiones_utero: allMappedFields['utero_dimensiones'] || allMappedFields['dimensiones_utero'] || '',
				interfase_endometrial: allMappedFields['interfase_endometrial'] || '',
				tipo_interfase_endometrial: allMappedFields['interfase_endometrial'] || '',
				dimensiones_ovario_izquierdo: allMappedFields['ovario_izquierdo'] || allMappedFields['dimensiones_ovario_izquierdo'] || '',
				dimensiones_ovario_derecho: allMappedFields['ovario_derecho'] || allMappedFields['dimensiones_ovario_derecho'] || '',
				liquido_fondo_saco: allMappedFields['liquido_fondo_saco'] || '',
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
				test_hinselmann: allMappedFields['test_hinselmann'] || allMappedFields['hinselmann_test'] || '',
				test_schiller: allMappedFields['test_schiller'] || allMappedFields['schiller_test'] || '',
				colposcopia_acetico_5: allMappedFields['colposcopia_acetico_5'] || allMappedFields['acetico_5'] || '',
				colposcopia_ectocervix: allMappedFields['colposcopia_ectocervix'] || allMappedFields['ectocervix'] || '',
				colposcopia_tipo: allMappedFields['colposcopia_tipo'] || allMappedFields['tipo_colposcopia'] || '',
				colposcopia_extension: allMappedFields['colposcopia_extension'] || allMappedFields['extension_colposcopia'] || '',
				colposcopia_descripcion: allMappedFields['colposcopia_descripcion'] || allMappedFields['descripcion_colposcopia'] || '',
				colposcopia_localizacion: allMappedFields['colposcopia_localizacion'] || allMappedFields['localizacion_colposcopia'] || '',
				colposcopia_acetowhite: allMappedFields['colposcopia_acetowhite'] || allMappedFields['acetowhite'] || '',
				colposcopia_acetowhite_detalles: allMappedFields['colposcopia_acetowhite_detalles'] || allMappedFields['acetowhite_detalles'] || '',
				colposcopia_mosaico: allMappedFields['colposcopia_mosaico'] || allMappedFields['mosaico'] || '',
				colposcopia_punteado: allMappedFields['colposcopia_punteado'] || allMappedFields['punteado'] || '',
				colposcopia_vasos_atipicos: allMappedFields['colposcopia_vasos_atipicos'] || allMappedFields['vasos_atipicos'] || '',
				colposcopia_carcinoma_invasivo: allMappedFields['colposcopia_carcinoma_invasivo'] || allMappedFields['carcinoma_invasivo'] || '',
				colposcopia_bordes: allMappedFields['colposcopia_bordes'] || allMappedFields['bordes_colposcopia'] || '',
				colposcopia_situacion: allMappedFields['colposcopia_situacion'] || allMappedFields['situacion_colposcopia'] || '',
				colposcopia_elevacion: allMappedFields['colposcopia_elevacion'] || allMappedFields['elevacion_colposcopia'] || '',
				colposcopia_biopsia: allMappedFields['colposcopia_biopsia'] || allMappedFields['biopsia'] || '',
				colposcopia_biopsia_localizacion: allMappedFields['colposcopia_biopsia_localizacion'] || allMappedFields['biopsia_localizacion'] || '',
				colposcopia_lugol: allMappedFields['colposcopia_lugol'] || allMappedFields['lugol'] || '',
			};
			
			// Combinar mapeo explícito con mapeo dinámico
			templateDataObj = {
				...baseTemplateData,
				...explicitMappings,
			};
			
			// Construir {{contenido}} usando la plantilla de texto de la base de datos
			if (templateText) {
				// Reemplazar \n literales por saltos de línea reales
				const templateTextProcessed = templateText.replace(/\\n/g, '\n');
				const contenidoGenerado = replaceTemplateVars(templateTextProcessed, templateDataObj);
				templateDataObj.contenido = contenidoGenerado;
				templateDataObj.content = contenidoGenerado;
				templateDataObj.informe = contenidoGenerado;
				
				console.log(`[N8N Internal] Contenido generado desde BD (primeros 200 chars):`, contenidoGenerado.substring(0, 200));
			} else {
				console.warn(`[N8N Internal] ⚠️ No se encontró template_text en la base de datos para construir {{contenido}}`);
				// Dejar contenido vacío si no hay plantilla de texto
				templateDataObj.contenido = '';
				templateDataObj.content = '';
				templateDataObj.informe = '';
			}
		}

		// Log para debugging: mostrar cuántas variables se mapearon
		const totalVariables = Object.keys(templateDataObj).length;
		console.log(`[N8N Internal] Total de variables mapeadas para plantilla: ${totalVariables}`);
		console.log(`[N8N Internal] Primeras 30 variables:`, Object.keys(templateDataObj).slice(0, 30).join(', '));
		
		// Verificar que tenemos las variables más comunes
		const commonVars = ['fur', 'FUR', 'ultima_regla', 'metodo_anticonceptivo', 'ho', 'HO', 'contenido', 'historia_enfermedad_actual', 'alergicos', 'quirurgicos'];
		const missingVars = commonVars.filter(v => !templateDataObj[v] && templateDataObj[v] !== '');
		if (missingVars.length > 0) {
			console.warn(`[N8N Internal] Variables comunes no encontradas:`, missingVars);
		}
		
		// Log de algunas variables clave para verificar que tienen valores
		const keyVars = ['historia_enfermedad_actual', 'alergicos', 'quirurgicos', 'tamano_mamas', 'simetria_mamas', 'fur', 'metodo_anticonceptivo', 'edad', 'paciente', 'fecha'];
		console.log(`[N8N Internal] Valores de variables clave:`);
		keyVars.forEach(v => {
			const value = templateDataObj[v];
			console.log(`  ${v}: "${value}" (${typeof value}, length: ${value?.length || 0})`);
		});
		
		// Contar cuántas variables tienen valores no vacíos
		const varsWithValues = Object.entries(templateDataObj).filter(([_, value]) => value && value !== '').length;
		console.log(`[N8N Internal] Variables con valores: ${varsWithValues} de ${totalVariables}`);
		
		// Renderizar plantilla
		try {
			console.log(`[N8N Internal] Iniciando renderizado de plantilla...`);
			doc.render(templateDataObj);
			console.log(`[N8N Internal] ✅ Plantilla renderizada exitosamente`);
			
			// Verificar que el documento tiene contenido después del renderizado
			const zip = doc.getZip();
			const documentXml = zip.files['word/document.xml'];
			if (documentXml) {
				const xmlContent = documentXml.asText();
				// Contar cuántas variables {{}} quedan sin reemplazar
				const remainingVars = (xmlContent.match(/\{\{[^}]+\}\}/g) || []).length;
				console.log(`[N8N Internal] Variables sin reemplazar en documento: ${remainingVars}`);
				if (remainingVars > 0) {
					const sampleVars = xmlContent.match(/\{\{[^}]+\}\}/g)?.slice(0, 10) || [];
					console.warn(`[N8N Internal] Ejemplos de variables sin reemplazar:`, sampleVars);
				}
			}
		} catch (renderError: any) {
			console.error(`[N8N Internal] ❌ Error al renderizar plantilla:`, {
				message: renderError.message,
				name: renderError.name,
				properties: renderError.properties,
				stack: renderError.stack?.substring(0, 500)
			});
			throw new Error(`Error al renderizar plantilla: ${renderError.message}`);
		}

		// Aplicar formato
		try {
			const zip = doc.getZip();
			const documentXml = zip.files['word/document.xml'];
			if (documentXml) {
				let xmlContent = documentXml.asText();
				const selectedFont = fontFamily; // Usar la fuente consolidada
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

		// Validar que el buffer se generó correctamente
		if (!generatedBuffer || generatedBuffer.length === 0) {
			console.error('[N8N Internal] Error: Buffer generado está vacío');
			return NextResponse.json(
				{ error: 'Error al guardar informe', detail: 'El documento generado está vacío' },
				{ status: 500 }
			);
		}

		console.log('[N8N Internal] Documento generado exitosamente:', {
			bufferSize: generatedBuffer.length,
			bufferSizeKB: Math.round(generatedBuffer.length / 1024),
		});

		// Subir informe a Supabase Storage
		const reportsBucket = 'consultation-reports';
		const reportFileName = `${consultationId}/${Date.now()}-informe-${consultationId}.docx`;

		console.log('[N8N Internal] Intentando subir informe:', {
			bucket: reportsBucket,
			fileName: reportFileName,
			bufferSize: generatedBuffer.length,
		});

		// Verificar que el bucket existe
		const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
		if (bucketsError) {
			console.error('[N8N Internal] Error listando buckets:', bucketsError);
			return NextResponse.json(
				{ error: 'Error al guardar informe', detail: `Error accediendo a Storage: ${bucketsError.message}` },
				{ status: 500 }
			);
		}

		const bucketExists = buckets?.some(b => b.name === reportsBucket);
		if (!bucketExists) {
			console.error('[N8N Internal] Bucket no existe:', reportsBucket);
			return NextResponse.json(
				{ error: 'Error al guardar informe', detail: `El bucket "${reportsBucket}" no existe. Debe crearse en Supabase Storage.` },
				{ status: 500 }
			);
		}

		const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
			.from(reportsBucket)
			.upload(reportFileName, generatedBuffer, {
				contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				upsert: false,
			});

		if (uploadError) {
			console.error('[N8N Internal] Error subiendo informe:', {
				error: uploadError,
				message: uploadError.message,
				errorCode: (uploadError as any).error,
				statusCode: (uploadError as any).statusCode,
			});
			return NextResponse.json(
				{ 
					error: 'Error al guardar informe', 
					detail: uploadError.message || 'Error desconocido al subir el archivo',
					errorCode: (uploadError as any).error,
					statusCode: (uploadError as any).statusCode,
				},
				{ status: 500 }
			);
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

