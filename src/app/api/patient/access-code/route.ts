// app/api/patient/access-code/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { authenticator } from 'otplib';

export async function GET(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Obtener o crear código de acceso
		const { data: accessKey, error: keyError } = await supabase
			.from('patientaccesskey')
			.select('secret, created_at')
			.eq('patient_id', patient.patientId)
			.maybeSingle();

		let secret: string;
		if (keyError || !accessKey) {
			// Generar nuevo secreto
			secret = authenticator.generateSecret();
			const { error: insertError } = await supabase
				.from('patientaccesskey')
				.insert({
					patient_id: patient.patientId,
					secret,
				});

			if (insertError) {
				console.error('[Access Code API] Error creando clave:', insertError);
				return NextResponse.json({ error: 'Error al generar código' }, { status: 500 });
			}
		} else {
			secret = accessKey.secret;
		}

		// Generar código TOTP actual
		const token = authenticator.generate(secret);
		const period = 30; // TOTP default period
		const remainingSeconds = period - (Math.floor(Date.now() / 1000) % period);

		return NextResponse.json({
			code: token,
			remainingSeconds,
			period,
		});
	} catch (err: any) {
		console.error('[Access Code API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const { action } = body;

		if (action === 'regenerate') {
			// Regenerar secreto
			const newSecret = authenticator.generateSecret();
			const { error } = await supabase
				.from('patientaccesskey')
				.upsert({
					patient_id: patient.patientId,
					secret: newSecret,
					created_at: new Date().toISOString(),
				});

			if (error) {
				console.error('[Access Code API] Error regenerando:', error);
				return NextResponse.json({ error: 'Error al regenerar código' }, { status: 500 });
			}

			return NextResponse.json({ success: true, message: 'Código regenerado correctamente' });
		}

		return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
	} catch (err: any) {
		console.error('[Access Code API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
