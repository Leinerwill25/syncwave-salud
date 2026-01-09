// app/api/consultations/[id]/save-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		// 1️⃣ Autenticación usando apiRequireRole
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		const doctorId = user.userId;
		const supabase = await createSupabaseServerClient();

		// Obtener datos de la consulta
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select(
				`
				id,
				patient_id,
				unregistered_patient_id,
				doctor_id,
				report_url
			`
			)
			.eq('id', id)
			.single();

		if (consultationError || !consultation) {
			return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
		}

		// Verificar que el médico sea el dueño de la consulta
		if (consultation.doctor_id !== doctorId) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		// Verificar que existe un report_url
		if (!consultation.report_url) {
			return NextResponse.json({ error: 'No hay informe generado para guardar. Por favor, genera el informe primero.' }, { status: 400 });
		}

		// Obtener el contenido del informe del body (si se proporciona)
		const body = await request.json().catch(() => ({}));
		const reportContent = body.content || '';

		// Obtener el patient_id de la consulta (puede ser patient_id o unregistered_patient_id)
		let patientIdForRecord: string | null = null;

		if (consultation.patient_id) {
			// Paciente registrado - usar directamente su ID
			patientIdForRecord = consultation.patient_id;
		} else if (consultation.unregistered_patient_id) {
			// Paciente no registrado - buscar un Patient existente vinculado a este unregistered_patient_id
			// NO crear un registro temporal, solo usar uno existente si existe
			const { data: patientFromUnregistered } = await supabase
				.from('patient')
				.select('id')
				.eq('unregistered_patient_id', consultation.unregistered_patient_id)
				.maybeSingle();

			if (patientFromUnregistered) {
				// Ya existe un Patient vinculado, usarlo
				patientIdForRecord = patientFromUnregistered.id;
				console.log('[Save Report API] Usando Patient existente vinculado a unregistered_patient_id:', patientIdForRecord);
			} else {
				// No existe un Patient vinculado - verificar que el unregistered_patient_id existe
				const { data: unregisteredPatient, error: unregisteredError } = await supabase
					.from('unregisteredpatients')
					.select('id')
					.eq('id', consultation.unregistered_patient_id)
					.maybeSingle();

				if (unregisteredError || !unregisteredPatient) {
					console.error('[Save Report API] Error: unregistered_patient_id no existe:', unregisteredError);
					return NextResponse.json({ 
						error: 'No se puede guardar el informe: el paciente no registrado no existe en la base de datos' 
					}, { status: 404 });
				}

				// El paciente no registrado existe en la tabla unregisteredpatients
				// NO crear un registro temporal en Patient
				// El informe ya está guardado en consultation.report_url
				// No podemos crear MedicalRecord porque requiere un patientId de Patient
				// Pero el informe ya está disponible en la consulta, así que retornamos éxito
				console.log('[Save Report API] Paciente no registrado existe en unregisteredpatients:', consultation.unregistered_patient_id);
				console.log('[Save Report API] El informe ya está guardado en consultation.report_url');
				
				// Retornar éxito porque el informe ya está guardado en la consulta
				// No se crea MedicalRecord porque no hay Patient vinculado y no creamos uno temporal
				return NextResponse.json({
					success: true,
					message: 'Informe guardado exitosamente. El informe está disponible en la consulta.',
					note: 'El informe está asociado al paciente no registrado y está disponible en la consulta.'
				});
			}
		}

		if (!patientIdForRecord) {
			return NextResponse.json({ error: 'No se puede guardar el informe: no se pudo determinar el paciente' }, { status: 400 });
		}

		// Verificar si ya existe un MedicalRecord para esta consulta
		const { data: existingConsultation } = await supabase
			.from('consultation')
			.select('medical_record_id')
			.eq('id', id)
			.single();

		const existingRecordId = existingConsultation?.medical_record_id;

		// Preparar el contenido del registro médico
		const medicalRecordContent = {
			type: 'informe_medico',
			consultation_id: id,
			content: reportContent || 'Informe médico generado',
			generated_at: new Date().toISOString(),
			report_url: consultation.report_url,
		};

		let medicalRecordId: string | null = null;

		if (existingRecordId) {
			// Actualizar MedicalRecord existente
			const { data: updatedRecord, error: updateRecordError } = await supabase
				.from('medicalrecord')
				.update({
					content: medicalRecordContent,
					attachments: [consultation.report_url],
				})
				.eq('id', existingRecordId)
				.select('id')
				.single();

			if (updateRecordError) {
				console.error('[Save Report API] Error actualizando MedicalRecord:', updateRecordError);
				return NextResponse.json({ error: 'Error al actualizar el registro médico' }, { status: 500 });
			}

			medicalRecordId = updatedRecord?.id || existingRecordId;
			console.log('[Save Report API] MedicalRecord actualizado:', medicalRecordId);
		} else {
			// Crear nuevo MedicalRecord
			const { data: newRecord, error: createRecordError } = await supabase
				.from('medicalrecord')
				.insert({
					patientId: patientIdForRecord,
					authorId: doctorId,
					content: medicalRecordContent,
					attachments: [consultation.report_url],
				})
				.select('id')
				.single();

			if (createRecordError) {
				console.error('[Save Report API] Error creando MedicalRecord:', createRecordError);
				return NextResponse.json({ error: 'Error al crear el registro médico' }, { status: 500 });
			}

			medicalRecordId = newRecord?.id || null;

			// Actualizar consulta con medical_record_id
			if (medicalRecordId) {
				const { error: updateError } = await supabase
					.from('consultation')
					.update({ medical_record_id: medicalRecordId })
					.eq('id', id);

				if (updateError) {
					console.error('[Save Report API] Error actualizando consultation:', updateError);
					// No fallar, el registro ya está creado
				}
			}

			console.log('[Save Report API] MedicalRecord creado:', medicalRecordId);
		}

		return NextResponse.json({
			success: true,
			medical_record_id: medicalRecordId,
			message: 'Informe guardado exitosamente en el historial del paciente',
		});
	} catch (err) {
		console.error('[Save Report API] Error:', err);
		return NextResponse.json(
			{
				error: 'Error interno al guardar informe',
				detail: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 }
		);
	}
}

