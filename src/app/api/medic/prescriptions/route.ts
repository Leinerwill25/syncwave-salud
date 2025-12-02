import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { createNotification } from '@/lib/notifications';

// ✅ GET — Lista todas las recetas (puede filtrarse por paciente)
export async function GET(req: Request) {
	try {
		const { supabase } = createSupabaseServerClient();
		const url = new URL(req.url);
		const patientId = url.searchParams.get('patientId');

		let query = supabase
			.from('prescription')
			.select(
				`
        id,
        patient_id,
        unregistered_patient_id,
        doctor_id,
        consultation_id,
        issued_at,
        valid_until,
        notes,
        status,
        created_at,
        prescription_item (
          id,
          medication_id,
          name,
          dosage,
          form,
          frequency,
          duration,
          quantity,
          instructions,
          created_at
        )
      `
			)
			.order('issued_at', { ascending: false });

		if (patientId) {
			// Buscar por patient_id o unregistered_patient_id
			query = query.or(`patient_id.eq.${patientId},unregistered_patient_id.eq.${patientId}`);
		}

		const { data, error } = await query;

		if (error) {
			console.error('❌ Error obteniendo recetas:', error.message);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ prescriptions: data }, { status: 200 });
	} catch (err: any) {
		console.error('❌ Error inesperado en GET /prescriptions:', err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}

// ✅ POST — Crea una nueva receta con sus items
export async function POST(req: Request) {
	try {
		const { supabase } = createSupabaseServerClient();
		const body = await req.json();

		/**
		 * Estructura esperada:
		 * {
		 *   patient_id?: string,
		 *   unregistered_patient_id?: string,
		 *   consultation_id?: string,
		 *   notes?: string,
		 *   valid_until?: string (ISO),
		 *   doctor_id?: string,
		 *   items: [
		 *     { medication_id?: string, name: string, dosage?: string, form?: string, frequency?: string, duration?: string, quantity?: number, instructions?: string }
		 *   ]
		 * }
		 */

		// Validar que haya al menos un tipo de paciente (registrado o no registrado)
		if ((!body?.patient_id && !body?.unregistered_patient_id) || !Array.isArray(body.items)) {
			return NextResponse.json({ error: 'El cuerpo de la solicitud es inválido. Se requiere (patient_id o unregistered_patient_id) e items[]' }, { status: 400 });
		}

		// Obtener sesión (usuario actual = doctor)
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError) console.warn('⚠️ No se pudo obtener sesión:', userError.message);

		const doctor_id = user?.id ?? body.doctor_id;
		if (!doctor_id) return NextResponse.json({ error: 'No se pudo determinar el doctor_id' }, { status: 401 });

		// Crear receta principal
		const prescriptionPayload: any = {
			doctor_id,
			consultation_id: body.consultation_id ?? null,
			notes: body.notes ?? null,
			valid_until: body.valid_until ?? null,
			status: body.status ?? 'ACTIVE',
		};

		// Incluir patient_id o unregistered_patient_id según corresponda
		if (body.patient_id) {
			prescriptionPayload.patient_id = body.patient_id;
		}
		if (body.unregistered_patient_id) {
			prescriptionPayload.unregistered_patient_id = body.unregistered_patient_id;
		}

		const { data: prescription, error: insertError } = await supabase.from('prescription').insert(prescriptionPayload).select('id').single();

		if (insertError) {
			console.error('❌ Error insertando receta:', insertError.message);
			return NextResponse.json({ error: insertError.message }, { status: 500 });
		}

		// Insertar items asociados
		const itemsToInsert = body.items.map((item: any) => ({
			prescription_id: prescription.id,
			medication_id: item.medication_id ?? null,
			name: item.name,
			dosage: item.dosage ?? null,
			form: item.form ?? null,
			frequency: item.frequency ?? null,
			duration: item.duration ?? null,
			quantity: item.quantity ?? null,
			instructions: item.instructions ?? null,
		}));

		const { error: itemsError } = await supabase.from('prescription_item').insert(itemsToInsert);

		if (itemsError) {
			console.error('❌ Error insertando items:', itemsError.message);
			// rollback si falla
			await supabase.from('prescription').delete().eq('id', prescription.id);
			return NextResponse.json({ error: itemsError.message }, { status: 500 });
		}

		// Recuperar receta creada con items
		const { data: createdPrescription, error: fetchError } = await supabase
			.from('prescription')
			.select(
				`
        id,
        patient_id,
        unregistered_patient_id,
        doctor_id,
        consultation_id,
        issued_at,
        valid_until,
        notes,
        status,
        created_at,
        prescription_item (*)
      `
			)
			.eq('id', prescription.id)
			.single();

		if (fetchError) {
			console.error('❌ Error recuperando receta creada:', fetchError.message);
			return NextResponse.json({ error: fetchError.message }, { status: 500 });
		}

		// Crear notificación y enviar email al paciente (solo si es paciente registrado)
		try {
			// Obtener información del paciente y doctor
			let patientName: string | undefined = undefined;
			let patientUserId: string | null = null;

			if (body.patient_id) {
				// Paciente registrado
				const [patientRes, doctorRes] = await Promise.all([
					supabase.from('Patient').select('firstName, lastName').eq('id', body.patient_id).maybeSingle(),
					supabase.from('User').select('name, organizationId').eq('id', doctor_id).maybeSingle(),
				]);

				patientName = patientRes.data ? `${patientRes.data.firstName} ${patientRes.data.lastName}` : undefined;
				const doctorName = doctorRes.data?.name || undefined;
				const organizationId = doctorRes.data?.organizationId || null;

				const prescriptionDate = createdPrescription.issued_at 
					? new Date(createdPrescription.issued_at).toLocaleDateString('es-ES', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric',
					})
					: new Date().toLocaleDateString('es-ES');

				// Obtener userId del paciente (si existe en User table)
				try {
					const { data: patientUser } = await supabase
						.from('User')
						.select('id')
						.eq('patientProfileId', body.patient_id)
						.maybeSingle();
					patientUserId = patientUser?.id || null;
				} catch {
					// Ignorar error
				}

				const prescriptionUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'}/dashboard/patient/recetas`;

				if (patientUserId) {
					await createNotification({
						userId: patientUserId,
						organizationId,
						type: 'PRESCRIPTION',
						title: 'Nueva Receta Médica',
						message: `El Dr./Dra. ${doctorName || 'tu médico'} ha emitido una nueva receta médica para ti.`,
						payload: {
							prescriptionId: prescription.id,
							prescription_id: prescription.id,
							patient_id: body.patient_id,
							patientName,
							doctorName,
							prescriptionDate,
							prescriptionUrl,
						},
						sendEmail: true,
					});
				}
			}
			// Si es paciente no registrado, no se envía notificación (no tiene cuenta en el sistema)

		} catch (notifErr) {
			console.error('❌ Error creando notificación/email para receta:', notifErr);
			// No fallar la creación de la receta si la notificación falla
		}

		return NextResponse.json({ prescription: createdPrescription }, { status: 201 });
	} catch (err) {
		console.error('❌ Error inesperado en POST /prescriptions:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
