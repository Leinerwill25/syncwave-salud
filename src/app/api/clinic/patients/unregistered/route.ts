import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';

export async function POST(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();
		
		// Verificar sesión
		const { data: { session }, error: sessionError } = await supabase.auth.getSession();
		
		if (sessionError || !session) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
		}

		// Leer payload
		const body = await req.json();

		// El cálculo de BMI lo haremos aquí para asegurar consistencia
		let bmi = null;
		if (body.heightCm && body.weightKg && body.heightCm > 0) {
			const heightM = body.heightCm / 100;
			bmi = Number((body.weightKg / (heightM * heightM)).toFixed(2));
		}

		// Insertar en la tabla unregisteredpatients
		const { data, error } = await supabase
			.from('unregisteredpatients')
			.insert({
				first_name: body.firstName,
				last_name: body.lastName,
				identification: body.identification || null,
				birth_date: body.birthDate || null,
				sex: body.sex || null,
				phone: body.phone,
				email: body.email || null,
				address: body.address || null,
				height_cm: body.heightCm || null,
				weight_kg: body.weightKg || null,
				bmi: bmi,
				allergies: Array.isArray(body.allergies) ? body.allergies.filter(Boolean).join(', ') : (body.allergies || null),
				chronic_conditions: Array.isArray(body.chronicConditions) ? body.chronicConditions.filter(Boolean).join(', ') : (body.chronicConditions || null),
				current_medication: Array.isArray(body.currentMedication) ? body.currentMedication.filter(Boolean).join(', ') : (body.currentMedication || null),
				family_history: Array.isArray(body.familyHistory) ? body.familyHistory.filter(Boolean).join(', ') : (body.familyHistory || null),
				motive: body.motive || null,
				pain_scale: body.painScale !== undefined && body.painScale !== null ? body.painScale : null,
				vital_bp_systolic: body.vitalBpSystolic || null,
				vital_bp_diastolic: body.vitalBpDiastolic || null,
				vital_heart_rate: body.vitalHeartRate || null,
				vital_respiratory_rate: body.vitalRespiratoryRate || null,
				vital_temperature: body.vitalTemperature || null,
				vital_spo2: body.vitalSpo2 || null,
				vital_glucose: body.vitalGlucose || null,
				profession: body.profession || null,
				emergency_contact_name: body.emergencyContactName || null,
				emergency_contact_phone: body.emergencyContactPhone || null,
				emergency_contact_relation: body.emergencyContactRelation || null,
				created_by: session.user.id
			})
			.select()
			.single();

		if (error) {
			console.error('Error insertando paciente no registrado:', error);
			return NextResponse.json({ error: 'Error al registrar paciente: ' + error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, patient: data });

	} catch (error: any) {
		console.error('API Error:', error);
		return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
	}
}
