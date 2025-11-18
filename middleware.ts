// middleware.ts
// Middleware para proteger rutas y validar sesiones y roles

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/register', '/reset-password', '/api/auth', '/'];

// Rutas de API que requieren autenticación pero no validación de rol específica
const API_ROUTES_REQUIRE_AUTH = ['/api/patients', '/api/prescriptions', '/api/notifications'];

// Mapeo de rutas a roles permitidos
const ROUTE_ROLE_MAP: Record<string, string[]> = {
	'/dashboard/clinic': ['ADMIN', 'CLINICA'],
	'/dashboard/medic': ['MEDICO'],
	'/dashboard/pharmacy': ['FARMACIA'],
	'/dashboard/patient': ['PACIENTE'],
};

/**
 * Obtiene el rol del usuario desde las cookies
 */
async function getUserRoleFromCookies(req: NextRequest): Promise<{ role: string | null; authId: string | null }> {
	const cookieStore = req.cookies;
	
	// Intentar obtener token de acceso
	const accessToken = cookieStore.get('sb-access-token')?.value;
	const sbToken = cookieStore.get('sb:token')?.value;
	const sbSession = cookieStore.get('sb-session')?.value;

	let token: string | null = null;

	if (accessToken) {
		token = accessToken;
	} else if (sbToken) {
		try {
			const parsed = JSON.parse(sbToken);
			token = parsed?.currentSession?.access_token ?? parsed?.access_token ?? null;
		} catch {
			// ignore
		}
	} else if (sbSession) {
		try {
			const parsed = JSON.parse(sbSession);
			token = parsed?.access_token ?? parsed?.session?.access_token ?? parsed?.currentSession?.access_token ?? null;
		} catch {
			// ignore
		}
	}

	if (!token) {
		return { role: null, authId: null };
	}

	try {
		const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
		const { data: { user }, error } = await supabase.auth.getUser(token);

		if (error || !user) {
			return { role: null, authId: null };
		}

		// Obtener rol desde la base de datos
		const { data: appUser } = await supabase
			.from('User')
			.select('role')
			.eq('authId', user.id)
			.maybeSingle();

		return {
			role: appUser?.role ?? null,
			authId: user.id,
		};
	} catch (err) {
		console.error('[Middleware] Error obteniendo rol:', err);
		return { role: null, authId: null };
	}
}

/**
 * Verifica si una ruta es pública
 */
function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route));
}

/**
 * Verifica si una ruta requiere autenticación
 */
function requiresAuth(pathname: string): boolean {
	if (isPublicRoute(pathname)) return false;
	if (pathname.startsWith('/dashboard')) return true;
	if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) return true;
	return false;
}

/**
 * Obtiene los roles permitidos para una ruta
 */
function getAllowedRolesForRoute(pathname: string): string[] | null {
	for (const [route, roles] of Object.entries(ROUTE_ROLE_MAP)) {
		if (pathname.startsWith(route)) {
			return roles;
		}
	}
	return null;
}

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	// Permitir rutas públicas
	if (isPublicRoute(pathname)) {
		return NextResponse.next();
	}

	// Verificar si requiere autenticación
	if (!requiresAuth(pathname)) {
		return NextResponse.next();
	}

	// Obtener rol del usuario
	const { role, authId } = await getUserRoleFromCookies(req);

	// Si no hay sesión activa, redirigir al login
	if (!role || !authId) {
		if (pathname.startsWith('/api')) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}
		const loginUrl = new URL('/login', req.url);
		loginUrl.searchParams.set('redirect', pathname);
		return NextResponse.redirect(loginUrl);
	}

	// Verificar rol para rutas de dashboard
	const allowedRoles = getAllowedRolesForRoute(pathname);
	if (allowedRoles) {
		if (!allowedRoles.includes(role)) {
			// Usuario autenticado pero con rol incorrecto
			// Redirigir a su dashboard correspondiente
			let redirectPath = '/dashboard';
			switch (role) {
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
			return NextResponse.redirect(new URL(redirectPath, req.url));
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
};
