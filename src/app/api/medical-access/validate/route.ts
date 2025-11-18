// app/api/medical-access/validate/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { authenticator } from 'otplib';

export async function POST(request: Request) {
	try {
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await request.json();
		const { code } = body;

		if (!code || code.length !== 6) {
			return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
		}

		// Buscar paciente con el código
		const { data: accessKeys, error: keysError } = await supabase
			.from('patientaccesskey')
			.select('patient_id, secret');

		if (keysError || !accessKeys) {
			return NextResponse.json({ error: 'Error al validar código' }, { status: 500 });
		}

		// Validar código contra todos los secretos
		let validPatientId: string | null = null;
		for (const accessKey of accessKeys) {
			try {
				const isValid = authenticator.check(code, accessKey.secret);
				if (isValid) {
					validPatientId = accessKey.patient_id;
					break;
				}
			} catch {
				// Continuar con el siguiente
				continue;
			}
		}

		if (!validPatientId) {
			return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 401 });
		}

		// Generar token temporal (expira en 5 minutos)
		const token = Buffer.from(
			JSON.stringify({
				patientId: validPatientId,
				expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos
			})
		).toString('base64');

		return NextResponse.json({
			success: true,
			token,
			patientId: validPatientId,
			expiresIn: 300, // 5 minutos en segundos
		});
	} catch (err: any) {
		console.error('[Medical Access Validate API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
