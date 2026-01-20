// app/api/n8n/analyze-template/route.ts
// Endpoint para analizar la plantilla Word y extraer todas las variables
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import mammoth from 'mammoth';

/**
 * Endpoint para analizar la plantilla Word y extraer todas las variables
 */
export async function POST(request: NextRequest) {
	try {
		// Parsear body con manejo de errores
		let body;
		try {
			body = await request.json();
		} catch (parseError: any) {
			console.error('[Analyze Template] Error parseando JSON:', parseError.message);
			return NextResponse.json(
				{ success: false, error: 'Error parseando JSON del request', detail: parseError.message },
				{ status: 400 }
			);
		}

		const { doctorId, reportType, apiKey } = body || {};

		// Validar clave secreta
		const N8N_API_KEY = process.env.N8N_API_KEY || 'change-this-secret-key';
		if (!apiKey || apiKey !== N8N_API_KEY) {
			console.warn('[Analyze Template] Intento de acceso no autorizado');
			return NextResponse.json(
				{ success: false, error: 'Unauthorized', detail: 'API key inválida o faltante' },
				{ status: 401 }
			);
		}

		if (!doctorId) {
			console.error('[Analyze Template] doctorId faltante en request');
			return NextResponse.json(
				{ success: false, error: 'doctorId es requerido' },
				{ status: 400 }
			);
		}

		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('[Analyze Template] Variables de entorno de Supabase no configuradas');
			return NextResponse.json(
				{ success: false, error: 'Configuración de Supabase no encontrada', detail: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY' },
				{ status: 500 }
			);
		}

		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		// Obtener perfil del médico para la plantilla
		const { data: medicProfile, error: medicProfileError } = await supabaseAdmin
			.from('medic_profile')
			.select('report_template_url, report_template_name, report_templates_by_specialty')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (medicProfileError) {
			console.error('[Analyze Template] Error obteniendo perfil médico:', medicProfileError);
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

		console.log('[Analyze Template] Analizando plantilla:', {
			url: medicProfile.report_template_url,
			name: medicProfile.report_template_name
		});

		// Descargar plantilla Word
		const templateUrl = medicProfile.report_template_url;
		const bucket = 'report-templates';

		let templateBuffer: Buffer;
		if (templateUrl.startsWith('http://') || templateUrl.startsWith('https://')) {
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

			const { data: signedUrlData } = await supabaseAdmin.storage
				.from(bucket)
				.createSignedUrl(filePath, 60);
			
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
			} else {
				const { data: templateData, error: downloadError } = await supabaseAdmin.storage
					.from(bucket)
					.download(filePath);

				if (downloadError || !templateData) {
					throw new Error('Error descargando plantilla');
				}

				const arrayBuffer = await templateData.arrayBuffer();
				templateBuffer = Buffer.from(arrayBuffer);
			}
		}

		// Extraer texto de la plantilla usando mammoth para obtener el texto completo
		let templateText = '';
		try {
			const result = await mammoth.extractRawText({ buffer: templateBuffer });
			templateText = result.value || '';
		} catch (mammothError: any) {
			console.warn('[Analyze Template] Error extrayendo texto con mammoth, usando método alternativo:', mammothError.message);
			// Si mammoth falla, intentar extraer del XML directamente
			templateText = 'Plantilla Word - contenido no extraíble como texto plano';
		}
		
		// Extraer variables usando regex para encontrar {{variable}} en el texto
		const variableRegex = /\{\{([^}]+)\}\}/g;
		const variables = new Set<string>();
		
		// Buscar variables en el texto extraído
		if (templateText) {
			let match;
			while ((match = variableRegex.exec(templateText)) !== null) {
				const variableName = match[1].trim();
				if (variableName) {
					variables.add(variableName);
				}
			}
		}

		// También buscar en el XML del documento (más preciso y completo)
		let zip: PizZip;
		try {
			zip = new PizZip(templateBuffer);
		} catch (zipError: any) {
			console.error('[Analyze Template] Error creando PizZip:', zipError.message);
			throw new Error(`Error procesando plantilla Word: ${zipError.message}`);
		}

		const docxContent = zip.files['word/document.xml'];
		if (docxContent) {
			try {
				const xmlContent = docxContent.asText();
				const xmlVariableRegex = /\{\{([^}]+)\}\}/g;
				let xmlMatch;
				while ((xmlMatch = xmlVariableRegex.exec(xmlContent)) !== null) {
					const variableName = xmlMatch[1].trim();
					if (variableName) {
						variables.add(variableName);
					}
				}
			} catch (xmlError: any) {
				console.warn('[Analyze Template] Error leyendo XML del documento:', xmlError.message);
			}
		}

		// Buscar también en otros archivos XML que pueden contener variables
		try {
			const headerFiles = Object.keys(zip.files).filter(f => f.startsWith('word/header') || f.startsWith('word/footer'));
			for (const headerFile of headerFiles) {
				const headerContent = zip.files[headerFile];
				if (headerContent) {
					try {
						const headerText = headerContent.asText();
						const headerVariableRegex = /\{\{([^}]+)\}\}/g;
						let headerMatch;
						while ((headerMatch = headerVariableRegex.exec(headerText)) !== null) {
							const variableName = headerMatch[1].trim();
							if (variableName) {
								variables.add(variableName);
							}
						}
					} catch (headerError: any) {
						console.warn(`[Analyze Template] Error leyendo ${headerFile}:`, headerError.message);
					}
				}
			}
		} catch (headerFilesError: any) {
			console.warn('[Analyze Template] Error procesando headers/footers:', headerFilesError.message);
		}

		const variablesList = Array.from(variables).sort();

		console.log('[Analyze Template] Variables encontradas:', variablesList.length);
		console.log('[Analyze Template] Variables:', variablesList);

		// Preparar texto de plantilla para el prompt (limitar tamaño)
		const templateTextForPrompt = templateText && templateText.length > 0 
			? templateText.substring(0, 5000) 
			: 'Plantilla Word - estructura disponible pero texto no extraíble';

		return NextResponse.json({
			success: true,
			templateName: medicProfile.report_template_name || 'Plantilla sin nombre',
			templateUrl: medicProfile.report_template_url || '',
			templateText: templateTextForPrompt,
			variables: variablesList,
			totalVariables: variablesList.length
		});

	} catch (error: any) {
		console.error('[Analyze Template] Error completo:', {
			message: error.message,
			stack: error.stack,
			name: error.name
		});
		
		// Retornar error más descriptivo
		const errorMessage = error.message || 'Error desconocido al analizar plantilla';
		return NextResponse.json(
			{ 
				success: false,
				error: 'Error al analizar plantilla', 
				detail: errorMessage,
				stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
			},
			{ status: 500 }
		);
	}
}

