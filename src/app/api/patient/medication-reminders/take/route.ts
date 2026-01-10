// app/api/patient/medication-reminders/take/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createNotification } from '@/lib/notifications';
import { cookies } from 'next/headers';

/**
 * POST /api/patient/medication-reminders/take
 * Registra que el paciente tomó un medicamento y notifica al doctor
 */
export async function POST(req: Request) {
	try {
		const patientAuth = await getAuthenticatedPatient();

		if (!patientAuth) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const { patient } = patientAuth;
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await req.json();
		const { prescription_item_id, prescription_id } = body;

		if (!prescription_item_id || !prescription_id) {
			return NextResponse.json({ error: 'Faltan campos requeridos: prescription_item_id, prescription_id' }, { status: 400 });
		}

		// Verificar que la prescripción pertenece al paciente
		const { data: prescription, error: presError } = await supabase
			.from('prescription')
			.select('id, patient_id, doctor_id, prescription_item!inner(id, name)')
			.eq('id', prescription_id)
			.eq('patient_id', patientAuth.patientId)
			.single();

		if (presError || !prescription) {
			return NextResponse.json({ error: 'Prescripción no encontrada o no autorizada' }, { status: 404 });
		}

		// Verificar que el prescription_item existe en esta prescripción
		const prescriptionItems = Array.isArray(prescription.prescription_item) 
			? prescription.prescription_item 
			: prescription.prescription_item 
				? [prescription.prescription_item] 
				: [];
		
		const item = prescriptionItems.find((item: any) => item.id === prescription_item_id);
		if (!item) {
			return NextResponse.json({ error: 'Item de prescripción no encontrado' }, { status: 404 });
		}

		// Obtener información del medicamento
		const medicationName = item.name || 'Medicamento';

		// Registrar la toma del medicamento
		const { data: dose, error: doseError } = await supabase
			.from('medication_dose')
			.insert({
				prescription_item_id,
				patient_id: patientAuth.patientId,
				doctor_id: prescription.doctor_id,
				prescription_id: prescription.id,
				taken_at: new Date().toISOString(),
			})
			.select('id, taken_at')
			.single();

		if (doseError) {
			console.error('Error registrando toma:', doseError);
			return NextResponse.json({ error: 'Error al registrar la toma del medicamento' }, { status: 500 });
		}

		// Obtener información del paciente para la notificación
		const { data: patientData } = await supabase
			.from('patient')
			.select('firstName, lastName')
			.eq('id', patientAuth.patientId)
			.single();

		const patientName = patientData ? `${patientData.firstName} ${patientData.lastName}` : 'Paciente';

		// Crear notificación para el doctor
		await createNotification({
			userId: prescription.doctor_id,
			organizationId: null,
			type: 'MEDICATION_TAKEN',
			title: 'Medicamento Tomado',
			message: `${patientName} ha indicado que tomó el medicamento: ${medicationName}`,
			payload: {
				prescription_id: prescription.id,
				prescription_item_id,
				patient_id: patientAuth.patientId,
				patient_name: patientName,
				medication_name: medicationName,
				taken_at: dose.taken_at,
			},
			sendEmail: true,
		});

		return NextResponse.json({
			success: true,
			dose: {
				id: dose.id,
				taken_at: dose.taken_at,
			},
			message: 'Medicamento registrado correctamente. El doctor ha sido notificado.',
		});
	} catch (error: any) {
		console.error('Error en POST /api/patient/medication-reminders/take:', error);
		return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
	}
}

