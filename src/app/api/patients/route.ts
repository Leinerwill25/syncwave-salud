// app/api/patients/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

/* ---------------------- Helpers ---------------------- */
function parseIntOrDefault(v: string | null, d = 1) {
	if (!v) return d;
	const n = parseInt(v, 10);
	return Number.isNaN(n) ? d : n;
}

async function tryRestoreSessionFromCookies(supabase: any, cookieStore: any): Promise<boolean> {
	if (!cookieStore) return false;

	const tried: string[] = [];
	// Priorizar sb-session como primera opción
	const cookieCandidates = ['sb-session', 'sb:token', 'supabase-auth-token', 'sb-access-token', 'sb-refresh-token'];

	for (const name of cookieCandidates) {
		tried.push(name);
		try {
			const c = typeof cookieStore.get === 'function' ? cookieStore.get(name) : undefined;
			const raw = c?.value ?? null;
			if (!raw) {
				console.debug(`[Patients API] Cookie "${name}" no encontrada`);
				continue;
			}

			console.debug(`[Patients API] Intentando restaurar sesión desde cookie "${name}"`);

			// `sb-session` y `sb:token` son JSON. `sb-access-token` es JWT string.
			// Intentamos parsear JSON; si no es JSON, lo tratamos según el nombre.
			let parsed: any = null;
			try {
				parsed = JSON.parse(raw);
			} catch {
				parsed = null;
			}

			// Casos:
			// - sb-session: { access_token, refresh_token, ... } o el objeto session completo
			// - sb:token or supabase-auth-token: object with currentSession or similar
			// - sb-access-token: just an access token string (sin refresh)
			let access_token: string | null = null;
			let refresh_token: string | null = null;

			if (parsed) {
				// Para sb-session, buscar directamente access_token y refresh_token
				if (name === 'sb-session') {
					// sb-session puede contener la sesión completa de Supabase
					// Puede ser: { access_token, refresh_token } o el objeto session completo
					access_token = parsed?.access_token ?? parsed?.session?.access_token ?? parsed?.currentSession?.access_token ?? null;
					refresh_token = parsed?.refresh_token ?? parsed?.session?.refresh_token ?? parsed?.currentSession?.refresh_token ?? null;

					// Si es el objeto session completo de Supabase (formato de set-session)
					if (!access_token && parsed?.user) {
						access_token = parsed.access_token ?? null;
						refresh_token = parsed.refresh_token ?? null;
					}

					console.debug(`[Patients API] sb-session parseado - access_token: ${access_token ? 'encontrado' : 'no encontrado'}, refresh_token: ${refresh_token ? 'encontrado' : 'no encontrado'}`);
				} else {
					// Para otras cookies JSON, buscar en varias rutas
					access_token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.current_session?.access_token ?? null;
					refresh_token = parsed?.refresh_token ?? parsed?.currentSession?.refresh_token ?? parsed?.current_session?.refresh_token ?? null;

					// algunos formatos guardan en currentSession: { access_token: '...', refresh_token: '...' }
					if (!access_token && parsed?.currentSession && typeof parsed.currentSession === 'object') {
						access_token = parsed.currentSession.access_token ?? null;
						refresh_token = parsed.currentSession.refresh_token ?? null;
					}
				}
			} else {
				// no JSON: puede ser sólo el access token
				if (name === 'sb-access-token') {
					access_token = raw;
				} else if (name === 'sb-refresh-token') {
					refresh_token = raw;
				}
			}

			if (!access_token && !refresh_token) {
				console.debug(`[Patients API] No se encontraron tokens en cookie "${name}"`);
				continue;
			}

			// Llamamos a setSession para que supabase-js tenga la sesión en memoria
			const payload: any = {};
			if (access_token) {
				payload.access_token = access_token;
				console.debug(`[Patients API] Usando access_token de cookie "${name}"`);
			}
			if (refresh_token) {
				payload.refresh_token = refresh_token;
				console.debug(`[Patients API] Usando refresh_token de cookie "${name}"`);
			}

			// setSession devuelve data con session o error
			const { data, error } = await supabase.auth.setSession(payload);
			if (error) {
				console.warn(`[Patients API] Intento de setSession desde cookie "${name}" fallo:`, error.message);
				// Si solo tenemos refresh_token y falla, intentar refresh
				if (refresh_token && !access_token && error.message.includes('session')) {
					try {
						const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({ refresh_token });
						if (!refreshError && refreshData?.session) {
							console.log(`[Patients API] Sesión refrescada exitosamente desde cookie "${name}"`);
							return true;
						}
					} catch (refreshErr: any) {
						console.debug(`[Patients API] Error al refrescar sesión:`, refreshErr?.message);
					}
				}
				continue;
			}

			if (data?.session) {
				console.log(`[Patients API] Sesión restaurada desde cookie "${name}"`);
				return true;
			}

			// si setSession no devolvió session, intentar getSession luego de setSession igualmente
			const { data: sessionAfter } = await supabase.auth.getSession();
			if (sessionAfter?.session) {
				console.log(`[Patients API] Sesión disponible luego de setSession (cookie: "${name}")`);
				return true;
			}
		} catch (err: any) {
			console.debug(`[Patients API] Error procesando cookie "${name}":`, err?.message ?? String(err));
			continue;
		}
	}

	return false;
}
function isoOrNull(v: string | null) {
	if (!v) return null;
	const d = new Date(v);
	return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function readMaybe<T = any>(row: any, ...names: string[]): T | undefined {
	for (const n of names) if (row && n in row && row[n] != null) return row[n];
	return undefined;
}
function normalizeDate(row: any, ...names: string[]) {
	const v = readMaybe(row, ...names);
	if (!v) return null;
	const d = new Date(v);
	return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
}

/* ---------------------- GET ---------------------- */
export async function GET(request: Request) {
	try {
		// Validar autenticación y rol (solo médicos pueden acceder)
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) {
			return authResult.response;
		}

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Obtener authId del usuario autenticado
		const authId = user.authId;

		const url = new URL(request.url);
		const qp = url.searchParams;

		/* ---------- HISTORIAL DETALLADO ---------- */
		const historyFor = qp.get('historyFor');
		if (historyFor) {
			// Obtener el app user ID (necesario para doctor_id en consultation)
			const { data: appUserData, error: appUserError } = await supabase.from('User').select('id').eq('authId', authId).maybeSingle();

			if (appUserError || !appUserData) {
				console.error('Error fetching app user for history', appUserError);
				return NextResponse.json({ error: 'Error al obtener datos del usuario' }, { status: 500 });
			}

			const currentAppUserId = appUserData.id;

			// Verificar si es un paciente registrado o no registrado
			// Primero verificamos en la tabla Patient
			const { data: registeredPatient } = await supabase.from('Patient').select('id').eq('id', historyFor).maybeSingle();
			const isRegistered = !!registeredPatient;

			// Verificar relación médico-paciente: buscar en appointments O consultations (doctor_id usa app user ID)
			// Si es paciente registrado, buscar por patient_id
			// Si es paciente no registrado, buscar por unregistered_patient_id
			const [appointmentCheck, consultationCheck] = await Promise.all([
				isRegistered
					? supabase.from('appointment').select('id').eq('patient_id', historyFor).eq('doctor_id', currentAppUserId).limit(1).maybeSingle()
					: Promise.resolve({ data: null, error: null }),
				isRegistered
					? supabase.from('consultation').select('id').eq('patient_id', historyFor).eq('doctor_id', currentAppUserId).limit(1).maybeSingle()
					: supabase.from('consultation').select('id').eq('unregistered_patient_id', historyFor).eq('doctor_id', currentAppUserId).limit(1).maybeSingle(),
			]);

			if (appointmentCheck.error || consultationCheck.error) {
				console.error('Error verifying relation', appointmentCheck.error || consultationCheck.error);
				return NextResponse.json({ error: 'Error al verificar relación', detail: (appointmentCheck.error || consultationCheck.error)?.message }, { status: 500 });
			}

			const hasRelation = appointmentCheck.data || consultationCheck.data;
			if (!hasRelation) {
				return NextResponse.json({ error: 'Acceso denegado: sin relación médica previa' }, { status: 403 });
			}

			// Obtener appointments (citas), recetas y labs
			// Filtrar TODOS por el doctor en sesión para mostrar solo lo que corresponde al especialista actual
			// Para pacientes no registrados, también buscamos lab_results por unregistered_patient_id
			const [appointmentRes, prescRes, labRes, consultationRes] = await Promise.all([
				isRegistered
					? supabase
							.from('appointment')
							.select('id,patient_id,doctor_id,organization_id,scheduled_at,duration_minutes,status,reason,location,created_at,updated_at')
							.eq('patient_id', historyFor)
							.eq('doctor_id', currentAppUserId)
							.order('scheduled_at', { ascending: false })
					: Promise.resolve({ data: [], error: null }),
				isRegistered
					? supabase
							.from('prescription')
							.select(
								`
					id,
					patient_id,
					doctor_id,
					consultation_id,
					issued_at,
					valid_until,
					status,
					notes,
					created_at,
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
				`
							)
							.eq('patient_id', historyFor)
							.eq('doctor_id', currentAppUserId)
							.order('created_at', { ascending: false })
					: Promise.resolve({ data: [], error: null }),
				// lab_results: si es paciente registrado filtramos por patient_id,
				// si es no registrado filtramos por unregistered_patient_id
				isRegistered
					? supabase
							.from('lab_result')
							.select('id,patient_id,unregistered_patient_id,consultation_id,result_type,result,is_critical,reported_at,created_at')
							.eq('patient_id', historyFor)
							.order('created_at', { ascending: false })
					: supabase
							.from('lab_result')
							.select('id,patient_id,unregistered_patient_id,consultation_id,result_type,result,is_critical,reported_at,created_at')
							.eq('unregistered_patient_id', historyFor)
							.order('created_at', { ascending: false }),
				// Buscar consultas tanto por patient_id como por unregistered_patient_id
				// Incluir appointment_id para detectar duplicados
				supabase
					.from('consultation')
					.select('id,chief_complaint,diagnosis,notes,created_at,patient_id,unregistered_patient_id,doctor_id,organization_id,appointment_id')
					.or(isRegistered ? `patient_id.eq.${historyFor}` : `unregistered_patient_id.eq.${historyFor}`)
					.eq('doctor_id', currentAppUserId)
					.order('created_at', { ascending: false }),
			]);

			const e = appointmentRes.error || prescRes.error || labRes.error || consultationRes.error;
			if (e) {
				console.error('Error obteniendo historial', e);
				return NextResponse.json({ error: 'Error al obtener historial', detail: e.message }, { status: 500 });
			}

			// Obtener IDs de consultas del doctor actual para filtrar lab_results
			const consultationIds = (consultationRes.data ?? []).map((c: any) => c.id).filter(Boolean);

			// Filtrar lab_results para mostrar solo los que pertenecen a consultas del doctor actual
			const filteredLabResults =
				consultationIds.length > 0
					? (labRes.data ?? []).filter((lab: any) => {
							// Si tiene consultation_id, verificar que pertenezca a una consultation del doctor
							if (lab.consultation_id) {
								return consultationIds.includes(lab.consultation_id);
							}
							// Si no tiene consultation_id, no mostrarlo (ya que no podemos verificar el doctor)
							return false;
					  })
					: [];

			const normalizeRows = (arr: any[], dates: string[]) =>
				(arr ?? []).map((r) => ({
					...r,
					createdAt: normalizeDate(r, ...dates),
				}));

			// Obtener IDs únicos de doctores para obtener sus nombres
			const doctorIds = [
				...new Set([
					...(appointmentRes.data ?? []).map((a: any) => a.doctor_id).filter(Boolean),
					...(prescRes.data ?? []).map((p: any) => p.doctor_id).filter(Boolean),
					...(consultationRes.data ?? []).map((c: any) => c.doctor_id).filter(Boolean),
				]),
			];

			// Obtener nombres de doctores
			const doctorNamesMap = new Map<string, string>();
			if (doctorIds.length > 0) {
				const { data: doctors } = await supabase.from('User').select('id, name').in('id', doctorIds);

				if (doctors) {
					doctors.forEach((doc: any) => {
						doctorNamesMap.set(doc.id, doc.name || 'Médico');
					});
				}
			}

			// Normalizar prescripciones: mapear prescription_item a medications
			const normalizedPrescriptions = (prescRes.data ?? []).map((p: any) => {
				const prescriptionItems = Array.isArray(p.prescription_item) ? p.prescription_item : [];
				const medications = prescriptionItems.map((item: any) => ({
					name: item.name || '',
					dose: item.dosage ? `${item.dosage}${item.form ? ` (${item.form})` : ''}` : item.form || '',
					instructions: item.instructions || (item.frequency && item.duration ? `${item.frequency} por ${item.duration}` : item.frequency || item.duration || ''),
					quantity: item.quantity,
					frequency: item.frequency,
					duration: item.duration,
				}));

				return {
					id: p.id,
					createdAt: normalizeDate(p, 'created_at'),
					date: normalizeDate(p, 'issued_at', 'created_at'),
					issuedAt: normalizeDate(p, 'issued_at'),
					validUntil: normalizeDate(p, 'valid_until'),
					doctor: doctorNamesMap.get(p.doctor_id) || 'Médico',
					doctorId: p.doctor_id,
					status: p.status || 'ACTIVE',
					notes: p.notes || null,
					medications: medications,
					meds: medications, // alias para compatibilidad
				};
			});

			// Obtener appointment IDs para buscar facturación
			const appointmentIds = [...new Set([...(appointmentRes.data ?? []).map((a: any) => a.id)])];
			
			// Buscar facturación asociada a los appointments
			let billingMap = new Map<string, any>();
			if (appointmentIds.length > 0) {
				const { data: billingData } = await supabase
					.from('facturacion')
					.select('id, appointment_id, total, currency, estado_pago, fecha_pago')
					.in('appointment_id', appointmentIds);

				if (billingData) {
					billingData.forEach((b: any) => {
						if (b.appointment_id) {
							billingMap.set(b.appointment_id, {
								id: b.id,
								total: b.total,
								currency: b.currency || 'USD',
								estadoPago: b.estado_pago,
								fechaPago: b.fecha_pago ? normalizeDate(b, 'fecha_pago') : null,
							});
						}
					});
				}
			}

			// Crear un mapa de appointments por ID para evitar duplicados
			const appointmentsById = new Map<string, any>();
			(appointmentRes.data ?? []).forEach((a: any) => {
				appointmentsById.set(a.id, a);
			});

			// Crear un mapa de consultas por appointment_id para detectar relaciones
			const consultationsByAppointmentId = new Map<string, any>();
			(consultationRes.data ?? []).forEach((c: any) => {
				if (c.appointment_id) {
					consultationsByAppointmentId.set(c.appointment_id, c);
				}
			});

			// Crear un conjunto de appointment IDs que ya tienen consultation asociada
			const appointmentIdsWithConsultation = new Set(consultationsByAppointmentId.keys());

			// Normalizar appointments (citas): mapear datos de appointment
			// Solo incluir appointments que NO tienen consultation asociada (para evitar duplicados)
			const normalizedAppointments = (appointmentRes.data ?? [])
				.filter((a: any) => !appointmentIdsWithConsultation.has(a.id))
				.map((a: any) => {
					const billing = billingMap.get(a.id);
					return {
						id: a.id,
						createdAt: normalizeDate(a, 'created_at'),
						date: normalizeDate(a, 'scheduled_at', 'created_at'),
						scheduledAt: normalizeDate(a, 'scheduled_at'),
						doctor: doctorNamesMap.get(a.doctor_id) || 'Médico',
						doctorId: a.doctor_id,
						organizationId: a.organization_id,
						status: a.status || 'SCHEDULED',
						reason: a.reason || null,
						presentingComplaint: a.reason || null,
						location: a.location || null,
						durationMinutes: a.duration_minutes || 30,
						notes: null,
						isAppointment: true,
						billing: billing || null,
					};
				});

			// Normalizar consultas de la tabla consultation
			// Si tiene appointment_id, combinar información del appointment
			// IMPORTANTE: Solo combinar si el appointment también pertenece al doctor actual
			const normalizedConsultationsFromTable = (consultationRes.data ?? []).map((c: any) => {
				const hasAppointment = c.appointment_id && appointmentsById.has(c.appointment_id);
				const appointment = hasAppointment ? appointmentsById.get(c.appointment_id) : null;
				
				// Verificar que el appointment también pertenezca al doctor actual
				const appointmentBelongsToDoctor = appointment && appointment.doctor_id === currentAppUserId;
				const billing = appointmentBelongsToDoctor ? billingMap.get(appointment.id) : null;

				// Si tiene appointment y pertenece al doctor actual, combinar información
				if (appointment && appointmentBelongsToDoctor) {
					return {
						id: c.appointment_id, // Usar el ID del appointment como ID principal para la vista
						consultationId: c.id, // Guardar el ID de la consultation para referencia
						createdAt: normalizeDate(c, 'created_at'),
						date: normalizeDate(appointment, 'scheduled_at', 'created_at'),
						scheduledAt: normalizeDate(appointment, 'scheduled_at'),
						doctor: doctorNamesMap.get(c.doctor_id) || 'Médico',
						doctorId: c.doctor_id,
						organizationId: appointment.organization_id || c.organization_id,
						status: appointment.status || 'SCHEDULED',
						reason: appointment.reason || c.chief_complaint || null,
						presentingComplaint: appointment.reason || c.chief_complaint || null,
						location: appointment.location || null,
						durationMinutes: appointment.duration_minutes || 30,
						diagnosis: c.diagnosis || null,
						notes: c.notes || null,
						isAppointment: true, // Marcamos como appointment porque tiene la información completa
						billing: billing || null,
					};
				}

				// Si no tiene appointment, mostrar solo información de la consultation
				return {
					id: c.id,
					createdAt: normalizeDate(c, 'created_at'),
					date: normalizeDate(c, 'created_at'),
					doctor: doctorNamesMap.get(c.doctor_id) || 'Médico',
					doctorId: c.doctor_id,
					organizationId: c.organization_id,
					reason: c.chief_complaint || null,
					presentingComplaint: c.chief_complaint || null,
					diagnosis: c.diagnosis || null,
					notes: c.notes || null,
					isAppointment: false,
					billing: null,
				};
			});

			// Combinar appointments sin consultation y consultas (que ya incluyen appointments con consultation)
			const allConsultations = [...normalizedAppointments, ...normalizedConsultationsFromTable].sort((a, b) => {
				const dateA = new Date(a.scheduledAt || a.date || a.createdAt || 0).getTime();
				const dateB = new Date(b.scheduledAt || b.date || b.createdAt || 0).getTime();
				return dateB - dateA; // Orden descendente (más reciente primero)
			});

			// Normalizar resultados de laboratorio para el frontend (PatientsGrid)
			const normalizedLabResults = (filteredLabResults ?? []).map((lab: any) => {
				const createdAt = normalizeDate(lab, 'created_at');
				const reportedAt = normalizeDate(lab, 'reported_at');

				const rawResult = lab.result;
				let resultValue: any = null;
				let unit: string | null = null;
				let referenceRange: string | null = null;
				let comment: string | null = null;
				let status: string | null = null;

				if (rawResult && typeof rawResult === 'object') {
					const r = rawResult as any;
					resultValue = r.value ?? r.result ?? null;
					unit = (r.unit ?? r.units ?? null) as string | null;
					referenceRange = (r.referenceRange ?? r.reference_range ?? null) as string | null;
					comment = (r.comment ?? r.notes ?? null) as string | null;
					status = (r.status ?? r.flag ?? null) as string | null;
				} else {
					resultValue = rawResult ?? null;
				}

				return {
					id: lab.id,
					testName: lab.result_type || 'Resultado de laboratorio',
					date: reportedAt || createdAt,
					collectedAt: reportedAt,
					result: resultValue,
					unit,
					referenceRange,
					comment,
					status,
					is_critical: lab.is_critical ?? false,
					createdAt,
				};
			});

			const history = {
				patientId: historyFor,
				summary: {
					consultationsCount: allConsultations.length,
					prescriptionsCount: prescRes.data?.length ?? 0,
					labResultsCount: filteredLabResults.length,
					billingsCount: 0, // TODO: agregar si es necesario
				},
				organizations: [], // TODO: agregar si es necesario
				consultations: allConsultations,
				prescriptions: normalizedPrescriptions,
				lab_results: normalizedLabResults,
				facturacion: [], // TODO: agregar si es necesario
			};

			return NextResponse.json(history);
		}

		/* ---------- LISTADO DE PACIENTES ---------- */
		const page = parseIntOrDefault(qp.get('page'), 1);
		const per_page = Math.min(parseIntOrDefault(qp.get('per_page'), 25), 200);
		const offset = (page - 1) * per_page;
		const q = qp.get('q');
		const gender = qp.get('gender');
		const includeSummary = qp.get('include_summary') === 'true';

		// Buscar el usuario en la tabla User usando authId
		const { data: userData, error: userError } = await supabase.from('User').select('id, role').eq('authId', authId).maybeSingle();

		if (userError || !userData) {
			console.error('Error fetching user role', userError);
			return NextResponse.json({ error: 'Error fetching user data' }, { status: 500 });
		}

		// userData.id es el app user ID (de la tabla User), necesario para consultas con doctor_id
		const appUserId = userData.id;
		const isMedic = userData.role === 'MEDICO';

		let baseQuery = supabase.from('Patient').select('id,firstName,lastName,identifier,dob,gender,phone,address,createdAt,updatedAt', { count: 'exact' });

		if (isMedic) {
			// doctor_id en consultation referencia User.id (app user ID), no authId
			// Buscar tanto por patient_id como por unregistered_patient_id
			const { data: consultationsData, error: idsError } = await supabase
				.from('consultation')
				.select('patient_id, unregistered_patient_id')
				.eq('doctor_id', appUserId);

			if (idsError) {
				console.error('Error fetching patient IDs for medic', idsError);
				return NextResponse.json({ error: 'Error fetching patient data', detail: idsError.message }, { status: 500 });
			}

			// Obtener IDs de pacientes registrados y no registrados
			const registeredPatientIds = [...new Set((consultationsData ?? []).map((p) => p.patient_id).filter(Boolean))];
			const unregisteredPatientIds = [...new Set((consultationsData ?? []).map((p) => p.unregistered_patient_id).filter(Boolean))];

			if (registeredPatientIds.length === 0 && unregisteredPatientIds.length === 0) {
				return NextResponse.json({
					data: [],
					meta: { page, per_page, total: 0 },
				});
			}

			// Si hay pacientes registrados, filtrar por ellos
			if (registeredPatientIds.length > 0) {
				baseQuery = baseQuery.in('id', registeredPatientIds);
			} else {
				// Si no hay pacientes registrados, devolver solo pacientes no registrados
				baseQuery = null as any;
			}

			// Si hay pacientes no registrados, obtenerlos también
			if (unregisteredPatientIds.length > 0) {
				const { data: unregisteredPatientsData, error: unregisteredError } = await supabase
					.from('unregisteredpatients')
					.select('id, first_name, last_name, identification, phone, created_at')
					.in('id', unregisteredPatientIds);

				if (unregisteredError) {
					console.error('Error fetching unregistered patients', unregisteredError);
				}

				// Convertir pacientes no registrados al formato esperado
				const normalizedUnregistered = (unregisteredPatientsData ?? []).map((up: any) => ({
					id: up.id,
					firstName: up.first_name || '',
					lastName: up.last_name || '',
					identifier: up.identification || null,
					dob: null,
					gender: null,
					phone: up.phone || null,
					address: null,
					createdAt: normalizeDate(up, 'created_at'),
					updatedAt: normalizeDate(up, 'created_at'),
					isUnregistered: true, // Marca para identificar pacientes no registrados
				}));

				// Obtener pacientes registrados
				let registeredPatients: any[] = [];
				if (baseQuery) {
					const registeredQuery = q
						? baseQuery.or(`firstName.ilike.%${q.replace(/'/g, "''")}%,lastName.ilike.%${q.replace(/'/g, "''")}%,identifier.ilike.%${q.replace(/'/g, "''")}%`)
						: baseQuery;
					const genderQuery = gender ? registeredQuery.eq('gender', gender) : registeredQuery;
					const { data: registeredData, error: registeredError } = await genderQuery
						.order('createdAt', { ascending: false })
						.range(offset, offset + per_page - 1);

					if (registeredError) {
						console.error('Error fetching registered patients', registeredError);
					} else {
						registeredPatients = registeredData ?? [];
					}
				}

				// Combinar ambos tipos de pacientes
				let allPatients = [...registeredPatients, ...normalizedUnregistered];

				// Aplicar búsqueda si existe
				if (q) {
					const searchLower = q.toLowerCase();
					allPatients = allPatients.filter((p) => {
						const firstName = (p.firstName || '').toLowerCase();
						const lastName = (p.lastName || '').toLowerCase();
						const identifier = (p.identifier || '').toLowerCase();
						return firstName.includes(searchLower) || lastName.includes(searchLower) || identifier.includes(searchLower);
					});
				}

				// Aplicar paginación
				const total = allPatients.length;
				const paginatedPatients = allPatients.slice(offset, offset + per_page);

				// Si se solicita summary, agregar datos adicionales
				if (includeSummary && paginatedPatients.length > 0) {
					const ids = paginatedPatients.filter((p) => !p.isUnregistered).map((p) => p.id);
					const unregisteredIds = paginatedPatients.filter((p) => p.isUnregistered).map((p) => p.id);

					const [consultRowsRes, prescRowsRes, labRowsRes, unregisteredConsultRowsRes] = await Promise.all([
						ids.length > 0 
							? supabase.from('consultation').select('id,patient_id,created_at').in('patient_id', ids).eq('doctor_id', appUserId)
							: Promise.resolve({ data: [], error: null }),
						ids.length > 0 
							? supabase.from('prescription').select('id,patient_id,created_at').in('patient_id', ids).eq('doctor_id', appUserId)
							: Promise.resolve({ data: [], error: null }),
						ids.length > 0 
							? supabase.from('lab_result').select('id,patient_id,consultation_id,created_at').in('patient_id', ids)
							: Promise.resolve({ data: [], error: null }),
						unregisteredIds.length > 0
							? supabase.from('consultation').select('id,unregistered_patient_id,created_at').in('unregistered_patient_id', unregisteredIds).eq('doctor_id', appUserId)
							: Promise.resolve({ data: [], error: null }),
					]);

					const consultRows = [...(consultRowsRes.data ?? []), ...(unregisteredConsultRowsRes.data ?? []).map((r: any) => ({ ...r, patient_id: r.unregistered_patient_id }))];
					const prescRows = prescRowsRes.data ?? [];
					
					// Filtrar lab_results por consultas del doctor actual
					const consultationIds = consultRows.map((c: any) => c.id).filter(Boolean);
					const filteredLabRows = consultationIds.length > 0
						? (labRowsRes.data ?? []).filter((lab: any) => 
							lab.consultation_id && consultationIds.includes(lab.consultation_id)
						)
						: [];
					const labRows = filteredLabRows;

					const map = new Map<string, any>();
					paginatedPatients.forEach((p) => {
						map.set(p.id, {
							...p,
							consultationsCount: 0,
							prescriptionsCount: 0,
							labResultsCount: 0,
							lastConsultationAt: null,
							lastPrescriptionAt: null,
							lastLabResultAt: null,
						});
					});

					const updateLast = (current: string | null, next: string | null) => {
						if (!next) return current;
						if (!current) return next;
						return new Date(next) > new Date(current) ? next : current;
					};

					consultRows.forEach((r) => {
						const pid = r.patient_id;
						const m = map.get(pid);
						if (!m) return;
						m.consultationsCount++;
						const date = normalizeDate(r, 'created_at');
						m.lastConsultationAt = updateLast(m.lastConsultationAt, date);
					});

					prescRows.forEach((r) => {
						const pid = r.patient_id;
						const m = map.get(pid);
						if (!m) return;
						m.prescriptionsCount++;
						const date = normalizeDate(r, 'created_at');
						m.lastPrescriptionAt = updateLast(m.lastPrescriptionAt, date);
					});

					labRows.forEach((r) => {
						const pid = r.patient_id;
						const m = map.get(pid);
						if (!m) return;
						m.labResultsCount++;
						const date = normalizeDate(r, 'created_at');
						m.lastLabResultAt = updateLast(m.lastLabResultAt, date);
					});

					const finalPatients = Array.from(map.values());
					return NextResponse.json({
						data: finalPatients,
						meta: { page, per_page, total },
					});
				}

				return NextResponse.json({
					data: paginatedPatients,
					meta: { page, per_page, total },
				});
			}
		}

		// Continuar con el flujo normal para pacientes registrados
		if (!baseQuery) {
			return NextResponse.json({
				data: [],
				meta: { page, per_page, total: 0 },
			});
		}

		if (q) {
			const escaped = q.replace(/'/g, "''");
			baseQuery = baseQuery.or(`firstName.ilike.%${escaped}%,lastName.ilike.%${escaped}%,identifier.ilike.%${escaped}%`);
		}
		if (gender) baseQuery = baseQuery.eq('gender', gender);

		const { data: patients, error, count } = await baseQuery.order('createdAt', { ascending: false }).range(offset, offset + per_page - 1);

		if (error) {
			console.error('Error al listar pacientes', error);
			return NextResponse.json({ error: 'Error al listar pacientes', detail: error.message }, { status: 500 });
		}

		if (includeSummary && patients?.length) {
			const ids = patients.map((p) => p.id);
			
			// Obtener consultas y prescripciones filtradas por doctor
			const [consultRowsRes, prescRowsRes, labRowsRes] = await Promise.all([
				isMedic 
					? supabase.from('consultation').select('id,patient_id,created_at').in('patient_id', ids).eq('doctor_id', appUserId)
					: supabase.from('consultation').select('id,patient_id,created_at').in('patient_id', ids),
				isMedic
					? supabase.from('prescription').select('id,patient_id,created_at').in('patient_id', ids).eq('doctor_id', appUserId)
					: supabase.from('prescription').select('id,patient_id,created_at').in('patient_id', ids),
				supabase.from('lab_result').select('id,patient_id,consultation_id,created_at').in('patient_id', ids),
			]);

			// Para lab_results, filtrar solo los que pertenecen a consultas del doctor actual
			let filteredLabRows: any[] = [];
			if (isMedic && consultRowsRes.data) {
				const consultationIds = consultRowsRes.data.map((c: any) => c.id).filter(Boolean);
				if (consultationIds.length > 0) {
					filteredLabRows = (labRowsRes.data ?? []).filter((lab: any) => 
						lab.consultation_id && consultationIds.includes(lab.consultation_id)
					);
				}
			} else {
				filteredLabRows = labRowsRes.data ?? [];
			}

			const consultRows = consultRowsRes.data ?? [];
			const prescRows = prescRowsRes.data ?? [];
			const labRows = filteredLabRows;

			const map = new Map<string, any>();
			patients.forEach((p) => {
				map.set(p.id, {
					...p,
					consultationsCount: 0,
					prescriptionsCount: 0,
					labResultsCount: 0,
					lastConsultationAt: null,
					lastPrescriptionAt: null,
					lastLabResultAt: null,
				});
			});

			const updateLast = (current: string | null, next: string | null) => {
				if (!next) return current;
				if (!current) return next;
				return new Date(next) > new Date(current) ? next : current;
			};

			consultRows.forEach((r) => {
				const pid = r.patient_id;
				const m = map.get(pid);
				if (!m) return;
				m.consultationsCount++;
				const date = normalizeDate(r, 'created_at');
				m.lastConsultationAt = updateLast(m.lastConsultationAt, date);
			});

			prescRows.forEach((r) => {
				const pid = r.patient_id;
				const m = map.get(pid);
				if (!m) return;
				m.prescriptionsCount++;
				const date = normalizeDate(r, 'created_at');
				m.lastPrescriptionAt = updateLast(m.lastPrescriptionAt, date);
			});

			labRows.forEach((r) => {
				const pid = r.patient_id;
				const m = map.get(pid);
				if (!m) return;
				m.labResultsCount++;
				const date = normalizeDate(r, 'created_at');
				m.lastLabResultAt = updateLast(m.lastLabResultAt, date);
			});

			const finalPatients = Array.from(map.values());
			return NextResponse.json({
				data: finalPatients,
				meta: { page, per_page, total: count ?? finalPatients.length },
			});
		}

		return NextResponse.json({
			data: patients ?? [],
			meta: { page, per_page, total: count ?? 0 },
		});
	} catch (err: any) {
		console.error('GET /api/patients error', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

/* ---------------------- POST ---------------------- */
export async function POST(request: Request) {
	try {
		// Obtener cookie store explícitamente
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Intentar obtener access_token directamente de cookies primero
		let accessTokenFromCookie: string | null = null;
		try {
			const sbAccessToken = cookieStore.get('sb-access-token');
			if (sbAccessToken?.value) {
				accessTokenFromCookie = sbAccessToken.value;
				console.debug('[Patients API POST] Encontrado sb-access-token en cookies');
			}
		} catch (err) {
			console.debug('[Patients API POST] Error leyendo sb-access-token:', err);
		}

		// Intentar obtener usuario con access_token directo si está disponible
		let {
			data: { user },
			error: authError,
		} = accessTokenFromCookie ? await supabase.auth.getUser(accessTokenFromCookie) : await supabase.auth.getUser();

		if (authError) {
			console.error('[Patients API POST] Auth error:', authError);
		}

		// Si getUser falla, intentar restaurar sesión desde cookies
		if (!user) {
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			if (restored) {
				const after = await supabase.auth.getUser();
				user = after.data?.user ?? null;
				if (user) {
					console.log('[Patients API POST] Sesión restaurada exitosamente');
				}
			}
		}

		if (!user) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const body = await request.json();

		const firstName = (body.firstName || body.first_name || '').trim();
		const lastName = (body.lastName || body.last_name || '').trim();
		if (!firstName || !lastName) {
			return NextResponse.json({ error: 'firstName y lastName son requeridos' }, { status: 400 });
		}

		// Validar que la cédula de identidad sea única (si se proporciona)
		if (body.identifier) {
			const identifier = String(body.identifier).trim();
			
			// Verificar en pacientes registrados
			const { data: existingRegistered, error: registeredCheckError } = await supabase
				.from('Patient')
				.select('id, identifier')
				.eq('identifier', identifier)
				.maybeSingle();

			if (registeredCheckError) {
				console.error('Error verificando cédula en Patient:', registeredCheckError);
				return NextResponse.json({ error: 'Error al verificar la cédula de identidad' }, { status: 500 });
			}

			if (existingRegistered) {
				return NextResponse.json(
					{
						error: `La cédula de identidad "${identifier}" ya está registrada para un paciente en el sistema.`,
						existingPatientId: existingRegistered.id,
					},
					{ status: 409 }
				);
			}

			// Verificar en pacientes no registrados
			const { data: existingUnregistered, error: unregisteredCheckError } = await supabase
				.from('unregisteredpatients')
				.select('id, identification')
				.eq('identification', identifier)
				.maybeSingle();

			if (unregisteredCheckError) {
				console.error('Error verificando cédula en unregisteredpatients:', unregisteredCheckError);
				return NextResponse.json({ error: 'Error al verificar la cédula de identidad' }, { status: 500 });
			}

			if (existingUnregistered) {
				return NextResponse.json(
					{
						error: `La cédula de identidad "${identifier}" ya está registrada para un paciente no registrado. Considere buscarlo en la lista de pacientes no registrados.`,
						existingPatientId: existingUnregistered.id,
					},
					{ status: 409 }
				);
			}
		}

		const payload = {
			firstName,
			lastName,
			identifier: body.identifier ? String(body.identifier).trim() : null,
			dob: isoOrNull(body.dob ?? null),
			gender: body.gender ?? null,
			phone: body.phone ?? null,
			address: body.address ?? null,
		};

		const { data, error } = await supabase.from('Patient').insert(payload).select().maybeSingle();

		if (error) {
			console.error('Error creando paciente', error);
			return NextResponse.json({ error: 'Error al crear paciente', detail: error.message }, { status: 500 });
		}

		const created = data
			? {
					...data,
					createdAt: normalizeDate(data, 'createdAt', 'created_at'),
					updatedAt: normalizeDate(data, 'updatedAt', 'updated_at'),
			  }
			: data;

		return NextResponse.json({ data: created }, { status: 201 });
	} catch (err: any) {
		console.error('POST /api/patients error', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}
