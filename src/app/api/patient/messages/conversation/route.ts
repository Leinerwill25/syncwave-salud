// app/api/patient/messages/conversation/route.ts
// API para crear una nueva conversación

import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await request.json();
		const { title, recipient_user_id } = body;

		if (!recipient_user_id) {
			return NextResponse.json({ error: 'recipient_user_id es requerido' }, { status: 400 });
		}

		// Verificar que el paciente tiene una cita con este doctor
		const { data: appointmentCheck, error: checkError } = await supabase
			.from('appointment')
			.select('id')
			.eq('patient_id', patient.patientId)
			.eq('doctor_id', recipient_user_id)
			.in('status', ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])
			.limit(1)
			.maybeSingle();

		if (checkError) {
			console.error('[Conversation API] Error verificando cita:', checkError);
		}

		if (!appointmentCheck) {
			return NextResponse.json({ 
				error: 'Solo puede comunicarse con doctores con los que tiene citas programadas' 
			}, { status: 403 });
		}

		// Crear conversación
		const { data: conversation, error: convError } = await supabase
			.from('conversation')
			.insert({
				title: title || `Conversación con médico`,
			})
			.select()
			.single();

		if (convError) {
			console.error('[Conversation API] Error creando conversación:', convError);
			return NextResponse.json({ error: 'Error al crear conversación' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			data: conversation,
		});
	} catch (err: any) {
		console.error('[Conversation API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

