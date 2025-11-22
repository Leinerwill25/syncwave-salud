// app/api/patient/pagos/doctor-payment-methods/route.ts
// API para obtener los métodos de pago de un doctor

import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const url = new URL(request.url);
		const doctorId = url.searchParams.get('doctorId');

		if (!doctorId) {
			return NextResponse.json({ error: 'doctorId es requerido' }, { status: 400 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Obtener métodos de pago del doctor desde medic_profile
		const { data: medicProfile, error } = await supabase
			.from('medic_profile')
			.select('payment_methods')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (error) {
			console.error('[Doctor Payment Methods API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener métodos de pago' }, { status: 500 });
		}

		// Parsear payment_methods
		let paymentMethods: unknown[] = [];
		if (medicProfile?.payment_methods) {
			try {
				if (typeof medicProfile.payment_methods === 'string') {
					paymentMethods = JSON.parse(medicProfile.payment_methods);
				} else if (Array.isArray(medicProfile.payment_methods)) {
					paymentMethods = medicProfile.payment_methods;
				}
			} catch (parseError) {
				console.error('[Doctor Payment Methods API] Error parseando payment_methods:', parseError);
				paymentMethods = [];
			}
		}

		return NextResponse.json({
			paymentMethods: paymentMethods || [],
		});
	} catch (err: unknown) {
		console.error('[Doctor Payment Methods API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

