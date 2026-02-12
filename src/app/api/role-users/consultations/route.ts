import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';
import { createClient } from '@supabase/supabase-js';

// GET: Obtener consultas basadas en citas confirmadas
export async function GET(request: NextRequest) {
	try {
		// Verificar sesión del usuario de rol
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado. Debe iniciar sesión como usuario de rol.' }, { status: 401 });
		}

		// Usar service role para evitar problemas de RLS al acceder a datos de pacientes
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			console.error('[Role User Consultations API] Variables de entorno de Supabase no configuradas');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		// Crear cliente con service role para evitar RLS
		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});
		const url = new URL(request.url);
		const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
		const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') || '10'));
		const q = url.searchParams.get('q') || '';

		const start = (page - 1) * pageSize;
		const end = start + pageSize - 1;

		// Obtener consultas que tienen appointment_id asociado
		// Y filtrar por citas confirmadas (status = 'CONFIRMADA')
		// Las consultas se muestran basadas en el estado de la cita
		let query = supabase
			.from('consultation')
			.select(
				`
				id,
				appointment_id,
				chief_complaint,
				diagnosis,
				notes,
				created_at,
				started_at,
				patient_id,
				unregistered_patient_id,
				organization_id,
				patient:patient_id(
					id,
					firstName,
					lastName,
					identifier
				),
				unregistered_patient:unregistered_patient_id(
					id,
					first_name,
					last_name,
					identification
				),
				appointment:appointment_id(
					id,
					status,
					scheduled_at,
					selected_service,
					referral_source,
					location,
					facturacion:facturacion!appointment_id(
						id,
						subtotal,
						impuestos,
						total,
						currency,
						tipo_cambio,
						metodo_pago,
						estado_pago,
						fecha_pago,
						notas
					)
				)
				`,
				{ count: 'exact' }
			)
			.eq('organization_id', session.organizationId)
			.not('appointment_id', 'is', null)
			.order('created_at', { ascending: false });

		// Filtrar solo citas confirmadas para mostrar como consultas
		// Necesitamos hacer un join con appointment para filtrar por status
		// Como Supabase no permite filtrar fácilmente por relaciones anidadas,
		// primero obtenemos las citas confirmadas y luego las consultas asociadas

		// Obtener IDs de citas confirmadas de la organización
		const { data: confirmedAppointments, error: appointmentsError } = await supabase
			.from('appointment')
			.select('id')
			.eq('organization_id', session.organizationId)
			.in('status', ['CONFIRMADA', 'COMPLETADA', 'REAGENDADA', 'CANCELADA', 'NO ASISTIÓ'])
			.order('scheduled_at', { ascending: false });

		if (appointmentsError) {
			console.error('[Role Users Consultations GET] Error obteniendo citas:', appointmentsError);
			return NextResponse.json({ error: 'Error al obtener citas' }, { status: 500 });
		}

		const appointmentIds = confirmedAppointments?.map((apt) => apt.id) || [];

		if (appointmentIds.length === 0) {
			return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 200 });
		}

		// Filtrar consultas por appointment_ids confirmados
		query = query.in('appointment_id', appointmentIds);

		// Aplicar búsqueda si existe
		if (q.trim()) {
			query = query.or(`chief_complaint.ilike.%${q}%,notes.ilike.%${q}%`);
		}

		const { data: consultations, error, count } = await query.range(start, end);

		if (error) {
			console.error('[Role Users Consultations GET] Error:', error);
			return NextResponse.json({ error: 'Error al obtener consultas' }, { status: 500 });
		}

		// Obtener información de servicios para parsear selected_service
		// Obtener el primer médico de la organización para acceder a sus servicios
		const { data: orgDoctor } = await supabase.from('users').select('id').eq('organizationId', session.organizationId).eq('role', 'MEDICO').limit(1).maybeSingle();

		let servicesMap: Map<string, any> = new Map();
		if (orgDoctor) {
			const { data: profile } = await supabase.from('medic_profile').select('services').eq('doctor_id', orgDoctor.id).maybeSingle();

			if (profile?.services) {
				let services: any[] = [];
				try {
					if (typeof profile.services === 'string') {
						services = JSON.parse(profile.services);
					} else if (Array.isArray(profile.services)) {
						services = profile.services;
					}
					services.forEach((s: any) => {
						if (s.id) servicesMap.set(s.id, s);
					});
				} catch (e) {
					console.error('[Consultations API] Error parseando servicios:', e);
				}
			}
		}

		// Formatear resultados
		const items = (consultations || []).map((consultation: any) => {
			const appointment = Array.isArray(consultation.appointment) ? consultation.appointment[0] : consultation.appointment;

			const facturacion = appointment?.facturacion ? (Array.isArray(appointment.facturacion) ? appointment.facturacion[0] : appointment.facturacion) : null;

			// Parsear selected_service y obtener información del servicio
			let serviceInfo: { id?: string; name?: string; price?: number; currency?: string } | null = null;

			// Intentar obtener servicio desde appointment.selected_service
			if (appointment?.selected_service) {
				try {
					let serviceData: any = appointment.selected_service;

					// Si es string, intentar parsear como JSON
					if (typeof serviceData === 'string') {
						try {
							serviceData = JSON.parse(serviceData);
						} catch {
							// Si no es JSON válido, tratar como ID
							serviceData = { id: serviceData };
						}
					}

					// Si es un objeto con propiedades, procesarlo
					if (typeof serviceData === 'object' && serviceData !== null) {
						// Si tiene ID, buscar en el mapa de servicios primero
						if (serviceData.id && servicesMap.has(serviceData.id)) {
							const fullService = servicesMap.get(serviceData.id);
							serviceInfo = {
								id: fullService.id,
								name: fullService.name || 'Servicio',
								price: fullService.price || 0,
								currency: fullService.currency || 'USD',
							};
						} else if (serviceData.name) {
							// Si tiene nombre directamente, usar esa información
							serviceInfo = {
								id: serviceData.id,
								name: serviceData.name || 'Servicio',
								price: serviceData.price || 0,
								currency: serviceData.currency || 'USD',
							};
						} else if (serviceData.id) {
							// Solo tiene ID, buscar en el mapa aunque no se encontró antes
							// Puede ser que el ID esté en formato diferente
							for (const [key, value] of servicesMap.entries()) {
								if (key === serviceData.id || String(value.id) === String(serviceData.id)) {
									serviceInfo = {
										id: value.id,
										name: value.name || 'Servicio',
										price: value.price || 0,
										currency: value.currency || 'USD',
									};
									break;
								}
							}
						}
					}
				} catch (e) {
					console.error('[Consultations API] Error parseando selected_service:', e, appointment.selected_service);
				}
			}

			// Si no se encontró servicio desde appointment, intentar desde facturacion o usar un nombre genérico
			// pero solo si realmente hay facturación (lo que indica que hubo un servicio)
			if (!serviceInfo && facturacion && facturacion.total > 0) {
				// Si hay facturación pero no servicio parseado, usar información genérica
				serviceInfo = {
					name: 'Servicio de Consulta',
					price: facturacion.total,
					currency: facturacion.currency || 'USD',
				};
			}

			// Determinar paciente
			let patientName = 'Sin paciente';
			let patientIdentifier: string | undefined;
			let isUnregistered = false;

			if (consultation.unregistered_patient) {
				const up = Array.isArray(consultation.unregistered_patient) ? consultation.unregistered_patient[0] : consultation.unregistered_patient;
				patientName = `${up.first_name} ${up.last_name}`;
				patientIdentifier = up.identification;
				isUnregistered = true;
			} else if (consultation.patient) {
				const p = Array.isArray(consultation.patient) ? consultation.patient[0] : consultation.patient;
				patientName = `${p.firstName} ${p.lastName}`;
				patientIdentifier = p.identifier;
			}

			// Estado basado en status de la cita
			const appointmentStatus = appointment?.status || 'PENDIENTE';

			// Mapear estados de cita a estados de consulta
			let consultationStatus = appointmentStatus;
			if (appointmentStatus === 'SCHEDULED') consultationStatus = 'EN ESPERA';
			if (appointmentStatus === 'CONFIRMADA') consultationStatus = 'CONFIRMADA';
			if (appointmentStatus === 'REAGENDADA') consultationStatus = 'REAGENDADA';
			if (appointmentStatus === 'CANCELADA') consultationStatus = 'CANCELADA';
			if (appointmentStatus === 'COMPLETADA') consultationStatus = 'COMPLETADA';
			if (appointmentStatus === 'NO ASISTIÓ') consultationStatus = 'NO ASISTIÓ';

			return {
				id: consultation.id,
				appointmentId: consultation.appointment_id,
				patientName,
				patientIdentifier,
				isUnregistered,
				chiefComplaint: consultation.chief_complaint,
				diagnosis: consultation.diagnosis,
				notes: consultation.notes,
				createdAt: consultation.created_at,
				startedAt: consultation.started_at,
				status: consultationStatus,
				appointmentStatus: appointmentStatus,
				scheduledAt: appointment?.scheduled_at,
				selectedService: appointment?.selected_service,
				serviceInfo: serviceInfo,
				referralSource: appointment?.referral_source,
				location: appointment?.location,
				facturacion: facturacion
					? {
							id: facturacion.id,
							subtotal: facturacion.subtotal,
							impuestos: facturacion.impuestos,
							total: facturacion.total,
							currency: facturacion.currency,
							tipoCambio: facturacion.tipo_cambio,
							metodoPago: facturacion.metodo_pago,
							estadoPago: facturacion.estado_pago,
							fechaPago: facturacion.fecha_pago,
							notas: facturacion.notas,
					  }
					: null,
			};
		});

		return NextResponse.json({
			items,
			total: count || 0,
			page,
			pageSize,
		});
	} catch (err) {
		console.error('[Role Users Consultations GET] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

// POST: Crear consulta (solo información administrativa, sin datos médicos sensibles)
export async function POST(request: NextRequest) {
	try {
		// Verificar sesión del usuario de rol
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado. Debe iniciar sesión como usuario de rol.' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const { organization_id, patient_id, unregistered_patient_id, chief_complaint, notes, consultation_date, scheduled_at, is_role_user } = body;

		if (!organization_id) {
			return NextResponse.json({ error: 'organization_id es requerido' }, { status: 400 });
		}

		if (!chief_complaint) {
			return NextResponse.json({ error: 'El motivo de consulta (chief_complaint) es requerido' }, { status: 400 });
		}

		if (!patient_id && !unregistered_patient_id) {
			return NextResponse.json({ error: 'Debe proporcionar patient_id o unregistered_patient_id' }, { status: 400 });
		}

		// Verificar que la organización del usuario de rol coincida
		if (organization_id !== session.organizationId) {
			return NextResponse.json({ error: 'No tiene permisos para crear consultas en esta organización' }, { status: 403 });
		}

		// Obtener el doctor principal de la organización (el primer médico)
		const { data: orgDoctor, error: doctorError } = await supabase.from('users').select('id').eq('organizationId', organization_id).eq('role', 'MEDICO').limit(1).maybeSingle();

		if (doctorError || !orgDoctor) {
			return NextResponse.json({ error: 'No se encontró un médico asociado a esta organización' }, { status: 400 });
		}

		const doctorId = orgDoctor.id;

		// Determinar started_at
		let startedAt: Date | null = null;
		const now = new Date();

		if (consultation_date) {
			const consultationDate = new Date(consultation_date);
			if (consultationDate <= now) {
				startedAt = consultationDate;
			}
		} else if (scheduled_at) {
			const scheduledDate = new Date(scheduled_at);
			if (scheduledDate <= now) {
				startedAt = scheduledDate;
			}
		}

		if (!startedAt) {
			startedAt = now;
		}

		// Construir payload de inserción
		const insertPayload: any = {
			doctor_id: doctorId,
			organization_id: organization_id,
			chief_complaint: chief_complaint,
			diagnosis: null, // No se permite diagnóstico para usuarios de rol
			notes: notes || null,
			started_at: startedAt.toISOString(),
			status: 'IN_PROGRESS', // Consulta iniciada
		};

		if (patient_id) {
			insertPayload.patient_id = patient_id;
			insertPayload.unregistered_patient_id = null;
		} else {
			insertPayload.unregistered_patient_id = unregistered_patient_id;
			insertPayload.patient_id = null;
		}

		// Guardar fecha de consulta en vitals si está disponible
		if (consultation_date || scheduled_at) {
			insertPayload.vitals = {
				consultation_date: consultation_date || scheduled_at,
				created_by_role_user: true,
				role_user_id: session.roleUserId,
			};
		}

		// Insertar consulta
		const { data: consultation, error: insertError } = await supabase.from('consultation').insert([insertPayload]).select().single();

		if (insertError) {
			console.error('[Role Users Consultations] Error insertando consulta:', insertError);
			return NextResponse.json({ error: 'Error al crear la consulta', detail: insertError.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, data: consultation });
	} catch (err) {
		console.error('[Role Users Consultations] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}
