// app/api/patient/emergency-qr/route.ts
// API para generar/obtener el token QR de emergencia del paciente autenticado

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { randomUUID } from 'crypto';

/**
 * GET: Obtener el token QR de emergencia del paciente (genera uno si no existe)
 */
export async function GET() {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();

		// Obtener datos actuales del paciente
		const { data: patientData, error: fetchError } = await supabase
			.from('Patient')
			.select('emergency_qr_token, emergency_qr_enabled')
			.eq('id', patient.patientId)
			.single();

		if (fetchError) {
			console.error('[Emergency QR API] Error obteniendo paciente:', fetchError);
			return NextResponse.json({ error: 'Error al obtener datos del paciente' }, { status: 500 });
		}

		// Si no existe token, generar uno
		if (!patientData.emergency_qr_token) {
			const newToken = randomUUID();
			const { error: updateError } = await supabase
				.from('Patient')
				.update({ emergency_qr_token: newToken })
				.eq('id', patient.patientId);

			if (updateError) {
				console.error('[Emergency QR API] Error generando token:', updateError);
				return NextResponse.json({ error: 'Error al generar token QR' }, { status: 500 });
			}

			return NextResponse.json({
				token: newToken,
				enabled: patientData.emergency_qr_enabled || false,
				url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ashira.click'}/emergency/${newToken}`,
			});
		}

		return NextResponse.json({
			token: patientData.emergency_qr_token,
			enabled: patientData.emergency_qr_enabled || false,
			url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ashira.click'}/emergency/${patientData.emergency_qr_token}`,
		});
	} catch (err: any) {
		console.error('[Emergency QR API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

/**
 * POST: Habilitar/deshabilitar el QR de emergencia
 */
export async function POST(req: NextRequest) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const body = await req.json();
		const enabled = body.enabled === true;

		const supabase = await createSupabaseServerClient();

		// Si se está habilitando y no existe token, generar uno
		if (enabled) {
			const { data: currentPatient } = await supabase
				.from('Patient')
				.select('emergency_qr_token')
				.eq('id', patient.patientId)
				.single();

			if (!currentPatient?.emergency_qr_token) {
				const newToken = randomUUID();
				const { error: updateError } = await supabase
					.from('Patient')
					.update({ 
						emergency_qr_enabled: true,
						emergency_qr_token: newToken,
					})
					.eq('id', patient.patientId);

				if (updateError) {
					console.error('[Emergency QR API] Error habilitando QR:', updateError);
					return NextResponse.json({ error: 'Error al habilitar QR' }, { status: 500 });
				}

				return NextResponse.json({
					success: true,
					enabled: true,
					token: newToken,
					url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ashira.click'}/emergency/${newToken}`,
				});
			}
		}

		// Actualizar estado enabled/disabled
		const { error: updateError } = await supabase
			.from('Patient')
			.update({ emergency_qr_enabled: enabled })
			.eq('id', patient.patientId);

		if (updateError) {
			console.error('[Emergency QR API] Error actualizando estado:', updateError);
			return NextResponse.json({ error: 'Error al actualizar estado del QR' }, { status: 500 });
		}

		return NextResponse.json({ success: true, enabled });
	} catch (err: any) {
		console.error('[Emergency QR API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

/**
 * DELETE: Regenerar token QR (invalidar el anterior)
 */
export async function DELETE() {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();
		const newToken = randomUUID();

		const { error: updateError } = await supabase
			.from('Patient')
			.update({ emergency_qr_token: newToken })
			.eq('id', patient.patientId);

		if (updateError) {
			console.error('[Emergency QR API] Error regenerando token:', updateError);
			return NextResponse.json({ error: 'Error al regenerar token' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			token: newToken,
			url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ashira.click'}/emergency/${newToken}`,
		});
	} catch (err: any) {
		console.error('[Emergency QR API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

