// app/api/icd11/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Cache para el token de acceso (en producción, considera usar Redis o similar)
let tokenCache: { token: string; expiresAt: number } | null = null;
let useBasicAuth = false; // Flag para indicar si debemos usar Basic Auth directamente

/**
 * Obtiene credenciales de autenticación para la API de CIE-11
 * Intenta OAuth2 primero, si falla usa Basic Auth directamente
 */
async function getAuthCredentials(): Promise<{ type: 'bearer' | 'basic'; value: string }> {
	// Verificar si tenemos un token válido en cache (solo para Bearer tokens)
	if (tokenCache && tokenCache.expiresAt > Date.now() && !useBasicAuth) {
		return { type: 'bearer', value: tokenCache.token };
	}

	const clientId = process.env.APIKEY_CIE_CLIENT_ID;
	const clientSecret = process.env.APIKEY_CIE_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw new Error('Las credenciales de CIE-11 (APIKEY_CIE_CLIENT_ID y APIKEY_CIE_CLIENT_SECRET) no están configuradas');
	}

	try {
		// Endpoint correcto de la API de CIE-11 según documentación oficial
		const tokenUrl = 'https://icdaccessmanagement.who.int/connect/token';
		
		// Crear Basic Auth header con client_id y client_secret
		const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
		
		const tokenResponse = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': `Basic ${basicAuth}`,
			},
			body: new URLSearchParams({
				grant_type: 'client_credentials',
				scope: 'icdapi_access',
			}),
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error('[ICD-11 API] Error obteniendo token:', tokenResponse.status, errorText);
			throw new Error(`Error al obtener token de acceso: ${tokenResponse.status} - ${errorText}`);
		}

		const tokenData = await tokenResponse.json();
		const accessToken = tokenData.access_token;

		if (!accessToken) {
			throw new Error('No se recibió access_token en la respuesta');
		}

		// Cachear el token (expira en aproximadamente 1 hora según documentación)
		const expiresIn = tokenData.expires_in || 3600; // Por defecto 1 hora
		tokenCache = {
			token: accessToken,
			expiresAt: Date.now() + (expiresIn * 1000) - 60000, // Renovar 1 minuto antes de expirar
		};

		console.log('[ICD-11 API] Token obtenido exitosamente');
		useBasicAuth = false;
		return { type: 'bearer', value: accessToken };
	} catch (error: any) {
		console.error('[ICD-11 API] Error en getAuthCredentials:', error);
		// Como último recurso, intentar Basic Auth
		console.log('[ICD-11 API] Usando Basic Auth como último recurso...');
		useBasicAuth = true;
		const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
		return { type: 'basic', value: basicAuth };
	}
}

/**
 * Endpoint para buscar códigos CIE-11 usando la API oficial de la OMS
 * Documentación: https://icd.who.int/icdapi
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const query = searchParams.get('q');
		const linearization = searchParams.get('linearization') || 'mms'; // mms = Mortality and Morbidity Statistics
		const language = searchParams.get('language') || 'es'; // español por defecto

		if (!query || query.trim().length < 2) {
			return NextResponse.json({ error: 'La búsqueda debe tener al menos 2 caracteres' }, { status: 400 });
		}

		// Obtener credenciales de autenticación
		const auth = await getAuthCredentials();

		// API oficial de la OMS para CIE-11
		// Intentar diferentes formatos de endpoint y release IDs
		const possibleReleaseIds = ['2024-05', '2024-01', '2023-01', 'latest'];
		const possibleUrls: Array<{ url: string; method: 'GET' | 'POST' }> = [];
		
		// Generar URLs con diferentes formatos
		for (const releaseId of possibleReleaseIds) {
			possibleUrls.push(
				{ url: `https://id.who.int/icd/release/11/${releaseId}/${linearization}/search`, method: 'POST' },
				{ url: `https://id.who.int/icd/release/11/${releaseId}/${linearization}/search`, method: 'GET' },
			);
		}
		
		// Agregar URLs sin releaseId
		possibleUrls.push(
			{ url: `https://id.who.int/icd/release/11/${linearization}/search`, method: 'POST' },
			{ url: `https://id.who.int/icd/release/11/${linearization}/search`, method: 'GET' },
		);

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'API-Version': 'v2',
			'Accept-Language': language,
		};

		// Agregar header de autenticación según el tipo
		if (auth.type === 'bearer') {
			headers['Authorization'] = `Bearer ${auth.value}`;
		} else {
			headers['Authorization'] = `Basic ${auth.value}`;
		}

		let searchResponse: Response | null = null;
		let lastError: string = '';
		let successfulUrl = '';

		// Intentar cada URL hasta encontrar una que funcione
		for (const { url: apiUrl, method } of possibleUrls) {
			try {
				console.log(`[ICD-11 API] Intentando búsqueda en: ${apiUrl} (${method})`);
				
				const fetchOptions: RequestInit = {
					method,
					headers,
				};

				// Configurar URL y body según el método
				let finalUrl = apiUrl;
				if (method === 'POST') {
					fetchOptions.body = JSON.stringify({
						q: query,
						highlight: true,
						fuzzy: true,
						fuzzyLevel: 2,
					});
				} else {
					// Para GET, agregar query como parámetro URL
					const urlWithQuery = new URL(apiUrl);
					urlWithQuery.searchParams.set('q', query);
					urlWithQuery.searchParams.set('highlight', 'true');
					urlWithQuery.searchParams.set('fuzzy', 'true');
					urlWithQuery.searchParams.set('fuzzyLevel', '2');
					finalUrl = urlWithQuery.toString();
				}

				searchResponse = await fetch(finalUrl, fetchOptions);

				if (searchResponse.ok) {
					successfulUrl = apiUrl;
					console.log(`[ICD-11 API] Búsqueda exitosa en: ${apiUrl}`);
					break;
				} else {
					const errorText = await searchResponse.text();
					console.warn(`[ICD-11 API] Error en ${apiUrl}: ${searchResponse.status} - ${errorText.substring(0, 200)}`);
					lastError = `${searchResponse.status}: ${errorText.substring(0, 200)}`;
				}
			} catch (err: any) {
				console.warn(`[ICD-11 API] Excepción al intentar ${apiUrl}:`, err.message);
				lastError = err.message;
			}
		}

		if (!searchResponse || !searchResponse.ok) {
			const errorDetails = lastError || 'No se pudo conectar a ningún endpoint';
			console.error('[ICD-11 API] Todos los endpoints de búsqueda fallaron. Último error:', errorDetails);
			return NextResponse.json(
				{ 
					error: 'Error al buscar en la API de CIE-11', 
					details: errorDetails,
					message: 'Verifica que el endpoint de búsqueda sea correcto y que tengas acceso a la API'
				},
				{ status: searchResponse?.status || 500 }
			);
		}

		const searchData = await searchResponse.json();

		// Función auxiliar para limpiar el título y extraer solo el nombre del diagnóstico
		const cleanTitle = (title: string): string => {
			if (!title) return '';
			
			let cleaned = title;
			
			// Si el título contiene una URL (http:// o https://), extraer solo la parte después del guion
			const urlPattern = /https?:\/\/[^\s]+/;
			if (urlPattern.test(cleaned)) {
				// Buscar el patrón "URL - Nombre" y extraer solo el nombre
				const match = cleaned.match(/https?:\/\/[^\s]+\s*-\s*(.+)/);
				if (match && match[1]) {
					cleaned = match[1].trim();
				} else {
					// Si no hay guion, eliminar la URL del título
					const urlMatch = cleaned.match(/https?:\/\/[^\s]+/);
					if (urlMatch) {
						cleaned = cleaned.replace(urlMatch[0], '').trim().replace(/^-\s*/, '').trim();
					}
				}
			}
			
			// Eliminar etiquetas HTML (como <em class='found'>texto</em>)
			// Reemplazar etiquetas HTML con solo su contenido
			cleaned = cleaned.replace(/<[^>]+>/g, '');
			
			// Limpiar espacios múltiples
			cleaned = cleaned.replace(/\s+/g, ' ').trim();
			
			return cleaned;
		};

		// Función auxiliar para extraer el código del ID o URL si es necesario
		const extractCode = (code: string, id: string, title?: string): string => {
			// Si ya tenemos un código válido, usarlo
			if (code && !code.includes('http://') && !code.includes('https://')) {
				return code;
			}
			
			// Si el código es una URL, extraer el código del final
			if (code && (code.includes('http://') || code.includes('https://'))) {
				const segments = code.split('/');
				const lastSegment = segments[segments.length - 1];
				if (lastSegment && lastSegment.trim()) {
					return lastSegment.trim();
				}
			}
			
			// Intentar extraer del ID
			if (id) {
				// Si el ID es una URL, extraer el código del final
				if (id.includes('http://') || id.includes('https://')) {
					const segments = id.split('/');
					const lastSegment = segments[segments.length - 1];
					if (lastSegment && lastSegment.trim()) {
						return lastSegment.trim();
					}
				}
				return id;
			}
			
			// Intentar extraer del título si contiene una URL
			if (title && (title.includes('http://') || title.includes('https://'))) {
				const urlMatch = title.match(/https?:\/\/[^\s]+/);
				if (urlMatch) {
					const url = urlMatch[0];
					const segments = url.split('/');
					const lastSegment = segments[segments.length - 1];
					if (lastSegment && lastSegment.trim()) {
						return lastSegment.trim();
					}
				}
			}
			
			return '';
		};

		// La respuesta puede tener diferentes estructuras dependiendo de la versión de la API
		// Normalizamos la respuesta para que sea consistente
		let results: Array<{
			code: string;
			title: string;
			description?: string;
			parent?: string;
			level?: number;
		}> = [];

		if (searchData.destinationEntities) {
			// Formato de respuesta con destinationEntities
			results = searchData.destinationEntities.map((entity: any) => {
				const rawTitle = entity.title || entity.label || '';
				const rawCode = entity.code || entity.id || '';
				return {
					code: extractCode(rawCode, entity.id || '', rawTitle),
					title: cleanTitle(rawTitle),
					description: entity.definition || entity.description || '',
					parent: entity.parent || '',
					level: entity.level || 0,
				};
			});
		} else if (Array.isArray(searchData)) {
			// Formato de respuesta como array
			results = searchData.map((item: any) => {
				const rawTitle = item.title || item.label || '';
				const rawCode = item.code || item.id || '';
				return {
					code: extractCode(rawCode, item.id || '', rawTitle),
					title: cleanTitle(rawTitle),
					description: item.definition || item.description || '',
					parent: item.parent || '',
					level: item.level || 0,
				};
			});
		} else if (searchData.results) {
			// Formato con campo results
			results = searchData.results.map((item: any) => {
				const rawTitle = item.title || item.label || '';
				const rawCode = item.code || item.id || '';
				return {
					code: extractCode(rawCode, item.id || '', rawTitle),
					title: cleanTitle(rawTitle),
					description: item.definition || item.description || '',
					parent: item.parent || '',
					level: item.level || 0,
				};
			});
		}

		// Obtener detalles adicionales para cada código encontrado
		const enrichedResults = await Promise.all(
			results.slice(0, 20).map(async (result) => {
				try {
					// Obtener información detallada del código
					const detailUrl = `https://id.who.int/icd/release/11/${releaseId}/${linearization}/${result.code}`;
					const detailHeaders: Record<string, string> = {
						'API-Version': 'v2',
						'Accept-Language': language,
					};

					if (auth.type === 'bearer') {
						detailHeaders['Authorization'] = `Bearer ${auth.value}`;
					} else {
						detailHeaders['Authorization'] = `Basic ${auth.value}`;
					}

					const detailResponse = await fetch(detailUrl, {
						headers: detailHeaders,
					});

					if (detailResponse.ok) {
						const detailData = await detailResponse.json();
						const rawDetailTitle = detailData.title?.[language] || detailData.title || result.title;
						return {
							...result,
							title: cleanTitle(rawDetailTitle),
							description: detailData.definition?.[language] || detailData.definition || result.description,
							parent: detailData.parent || result.parent,
							level: detailData.level || result.level,
						};
					}
				} catch (err) {
					console.warn(`[ICD-11 API] Error obteniendo detalles para ${result.code}:`, err);
				}
				return result;
			})
		);

		return NextResponse.json({
			results: enrichedResults,
			total: enrichedResults.length,
			query,
		});
	} catch (error: any) {
		console.error('[ICD-11 API] Error:', error);
		return NextResponse.json(
			{
				error: 'Error al buscar códigos CIE-11',
				details: error.message || String(error),
			},
			{ status: 500 }
		);
	}
}

/**
 * Endpoint para obtener detalles de un código CIE-11 específico
 */
export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { code } = body;

		if (!code) {
			return NextResponse.json({ error: 'Se requiere el código CIE-11' }, { status: 400 });
		}

		// Obtener credenciales de autenticación
		const auth = await getAuthCredentials();

		const releaseId = '2024-05';
		const linearization = 'mms';
		const language = 'es';

		const detailUrl = `https://id.who.int/icd/release/11/${releaseId}/${linearization}/${code}`;
		
		const headers: Record<string, string> = {
			'API-Version': 'v2',
			'Accept-Language': language,
		};

		if (auth.type === 'bearer') {
			headers['Authorization'] = `Bearer ${auth.value}`;
		} else {
			headers['Authorization'] = `Basic ${auth.value}`;
		}

		const detailResponse = await fetch(detailUrl, {
			headers,
		});

		if (!detailResponse.ok) {
			return NextResponse.json(
				{ error: 'Código CIE-11 no encontrado' },
				{ status: detailResponse.status }
			);
		}

		const detailData = await detailResponse.json();

		return NextResponse.json({
			code: detailData.code || code,
			title: detailData.title?.[language] || detailData.title || '',
			description: detailData.definition?.[language] || detailData.definition || '',
			parent: detailData.parent || '',
			level: detailData.level || 0,
			children: detailData.children || [],
		});
	} catch (error: any) {
		console.error('[ICD-11 API] Error obteniendo detalles:', error);
		return NextResponse.json(
			{
				error: 'Error al obtener detalles del código CIE-11',
				details: error.message || String(error),
			},
			{ status: 500 }
		);
	}
}

