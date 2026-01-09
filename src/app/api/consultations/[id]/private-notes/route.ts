import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// GET: Obtener observaciones privadas del doctor para una consulta
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id: consultationId } = await params;

		// Autenticación
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const doctorId = user.userId;
		const supabase = await createSupabaseServerClient();

		// Verificar que la consulta existe y pertenece al doctor
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select('id, doctor_id, patient_id, unregistered_patient_id')
			.eq('id', consultationId)
			.maybeSingle();

		if (consultationError || !consultation) {
			return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
		}

		// Verificar que el doctor es el dueño de la consulta
		if (consultation.doctor_id !== doctorId) {
			return NextResponse.json({ error: 'No autorizado para acceder a esta consulta' }, { status: 403 });
		}

		// Obtener las observaciones privadas del doctor para esta consulta
		const { data: privateNotes, error: notesError } = await supabase
			.from('doctor_private_notes')
			.select('id, notes, created_at, updated_at')
			.eq('consultation_id', consultationId)
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (notesError) {
			// Si la tabla no existe, devolver null en lugar de error
			if (notesError.code === 'PGRST205' || (notesError.message && notesError.message.includes('not found'))) {
				console.warn('[Private Notes API] Tabla doctor_private_notes no existe aún. Ejecuta el SQL de migración.');
				return NextResponse.json({ notes: null });
			}
			console.error('[Private Notes API] Error obteniendo notas:', notesError);
			return NextResponse.json({ error: 'Error al obtener las observaciones' }, { status: 500 });
		}

		// Si no hay notas, devolver null (no es un error)
		return NextResponse.json({ notes: privateNotes || null });
	} catch (err: any) {
		console.error('[Private Notes API] Error:', err);
		return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
	}
}

// POST: Crear o actualizar observaciones privadas del doctor
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id: consultationId } = await params;

		// Autenticación
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const doctorId = user.userId;
		const supabase = await createSupabaseServerClient();

		// Obtener datos del body
		const body = await request.json();
		const { notes, patient_id, unregistered_patient_id } = body;

		if (!notes || typeof notes !== 'string') {
			return NextResponse.json({ error: 'Las observaciones son requeridas' }, { status: 400 });
		}

		// Verificar que la consulta existe y pertenece al doctor
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select('id, doctor_id, patient_id, unregistered_patient_id')
			.eq('id', consultationId)
			.maybeSingle();

		if (consultationError || !consultation) {
			return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
		}

		// Verificar que el doctor es el dueño de la consulta
		if (consultation.doctor_id !== doctorId) {
			return NextResponse.json({ error: 'No autorizado para acceder a esta consulta' }, { status: 403 });
		}

		// Determinar los IDs del paciente (usar los del body o los de la consulta)
		const finalPatientId = patient_id || consultation.patient_id || null;
		const finalUnregisteredPatientId = unregistered_patient_id || consultation.unregistered_patient_id || null;

		// Validar que al menos uno de los IDs de paciente esté presente
		if (!finalPatientId && !finalUnregisteredPatientId) {
			return NextResponse.json({ error: 'Se requiere un ID de paciente (registrado o no registrado)' }, { status: 400 });
		}

		// Verificar si ya existen observaciones para esta consulta y doctor
		const { data: existingNotes, error: checkError } = await supabase
			.from('doctor_private_notes')
			.select('id')
			.eq('consultation_id', consultationId)
			.eq('doctor_id', doctorId)
			.maybeSingle();

		// Si la tabla no existe, devolver error informativo
		if (checkError && (checkError.code === 'PGRST205' || (checkError.message && checkError.message.includes('not found')))) {
			return NextResponse.json({ 
				error: 'La tabla de observaciones privadas no está configurada. Por favor, ejecuta el SQL de migración en la base de datos.' 
			}, { status: 503 });
		}

		let result;
		if (existingNotes) {
			// Actualizar observaciones existentes
			const { data: updatedNotes, error: updateError } = await supabase
				.from('doctor_private_notes')
				.update({
					notes: notes.trim(),
					patient_id: finalPatientId,
					unregistered_patient_id: finalUnregisteredPatientId,
					updated_at: new Date().toISOString(),
				})
				.eq('id', existingNotes.id)
				.eq('doctor_id', doctorId)
				.select('id, notes, created_at, updated_at')
				.single();

			if (updateError) {
				console.error('[Private Notes API] Error actualizando notas:', updateError);
				return NextResponse.json({ error: 'Error al actualizar las observaciones' }, { status: 500 });
			}

			result = updatedNotes;
		} else {
			// Crear nuevas observaciones
			const { data: newNotes, error: insertError } = await supabase
				.from('doctor_private_notes')
				.insert({
					consultation_id: consultationId,
					doctor_id: doctorId,
					patient_id: finalPatientId,
					unregistered_patient_id: finalUnregisteredPatientId,
					notes: notes.trim(),
				})
				.select('id, notes, created_at, updated_at')
				.single();

			if (insertError) {
				console.error('[Private Notes API] Error creando notas:', insertError);
				return NextResponse.json({ error: 'Error al guardar las observaciones' }, { status: 500 });
			}

			result = newNotes;
		}

		return NextResponse.json({ notes: result, message: 'Observaciones guardadas exitosamente' });
	} catch (err: any) {
		console.error('[Private Notes API] Error:', err);
		return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
	}
}

