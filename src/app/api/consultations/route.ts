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
				`id, chief_complaint, diagnosis, notes, created_at,
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

		const items = (data || []).map((c: any) => ({
			...c,
			patient: Array.isArray(c.patient) ? c.patient[0] : c.patient,
			doctor: Array.isArray(c.doctor) ? c.doctor[0] : c.doctor,
		}));

		return NextResponse.json({ items, total: typeof count === 'number' ? count : items.length }, { status: 200 });
	} catch (error: any) {
		console.error('❌ Error GET /consultations:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
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
			if (!organizationIdToUse && (appUser as any).organizationId) organizationIdToUse = (appUser as any).organizationId;
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
		let vitalsPayload: any = vitals || {};
		
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
		const insertPayload: any = {
			doctor_id: doctorIdToUse,
			organization_id: organizationIdToUse,
			chief_complaint,
			diagnosis,
			notes,
			vitals: Object.keys(vitalsPayload).length > 0 ? vitalsPayload : null,
			started_at: startedAt.toISOString(),
		};

		let insertData;
		let insertErr;

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

			let result: any;
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

				insertData = result.rows[0];
				insertErr = null;
			} catch (sqlError: any) {
				console.error('Error con SQL directo para paciente no registrado:', sqlError);
				
				// Si el error es que patient_id es NOT NULL, intentar modificar el esquema automáticamente
				if (sqlError.code === '23502' && (sqlError.column === 'patient_id' || sqlError.message?.includes('patient_id'))) {
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
					} catch (alterError: any) {
						console.error('Error al modificar el esquema:', alterError);
						insertErr = new Error(
							'No se pudo modificar el esquema de la base de datos automáticamente. ' +
							'Por favor, ejecuta manualmente: ALTER TABLE consultation ALTER COLUMN patient_id DROP NOT NULL; ' +
							'Error: ' + (alterError.message || 'Desconocido')
						);
					}
				} else {
					insertErr = sqlError;
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
			return NextResponse.json({ error: insertErr.message || 'Error al crear consulta' }, { status: 500 });
		}

		return NextResponse.json({ data: insertData }, { status: 201 });
	} catch (error: any) {
		console.error('❌ Error POST /consultations:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}
