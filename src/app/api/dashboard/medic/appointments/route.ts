// app/api/appointments/list/route.ts
import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { optimizeSupabaseQuery, getLiteSelectFields } from '@/lib/lite-mode-utils';
import { getApiResponseHeaders } from '@/lib/api-cache-utils';

// Configurar caché optimizada (dynamic: datos que cambian frecuentemente)
export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(req: Request) {
	try {
		// 1️⃣ Autenticación - requerir que el usuario esté autenticado
		const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();
		const { searchParams } = new URL(req.url);
		const date = searchParams.get('date');
		const isLiteMode = searchParams.get('liteMode') === 'true';

		if (!date) {
			return NextResponse.json({ error: 'Debe especificarse una fecha (YYYY-MM-DD).' }, { status: 400 });
		}

		// 🕐 1️⃣ Calcular rango de día exacto respetando la zona horaria local
		// Recibimos 'YYYY-MM-DD'
		const startIso = `${date}T00:00:00.000Z`; // Usamos Z para indicar que el filtro es el rango absoluto del día
		const endIso = `${date}T23:59:59.999Z`;

        // NOTA: Para timestamptz en Postgres, compararemos contra el inicio y fin del día
        // con una lógica que asuma que el 'date' enviado ya es el día local del usuario.
        const dbStart = `${date} 00:00:00-04`; // Asumimos Caracas UTC-4
        const dbEnd = `${date} 23:59:59-04`;

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

			console.log('[Appointments API] Filtrando citas por doctor:', {
				doctorId: doctorIdToFilter,
				organizationId: organizationIdToFilter,
				date: date,
			});

			// Validar que el médico realmente pertenezca a esa organización
			const { data: doctorCheck } = await supabase.from('users').select('id, organizationId').eq('id', user.userId).eq('organizationId', user.organizationId).maybeSingle();

			if (!doctorCheck) {
				console.error('[Appointments API] Médico no pertenece a la organización especificada');
				return NextResponse.json({ error: 'Error de validación de organización' }, { status: 403 });
			}
		} else if (user.role === 'ADMIN') {
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

		// 3️⃣ Construir query con filtros de seguridad - En liteMode mantenemos relaciones de pacientes (crítico)
		// Solo reducimos campos no esenciales como location, selected_service, etc.
		const selectFields = isLiteMode
			? `id,
				scheduled_at,
				duration_minutes,
				status,
				reason,
				patient_id,
				unregistered_patient_id,
				doctor_id,
				organization_id,
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
				)`
			: `id,
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
				)`;

		let query = supabase
			.from('appointment')
			.select(selectFields)
			.gte('scheduled_at', dbStart)
			.lte('scheduled_at', dbEnd);
		
		// En liteMode, solo limitar resultados pero mantener relaciones de pacientes
		// NO usar optimizeSupabaseQuery aquí porque ya tenemos selectFields optimizado
		if (isLiteMode) {
			// Solo aplicar límite, pero mantener las relaciones
			query = query.limit(50);
		}

		// 4️⃣ Aplicar filtros de seguridad - SIEMPRE filtrar por doctor_id Y organization_id
		// Esto asegura que incluso si hay un error, los datos están aislados
		if (doctorIdToFilter && organizationIdToFilter) {
			// Filtrar por doctor Y organización para máxima seguridad
			query = query.eq('doctor_id', doctorIdToFilter).eq('organization_id', organizationIdToFilter);
			console.log('[Appointments API] Aplicando filtros: doctor_id =', doctorIdToFilter, ', organization_id =', organizationIdToFilter);
		} else if (organizationIdToFilter) {
			// Si solo hay organizationId, filtrar solo por eso
			query = query.eq('organization_id', organizationIdToFilter);
			console.log('[Appointments API] Aplicando filtro: organization_id =', organizationIdToFilter);
		} else {
			// Si no hay filtros de seguridad válidos, no devolver nada (seguridad por defecto)
			console.warn('[Appointments API] No hay filtros de seguridad válidos - denegando acceso');
			return NextResponse.json([], { status: 200 });
		}

		query = query.order('scheduled_at', { ascending: true });

		let { data, error } = await query;

		if (error) {
			console.error('❌ Error al obtener citas:', error.message);
			return NextResponse.json({ error: 'Error consultando citas en la base de datos.' }, { status: 500 });
		}

		// Validación adicional: asegurar que todas las citas devueltas pertenezcan al doctor correcto
		// Esto es una capa extra de seguridad en caso de que el filtro de Supabase no funcione correctamente
		if (doctorIdToFilter && data && Array.isArray(data)) {
			const originalLength = data.length;
			data = data.filter((cita: any) => {
				const matchesDoctor = cita.doctor_id === doctorIdToFilter;
				if (!matchesDoctor) {
					console.warn('[Appointments API] Cita con doctor_id incorrecto filtrada:', {
						citaId: cita.id,
						expectedDoctorId: doctorIdToFilter,
						actualDoctorId: cita.doctor_id,
					});
				}
				return matchesDoctor;
			});
			
			if (data.length !== originalLength) {
				console.warn('[Appointments API] Se filtraron', originalLength - data.length, 'citas que no pertenecían al doctor');
			}
		}

		if (!data || data.length === 0) {
			return NextResponse.json([], { 
				status: 200,
				headers: getApiResponseHeaders('dynamic'),
			});
		}

		// 🧮 4️⃣ Formatear resultados y obtener datos de pacientes no registrados y booked_by_patient
		// Obtener todos los IDs de pacientes no registrados de una vez
		const unregisteredPatientIds = [...new Set(
			data
				.map((cita: any) => cita.unregistered_patient_id)
				.filter((id: any): id is string => typeof id === 'string' && id !== null && id !== undefined)
		)];

		let unregisteredPatientsMap: Map<string, { first_name: string; last_name: string; identification?: string; phone?: string }> = new Map();

		// Primero, intentar construir mapa desde los datos que ya vienen en la query
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

		// Si hay IDs de pacientes no registrados que no se cargaron en la relación, obtenerlos directamente
		const missingIds = unregisteredPatientIds.filter((id) => !unregisteredPatientsMap.has(id));
		if (missingIds.length > 0) {
			try {
				const { data: unregisteredData, error: unregisteredError } = await supabase
					.from('unregisteredpatients')
					.select('id, first_name, last_name, identification, phone')
					.in('id', missingIds);

				if (!unregisteredError && unregisteredData) {
					unregisteredData.forEach((up: any) => {
						unregisteredPatientsMap.set(up.id, {
							first_name: up.first_name || '',
							last_name: up.last_name || '',
							identification: up.identification || undefined,
							phone: up.phone || undefined,
						});
					});
				} else if (unregisteredError) {
					console.error('[Appointments API] Error obteniendo pacientes no registrados:', unregisteredError);
				}
			} catch (err) {
				console.error('[Appointments API] Error al obtener pacientes no registrados:', err);
			}
		}

		// Obtener datos de pacientes que reservaron citas (booked_by_patient_id) - Solo si no es liteMode
		const bookedByPatientIds = !isLiteMode 
			? [...new Set(data.map((cita: any) => cita.booked_by_patient_id).filter(Boolean))]
			: [];

		let bookedByPatientsMap: Map<string, { id: string; firstName: string; lastName: string; identifier?: string }> = new Map();

		if (bookedByPatientIds.length > 0) {
			const { data: bookedByPatients } = await supabase
				.from('patient')
				.select('id, firstName, lastName, identifier')
				.in('id', bookedByPatientIds)
				.limit(50); // Limitar para evitar queries grandes

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

		// Optimizar procesamiento según liteMode
		const citas = data.map((cita: any) => {
			const start = new Date(cita.scheduled_at);
			const startTime = start.toLocaleTimeString('es-ES', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: true,
			});

			let endTime = '';
			if (!isLiteMode && cita.duration_minutes) {
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

			// Prioridad 1: Si hay unregistered_patient_id, intentar obtener datos del paciente no registrado
			if (cita.unregistered_patient_id) {
				// Primero intentar desde la relación cargada
				if (cita.unregistered_patient) {
					const unregisteredPatient = Array.isArray(cita.unregistered_patient) ? cita.unregistered_patient[0] : cita.unregistered_patient;
					if (unregisteredPatient) {
						patientFirstName = unregisteredPatient.first_name || null;
						patientLastName = unregisteredPatient.last_name || null;
						patientIdentifier = unregisteredPatient.identification || null;
						patientPhone = unregisteredPatient.phone || null;
						patientName = `${patientFirstName || ''} ${patientLastName || ''}`.trim() || 'Paciente no identificado';
						isUnregistered = true;
					}
				}
				
				// Si no se obtuvo desde la relación, intentar desde el mapa
				if (!patientFirstName && !patientLastName && unregisteredPatientsMap.has(cita.unregistered_patient_id)) {
					const upData = unregisteredPatientsMap.get(cita.unregistered_patient_id)!;
					patientFirstName = upData.first_name || null;
					patientLastName = upData.last_name || null;
					patientIdentifier = upData.identification || null;
					patientPhone = upData.phone || null;
					patientName = `${patientFirstName || ''} ${patientLastName || ''}`.trim() || 'Paciente no identificado';
					isUnregistered = true;
				}
			}
			
			// Prioridad 2: Si hay patient_id y no se obtuvo información del paciente no registrado
			if (!isUnregistered && cita.patient) {
				const patient = Array.isArray(cita.patient) ? cita.patient[0] : cita.patient;
				if (patient) {
					patientFirstName = patient.firstName || null;
					patientLastName = patient.lastName || null;
					patientIdentifier = patient.identifier || null;
					patientPhone = patient.phone || null;
					patientName = `${patientFirstName || ''} ${patientLastName || ''}`.trim() || 'Paciente no identificado';
				}
			}

			// Parsear selected_service solo si no es liteMode
			let selectedService: { name: string; description?: string; price?: number; currency?: string } | null = null;
			if (!isLiteMode && cita.selected_service) {
				try {
					let serviceData: any = cita.selected_service;
					if (typeof serviceData === 'string') {
						try {
							serviceData = JSON.parse(serviceData);
						} catch {
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
					// Silenciar errores en liteMode
				}
			}

			// Determinar quién reservó la cita (solo si no es liteMode)
			let bookedBy = null;
			if (!isLiteMode && cita.booked_by_patient_id && cita.booked_by_patient_id !== cita.patient_id) {
				const bookedByPatient = bookedByPatientsMap.get(cita.booked_by_patient_id);
				if (bookedByPatient) {
					bookedBy = {
						id: bookedByPatient.id,
						name: `${bookedByPatient.firstName} ${bookedByPatient.lastName}`,
						identifier: bookedByPatient.identifier,
					};
				}
			}

			// Normalizar el estado: convertir "EN_ESPERA" a "EN ESPERA" para consistencia con el frontend
			const normalizeStatus = (status: string | null | undefined): string => {
				if (!status) return 'SCHEDULED';
				if (status === 'EN_ESPERA') return 'EN ESPERA';
				if (status === 'NO_ASISTIO') return 'NO ASISTIÓ';
				return status;
			};

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
				status: normalizeStatus(cita.status),
				reason: cita.reason ?? '',
				location: isLiteMode ? '' : (cita.location ?? ''),
				selected_service: selectedService,
				referral_source: isLiteMode ? null : (cita.referral_source || null),
				bookedBy,
                organizationId: cita.organization_id // Necesario para componentes UI
			};
		});

		return NextResponse.json(citas, { 
			status: 200,
			headers: getApiResponseHeaders('dynamic'),
		});
	} catch (error: any) {
		console.error('❌ Error general al obtener citas:', error);
		return NextResponse.json({ error: 'Error obteniendo citas médicas.' }, { status: 500 });
	}
}
