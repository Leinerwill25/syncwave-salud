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
	let response = NextResponse.next({
		request: {
			headers: request.headers,
		},
	});

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

	const { pathname } = request.nextUrl;

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

		// Obtener rol del usuario desde la base de datos
		// Nota: Idealmente esto debería estar en un custom claim o cacheado,
		// pero por ahora mantenemos la lógica de consultar DB si es necesario.
		// Para optimizar, asumimos que si hay sesión válida, el rol se valida en layout o página,
		// o consultamos DB aquí si es crítico.
		// Por simplicidad y rendimiento, vamos a confiar en la sesión de Supabase para autenticación,
		// y dejar la autorización fina de roles para el layout/page o una consulta optimizada.
		
		// Sin embargo, para mantener la redirección por rol existente:
		const { data: appUser } = await supabase
			.from('User')
			.select('role')
			.eq('authId', user.id)
			.maybeSingle();

		const userRole = appUser?.role;

		if (!userRole) {
			// Usuario sin rol asignado en DB? Raro, pero posible si falló registro.
			// Redirigir a login o página de error.
			const loginUrl = new URL('/login', request.url);
			return NextResponse.redirect(loginUrl);
		}

		// Verificar rol para rutas de dashboard
		const allowedRoles = getAllowedRolesForRoute(pathname);
		if (allowedRoles) {
			if (!allowedRoles.includes(userRole)) {
				// Redirigir a su dashboard correspondiente
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
				// Evitar bucle de redirección si ya está en la ruta correcta (o subruta válida)
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
