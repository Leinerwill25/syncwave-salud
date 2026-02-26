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
	'/nurse': ['ENFERMERO', 'ENFERMERA', 'ADMIN'],
};

// Orígenes permitidos para CORS
const ALLOWED_ORIGINS = ['https://ashira.click', 'https://app.ashira.click', 'http://localhost:3000'];

function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some((route) => {
		if (route === '/') return pathname === '/';
		return pathname === route || pathname.startsWith(route + '/');
	});
}

function requiresAuth(pathname: string): boolean {
	if (isPublicRoute(pathname)) return false;
	if (pathname.startsWith('/dashboard')) return true;
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

/**
 * Aplica cabeceras de seguridad incluyendo CSP
 */
function applySecurityHeaders(response: NextResponse, nonce: string) {
	const cspHeader = `
		default-src 'self';
		script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.google.com https://*.vercel-scripts.com;
		style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
		img-src 'self' blob: data: https://*.supabase.co https://*.ashira.click https://*.google.com https://*.vercel-scripts.com https://*.tile.openstreetmap.org;
		font-src 'self' https://fonts.gstatic.com;
		connect-src 'self' https://*.supabase.co https://*.ashira.click https://api.groq.com https://nominatim.openstreetmap.org;
		frame-src 'self' https://www.youtube.com https://youtube.com;
		frame-ancestors 'none';
		base-uri 'self';
		form-action 'self';
	`.replace(/\s{2,}/g, ' ').trim();

	response.headers.set('x-nonce', nonce);
	response.headers.set('Content-Security-Policy', cspHeader);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

/**
 * Maneja cabeceras CORS
 */
function handleCors(request: NextRequest, response: NextResponse): NextResponse | null {
	const { pathname } = request.nextUrl;
	const origin = request.headers.get('origin');
	const isAllowedOrigin = origin && ALLOWED_ORIGINS.includes(origin);

	if (pathname.startsWith('/api/') && isAllowedOrigin) {
		response.headers.set('Access-Control-Allow-Origin', origin);
		response.headers.set('Access-Control-Allow-Credentials', 'true');
		response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
		
		if (request.method === 'OPTIONS') {
			return new NextResponse(null, { status: 204, headers: response.headers });
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
			redirectPath = '/nurse/dashboard';
			break;
	}
	// Si ya estamos en una ruta que empieza con el redirectPath deseado, no redirigir
	return !pathname.startsWith(redirectPath) ? redirectPath : null;
}

export async function middleware(request: NextRequest) {
	const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
	const { pathname } = request.nextUrl;

	let response = NextResponse.next({
		request: { headers: new Headers(request.headers) },
	});

	// 1. Cabeceras de seguridad
	applySecurityHeaders(response, nonce);

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

	// 4. Autenticación Robusta
	// Intentar obtener token desde header o cookies
	const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
	let token: string | null = null;
	if (authHeader?.startsWith('Bearer ')) {
		token = authHeader.split(' ')[1];
	}

	if (!token) {
		const allCookies = request.cookies.getAll();
		for (const cookie of allCookies) {
			const value = cookie.value;
			if (!value) continue;
			if (cookie.name.includes('access-token')) {
				token = value;
				break;
			}
			try {
				const parsed = JSON.parse(value);
				const extracted = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
				if (extracted) {
					token = extracted;
					break;
				}
			} catch { /* ignore */ }
		}
	}

	let user: any = null;
	if (token) {
		const { data: { user: userData }, error } = await supabase.auth.getUser(token);
		if (!error && userData) user = userData;
	}

	// Fallback a getUser/getSession estándar
	if (!user) {
		const { data: { user: userData } } = await supabase.auth.getUser();
		user = userData;
	}

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
		const { data: appUser } = await supabase.from('users').select('role').eq('authId', user.id).maybeSingle();
		const userRole = appUser?.role;

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
