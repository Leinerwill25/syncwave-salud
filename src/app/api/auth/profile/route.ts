import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-guards';

export async function GET(req: NextRequest) {
	try {
		// 1️⃣ Usar el guard robusto que maneja cookies y headers de forma estandarizada
		const user = await requireAuth();

		if (!user) {
			return NextResponse.json({ ok: false, message: 'No autenticado o sesión expirada.' }, { status: 401 });
		}

		// 2️⃣ OK — devolver datos del perfil siguiendo el formato esperado por el frontend
		return NextResponse.json({
			ok: true,
			data: {
				userId: user.userId,
				role: user.role,
				organizationId: user.organizationId,
				email: user.email
			},
		});
	} catch (err: any) {
		console.error('GET /api/auth/profile error:', err);
		return NextResponse.json({ ok: false, message: err?.message || 'Error interno del servidor' }, { status: 500 });
	}
}
