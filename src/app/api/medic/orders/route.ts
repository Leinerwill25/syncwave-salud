// app/api/medic/orders/route.ts
// API para gestionar órdenes médicas (solicitudes de exámenes de laboratorio)

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { apiRequireRole } from '@/lib/auth-guards';

// GET - Lista todas las órdenes médicas del médico
export async function GET(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		// Type assertion: después de la validación, user está garantizado
		const authenticatedUser = user;

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const url = new URL(req.url);
		const patientId = url.searchParams.get('patientId');
		const consultationId = url.searchParams.get('consultationId');
		const status = url.searchParams.get('status'); // pending, processing, completed

		// Las órdenes médicas son lab_result donde ordering_provider_id es el médico actual
		// Estado: pending (sin result), processing (result parcial), completed (result completo)
		// Nota: Ya no usamos la relación Patient:patient_id porque patient_id puede ser de Patient o unregisteredpatients
		let query = supabase
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
					diagnosis
				)
			`)
			.eq('ordering_provider_id', authenticatedUser.userId)
			.order('created_at', { ascending: false });

		if (patientId) {
			query = query.eq('patient_id', patientId);
		}

		if (consultationId) {
			query = query.eq('consultation_id', consultationId);
		}

		const { data: orders, error } = await query;

		if (error) {
			console.error('[Medic Orders API] Error:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Obtener información de pacientes (tanto registrados como no registrados)
		const patientIds = new Set<string>();
		const unregisteredPatientIds = new Set<string>();
		
		(orders || []).forEach((order: any) => {
			if (order.patient_id) patientIds.add(order.patient_id);
			if (order.unregistered_patient_id) unregisteredPatientIds.add(order.unregistered_patient_id);
		});

		// Obtener pacientes registrados
		const registeredPatientsMap = new Map();
		if (patientIds.size > 0) {
			const { data: registeredPatients } = await supabase
				.from('Patient')
				.select('id, firstName, lastName, identifier')
				.in('id', Array.from(patientIds));
			
			if (registeredPatients) {
				registeredPatients.forEach((p: any) => {
					registeredPatientsMap.set(p.id, p);
				});
			}
		}

		// Obtener pacientes no registrados
		const unregisteredPatientsMap = new Map();
		if (unregisteredPatientIds.size > 0) {
			const { data: unregisteredPatients } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, identification')
				.in('id', Array.from(unregisteredPatientIds));
			
			if (unregisteredPatients) {
				unregisteredPatients.forEach((up: any) => {
					unregisteredPatientsMap.set(up.id, {
						id: up.id,
						firstName: up.first_name,
						lastName: up.last_name,
						identifier: up.identification,
					});
				});
			}
		}

		// Determinar estado basado en si tiene result y agregar información del paciente
		const ordersWithStatus = (orders || []).map((order: any) => {
			let orderStatus = 'pending';
			if (order.result) {
				// Verificar si result es un objeto JSON con información del paciente no registrado
				// Si contiene unregistered_patient_id, NO es un resultado de laboratorio, es información del paciente
				try {
					const resultData = typeof order.result === 'string' ? JSON.parse(order.result) : order.result;
					if (resultData && resultData.unregistered_patient_id) {
						// Es información del paciente no registrado, NO es un resultado de laboratorio
						// Mantener como pending porque no hay resultados reales
						orderStatus = 'pending';
					} else {
						// Es un resultado de laboratorio normal
						orderStatus = 'completed';
					}
				} catch {
					// Si no es JSON válido, puede ser un resultado de laboratorio en texto
					// Solo considerar completado si no es un string que parece información del paciente
					const resultStr = String(order.result);
					if (resultStr.includes('unregistered_patient_id') || resultStr.includes('patient_name')) {
						// Parece información del paciente, mantener como pending
						orderStatus = 'pending';
					} else {
						// Es un resultado de laboratorio
						orderStatus = 'completed';
					}
				}
			} else if (order.reported_at) {
				orderStatus = 'processing';
			}

			// Obtener información del paciente
			let patient = null;
			if (order.patient_id) {
				// Intentar obtener de pacientes registrados primero
				patient = registeredPatientsMap.get(order.patient_id);
				
				// Si no está en registrados, puede ser un paciente no registrado (usando su ID como patient_id)
				if (!patient && unregisteredPatientsMap.has(order.patient_id)) {
					patient = unregisteredPatientsMap.get(order.patient_id);
				}
			}
			
			// Si hay unregistered_patient_id, usar ese
			if (!patient && order.unregistered_patient_id) {
				patient = unregisteredPatientsMap.get(order.unregistered_patient_id);
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
						};
					}
				} catch {
					// Ignorar errores de parsing
				}
			}

			return {
				...order,
				status: orderStatus,
				Patient: patient, // Agregar información del paciente
			};
		});

		// Filtrar por status si se especifica
		const filtered = status
			? ordersWithStatus.filter((o: any) => o.status === status)
			: ordersWithStatus;

		return NextResponse.json({ orders: filtered }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Orders API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// POST - Crear una nueva orden médica
export async function POST(req: Request) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		// Type assertion: después de la validación, user está garantizado
		const authenticatedUser = user;

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		const body = await req.json();
		const { patient_id, consultation_id, result_type, attachments, notes, is_critical } = body;

		if (!result_type) {
			return NextResponse.json(
				{ error: 'result_type es requerido' },
				{ status: 400 }
			);
		}

		// Si hay consultation_id, validar que pertenezca al paciente correcto (registrado o no registrado)
		let finalPatientId = patient_id;
		let isUnregisteredPatient = false;
		let consultation: any = null;

		if (consultation_id) {
			const { data: consultationData, error: consultationError } = await supabase
				.from('consultation')
				.select('id, patient_id, unregistered_patient_id, doctor_id, organization_id')
				.eq('id', consultation_id)
				.eq('doctor_id', authenticatedUser.userId)
				.maybeSingle();

			if (consultationError) {
				console.error('[Medic Orders API] Error obteniendo consulta:', consultationError);
				return NextResponse.json({ error: 'Error al validar la consulta' }, { status: 500 });
			}

			if (!consultationData) {
				return NextResponse.json(
					{ error: 'La consulta especificada no existe o no pertenece al médico actual' },
					{ status: 404 }
				);
			}

			consultation = consultationData;

			// Verificar si es paciente no registrado
			if (consultation.unregistered_patient_id && !consultation.patient_id) {
				isUnregisteredPatient = true;
				
				// Obtener datos del paciente no registrado
				const { data: unregisteredPatient, error: unregisteredError } = await supabase
					.from('unregisteredpatients')
					.select('id, first_name, last_name, identification, phone, email, birth_date, sex, address')
					.eq('id', consultation.unregistered_patient_id)
					.maybeSingle();
				
				if (unregisteredError || !unregisteredPatient) {
					console.error('[Medic Orders API] Error obteniendo paciente no registrado:', unregisteredError);
					return NextResponse.json(
						{ error: 'Error al obtener datos del paciente no registrado' },
						{ status: 500 }
					);
				}
				
				// Validar que el patient_id proporcionado (si existe) corresponde al paciente no registrado
				// O si no se proporciona, usar el unregistered_patient_id directamente
				if (patient_id) {
					// Si se proporciona un patient_id, verificar que corresponde al paciente no registrado
					// Buscar en unregisteredpatients por identification para validar
					if (unregisteredPatient.identification) {
						const { data: unregisteredByIdentifier } = await supabase
							.from('unregisteredpatients')
							.select('id')
							.eq('identification', unregisteredPatient.identification)
							.maybeSingle();
						
						// Si el patient_id no existe en Patient, es válido usar el unregistered_patient_id
						// No necesitamos crear registro en Patient, solo validar que el paciente no registrado existe
						if (unregisteredByIdentifier && unregisteredByIdentifier.id === consultation.unregistered_patient_id) {
							// El paciente no registrado es válido, pero lab_result requiere patient_id
							// Usaremos SQL directo para insertar con patient_id null y almacenar unregistered_patient_id en notes o metadata
							// Por ahora, marcamos que es un paciente no registrado
							isUnregisteredPatient = true;
						}
					}
				}
				
				// Para pacientes no registrados, no creamos registro en Patient
				// Usaremos SQL directo para insertar en lab_result con patient_id null (si el esquema lo permite)
				// o almacenaremos la información del paciente no registrado en un campo JSON
			}

			// Usar el patient_id de la consulta si está disponible
			if (consultation.patient_id) {
				finalPatientId = consultation.patient_id;
			}

			// Validar que el patient_id proporcionado coincida con el de la consulta
			if (patient_id && consultation.patient_id && patient_id !== consultation.patient_id) {
				return NextResponse.json(
					{ error: 'El patient_id proporcionado no coincide con el de la consulta especificada' },
					{ status: 400 }
				);
			}
		}

		// Crear orden médica (lab_result sin result aún)
		let order;
		let error;

		if (isUnregisteredPatient && consultation && consultation.unregistered_patient_id) {
			// Para pacientes no registrados, usar el id del paciente no registrado como patient_id
			// NO guardar información del paciente en el campo result - ese campo es solo para resultados de laboratorio
			
			// Validar que el paciente no registrado existe
			const { data: unregisteredPatient } = await supabase
				.from('unregisteredpatients')
				.select('id')
				.eq('id', consultation.unregistered_patient_id)
				.maybeSingle();

			if (!unregisteredPatient) {
				return NextResponse.json(
					{ error: 'No se encontró el paciente no registrado especificado' },
					{ status: 404 }
				);
			}

			// Usar el id del paciente no registrado como patient_id
			finalPatientId = consultation.unregistered_patient_id;

			// Insertar la orden médica usando Supabase con el patient_id del paciente no registrado
			// IMPORTANTE: result debe ser null porque aún no hay resultados de laboratorio
			const result = await supabase
				.from('lab_result')
				.insert({
					patient_id: finalPatientId, // Usar el id del paciente no registrado
					unregistered_patient_id: consultation.unregistered_patient_id, // También guardar en unregistered_patient_id si existe
					consultation_id: consultation_id || null,
					ordering_provider_id: authenticatedUser.userId,
					result_type,
					result: null, // NO guardar información del paciente aquí - este campo es solo para resultados de laboratorio
					attachments: attachments || [],
					is_critical: is_critical || false,
				})
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
					created_at
				`)
				.single();

			order = result.data;
			error = result.error;
		} else {
			// Para pacientes registrados, usar el método normal de Supabase
			if (!finalPatientId) {
				return NextResponse.json(
					{ error: 'patient_id es requerido. Debe proporcionarse directamente o a través de una consulta válida' },
					{ status: 400 }
				);
			}

			// Para pacientes registrados, crear orden médica normal
			// IMPORTANTE: result siempre null al crear - solo para resultados de laboratorio
			const result = await supabase
				.from('lab_result')
				.insert({
					patient_id: finalPatientId,
					consultation_id: consultation_id || null,
					ordering_provider_id: authenticatedUser.userId,
					result_type,
					result: null, // IMPORTANTE: result siempre null al crear - solo para resultados de laboratorio
					attachments: attachments || [],
					is_critical: is_critical || false,
				})
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

			order = result.data;
			error = result.error;
		}

		if (error) {
			console.error('[Medic Orders API] Error creando orden:', error);
			return NextResponse.json({ error: error.message || 'Error al crear orden médica' }, { status: 500 });
		}

		return NextResponse.json(
			{
				order: {
					...order,
					status: 'pending',
				},
			},
			{ status: 201 }
		);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Orders API] Error inesperado:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

