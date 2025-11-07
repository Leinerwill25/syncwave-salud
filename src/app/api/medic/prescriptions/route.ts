import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

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

		if (patientId) query = query.eq('patient_id', patientId);

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
		 *   patient_id: string,
		 *   consultation_id?: string,
		 *   notes?: string,
		 *   valid_until?: string (ISO),
		 *   doctor_id?: string,
		 *   items: [
		 *     { medication_id?: string, name: string, dosage?: string, form?: string, frequency?: string, duration?: string, quantity?: number, instructions?: string }
		 *   ]
		 * }
		 */

		if (!body?.patient_id || !Array.isArray(body.items)) {
			return NextResponse.json({ error: 'El cuerpo de la solicitud es inválido. Se requiere patient_id e items[]' }, { status: 400 });
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
		const prescriptionPayload = {
			patient_id: body.patient_id,
			doctor_id,
			consultation_id: body.consultation_id ?? null,
			notes: body.notes ?? null,
			valid_until: body.valid_until ?? null,
			status: body.status ?? 'ACTIVE',
		};

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

		return NextResponse.json({ prescription: createdPrescription }, { status: 201 });
	} catch (err: any) {
		console.error('❌ Error inesperado en POST /prescriptions:', err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
