// app/api/medical-access/grant/route.ts
// API para crear un grant de acceso médico después de validar el código TOTP

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

export async function POST(request: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const doctor = authResult.user;
		if (!doctor) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const { patient_id, token } = body;

		if (!patient_id || !token) {
			return NextResponse.json({ error: 'patient_id y token son requeridos' }, { status: 400 });
		}

		// Validar el token (debe venir de la validación del código TOTP)
		try {
			const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
			if (tokenData.patientId !== patient_id || tokenData.expiresAt < Date.now()) {
				return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
			}
		} catch {
			return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
		}

		// Verificar si ya existe un grant activo
		const { data: existingGrant, error: checkError } = await supabase
			.from('MedicalAccessGrant')
			.select('id, is_active')
			.eq('patient_id', patient_id)
			.eq('doctor_id', doctor.userId)
			.eq('is_active', true)
			.maybeSingle();

		if (checkError && checkError.code !== 'PGRST116') {
			console.error('[Medical Access Grant API] Error verificando grant existente:', checkError);
		}

		// Si ya existe un grant activo, actualizarlo
		if (existingGrant) {
			const { data: updatedGrant, error: updateError } = await supabase
				.from('MedicalAccessGrant')
				.update({
					granted_at: new Date().toISOString(),
					expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
					revoked_at: null,
					is_active: true,
				})
				.eq('id', existingGrant.id)
				.select()
				.single();

			if (updateError) {
				console.error('[Medical Access Grant API] Error actualizando grant:', updateError);
				return NextResponse.json({ error: 'Error al actualizar acceso' }, { status: 500 });
			}

			return NextResponse.json({
				success: true,
				grant: updatedGrant,
			});
		}

		// Crear nuevo grant
		const { data: newGrant, error: grantError } = await supabase
			.from('MedicalAccessGrant')
			.insert({
				patient_id,
				doctor_id: doctor.userId,
				expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
				is_active: true,
			})
			.select()
			.single();

		if (grantError) {
			console.error('[Medical Access Grant API] Error creando grant:', grantError);
			return NextResponse.json({ error: 'Error al crear acceso' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			grant: newGrant,
		});
	} catch (err: any) {
		console.error('[Medical Access Grant API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

