// app/api/medic/orders/[id]/route.ts
// API para gestionar una orden médica específica

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Obtener detalles de una orden médica
export async function GET(
	req: Request,
	context: { params: Promise<{ id: string }> }
) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		// Type assertion: después de la validación, user está garantizado
		const authenticatedUser = user;

		const { id } = await context.params;
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const { data: order, error } = await supabase
			.from('lab_result')
			.select(`
				id,
				patient_id,
				unregistered_patient_id,
				consultation_id,
				ordering_provider_id,
				result_type,
				result,
				attachments,
				is_critical,
				reported_at,
				created_at,
				consultation:consultation_id (
					id,
					chief_complaint,
					diagnosis,
					notes,
					started_at,
					ended_at
				)
			`)
			.eq('id', id)
			.eq('ordering_provider_id', authenticatedUser.userId)
			.single();

		if (error) {
			console.error('[Medic Orders API] Error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		if (!order) {
			return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
		}

		// Obtener información del paciente (registrado o no registrado)
		let patient = null;
		if (order.patient_id) {
			// Intentar obtener de pacientes registrados primero
			const { data: registeredPatient } = await supabase
				.from('patient')
				.select('id, firstName, lastName, identifier, dob, gender, phone')
				.eq('id', order.patient_id)
				.maybeSingle();
			
			if (registeredPatient) {
				patient = registeredPatient;
			} else {
				// Si no está en registrados, puede ser un paciente no registrado (usando su ID como patient_id)
				const { data: unregisteredPatient } = await supabase
					.from('unregisteredpatients')
					.select('id, first_name, last_name, identification, birth_date, sex, phone')
					.eq('id', order.patient_id)
					.maybeSingle();
				
				if (unregisteredPatient) {
					patient = {
						id: unregisteredPatient.id,
						firstName: unregisteredPatient.first_name,
						lastName: unregisteredPatient.last_name,
						identifier: unregisteredPatient.identification,
						dob: unregisteredPatient.birth_date,
						gender: unregisteredPatient.sex,
						phone: unregisteredPatient.phone,
					};
				}
			}
		}
		
		// Si hay unregistered_patient_id, usar ese
		if (!patient && order.unregistered_patient_id) {
			const { data: unregisteredPatient } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, identification, birth_date, sex, phone')
				.eq('id', order.unregistered_patient_id)
				.maybeSingle();
			
			if (unregisteredPatient) {
				patient = {
					id: unregisteredPatient.id,
					firstName: unregisteredPatient.first_name,
					lastName: unregisteredPatient.last_name,
					identifier: unregisteredPatient.identification,
					dob: unregisteredPatient.birth_date,
					gender: unregisteredPatient.sex,
					phone: unregisteredPatient.phone,
				};
			}
		}

		// Si aún no hay paciente pero hay result con información del paciente no registrado
		if (!patient && order.result) {
			try {
				const resultData = typeof order.result === 'string' ? JSON.parse(order.result) : order.result;
				if (resultData && resultData.unregistered_patient_id) {
					patient = {
						id: resultData.unregistered_patient_id,
						firstName: resultData.patient_name?.split(' ')[0] || '',
						lastName: resultData.patient_name?.split(' ').slice(1).join(' ') || '',
						identifier: resultData.identification,
						dob: resultData.birth_date,
						gender: resultData.sex,
						phone: resultData.phone,
					};
				}
			} catch {
				// Ignorar errores de parsing
			}
		}

		// Determinar estado
		let status = 'pending';
		if (order.result) {
			// Verificar si result es un objeto JSON con información del paciente no registrado
			// Si contiene unregistered_patient_id, NO es un resultado de laboratorio
			try {
				const resultData = typeof order.result === 'string' ? JSON.parse(order.result) : order.result;
				if (resultData && resultData.unregistered_patient_id) {
					// Es información del paciente no registrado, NO es un resultado de laboratorio
					// Mantener como pending porque no hay resultados reales
					status = 'pending';
				} else {
					// Es un resultado de laboratorio normal
					status = 'completed';
				}
			} catch {
				// Si no es JSON válido, puede ser un resultado de laboratorio en texto
				// Solo considerar completado si no es un string que parece información del paciente
				const resultStr = String(order.result);
				if (resultStr.includes('unregistered_patient_id') || resultStr.includes('patient_name')) {
					// Parece información del paciente, mantener como pending
					status = 'pending';
				} else {
					// Es un resultado de laboratorio
					status = 'completed';
				}
			}
		} else if (order.reported_at) {
			status = 'processing';
		}

		return NextResponse.json(
			{
				order: {
					...order,
					Patient: patient, // Agregar información del paciente
					status,
				},
			},
			{ status: 200 }
		);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Orders API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// PATCH - Actualizar una orden médica (agregar attachments, etc.)
export async function PATCH(
	req: Request,
	context: { params: Promise<{ id: string }> }
) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		// Type assertion: después de la validación, user está garantizado
		const authenticatedUser = user;

		const { id } = await context.params;
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await req.json();
		const { attachments, result_type, is_critical } = body;

		// Verificar que la orden pertenece al médico
		const { data: existingOrder, error: checkError } = await supabase
			.from('lab_result')
			.select('id, ordering_provider_id')
			.eq('id', id)
			.eq('ordering_provider_id', authenticatedUser.userId)
			.single();

		if (checkError || !existingOrder) {
			return NextResponse.json(
				{ error: 'Orden no encontrada o no autorizada' },
				{ status: 404 }
			);
		}

		// Actualizar solo campos permitidos
		const updateData: Record<string, unknown> = {};
		if (attachments !== undefined) updateData.attachments = attachments;
		if (result_type !== undefined) updateData.result_type = result_type;
		if (is_critical !== undefined) updateData.is_critical = is_critical;

		const { data: updatedOrder, error } = await supabase
			.from('lab_result')
			.update(updateData)
			.eq('id', id)
			.select(`
				id,
				patient_id,
				consultation_id,
				ordering_provider_id,
				result_type,
				result,
				attachments,
				is_critical,
				reported_at,
				created_at
			`)
			.single();

		if (error) {
			console.error('[Medic Orders API] Error actualizando:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Determinar estado
		let status = 'pending';
		if (updatedOrder.result) {
			status = 'completed';
		} else if (updatedOrder.reported_at) {
			status = 'processing';
		}

		return NextResponse.json(
			{
				order: {
					...updatedOrder,
					status,
				},
			},
			{ status: 200 }
		);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Orders API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

