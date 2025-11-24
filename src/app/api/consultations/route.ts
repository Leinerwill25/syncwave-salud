// app/api/consultations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

export async function GET(req: NextRequest) {
	try {
		const { supabase } = createSupabaseServerClient();
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

		let query = supabase
			.from('consultation')
			.select(
				`id, chief_complaint, diagnosis, notes, created_at, unregistered_patient_id,
         patient:patient_id(firstName, lastName, identifier),
         doctor:doctor_id(id, name)`,
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
		if (error) throw error;

		interface ConsultationWithRelations {
			patient?: unknown | unknown[];
			doctor?: unknown | unknown[];
			unregistered_patient_id?: string | null;
			[key: string]: unknown;
		}

		// Obtener información de pacientes no registrados si existen
		const unregisteredPatientIds = (data || [])
			.filter((c: ConsultationWithRelations) => c.unregistered_patient_id && !c.patient)
			.map((c: ConsultationWithRelations) => c.unregistered_patient_id)
			.filter((id): id is string => typeof id === 'string');

		// Obtener todos los pacientes no registrados de una vez
		let unregisteredPatientsMap: Record<string, { firstName: string; lastName: string; identifier?: string }> = {};
		if (unregisteredPatientIds.length > 0) {
			const { data: unregisteredData } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name, identification')
				.in('id', unregisteredPatientIds);

			if (unregisteredData) {
				unregisteredPatientsMap = unregisteredData.reduce((acc, up) => {
					acc[up.id] = {
						firstName: up.first_name,
						lastName: up.last_name,
						identifier: up.identification || undefined,
					};
					return acc;
				}, {} as Record<string, { firstName: string; lastName: string; identifier?: string }>);
			}
		}

		const consultationsWithUnregistered = (data || []).map((c: ConsultationWithRelations) => {
			const normalized = {
				...c,
				patient: Array.isArray(c.patient) ? c.patient[0] : c.patient,
				doctor: Array.isArray(c.doctor) ? c.doctor[0] : c.doctor,
			};

			// Si hay unregistered_patient_id y no hay patient, usar los datos del paciente no registrado
			if (c.unregistered_patient_id && typeof c.unregistered_patient_id === 'string' && !normalized.patient) {
				const unregisteredData = unregisteredPatientsMap[c.unregistered_patient_id];
				if (unregisteredData) {
					normalized.patient = {
						...unregisteredData,
						isUnregistered: true,
					};
				}
			}

			return normalized;
		});

		return NextResponse.json({ items: consultationsWithUnregistered, total: typeof count === 'number' ? count : consultationsWithUnregistered.length }, { status: 200 });
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Error interno';
		console.error('❌ Error GET /consultations:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	try {
		const { supabase } = createSupabaseServerClient();

		// Intentamos obtener el user desde la sesión server-side
		const maybeUser = await supabase.auth.getUser();

		const sessionUser = maybeUser?.data?.user ?? null;

		// Body
		const body = await req.json().catch(() => ({}));
		const { patient_id, unregistered_patient_id, doctor_id: providedDoctorId, organization_id: providedOrgId = null, chief_complaint, diagnosis = null, notes = null, vitals = null, initial_patient_data = null, specialty_data = null, private_notes = null } = body || {};

		// Validaciones básicas
		if (!patient_id && !unregistered_patient_id) return NextResponse.json({ error: 'patient_id o unregistered_patient_id es obligatorio' }, { status: 400 });
		if (!chief_complaint) return NextResponse.json({ error: 'chief_complaint es obligatorio' }, { status: 400 });

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

		// Construir payload según el tipo de paciente
		// IMPORTANTE: Si patient_id es NOT NULL en la BD, necesitamos un valor válido o usar SQL directo
		interface InsertPayload {
			doctor_id: string | null;
			organization_id: string | null;
			chief_complaint: string | null;
			diagnosis: string | null;
			notes: string | null;
			vitals: string | null;
			started_at: string;
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
		};

		interface PostgresError {
			code?: string;
			column?: string;
			message?: string;
		}
		let insertData: Record<string, unknown> | undefined;
		let insertErr: Error | PostgresError | null = null;

		if (patient_id) {
			// Paciente registrado: incluir patient_id
			insertPayload.patient_id = patient_id;
			const result = await supabase.from('consultation').insert([insertPayload]).select('*').maybeSingle();
			insertData = result.data;
			insertErr = result.error;
		} else if (unregistered_patient_id) {
			// Paciente no registrado: patient_id es NOT NULL pero necesitamos solo unregistered_patient_id
			// NOTA: La tabla tiene patient_id como NOT NULL, lo cual es un problema de diseño
			// Para solucionarlo, necesitamos usar SQL directo con un valor temporal o cambiar el esquema
			// Por ahora, intentar insertar omitiendo patient_id - si falla, necesitarás modificar el esquema
			const { Pool } = await import('pg');
			const pool = new Pool({
				connectionString: process.env.DATABASE_URL,
			});

			interface QueryResult {
				rows: Array<Record<string, unknown>>;
			}
			let result: QueryResult | null = null;
			try {
				// Intentar insertar sin patient_id (fallará si es NOT NULL, pero lo intentamos)
				result = await pool.query(
					`
					INSERT INTO consultation (
						unregistered_patient_id,
						doctor_id,
						organization_id,
						chief_complaint,
						diagnosis,
						notes,
						vitals,
						started_at
					) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
					RETURNING *
				`,
					[
						unregistered_patient_id,
						doctorIdToUse,
						organizationIdToUse,
						chief_complaint,
						diagnosis,
						notes,
						Object.keys(vitalsPayload).length > 0 ? JSON.stringify(vitalsPayload) : null,
						startedAt.toISOString(),
					]
				);

				insertData = result.rows[0] as Record<string, unknown>;
				insertErr = null;
			} catch (sqlError: unknown) {
				console.error('Error con SQL directo para paciente no registrado:', sqlError);
				
				// Si el error es que patient_id es NOT NULL, intentar modificar el esquema automáticamente
				const pgError = sqlError as PostgresError;
				if (pgError.code === '23502' && (pgError.column === 'patient_id' || pgError.message?.includes('patient_id'))) {
					try {
						console.log('Intentando modificar el esquema para hacer patient_id nullable...');
						// Intentar modificar el esquema para hacer patient_id nullable
						await pool.query('ALTER TABLE consultation ALTER COLUMN patient_id DROP NOT NULL');
						
						// Reintentar la inserción después de modificar el esquema
						result = await pool.query(
							`
							INSERT INTO consultation (
								unregistered_patient_id,
								doctor_id,
								organization_id,
								chief_complaint,
								diagnosis,
								notes,
								vitals,
								started_at
							) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
							RETURNING *
						`,
							[
								unregistered_patient_id,
								doctorIdToUse,
								organizationIdToUse,
								chief_complaint,
								diagnosis,
								notes,
								Object.keys(vitalsPayload).length > 0 ? JSON.stringify(vitalsPayload) : null,
								startedAt.toISOString(),
							]
						);
						
						insertData = result.rows[0];
						insertErr = null;
						console.log('Esquema modificado exitosamente y consulta creada');
					} catch (alterError: unknown) {
						const alterErrorMessage = alterError instanceof Error ? alterError.message : 'Desconocido';
						console.error('Error al modificar el esquema:', alterError);
						insertErr = new Error(
							'No se pudo modificar el esquema de la base de datos automáticamente. ' +
							'Por favor, ejecuta manualmente: ALTER TABLE consultation ALTER COLUMN patient_id DROP NOT NULL; ' +
							'Error: ' + alterErrorMessage
						);
					}
				} else {
					insertErr = pgError as PostgresError;
				}
			} finally {
				try {
					await pool.end();
				} catch (e) {
					// ignore
				}
			}
		} else {
			// No hay paciente especificado
			insertErr = new Error('Debe proporcionar patient_id o unregistered_patient_id');
		}

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
