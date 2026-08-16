// middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Marketing / estáticos: NUNCA llamar a Supabase aquí (evita 504 en redes móviles).
 * Auth pages y APIs públicas sí pasan por middleware de headers, pero sin getUser.
 */
const MARKETING_PUBLIC_ROUTES = [
	'/',
	'/landing',
	'/farmacia',
	'/politicas-privacidad',
	'/public-report',
	'/share',
	'/emergency',
	'/rate-consultation',
	'/lab-upload',
	'/robots.txt',
	'/sitemap.xml',
	'/manifest.json',
	'/api/landing',
	'/api/public',
];

const AUTH_PUBLIC_ROUTES = [
	'/login',
	'/register',
	'/reset-password',
	'/safecare/login',
	'/api/auth',
	'/api/plans',
	'/api/register',
	'/api/organizations',
	'/api/role-users',
	'/api/analytics/login',
	'/dashboard/analytics',
];

const PUBLIC_ROUTES = [...MARKETING_PUBLIC_ROUTES, ...AUTH_PUBLIC_ROUTES];

const ROUTE_ROLE_MAP: Record<string, string[]> = {
	'/dashboard/clinic': ['ADMIN', 'CLINICA'],
	'/dashboard/medic': ['MEDICO'],
	'/dashboard/pharmacy': ['FARMACIA'],
	'/dashboard/patient': ['PACIENTE'],
	'/dashboard/nurse': ['ENFERMERO', 'ENFERMERA', 'ADMIN'],
	'/dashboard/administration': ['ADMINISTRACION'],
	'/dashboard/safecare': ['SAFECARE', 'ADMIN', 'ADMINISTRACION'],
};

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

const SENSITIVE_ROUTES = ['/api/', '/dashboard', '/patients', '/login', '/admin', '/billing'];
const SUPABASE_FETCH_TIMEOUT_MS = 4_000;

function pathMatches(pathname: string, routes: string[]): boolean {
	return routes.some((route) => {
		if (route === '/') return pathname === '/';
		return pathname === route || pathname.startsWith(route + '/');
	});
}

function isPublicRoute(pathname: string): boolean {
	return pathMatches(pathname, PUBLIC_ROUTES);
}

function isMarketingPublicRoute(pathname: string): boolean {
	return pathMatches(pathname, MARKETING_PUBLIC_ROUTES);
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
		case 'SAFECARE':
			redirectPath = '/dashboard/safecare';
			break;
	}
	return !pathname.startsWith(redirectPath) ? redirectPath : null;
}

function applySecurityHeaders(response: NextResponse, nonce: string, pathname: string, origin: string | null) {
	const csp = [
		"default-src 'self'",
		`script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://*.supabase.co https://www.googletagmanager.com https://*.vercel-scripts.com`,
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"img-src 'self' blob: data: https://*.supabase.co https://*.ashira.click https://www.googletagmanager.com https://*.vercel-scripts.com https://*.tile.openstreetmap.org",
		"font-src 'self' https://fonts.gstatic.com",
		"connect-src 'self' https://*.supabase.co https://*.ashira.click https://api.groq.com https://nominatim.openstreetmap.org https://www.google-analytics.com https://analytics.google.com",
		"worker-src 'self' blob:",
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
	response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=()');
	response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
	response.headers.set('Server', '');

	if (origin && ALLOWED_ORIGINS.has(origin)) {
		response.headers.set('Access-Control-Allow-Origin', origin);
		response.headers.set('Access-Control-Allow-Credentials', 'true');
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
		response.headers.set('Access-Control-Max-Age', '86400');
		response.headers.set('Vary', 'Origin');
	}

	const isSensitive = SENSITIVE_ROUTES.some((route) => pathname.startsWith(route));
	if (isSensitive) {
		response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
		response.headers.set('Pragma', 'no-cache');
		response.headers.set('Expires', '0');
	}
}

function createTimedFetch(timeoutMs: number): typeof fetch {
	return (input, init) => {
		const timeoutSignal = AbortSignal.timeout(timeoutMs);
		const callerSignal = init?.signal;
		const signal =
			callerSignal && typeof AbortSignal.any === 'function'
				? AbortSignal.any([callerSignal, timeoutSignal])
				: timeoutSignal;
		return fetch(input, { ...init, signal });
	};
}

export async function middleware(request: NextRequest) {
	const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
	const { pathname } = request.nextUrl;
	const origin = request.headers.get('origin');

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

	const requestHeaders = new Headers(request.headers);
	requestHeaders.set('x-nonce', nonce);

	let response = NextResponse.next({
		request: { headers: requestHeaders },
	});

	applySecurityHeaders(response, nonce, pathname, origin);

	// Home / landings / assets públicos: salir sin Supabase (fix del 504 móvil).
	if (isMarketingPublicRoute(pathname) || !requiresAuth(pathname)) {
		return response;
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!supabaseUrl || !supabaseAnon) {
		return response;
	}

	const supabase = createServerClient(supabaseUrl, supabaseAnon, {
		cookies: {
			getAll: () => request.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					request.cookies.set(name, value);
					response.cookies.set(name, value, options);
				});
			},
		},
		global: {
			fetch: createTimedFetch(SUPABASE_FETCH_TIMEOUT_MS),
		},
	});

	if (pathname.startsWith('/api/analytics/')) {
		const adminSession = request.cookies.get('analytics-admin-session');
		if (adminSession?.value) {
			return response;
		}
	}

	let user: { id: string; user_metadata?: Record<string, unknown> } | null = null;
	try {
		const { data } = await supabase.auth.getUser();
		user = data.user;
	} catch {
		user = null;
	}

	if (!user) {
		if (pathname.startsWith('/api')) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}
		const loginUrl = new URL('/login', request.url);
		loginUrl.searchParams.set('redirect', pathname);
		return NextResponse.redirect(loginUrl);
	}

	// Misma lógica previa: metadata + tabla users (con timeout de fetch).
	let userRole: string | undefined;
	try {
		const { data: appUsers } = await supabase.from('users').select('role').eq('authId', user.id);
		if (appUsers && appUsers.length > 0) {
			const metaRole = user.user_metadata?.role;
			userRole = metaRole
				? appUsers.find((u) => u.role === metaRole)?.role || appUsers[0].role
				: appUsers.find((u) => u.role !== 'PACIENTE')?.role || appUsers[0].role;
		} else if (typeof user.user_metadata?.role === 'string') {
			userRole = user.user_metadata.role;
		}
	} catch {
		userRole = typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : undefined;
	}

	if (!userRole) {
		if (pathname.startsWith('/api')) {
			return NextResponse.json({ error: 'Usuario sin rol asignado' }, { status: 403 });
		}
		return NextResponse.redirect(new URL('/login', request.url));
	}

	const allowedRoles = getAllowedRolesForRoute(pathname);
	if (allowedRoles && !allowedRoles.includes(userRole)) {
		const redirectPath = getRoleRedirectPath(userRole, pathname);
		if (redirectPath) return NextResponse.redirect(new URL(redirectPath, request.url));
	}

	return response;
}

export const config = {
	matcher: [
		/*
		 * Volvemos al matcher original (+ iconos).
		 * No excluir .json/.xml de forma agresiva: puede interferir con rutas de la app.
		 */
		'/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
};
