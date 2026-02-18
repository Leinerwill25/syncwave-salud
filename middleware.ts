// middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/register', '/reset-password', '/api/auth', '/'];

// Mapeo de rutas a roles permitidos
const ROUTE_ROLE_MAP: Record<string, string[]> = {
	'/dashboard/clinic': ['ADMIN', 'CLINICA'],
	'/dashboard/medic': ['MEDICO'],
	'/dashboard/pharmacy': ['FARMACIA'],
	'/dashboard/patient': ['PACIENTE'],
};

// Orígenes permitidos para CORS
const ALLOWED_ORIGINS = ['https://ashira.click', 'https://app.ashira.click', 'http://localhost:3000'];

function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route));
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

export async function middleware(request: NextRequest) {
	const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
	const { pathname } = request.nextUrl;
	const origin = request.headers.get('origin');

	// 1. Manejo de CORS dinámico
	const isAllowedOrigin = origin && ALLOWED_ORIGINS.includes(origin);
	
	let response = NextResponse.next({
		request: {
			headers: new Headers(request.headers),
		},
	});

	// Inyectar nonce en la request para que pueda ser leído en layouts/pages
	response.headers.set('x-nonce', nonce);

	// Configurar CSP (Ajustado para permitir OpenStreetMap y evitar bloqueo de scripts de Next.js)
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

	response.headers.set('Content-Security-Policy', cspHeader);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

	// Si es una petición de API y el origen es permitido, añadir cabeceras CORS
	if (pathname.startsWith('/api/') && isAllowedOrigin) {
		response.headers.set('Access-Control-Allow-Origin', origin);
		response.headers.set('Access-Control-Allow-Credentials', 'true');
		response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
	}

	// Manejo de preflight (OPTIONS)
	if (request.method === 'OPTIONS' && pathname.startsWith('/api/') && isAllowedOrigin) {
		return new NextResponse(null, {
			status: 204,
			headers: response.headers,
		});
	}

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						request.cookies.set(name, value);
						response.cookies.set(name, value, {
							...options,
							maxAge: 3153600000, // 100 años
						});
					});
				},
			},
		}
	);

	// Refrescar sesión si es necesario
	const { data: { user }, error } = await supabase.auth.getUser();

	// Permitir rutas públicas
	if (isPublicRoute(pathname)) {
		return response;
	}

	// Verificar si requiere autenticación
	if (requiresAuth(pathname)) {
		if (error || !user) {
			if (pathname.startsWith('/api')) {
				return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
			}
			const loginUrl = new URL('/login', request.url);
			loginUrl.searchParams.set('redirect', pathname);
			return NextResponse.redirect(loginUrl);
		}

		// 🔹 CORRECCIÓN: Usar tabla 'users' en lugar de 'User'
		const { data: appUser } = await supabase
			.from('users')
			.select('role')
			.eq('authId', user.id)
			.maybeSingle();

		const userRole = appUser?.role;

		if (!userRole) {
			const loginUrl = new URL('/login', request.url);
			return NextResponse.redirect(loginUrl);
		}

		// Verificar rol para rutas de dashboard
		const allowedRoles = getAllowedRolesForRoute(pathname);
		if (allowedRoles) {
			if (!allowedRoles.includes(userRole)) {
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
				}
				if (!pathname.startsWith(redirectPath)) {
					return NextResponse.redirect(new URL(redirectPath, request.url));
				}
			}
		}
	}

	return response;
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
};
