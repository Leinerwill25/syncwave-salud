// app/api/dashboard/medic/appointments/new/route.ts
import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function POST(req: Request) {
	try {
		// Verificar autenticación y rol
		const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();
		const body = await req.json();

		const { patient_id, unregistered_patient_id, doctor_id, organization_id, scheduled_at, duration_minutes = 30, status = 'SCHEDULED', reason, location } = body;

		// El doctor puede crear citas para pacientes registrados O no registrados
		if ((!patient_id && !unregistered_patient_id) || !doctor_id || !scheduled_at) {
			return NextResponse.json({ error: 'Campos requeridos: (patient_id o unregistered_patient_id), doctor_id y scheduled_at.' }, { status: 400 });
		}

		// Obtener el ID del usuario (doctor) que está creando la cita
		const createdByDoctorId = user.userId;

		// NOTA: El doctor puede crear citas para pacientes registrados O no registrados
		// Siempre establecer created_by_doctor_id para identificar el origen
		const appointmentData: any = {
			patient_id: patient_id || null, // Puede ser null si es paciente no registrado
			unregistered_patient_id: unregistered_patient_id || null, // Puede ser null si es paciente registrado
			doctor_id,
			organization_id,
			scheduled_at,
			duration_minutes,
			status,
			reason,
			location,
			created_by_doctor_id: createdByDoctorId, // Rastrear que fue creada por el doctor
			// NO establecer created_by_role_user_id ni booked_by_patient_id
		};

		const { data, error } = await supabase
			.from('appointment')
			.insert([appointmentData])
			.select('id, scheduled_at, status, reason, location')
			.single();

		if (error) {
			console.error('❌ Error al crear cita:', error.message);
			return NextResponse.json({ error: 'No se pudo crear la cita.' }, { status: 500 });
		}

		return NextResponse.json({ success: true, appointment: data }, { status: 201 });
	} catch (error: any) {
		console.error('❌ Error general al crear cita:', error);
		return NextResponse.json({ error: 'Error interno al crear cita.' }, { status: 500 });
	}
}
