// middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ===== CONFIGURACIÓN DE RUTAS =====
const PUBLIC_ROUTES = ['/login', '/register', '/reset-password', '/api/auth', '/api/plans', '/api/register', '/api/organizations', '/api/public', '/'];

const ROUTE_ROLE_MAP: Record<string, string[]> = {
	'/dashboard/clinic': ['ADMIN', 'CLINICA'],
	'/dashboard/medic': ['MEDICO'],
	'/dashboard/pharmacy': ['FARMACIA'],
	'/dashboard/patient': ['PACIENTE'],
	'/dashboard/nurse': ['ENFERMERO', 'ENFERMERA', 'ADMIN'],
	'/dashboard/administration': ['ADMINISTRACION'],
};

// ===== WHITELIST DE CORS =====
const ALLOWED_ORIGINS = new Set([
	'https://ashira.click',
	'https://www.ashira.click',
	'https://app.ashira.click',
	'https://admin.ashira.click',
	'https://dashboard.ashira.click',
]);

if (process.env.NODE_ENV === 'development') {
	ALLOWED_ORIGINS.add('http://localhost:3000');
	ALLOWED_ORIGINS.add('http://localhost:3001');
}

// ===== RUTAS SENSIBLES (cache restrictivo) =====
const SENSITIVE_ROUTES = ['/api/', '/dashboard', '/patients', '/login', '/admin', '/billing'];

// ===== FUNCIONES AUXILIARES =====
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
	return !pathname.startsWith(redirectPath) ? redirectPath : null;
}

// ===== MIDDLEWARE PRINCIPAL =====
export async function middleware(request: NextRequest) {
	const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
	const { pathname } = request.nextUrl;
	const origin = request.headers.get('origin');

	// 1. Manejar Preflight de CORS (OPTIONS)
	if (request.method === 'OPTIONS') {
		const preflightResponse = new NextResponse(null, { status: 204 });
		if (origin && ALLOWED_ORIGINS.has(origin)) {
			preflightResponse.headers.set('Access-Control-Allow-Origin', origin);
			preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
			preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
			preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
			preflightResponse.headers.set('Access-Control-Max-Age', '86400');
			preflightResponse.headers.set('Vary', 'Origin');
		}
		return preflightResponse;
	}

	// 2. Base de la respuesta con Nonce en Request Headers (para Server Components)
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set('x-nonce', nonce);

	let response = NextResponse.next({
		request: { headers: requestHeaders },
	});

	// 3. Inicializar Supabase Client (Sync cookies)
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

	// 4. Cabeceras de Seguridad Globales (CSP, HSTS, etc.)
	const csp = [
		"default-src 'self'",
		`script-src 'self' 'nonce-${nonce}' https://*.supabase.co https://www.googletagmanager.com https://*.vercel-scripts.com`,
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"img-src 'self' blob: data: https://*.supabase.co https://*.ashira.click https://www.googletagmanager.com https://*.vercel-scripts.com https://*.tile.openstreetmap.org",
		"font-src 'self' https://fonts.gstatic.com",
		"connect-src 'self' https://*.supabase.co https://*.ashira.click https://api.groq.com https://nominatim.openstreetmap.org https://www.google-analytics.com https://analytics.google.com",
		"frame-src 'self' https://www.youtube.com https://youtube.com",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"upgrade-insecure-requests",
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);
	response.headers.set('x-nonce', nonce);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
	response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
	response.headers.set('Server', ''); // Ofuscación de servidor

	// 5. Aplicar CORS Dinámico (Whitelist)
	if (origin && ALLOWED_ORIGINS.has(origin)) {
		response.headers.set('Access-Control-Allow-Origin', origin);
		response.headers.set('Access-Control-Allow-Credentials', 'true');
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
		response.headers.set('Access-Control-Max-Age', '86400');
		response.headers.set('Vary', 'Origin');
	}

	// 6. Cache restrictivo para ePHI
	const isSensitive = SENSITIVE_ROUTES.some((route) => pathname.startsWith(route));
	if (isSensitive) {
		response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
		response.headers.set('Pragma', 'no-cache');
		response.headers.set('Expires', '0');
	}

	// 7. Autenticación y Autorización
	const { data: { user } } = await supabase.auth.getUser();

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

		// Obtener rol del usuario
		const { data: appUsers } = await supabase.from('users').select('role').eq('authId', user.id);
		let userRole: string | undefined;
		
		if (appUsers && appUsers.length > 0) {
			const metaRole = user.user_metadata?.role;
			userRole = metaRole ? (appUsers.find(u => u.role === metaRole)?.role || appUsers[0].role) : (appUsers.find(u => u.role !== 'PACIENTE')?.role || appUsers[0].role);
		} else if (user.user_metadata?.role) {
			userRole = user.user_metadata.role;
		}

		if (!userRole) {
			if (pathname.startsWith('/api')) {
				return NextResponse.json({ error: 'Usuario sin rol asignado' }, { status: 403 });
			}
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
