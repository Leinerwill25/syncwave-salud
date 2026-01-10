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
		const supabase = await createSupabaseServerClient();

		const url = new URL(request.url);
		const status = url.searchParams.get('status'); // active, expired, all
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 100); // Límite por defecto 30, máximo 100

		const now = new Date().toISOString();
		
		// Optimizar: filtrar en la base de datos cuando sea posible
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
				doctor:doctor_id (
					id,
					name
				),
				prescription_item (
					id,
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
			.order('created_at', { ascending: false })
			.limit(limit);

		// Si el status es específico, aplicar filtros básicos en la DB
		if (status === 'active') {
			query = query.eq('status', 'ACTIVE');
		} else if (status === 'expired') {
			query = query.or('status.eq.EXPIRED,valid_until.lt.' + now);
		}

		const { data: prescriptions, error } = await query;

		if (error) {
			console.error('[Patient Recetas API] Error:', error);
			return NextResponse.json({ 
				error: 'Error al obtener recetas', 
				detail: error.message
			}, { status: 500 });
		}

		// Filtrar por estado real (incluyendo validación de fecha) solo si es necesario
		const filteredPrescriptions = (prescriptions || []).map((prescription: any) => {
			const hasValidUntil = prescription.valid_until !== null;
			const isPastDue = hasValidUntil && new Date(prescription.valid_until) < new Date(now);
			const realStatus = isPastDue ? 'EXPIRED' : prescription.status;
			
			// Si el filtro de status es 'active', excluir expiradas por fecha
			if (status === 'active' && isPastDue) {
				return null;
			}
			// Si el filtro de status es 'expired', excluir activas que no estén expiradas por fecha
			if (status === 'expired' && !isPastDue && prescription.status !== 'EXPIRED') {
				return null;
			}
			
			return {
				...prescription,
				realStatus,
				isExpired: isPastDue,
			};
		}).filter((p: any) => p !== null);

		return NextResponse.json({
			data: filteredPrescriptions,
		}, {
			headers: {
				'Cache-Control': 'private, max-age=60', // Cache por 60 segundos
			},
		});
	} catch (err: any) {
		console.error('[Patient Recetas API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

