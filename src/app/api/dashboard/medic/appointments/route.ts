// app/api/appointments/list/route.ts
import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(req: Request) {
	try {
		// 1️⃣ Autenticación - requerir que el usuario esté autenticado
		const authResult = await apiRequireRole(['MEDICO', 'CLINICA', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();
		const { searchParams } = new URL(req.url);
		const date = searchParams.get('date');

		if (!date) {
			return NextResponse.json({ error: 'Debe especificarse una fecha (YYYY-MM-DD).' }, { status: 400 });
		}

		// 🕐 1️⃣ Calcular rango de día local (sin convertir a UTC)
		const localDate = new Date(`${date}T00:00:00`);
		const startOfDay = new Date(localDate);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(localDate);
		endOfDay.setHours(23, 59, 59, 999);

		// 🕑 2️⃣ Convertir a formato compatible con Postgres timestamptz
		const startIso = startOfDay.toISOString().replace('Z', '+00:00');
		const endIso = endOfDay.toISOString().replace('Z', '+00:00');

		// 2️⃣ Determinar filtros de seguridad según el rol del usuario
		// REGLA CRÍTICA: Cada usuario solo puede ver datos de su propia organización/consultorio
		let doctorIdToFilter: string | null = null;
		let organizationIdToFilter: string | null = null;

		if (user.role === 'MEDICO') {
			// Médicos SOLO ven sus propias citas Y deben tener organizationId válido
			if (!user.userId) {
				console.error('[Appointments API] Usuario MEDICO sin userId');
				return NextResponse.json({ error: 'Usuario no válido' }, { status: 403 });
			}

			// Validar que el médico tenga una organización asignada
			if (!user.organizationId) {
				console.warn('[Appointments API] Médico sin organizationId - denegando acceso por seguridad');
				return NextResponse.json([], { status: 200 });
			}

			doctorIdToFilter = user.userId;
			organizationIdToFilter = user.organizationId;

			// Validar que el médico realmente pertenezca a esa organización
			const { data: doctorCheck } = await supabase.from('User').select('id, organizationId').eq('id', user.userId).eq('organizationId', user.organizationId).maybeSingle();

			if (!doctorCheck) {
				console.error('[Appointments API] Médico no pertenece a la organización especificada');
				return NextResponse.json({ error: 'Error de validación de organización' }, { status: 403 });
			}
		} else if (user.role === 'CLINICA' || user.role === 'ADMIN') {
			// Clínicas y admins ven citas de su organización
			if (!user.organizationId) {
				console.warn('[Appointments API] Usuario CLINICA/ADMIN sin organizationId - denegando acceso');
				return NextResponse.json([], { status: 200 });
			}

			organizationIdToFilter = user.organizationId;
		} else {
			// Para otros roles, no devolver nada por seguridad
			return NextResponse.json([], { status: 200 });
		}

		// 3️⃣ Construir query con filtros de seguridad
		let query = supabase
			.from('appointment')
			.select(
				`
				id,
				scheduled_at,
				duration_minutes,
				status,
				reason,
				location,
				patient_id,
				unregistered_patient_id,
				booked_by_patient_id,
				doctor_id,
				organization_id,
				selected_service,
				referral_source,
				patient:patient_id (
					id,
					firstName,
					lastName,
					identifier,
					phone
				),
				unregistered_patient:unregistered_patient_id (
					id,
					first_name,
					last_name,
					identification,
					phone
				)
				`
			)
			.gte('scheduled_at', startIso)
			.lte('scheduled_at', endIso);

		// 4️⃣ Aplicar filtros de seguridad - SIEMPRE filtrar por doctor_id Y organization_id
		// Esto asegura que incluso si hay un error, los datos están aislados
		if (doctorIdToFilter && organizationIdToFilter) {
			// Filtrar por doctor Y organización para máxima seguridad
			query = query.eq('doctor_id', doctorIdToFilter).eq('organization_id', organizationIdToFilter);
		} else if (organizationIdToFilter) {
			// Si solo hay organizationId, filtrar solo por eso
			query = query.eq('organization_id', organizationIdToFilter);
		} else {
			// Si no hay filtros de seguridad válidos, no devolver nada (seguridad por defecto)
			console.warn('[Appointments API] No hay filtros de seguridad válidos - denegando acceso');
			return NextResponse.json([], { status: 200 });
		}

		query = query.order('scheduled_at', { ascending: true });

		const { data, error } = await query;

		if (error) {
			console.error('❌ Error al obtener citas:', error.message);
			return NextResponse.json({ error: 'Error consultando citas en la base de datos.' }, { status: 500 });
		}

		if (!data || data.length === 0) {
			return NextResponse.json([], { status: 200 });
		}

		// 🧮 4️⃣ Formatear resultados y obtener datos de pacientes no registrados y booked_by_patient
		// Obtener todos los IDs de pacientes no registrados de una vez (ya viene en la query)
		let unregisteredPatientsMap: Map<string, { first_name: string; last_name: string; identification?: string; phone?: string }> = new Map();

		// Construir mapa desde los datos que ya vienen en la query
		data.forEach((cita: any) => {
			if (cita.unregistered_patient) {
				const up = Array.isArray(cita.unregistered_patient) ? cita.unregistered_patient[0] : cita.unregistered_patient;
				if (up && up.id) {
					unregisteredPatientsMap.set(up.id, {
						first_name: up.first_name || '',
						last_name: up.last_name || '',
						identification: up.identification || undefined,
						phone: up.phone || undefined,
					});
				}
			}
		});

		// Obtener datos de pacientes que reservaron citas (booked_by_patient_id)
		const bookedByPatientIds = [...new Set(data.map((cita: any) => cita.booked_by_patient_id).filter(Boolean))];

		let bookedByPatientsMap: Map<string, { id: string; firstName: string; lastName: string; identifier?: string }> = new Map();

		if (bookedByPatientIds.length > 0) {
			// booked_by_patient_id puede ser UUID (string), así que intentamos obtener de Patient
			const { data: bookedByPatients } = await supabase.from('Patient').select('id, firstName, lastName, identifier').in('id', bookedByPatientIds);

			if (bookedByPatients) {
				bookedByPatients.forEach((bp: any) => {
					bookedByPatientsMap.set(bp.id, {
						id: bp.id,
						firstName: bp.firstName || '',
						lastName: bp.lastName || '',
						identifier: bp.identifier || undefined,
					});
				});
			}
		}

		const citas = data.map((cita: any) => {
			const start = new Date(cita.scheduled_at);
			const startTime = start.toLocaleTimeString('es-ES', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: true,
			});

			let endTime = '';
			if (cita.duration_minutes) {
				const end = new Date(start.getTime() + cita.duration_minutes * 60000);
				endTime = end.toLocaleTimeString('es-ES', {
					hour: '2-digit',
					minute: '2-digit',
					hour12: true,
				});
			}

			// Determinar el nombre del paciente y datos completos
			let patientName = 'Paciente no identificado';
			let patientFirstName: string | null = null;
			let patientLastName: string | null = null;
			let patientIdentifier: string | null = null;
			let patientPhone: string | null = null;
			let isUnregistered = false;

			if (cita.unregistered_patient) {
				// Es un paciente no registrado
				const unregisteredPatient = Array.isArray(cita.unregistered_patient) ? cita.unregistered_patient[0] : cita.unregistered_patient;
				if (unregisteredPatient) {
					patientFirstName = unregisteredPatient.first_name || null;
					patientLastName = unregisteredPatient.last_name || null;
					patientIdentifier = unregisteredPatient.identification || null;
					patientPhone = unregisteredPatient.phone || null;
					patientName = `${patientFirstName || ''} ${patientLastName || ''}`.trim() || 'Paciente no identificado';
					isUnregistered = true;
				}
			} else if (cita.patient) {
				// Es un paciente registrado - normalizar (puede venir como array)
				const patient = Array.isArray(cita.patient) ? cita.patient[0] : cita.patient;
				if (patient) {
					patientFirstName = patient.firstName || null;
					patientLastName = patient.lastName || null;
					patientIdentifier = patient.identifier || null;
					patientPhone = patient.phone || null;
					patientName = `${patientFirstName || ''} ${patientLastName || ''}`.trim() || 'Paciente no identificado';
				}
			}

			// Parsear selected_service si existe
			let selectedService: { name: string; description?: string; price?: number; currency?: string } | null = null;
			if (cita.selected_service) {
				try {
					let serviceData: any = cita.selected_service;
					if (typeof serviceData === 'string') {
						try {
							serviceData = JSON.parse(serviceData);
						} catch {
							// Si no es JSON válido, usar como nombre
							serviceData = { name: serviceData };
						}
					}
					if (typeof serviceData === 'object' && serviceData !== null) {
						selectedService = {
							name: serviceData.name || 'Servicio',
							description: serviceData.description,
							price: serviceData.price || serviceData.price === 0 ? Number(serviceData.price) : undefined,
							currency: serviceData.currency || 'USD',
						};
					}
				} catch (e) {
					console.error('[Medic Appointments API] Error parseando selected_service:', e);
				}
			}

			// Determinar quién reservó la cita (si es diferente del paciente)
			let bookedBy = null;
			if (cita.booked_by_patient_id && cita.booked_by_patient_id !== cita.patient_id) {
				const bookedByPatient = bookedByPatientsMap.get(cita.booked_by_patient_id);
				if (bookedByPatient) {
					bookedBy = {
						id: bookedByPatient.id,
						name: `${bookedByPatient.firstName} ${bookedByPatient.lastName}`,
						identifier: bookedByPatient.identifier,
					};
				}
			}

			return {
				id: cita.id,
				patient: patientName,
				patientFirstName,
				patientLastName,
				patientIdentifier,
				patientPhone,
				isUnregistered,
				time: endTime ? `${startTime} - ${endTime}` : startTime,
				scheduled_at: cita.scheduled_at,
				status: cita.status ?? 'SCHEDULED',
				reason: cita.reason ?? '',
				location: cita.location ?? '',
				selected_service: selectedService,
				referral_source: cita.referral_source || null,
				bookedBy, // Información de quién reservó la cita (si es diferente del paciente)
			};
		});

		return NextResponse.json(citas, { status: 200 });
	} catch (error: any) {
		console.error('❌ Error general al obtener citas:', error);
		return NextResponse.json({ error: 'Error obteniendo citas médicas.' }, { status: 500 });
	}
}
