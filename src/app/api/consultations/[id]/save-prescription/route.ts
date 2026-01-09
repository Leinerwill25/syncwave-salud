// app/api/consultations/[id]/save-prescription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		// 1️⃣ Autenticación usando apiRequireRole (maneja correctamente la restauración de sesión)
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		const doctorId = user.userId;
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const { prescriptionUrl, items } = body;

		if (!prescriptionUrl || typeof prescriptionUrl !== 'string') {
			return NextResponse.json({ error: 'prescriptionUrl es requerido' }, { status: 400 });
		}

		// Obtener la consulta para obtener datos del paciente
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select('id, patient_id, unregistered_patient_id, doctor_id')
			.eq('id', id)
			.single();

		if (consultationError || !consultation) {
			console.error('[Save Prescription API] Error obteniendo consulta:', consultationError);
			return NextResponse.json({ error: 'Error al obtener consulta' }, { status: 500 });
		}

		// Verificar que el médico sea el dueño de la consulta
		if (consultation.doctor_id !== doctorId) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		// Obtener la prescripción asociada a esta consulta
		let { data: prescription, error: prescriptionError } = await supabase
			.from('prescription')
			.select('id, doctor_id, consultation_id')
			.eq('consultation_id', id)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (prescriptionError) {
			console.error('[Save Prescription API] Error obteniendo prescripción:', prescriptionError);
			return NextResponse.json({ error: 'Error al obtener prescripción' }, { status: 500 });
		}

		// Si no existe prescripción, crearla
		if (!prescription) {
			console.log('[Save Prescription API] No se encontró prescripción, creando una nueva...');
			const prescriptionPayload: any = {
				doctor_id: doctorId,
				consultation_id: id,
				patient_id: consultation.patient_id || null,
				unregistered_patient_id: consultation.unregistered_patient_id || null,
				prescription_url: prescriptionUrl,
				status: 'ACTIVE',
			};

			const { data: newPrescription, error: createError } = await supabase
				.from('prescription')
				.insert([prescriptionPayload])
				.select('id')
				.single();

			if (createError || !newPrescription) {
				console.error('[Save Prescription API] Error creando prescripción:', createError);
				return NextResponse.json({ error: 'Error al crear prescripción' }, { status: 500 });
			}

			prescription = newPrescription;
			console.log('[Save Prescription API] Prescripción creada exitosamente:', prescription.id);
		} else {
			// Verificar que el médico sea el dueño de la prescripción
			if (prescription.doctor_id !== doctorId) {
				return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
			}

			// Actualizar prescripción existente con la URL del archivo generado
			const { error: updateError } = await supabase
				.from('prescription')
				.update({ prescription_url: prescriptionUrl })
				.eq('id', prescription.id);

			if (updateError) {
				console.error('[Save Prescription API] Error actualizando prescripción:', updateError);
				return NextResponse.json({ error: 'Error al guardar URL de receta' }, { status: 500 });
			}

			console.log('[Save Prescription API] Prescripción actualizada exitosamente:', prescription.id);
		}

		// Guardar los items (medicamentos) si se proporcionaron
		if (items && Array.isArray(items) && items.length > 0) {
			// Primero, eliminar items existentes de esta prescripción para evitar duplicados
			const { error: deleteError } = await supabase
				.from('prescription_item')
				.delete()
				.eq('prescription_id', prescription.id);

			if (deleteError) {
				console.warn('[Save Prescription API] Error eliminando items anteriores:', deleteError);
				// Continuar de todas formas, puede que no haya items anteriores
			}

			// Preparar items para insertar
			const itemsToInsert = items.map((item: any) => ({
				prescription_id: prescription.id,
				medication_id: item.medication_id || null,
				name: item.name || null,
				dosage: item.dosage || null,
				form: item.form || null,
				frequency: item.frequency || null,
				duration: item.duration || null,
				quantity: item.quantity || null,
				instructions: item.instructions || null,
			}));

			// Insertar los nuevos items
			const { error: itemsError } = await supabase
				.from('prescription_item')
				.insert(itemsToInsert);

			if (itemsError) {
				console.error('[Save Prescription API] Error guardando items:', itemsError);
				// No fallar completamente, solo advertir
				console.warn('[Save Prescription API] Los items no se pudieron guardar, pero la prescripción se guardó correctamente');
			} else {
				console.log('[Save Prescription API] Items guardados exitosamente:', itemsToInsert.length);
			}
		}

		return NextResponse.json({
			success: true,
			message: 'Receta guardada exitosamente en la base de datos',
			prescription_id: prescription.id,
		});
	} catch (err) {
		console.error('[Save Prescription API] Error:', err);
		return NextResponse.json(
			{
				error: 'Error interno al guardar receta',
				detail: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 }
		);
	}
}
