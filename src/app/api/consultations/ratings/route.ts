// app/api/consultations/ratings/route.ts
// API para guardar calificaciones de consultas

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createNotification } from '@/lib/notifications';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
	try {
		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
		}

		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		const body = await req.json();
		const { consultation_id, communication_rating, attention_rating, satisfaction_rating, comments } = body;

		// Validaciones
		if (!consultation_id) {
			return NextResponse.json({ error: 'consultation_id es requerido' }, { status: 400 });
		}

		const validRatings = ['yes', 'no', 'maybe'];
		if (!validRatings.includes(communication_rating) || 
		    !validRatings.includes(attention_rating) || 
		    !validRatings.includes(satisfaction_rating)) {
			return NextResponse.json({ error: 'Las calificaciones deben ser: yes, no o maybe' }, { status: 400 });
		}

		// Obtener datos de la consulta
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select(`
				id,
				patient_id,
				unregistered_patient_id,
				doctor_id,
				organization_id,
				patient:patient_id(firstName, lastName),
				unregistered_patient:unregistered_patient_id(first_name, last_name),
				doctor:doctor_id(name, email)
			`)
			.eq('id', consultation_id)
			.single();

		if (consultationError || !consultation) {
			return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
		}

		// Verificar que no se haya calificado ya esta consulta
		const { data: existingRating } = await supabase
			.from('consultation_ratings')
			.select('id')
			.eq('consultation_id', consultation_id)
			.maybeSingle();

		if (existingRating) {
			return NextResponse.json({ error: 'Esta consulta ya ha sido calificada' }, { status: 409 });
		}

		// Guardar calificación
		const { data: rating, error: ratingError } = await supabase
			.from('consultation_ratings')
			.insert({
				consultation_id: consultation_id,
				patient_id: consultation.patient_id || null,
				unregistered_patient_id: consultation.unregistered_patient_id || null,
				doctor_id: consultation.doctor_id,
				organization_id: consultation.organization_id,
				communication_rating,
				attention_rating,
				satisfaction_rating,
				comments: comments || null,
			})
			.select()
			.single();

		if (ratingError) {
			console.error('[Ratings API] Error guardando calificación:', ratingError);
			return NextResponse.json({ error: 'Error al guardar la calificación' }, { status: 500 });
		}

		// Crear notificación para el doctor
		if (consultation.doctor_id) {
			// Manejar caso donde patient puede ser array o objeto
			const patient = Array.isArray(consultation.patient) 
				? consultation.patient[0] 
				: consultation.patient;
			
			// Manejar caso donde unregistered_patient puede ser array o objeto
			const unregisteredPatient = Array.isArray(consultation.unregistered_patient)
				? consultation.unregistered_patient[0]
				: consultation.unregistered_patient;
			
			const patientName = patient
				? `${patient.firstName} ${patient.lastName}`
				: unregisteredPatient
					? `${unregisteredPatient.first_name} ${unregisteredPatient.last_name}`
					: 'Paciente';

			// Contar respuestas positivas
			const positiveCount = [communication_rating, attention_rating, satisfaction_rating].filter(r => r === 'yes').length;
			const ratingEmoji = positiveCount >= 2 ? '⭐' : positiveCount === 1 ? '👍' : '😐';

			await createNotification({
				userId: consultation.doctor_id,
				organizationId: consultation.organization_id,
				type: 'CONSULTATION_RATING',
				title: `${ratingEmoji} Nueva Calificación de Consulta`,
				message: `${patientName} ha calificado su consulta. Comunicación: ${communication_rating === 'yes' ? '✅' : communication_rating === 'no' ? '❌' : '🤔'}, Atención: ${attention_rating === 'yes' ? '✅' : attention_rating === 'no' ? '❌' : '🤔'}, Satisfacción: ${satisfaction_rating === 'yes' ? '✅' : satisfaction_rating === 'no' ? '❌' : '🤔'}`,
				payload: {
					consultation_id: consultation_id,
					rating_id: rating.id,
					patient_name: patientName,
					communication_rating,
					attention_rating,
					satisfaction_rating,
					comments: comments || null,
				},
				sendEmail: false, // No enviar email, solo notificación en app
			});
		}

		return NextResponse.json({
			success: true,
			rating,
			message: 'Calificación guardada exitosamente. ¡Gracias por su feedback!',
		});
	} catch (err) {
		console.error('[Ratings API] Error:', err);
		return NextResponse.json(
			{
				error: 'Error interno',
				detail: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 }
		);
	}
}

// GET: Obtener calificación de una consulta (si existe)
export async function GET(req: NextRequest) {
	try {
		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
		}

		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		const { searchParams } = new URL(req.url);
		const consultation_id = searchParams.get('consultation_id');

		if (!consultation_id) {
			return NextResponse.json({ error: 'consultation_id es requerido' }, { status: 400 });
		}

		const { data: rating, error } = await supabase
			.from('consultation_ratings')
			.select('*')
			.eq('consultation_id', consultation_id)
			.maybeSingle();

		if (error) {
			console.error('[Ratings API] Error obteniendo calificación:', error);
			return NextResponse.json({ error: 'Error al obtener la calificación' }, { status: 500 });
		}

		return NextResponse.json({ rating });
	} catch (err) {
		console.error('[Ratings API] Error:', err);
		return NextResponse.json(
			{
				error: 'Error interno',
				detail: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 }
		);
	}
}

