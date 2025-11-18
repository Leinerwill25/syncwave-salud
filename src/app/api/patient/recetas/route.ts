// app/api/patient/recetas/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const url = new URL(request.url);
		const status = url.searchParams.get('status'); // active, expired, all

		// Obtener todas las recetas primero para poder filtrar por fecha de vencimiento
		let query = supabase
			.from('prescription')
			.select(`
				id,
				patient_id,
				doctor_id,
				consultation_id,
				issued_at,
				valid_until,
				notes,
				status,
				created_at,
				doctor:User!fk_prescription_doctor (
					id,
					name,
					email
				),
				prescription_item:prescription_item!fk_prescriptionitem_prescription (
					id,
					prescription_id,
					medication_id,
					name,
					dosage,
					form,
					frequency,
					duration,
					quantity,
					instructions
				)
			`)
			.eq('patient_id', patient.patientId)
			.order('created_at', { ascending: false });

		const { data: allPrescriptions, error } = await query;

		if (error) {
			console.error('[Patient Recetas API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener recetas' }, { status: 500 });
		}

		// Filtrar por estado considerando la fecha de vencimiento
		const now = new Date();
		let filteredPrescriptions = allPrescriptions || [];

		if (status === 'active') {
			// Activas: status = ACTIVE Y (sin valid_until O valid_until >= ahora)
			filteredPrescriptions = filteredPrescriptions.filter((prescription: any) => {
				const isActiveStatus = prescription.status === 'ACTIVE';
				const hasValidUntil = prescription.valid_until !== null;
				const isNotExpired = !hasValidUntil || new Date(prescription.valid_until) >= now;
				return isActiveStatus && isNotExpired;
			});
		} else if (status === 'expired') {
			// Vencidas: status = EXPIRED O (valid_until existe Y valid_until < ahora)
			filteredPrescriptions = filteredPrescriptions.filter((prescription: any) => {
				const isExpiredStatus = prescription.status === 'EXPIRED';
				const hasValidUntil = prescription.valid_until !== null;
				const isPastDue = hasValidUntil && new Date(prescription.valid_until) < now;
				return isExpiredStatus || isPastDue;
			});
		}
		// Si status === 'all', no filtrar

		// Agregar campo calculado para el estado real
		const prescriptionsWithRealStatus = filteredPrescriptions.map((prescription: any) => {
			const hasValidUntil = prescription.valid_until !== null;
			const isPastDue = hasValidUntil && new Date(prescription.valid_until) < now;
			const realStatus = isPastDue ? 'EXPIRED' : prescription.status;
			
			return {
				...prescription,
				realStatus, // Estado real basado en fecha
				isExpired: isPastDue, // Flag booleano para facilitar el uso
			};
		});

		const prescriptions = prescriptionsWithRealStatus;

		return NextResponse.json({
			data: prescriptions,
		});
	} catch (err: any) {
		console.error('[Patient Recetas API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

