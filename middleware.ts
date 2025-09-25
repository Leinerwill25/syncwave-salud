// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
	const url = req.nextUrl.clone();

	// 1) Si la ruta es pública, permitir
	// (matchers controlan qué rutas pasan por aquí, ver abajo)
	// 2) Intentamos leer token de cookie. Ajusta el nombre de la cookie según tu implementación.
	const sbAccess = req.cookies.get('sb-access-token')?.value ?? null;
	const sbRefresh = req.cookies.get('sb-refresh-token')?.value ?? null;
	const anyToken = sbAccess ?? sbRefresh ?? null;

	// Si hay token, permitimos. (Nota: esto solo verifica existencia de token en cookie,
	// no valida la sesión con supabase. Para validación fuerte, valida server-side con supabaseAdmin)
	if (anyToken) {
		return NextResponse.next();
	}

	// Si no hay token, redirigir a login
	url.pathname = '/login';
	// añadimos redirectTo para que puedas volver luego
	url.searchParams.set('redirect', req.nextUrl.pathname);
	return NextResponse.redirect(url);
}

// Proteger solo /dashboard/*
export const config = {
	matcher: ['/dashboard/:path*'],
};
