// app/api/consultations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

export async function GET(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();
		const url = new URL(req.url);
		const doctorId = url.searchParams.get('doctorId');
		const patientId = url.searchParams.get('patientId');
		const q = url.searchParams.get('q') || '';
		const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
		const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') || '10'));
		const from = url.searchParams.get('from'); // ISO date optional
		const to = url.searchParams.get('to'); // ISO date optional

		const start = (page - 1) * pageSize;
		const end = start + pageSize - 1;

		// Query mejorado: obtener todos los campos necesarios incluyendo patient_id y unregistered_patient_id
		let query = supabase
			.from('consultation')
			.select(
				`id, 
				chief_complaint, 
				diagnosis, 
				notes, 
				created_at, 
				patient_id, 
				unregistered_patient_id,
				patient:patient_id(
					id,
					firstName, 
					lastName, 
					identifier
				),
				doctor:doctor_id(
					id, 
					name
				)`,
				{ count: 'exact' }
			)
			.order('created_at', { ascending: false });

		if (doctorId) query = query.eq('doctor_id', doctorId);
		if (patientId) query = query.eq('patient_id', patientId);
		if (from) query = query.gte('created_at', from);
		if (to) query = query.lte('created_at', to);

		if (q) {
			const pattern = `%${q}%`;
			query = query.or(`chief_complaint.ilike.${pattern},diagnosis.ilike.${pattern}`);
		}

		query = query.range(start, end);

		const { data, error, count } = await query;
		if (error) {
			console.error('[Consultations API] Error en query de Supabase:', error);
			// Si es un error de conexión, proporcionar un mensaje más claro
			if (error.message?.includes('fetch failed') || error.message?.includes('timeout') || error.message?.includes('ECONNRESET')) {
				throw new Error('Error de conexión con la base de datos. Por favor, intenta nuevamente.');
			}
			throw error;
		}

		interface ConsultationWithRelations {
			id: string;
			patient_id?: string | null;
			unregistered_patient_id?: string | null;
			patient?: unknown | unknown[] | null;
			doctor?: unknown | unknown[];
			[key: string]: unknown;
		}

		// Debug: Log para ver qué datos estamos recibiendo
		console.log('[Consultations API] Total consultas recibidas:', (data || []).length);
		console.log('[Consultations API] Muestra de datos:', JSON.stringify((data || []).slice(0, 2), null, 2));

		// Extraer TODOS los IDs de pacientes no registrados
		const unregisteredPatientIds = (data || [])
			.map((c: ConsultationWithRelations) => c.unregistered_patient_id)
			.filter((id): id is string => typeof id === 'string' && id !== null && id !== undefined);

		console.log('[Consultations API] IDs de pacientes no registrados encontrados:', unregisteredPatientIds.length);

		// Obtener todos los pacientes no registrados de una vez
		let unregisteredPatientsMap: Record<string, { firstName: string; lastName: string; identifier?: string }> = {};
		if (unregisteredPatientIds.length > 0) {
			try {
				const { data: unregisteredData, error: unregisteredError } = await supabase
					.from('unregisteredpatients')
					.select('id, first_name, last_name, identification')
					.in('id', unregisteredPatientIds);

				if (unregisteredError) {
					console.error('[Consultations API] Error obteniendo pacientes no registrados:', unregisteredError);
					// No lanzar error, continuar sin los datos de pacientes no registrados
					// Los logs ayudarán a identificar el problema
				} else if (unregisteredData) {
					console.log('[Consultations API] Pacientes no registrados obtenidos:', unregisteredData.length);
					unregisteredPatientsMap = unregisteredData.reduce((acc, up) => {
						acc[up.id] = {
							firstName: up.first_name || '',
							lastName: up.last_name || '',
							identifier: up.identification || undefined,
						};
						return acc;
					}, {} as Record<string, { firstName: string; lastName: string; identifier?: string }>);
				}
			} catch (unregisteredFetchError: unknown) {
				// Si hay un error de conexión al obtener pacientes no registrados, continuar sin ellos
				// Esto permite que la consulta principal funcione aunque falle la obtención de datos adicionales
				console.error('[Consultations API] Error al obtener pacientes no registrados (continuando sin ellos):', unregisteredFetchError);
			}
		}

		const consultationsWithUnregistered = (data || []).map((c: ConsultationWithRelations) => {
			// Normalizar paciente y doctor (pueden venir como array o objeto)
			const patientData = Array.isArray(c.patient) ? c.patient[0] : c.patient;
			const normalized = {
				...c,
				patient: patientData,
				doctor: Array.isArray(c.doctor) ? c.doctor[0] : c.doctor,
			};

			// Verificar si hay paciente registrado válido
			const hasRegisteredPatient = patientData && 
				typeof patientData === 'object' && 
				patientData !== null &&
				('firstName' in patientData || 'lastName' in patientData) &&
				((patientData as any).firstName || (patientData as any).lastName);

			// Prioridad 1: Si hay unregistered_patient_id, intentar obtener los datos
			if (c.unregistered_patient_id && typeof c.unregistered_patient_id === 'string') {
				const unregisteredData = unregisteredPatientsMap[c.unregistered_patient_id];
				
				if (unregisteredData && (unregisteredData.firstName || unregisteredData.lastName)) {
					// Si no hay paciente registrado válido, usar el no registrado
					if (!hasRegisteredPatient) {
						normalized.patient = {
							firstName: unregisteredData.firstName || '',
							lastName: unregisteredData.lastName || '',
							identifier: unregisteredData.identifier,
							isUnregistered: true,
						};
						console.log(`[Consultations API] Consulta ${c.id}: Usando paciente no registrado`, unregisteredData);
					} else {
						// Si hay paciente registrado, mantenerlo pero marcar como registrado
						normalized.patient = {
							...(patientData as any),
							isUnregistered: false,
						};
					}
				} else {
					// Hay unregistered_patient_id pero no encontramos los datos en el mapa
					console.warn(`[Consultations API] Consulta ${c.id}: unregistered_patient_id=${c.unregistered_patient_id} pero no se encontraron datos en el mapa`);
					
					// Si no hay paciente registrado, intentar al menos mostrar algo
					if (!hasRegisteredPatient) {
						normalized.patient = {
							firstName: 'Paciente',
							lastName: 'No Registrado',
							isUnregistered: true,
						};
					} else {
						normalized.patient = {
							...(patientData as any),
							isUnregistered: false,
						};
					}
				}
			} 
			// Prioridad 2: Si hay paciente registrado válido
			else if (hasRegisteredPatient) {
				normalized.patient = {
					...(patientData as any),
					isUnregistered: false,
				};
			} 
			// Prioridad 3: Si hay patient_id pero no se pudo obtener la relación
			else if (c.patient_id) {
				console.warn(`[Consultations API] Consulta ${c.id}: Tiene patient_id=${c.patient_id} pero no se pudo obtener la relación del paciente`);
				// Intentar obtener el paciente directamente si tenemos el ID
				normalized.patient = {
					firstName: 'Paciente',
					lastName: `ID: ${c.patient_id.substring(0, 8)}...`,
					isUnregistered: false,
				};
			} 
			// Prioridad 4: No hay información de paciente
			else {
				console.warn(`[Consultations API] Consulta ${c.id}: No tiene patient_id ni unregistered_patient_id - consulta sin paciente asignado`);
				normalized.patient = null;
			}

			return normalized;
		});

		return NextResponse.json({ items: consultationsWithUnregistered, total: typeof count === 'number' ? count : consultationsWithUnregistered.length }, { status: 200 });
	} catch (error: unknown) {
		let errorMessage = 'Error interno';
		let statusCode = 500;

		if (error instanceof Error) {
			errorMessage = error.message;
			// Detectar errores de conexión y proporcionar códigos de estado apropiados
			if (error.message.includes('fetch failed') || error.message.includes('timeout') || error.message.includes('ECONNRESET') || error.message.includes('Connect Timeout')) {
				errorMessage = 'Error de conexión con la base de datos. Por favor, verifica tu conexión a internet e intenta nuevamente.';
				statusCode = 503; // Service Unavailable
			}
		} else if (typeof error === 'object' && error !== null) {
			// Manejar errores de Supabase que pueden no ser instancias de Error
			const supabaseError = error as { message?: string; code?: string; details?: string };
			errorMessage = supabaseError.message || supabaseError.details || 'Error desconocido';
			if (supabaseError.code === 'PGRST116') {
				statusCode = 404;
			}
		}

		console.error('❌ Error GET /consultations:', errorMessage, error);
		return NextResponse.json({ error: errorMessage }, { status: statusCode });
	}
}

export async function POST(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();

		// Intentamos obtener el user desde la sesión server-side
		const maybeUser = await supabase.auth.getUser();

		const sessionUser = maybeUser?.data?.user ?? null;

		// Body
		const body = await req.json().catch(() => ({}));
		const { patient_id, unregistered_patient_id, appointment_id, doctor_id: providedDoctorId, organization_id: providedOrgId = null, chief_complaint, diagnosis = null, notes = null, vitals = null, initial_patient_data = null, specialty_data = null, private_notes = null } = body || {};

		// Validaciones básicas
		if (!patient_id && !unregistered_patient_id && !appointment_id) {
			return NextResponse.json({ error: 'patient_id, unregistered_patient_id o appointment_id es obligatorio' }, { status: 400 });
		}
		if (!chief_complaint) return NextResponse.json({ error: 'chief_complaint es obligatorio' }, { status: 400 });

		// Si se proporciona appointment_id, obtener los datos del paciente desde la cita
		let finalPatientId: string | null = patient_id || null;
		let finalUnregisteredPatientId: string | null = unregistered_patient_id || null;
		let finalAppointmentId: string | null = appointment_id || null;
		let appointmentDoctorId: string | null = null;
		let appointmentOrganizationId: string | null = null;

		if (appointment_id) {
			const { data: appointmentData, error: appointmentError } = await supabase
				.from('appointment')
				.select('patient_id, unregistered_patient_id, doctor_id, organization_id')
				.eq('id', appointment_id)
				.single();

			if (appointmentError) {
				console.error('Error obteniendo datos del appointment:', appointmentError);
				return NextResponse.json({ error: 'Error al obtener datos de la cita' }, { status: 500 });
			}

			if (appointmentData) {
				// Copiar patient_id y unregistered_patient_id desde el appointment si no se proporcionaron
				if (!finalPatientId && appointmentData.patient_id) {
					finalPatientId = appointmentData.patient_id;
				}
				if (!finalUnregisteredPatientId && appointmentData.unregistered_patient_id) {
					finalUnregisteredPatientId = appointmentData.unregistered_patient_id;
				}
				
				// Guardar doctor_id y organization_id del appointment para usarlos como fallback
				appointmentDoctorId = appointmentData.doctor_id || null;
				appointmentOrganizationId = appointmentData.organization_id || null;
			}
		}

		// Validar que al menos uno de los IDs de paciente esté presente después de obtener datos del appointment
		if (!finalPatientId && !finalUnregisteredPatientId) {
			return NextResponse.json({ error: 'No se pudo determinar el paciente. La cita no tiene patient_id ni unregistered_patient_id.' }, { status: 400 });
		}

		let doctorIdToUse: string | null = null;
		let organizationIdToUse: string | null = providedOrgId ?? null;

		// 1) Si hay sesión server-side, mapear auth user -> User.id usando authId
		if (sessionUser?.id) {
			const { data: appUser, error: appUserErr } = await supabase.from('User').select('id, organizationId').eq('authId', sessionUser.id).maybeSingle();

			if (appUserErr) {
				console.error('Error buscando User por authId:', appUserErr);
				return NextResponse.json({ error: 'Error interno buscando perfil de usuario' }, { status: 500 });
			}

			if (!appUser) {
				// No hay fila en User que corresponda al auth user -> instrucción clara
				return NextResponse.json(
					{
						error: 'Perfil de aplicación no encontrado. El usuario autenticado no tiene un registro en la tabla "User". ' + 'Asigna el campo authId en la tabla User o crea el perfil del profesional antes de crear consultas.',
					},
					{ status: 403 }
				);
			}

			doctorIdToUse = appUser.id;
			// si no se proporcionó organización, tomar la de appUser
			interface AppUser {
				id: string;
				organizationId?: string | null;
			}
			const typedAppUser = appUser as AppUser;
			if (!organizationIdToUse && typedAppUser.organizationId) {
				organizationIdToUse = typedAppUser.organizationId;
			}
		} else {
			// 2) No hay sesión server-side: aceptamos doctor_id enviado desde cliente solo si existe en tabla User
			if (!providedDoctorId) {
				return NextResponse.json({ error: 'No hay sesión activa ni doctor_id proporcionado' }, { status: 401 });
			}

			const { data: doctorRow, error: doctorErr } = await supabase.from('User').select('id').eq('id', providedDoctorId).maybeSingle();
			if (doctorErr) {
				console.error('Error verificando doctor_id:', doctorErr);
				return NextResponse.json({ error: 'Error interno verificando doctor_id' }, { status: 500 });
			}
			if (!doctorRow) {
				return NextResponse.json({ error: 'doctor_id proporcionado no existe en tabla User' }, { status: 400 });
			}

			doctorIdToUse = providedDoctorId;
		}

		// Si no se pudo determinar el doctor_id de otra forma, usar el del appointment
		if (!doctorIdToUse && appointmentDoctorId) {
			doctorIdToUse = appointmentDoctorId;
		}
		
		// Si no se pudo determinar la organización de otra forma, usar la del appointment
		if (!organizationIdToUse && appointmentOrganizationId) {
			organizationIdToUse = appointmentOrganizationId;
		}

		// Construir payload de inserción
		// Usamos vitals (jsonb) para guardar tanto signos vitales como datos adicionales
		interface VitalsPayload {
			consultation_date?: string;
			scheduled_date?: string;
			initial_patient_data?: unknown;
			specialty_data?: unknown;
			private_notes?: string;
			[key: string]: unknown;
		}
		let vitalsPayload: VitalsPayload = (vitals as VitalsPayload) || {};
		
		// Agregar datos adicionales al objeto vitals
		if (initial_patient_data) {
			vitalsPayload.initial_patient_data = initial_patient_data;
		}
		if (specialty_data) {
			vitalsPayload.specialty_data = specialty_data;
		}
		if (private_notes) {
			vitalsPayload.private_notes = private_notes;
		}

		// Determinar started_at automáticamente
		// Si hay fecha de consulta en vitals y es en el pasado o hoy, usar esa fecha
		// Si no, usar la fecha/hora actual
		let startedAt: Date | null = null;
		const now = new Date();
		
		if (vitalsPayload?.consultation_date) {
			const consultationDate = new Date(vitalsPayload.consultation_date);
			// Si la fecha de consulta es en el pasado o es hoy, establecer started_at
			if (consultationDate <= now) {
				startedAt = consultationDate;
			}
		} else if (vitalsPayload?.scheduled_date) {
			const scheduledDate = new Date(vitalsPayload.scheduled_date);
			// Si la fecha programada es en el pasado o es hoy, establecer started_at
			if (scheduledDate <= now) {
				startedAt = scheduledDate;
			}
		}
		
		// Si no se estableció started_at pero la consulta se está creando ahora, activarla automáticamente
		if (!startedAt) {
			startedAt = now;
		}

		// Construir payload - incluir ambos campos (patient_id y unregistered_patient_id) ya que ambos pueden ser nullable
		interface InsertPayload {
			doctor_id: string | null;
			organization_id: string | null;
			chief_complaint: string | null;
			diagnosis: string | null;
			notes: string | null;
			vitals: string | null;
			started_at: string;
			appointment_id?: string | null;
			patient_id?: string | null;
			unregistered_patient_id?: string | null;
		}
		const insertPayload: InsertPayload = {
			doctor_id: doctorIdToUse,
			organization_id: organizationIdToUse,
			chief_complaint,
			diagnosis,
			notes,
			vitals: Object.keys(vitalsPayload).length > 0 ? JSON.stringify(vitalsPayload) : null,
			started_at: startedAt.toISOString(),
			appointment_id: finalAppointmentId,
			patient_id: finalPatientId || null,
			unregistered_patient_id: finalUnregisteredPatientId || null,
		};

		// Insertar la consulta con ambos campos (patient_id puede ser null si es paciente no registrado)
		const result = await supabase.from('consultation').insert([insertPayload]).select('*').maybeSingle();
		const insertData = result.data;
		const insertErr = result.error;

		if (insertErr) {
			console.error('❌ Error insert consultation:', insertErr);
			const errorMessage = insertErr instanceof Error 
				? insertErr.message 
				: (insertErr as PostgresError).message || 'Error al crear consulta';
			return NextResponse.json({ error: errorMessage }, { status: 500 });
		}

		return NextResponse.json({ data: insertData }, { status: 201 });
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Error interno';
		console.error('❌ Error POST /consultations:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
