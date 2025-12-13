// app/api/patient/consultations/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET() {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Obtener el unregistered_patient_id del paciente registrado (si existe)
		const { data: patientData, error: patientError } = await supabase.from('Patient').select('id, unregistered_patient_id').eq('id', patient.patientId).maybeSingle();

		if (patientError) {
			console.error('[Patient Consultations API] Error obteniendo datos del paciente:', patientError);
			return NextResponse.json({ error: 'Error al obtener datos del paciente' }, { status: 500 });
		}

		// Construir query que busque tanto por patient_id como por unregistered_patient_id
		// Si el paciente tiene unregistered_patient_id vinculado, buscar consultas con ambos IDs
		let consultations: any[] = [];
		let error: any = null;

		if (patientData?.unregistered_patient_id) {
			// Buscar consultas con patient_id O unregistered_patient_id
			const { data: consultations1, error: error1 } = await supabase
				.from('consultation')
				.select(
					`
					id,
					created_at,
					diagnosis,
					patient_id,
					unregistered_patient_id,
					doctor:doctor_id(
						name
					)
				`
				)
				.eq('patient_id', patient.patientId)
				.order('created_at', { ascending: false })
				.limit(50);

			const { data: consultations2, error: error2 } = await supabase
				.from('consultation')
				.select(
					`
					id,
					created_at,
					diagnosis,
					patient_id,
					unregistered_patient_id,
					doctor:doctor_id(
						name
					)
				`
				)
				.eq('unregistered_patient_id', patientData.unregistered_patient_id)
				.order('created_at', { ascending: false })
				.limit(50);

			// Combinar resultados y eliminar duplicados
			const allConsultations = [...(consultations1 || []), ...(consultations2 || [])];
			const uniqueConsultations = Array.from(new Map(allConsultations.map((c) => [c.id, c])).values());
			consultations = uniqueConsultations
				.sort((a, b) => {
					const dateA = new Date(a.created_at).getTime();
					const dateB = new Date(b.created_at).getTime();
					return dateB - dateA;
				})
				.slice(0, 50);

			error = error1 || error2;
		} else {
			// Solo buscar por patient_id
			const result = await supabase
				.from('consultation')
				.select(
					`
					id,
					created_at,
					diagnosis,
					patient_id,
					unregistered_patient_id,
					doctor:doctor_id(
						name
					)
				`
				)
				.eq('patient_id', patient.patientId)
				.order('created_at', { ascending: false })
				.limit(50);

			consultations = result.data || [];
			error = result.error;
		}

		if (error) {
			console.error('[Patient Consultations API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener consultas' }, { status: 500 });
		}

		return NextResponse.json({
			consultations: consultations || [],
		});
	} catch (err: any) {
		console.error('[Patient Consultations API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
