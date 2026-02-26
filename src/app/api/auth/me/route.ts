import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-guards';

export async function GET(request: Request) {
	try {
		const user = await getAuthenticatedUser();

		if (!user) {
			console.warn('[Auth /me] No se pudo obtener usuario autenticado');
			return NextResponse.json({ error: 'No authenticated session (AuthSessionMissing).' }, { status: 401 });
		}

		// Mantener el formato de respuesta esperado por los componentes que usan /api/auth/me
		return NextResponse.json({ 
			id: user.userId, 
			organizationId: user.organizationId,
			role: user.role,
			email: user.email 
		}, { status: 200 });
	} catch (err: any) {
		console.error('[Auth] Error inesperado en /api/auth/me:', err);
		return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 });
	}
}
