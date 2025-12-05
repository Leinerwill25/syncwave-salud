// app/api/medical-access/validate/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { authenticator } from 'otplib';

export async function POST(request: Request) {
	try {
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

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

		// Obtener el doctor_id del usuario autenticado si existe
		const { data: { user: authUser } } = await supabase.auth.getUser();
		let doctorId: string | null = null;
		if (authUser) {
			const { data: appUser } = await supabase
				.from('User')
				.select('id, role')
				.eq('authId', authUser.id)
				.maybeSingle();
			if (appUser && appUser.role === 'MEDICO') {
				doctorId = appUser.id;
			}
		}

		// Generar token temporal (expira en 5 minutos)
		const token = Buffer.from(
			JSON.stringify({
				patientId: validPatientId,
				expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos
			})
		).toString('base64');

		// Si hay un doctor autenticado, crear el grant automáticamente
		if (doctorId) {
			try {
				// Verificar si ya existe un grant activo
				const { data: existingGrant } = await supabase
					.from('MedicalAccessGrant')
					.select('id')
					.eq('patient_id', validPatientId)
					.eq('doctor_id', doctorId)
					.eq('is_active', true)
					.maybeSingle();

				if (!existingGrant) {
					// Crear nuevo grant
					await supabase
						.from('MedicalAccessGrant')
						.insert({
							patient_id: validPatientId,
							doctor_id: doctorId,
							expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
							is_active: true,
						});
				} else {
					// Actualizar grant existente
					await supabase
						.from('MedicalAccessGrant')
						.update({
							granted_at: new Date().toISOString(),
							expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
							revoked_at: null,
							is_active: true,
						})
						.eq('id', existingGrant.id);
				}
			} catch (grantError) {
				console.error('[Medical Access Validate API] Error creando grant:', grantError);
				// No fallar la validación si el grant falla
			}
		}

		return NextResponse.json({
			success: true,
			valid: true,
			token,
			patientId: validPatientId,
			expiresIn: 300, // 5 minutos en segundos
		});
	} catch (err: any) {
		console.error('[Medical Access Validate API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
