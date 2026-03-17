// middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/register', '/reset-password', '/api/auth', '/api/plans', '/api/register', '/api/organizations', '/api/public', '/'];

// 9. Mapeo de rutas a roles permitidos
const ROUTE_ROLE_MAP: Record<string, string[]> = {
	'/dashboard/clinic': ['ADMIN', 'CLINICA'],
	'/dashboard/medic': ['MEDICO'],
	'/dashboard/pharmacy': ['FARMACIA'],
	'/dashboard/patient': ['PACIENTE'],
	'/dashboard/nurse': ['ENFERMERO', 'ENFERMERA', 'ADMIN'],
	'/dashboard/administration': ['ADMINISTRACION'],
};


function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some((route) => {
		if (route === '/') return pathname === '/';
		return pathname === route || pathname.startsWith(route + '/');
	});
}

function requiresAuth(pathname: string): boolean {
	if (isPublicRoute(pathname)) return false;
	if (pathname.startsWith('/dashboard')) return true;
	if (pathname.startsWith('/nurse')) return true;
	if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) return true;
	return false;
}

function getAllowedRolesForRoute(pathname: string): string[] | null {
	for (const [route, roles] of Object.entries(ROUTE_ROLE_MAP)) {
		if (pathname.startsWith(route)) {
			return roles;
		}
	}
	return null;
}

// Orígenes permitidos para CORS - Whitelist estricta
const ALLOWED_ORIGINS = new Set([
	'https://ashira.click',
	'https://www.ashira.click',
	'https://app.ashira.click',
	'https://admin.ashira.click',
	'https://dashboard.ashira.click',
	'https://syncwavesaludbeta.vercel.app'
]);

if (process.env.NODE_ENV === 'development') {
	ALLOWED_ORIGINS.add('http://localhost:3000');
	ALLOWED_ORIGINS.add('http://localhost:3001');
}

/**
 * Aplica cabeceras de seguridad incluyendo CSP refinada y Trusted Types
 */
function applySecurityHeaders(request: NextRequest, response: NextResponse, nonce: string) {
	// CSP Endurecida: Dominios de Google específicos (reCAPTCHA, GTM, Analytics)
	const googleDomains = [
		'https://www.google.com/recaptcha/',
		'https://www.gstatic.com/recaptcha/',
		'https://www.googletagmanager.com',
		'https://www.google-analytics.com',
		'https://maps.googleapis.com',
		'https://maps.gstatic.com'
	].join(' ');

	const cspHeader = `
		default-src 'self';
		script-src 'self' 'nonce-${nonce}' https://*.supabase.co ${googleDomains} https://*.vercel-scripts.com;
		style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
		img-src 'self' blob: data: https://*.supabase.co https://*.ashira.click ${googleDomains} https://*.vercel-scripts.com https://*.tile.openstreetmap.org;
		font-src 'self' https://fonts.gstatic.com;
		connect-src 'self' https://*.supabase.co https://*.ashira.click https://api.groq.com https://nominatim.openstreetmap.org ${googleDomains};
		frame-src 'self' https://www.google.com/recaptcha/ https://recaptcha.google.com https://www.youtube.com https://youtube.com;
		frame-ancestors 'none';
		base-uri 'self';
		form-action 'self';
		upgrade-insecure-requests;
	`.replace(/\s{2,}/g, ' ').trim();

	response.headers.set('Content-Security-Policy', cspHeader);
	response.headers.set('x-nonce', nonce); // Para que el layout raíz lo recupere
	
	// Trusted Types - Fase 1: Report-Only (No bloquea, solo reporta en consola)
	response.headers.set(
		'Content-Security-Policy-Report-Only',
		"require-trusted-types-for 'script'; trusted-types default nextjs nextjs#bundler"
	);

	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
	response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
	
	// Intento de suprimir header Server
	response.headers.set('Server', 'ASHIRA-SECURE'); 

	// --- CACHE RESTRICTIVO PARA RUTAS SENSIBLES (ePHI) ---
	const { pathname } = request.nextUrl;
	const sensitiveRoutes = ['/api/', '/dashboard', '/patients', '/login', '/nurse', '/medic', '/admin'];
	const isSensitive = sensitiveRoutes.some(route => pathname.startsWith(route));
	
	if (isSensitive) {
		response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
		response.headers.set('Pragma', 'no-cache');
		response.headers.set('Expires', '0');
	}
}

/**
 * Maneja cabeceras CORS de forma restrictiva con Whitelist dinámica
 */
function handleCors(request: NextRequest, response: NextResponse): NextResponse | null {
	const { pathname } = request.nextUrl;
	const origin = request.headers.get('origin');
	const isAllowedOrigin = origin && ALLOWED_ORIGINS.has(origin);

	if (pathname.startsWith('/api/') || pathname.startsWith('/_next/data/')) {
		if (isAllowedOrigin) {
			response.headers.set('Access-Control-Allow-Origin', origin!);
			response.headers.set('Access-Control-Allow-Credentials', 'true');
			response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
			response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
			response.headers.set('Access-Control-Max-Age', '86400');
			response.headers.set('Vary', 'Origin'); // Crítico para caché selectiva
		}
		
		if (request.method === 'OPTIONS') {
			return new NextResponse(null, { 
				status: 204, 
				headers: response.headers 
			});
		}
	}
	return null;
}

/**
 * Maneja la lógica de redirección por rol
 */
function getRoleRedirectPath(userRole: string, pathname: string): string | null {
	let redirectPath = '/dashboard';
	switch (userRole) {
		case 'ADMIN':
		case 'CLINICA':
			redirectPath = '/dashboard/clinic';
			break;
		case 'MEDICO':
			redirectPath = '/dashboard/medic';
			break;
		case 'FARMACIA':
			redirectPath = '/dashboard/pharmacy';
			break;
		case 'PACIENTE':
			redirectPath = '/dashboard/patient';
			break;
		case 'ENFERMERO':
		case 'ENFERMERA':
			redirectPath = '/dashboard/nurse';
			break;
		case 'ADMINISTRACION':
			redirectPath = '/dashboard/administration';
			break;
	}
	// Si ya estamos en una ruta que empieza con el redirectPath deseado, no redirigir
	return !pathname.startsWith(redirectPath) ? redirectPath : null;
}

export async function middleware(request: NextRequest) {
	const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
	const { pathname } = request.nextUrl;

	const requestHeaders = new Headers(request.headers);
	requestHeaders.set('x-nonce', nonce);

	let response = NextResponse.next({
		request: { headers: requestHeaders },
	});

	// 1. Cabeceras de seguridad
	applySecurityHeaders(request, response, nonce);

	// 2. CORS
	const corsResponse = handleCors(request, response);
	if (corsResponse) return corsResponse;

	// 3. Supabase Client
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll: () => request.cookies.getAll(),
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						request.cookies.set(name, value);
						response.cookies.set(name, value, { ...options, maxAge: 3153600000 });
					});
				},
			},
		}
	);

	// 4. Autenticación Robusta usando el SDK
	// El SDK se encarga de leer las cookies automágicamente
	const { data: { user }, error: authError } = await supabase.auth.getUser();

	if (isPublicRoute(pathname)) return response;

	if (requiresAuth(pathname)) {
		if (!user) {
			if (pathname.startsWith('/api')) {
				return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
			}
			const loginUrl = new URL('/login', request.url);
			loginUrl.searchParams.set('redirect', pathname);
			return NextResponse.redirect(loginUrl);
		}

		// Obtener rol del usuario. Manejar caso de múltiples perfiles (ej. MEDICO + PACIENTE)
		const { data: appUsers, error: userError } = await supabase.from('users').select('role').eq('authId', user.id);
		let userRole: string | undefined;
		
		if (!userError && appUsers && appUsers.length > 0) {
			const metaRole = user.user_metadata?.role;
			if (metaRole) {
				userRole = appUsers.find(u => u.role === metaRole)?.role || appUsers[0].role;
			} else {
				userRole = appUsers.find(u => u.role !== 'PACIENTE')?.role || appUsers[0].role;
			}
		}

		// Fallback: Si no está en la tabla "users", buscar en metadata (muy común en registros nuevos/migrados)
		if (!userRole && user.user_metadata?.role) {
			userRole = user.user_metadata.role;
		}

		if (!userRole) {
			if (pathname.startsWith('/api')) {
				return NextResponse.json({ error: 'Usuario sin rol asignado' }, { status: 403 });
			}
			console.warn('[Middleware] No role found for user:', user.id);
			return NextResponse.redirect(new URL('/login', request.url));
		}

		// Verificar autorización por ruta
		const allowedRoles = getAllowedRolesForRoute(pathname);
		if (allowedRoles && !allowedRoles.includes(userRole)) {
			const redirectPath = getRoleRedirectPath(userRole, pathname);
			if (redirectPath) return NextResponse.redirect(new URL(redirectPath, request.url));
		}
	}

	return response;
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
};
