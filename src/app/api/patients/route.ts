// app/api/patients/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';

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
		// Obtener cookie store explícitamente
		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Intentar obtener access_token directamente de cookies primero
		let accessTokenFromCookie: string | null = null;
		try {
			const sbAccessToken = cookieStore.get('sb-access-token');
			if (sbAccessToken?.value) {
				accessTokenFromCookie = sbAccessToken.value;
				console.debug('[Patients API] Encontrado sb-access-token en cookies');
			}
		} catch (err) {
			console.debug('[Patients API] Error leyendo sb-access-token:', err);
		}

		// Intentar obtener usuario con access_token directo si está disponible
		let {
			data: { user },
			error: authError,
		} = accessTokenFromCookie ? await supabase.auth.getUser(accessTokenFromCookie) : await supabase.auth.getUser();

		if (authError) {
			console.error('[Patients API] Auth error:', authError);
		}

		// Si getUser falla, intentar restaurar sesión desde cookies
		if (!user) {
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			if (restored) {
				const after = await supabase.auth.getUser();
				user = after.data?.user ?? null;
				if (user) {
					console.log('[Patients API] Sesión restaurada exitosamente');
				}
			}
		}

		if (!user) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const url = new URL(request.url);
		const qp = url.searchParams;

		/* ---------- HISTORIAL DETALLADO ---------- */
		const historyFor = qp.get('historyFor');
		if (historyFor) {
			// Obtener el app user ID (necesario para doctor_id en consultation)
			const { data: appUserData, error: appUserError } = await supabase.from('User').select('id').eq('authId', user.id).maybeSingle();

			if (appUserError || !appUserData) {
				console.error('Error fetching app user for history', appUserError);
				return NextResponse.json({ error: 'Error al obtener datos del usuario' }, { status: 500 });
			}

			const currentAppUserId = appUserData.id;

			// Verificar relación médico-paciente: buscar en appointments O consultations (doctor_id usa app user ID)
			const [appointmentCheck, consultationCheck] = await Promise.all([supabase.from('appointment').select('id').eq('patient_id', historyFor).eq('doctor_id', currentAppUserId).limit(1).maybeSingle(), supabase.from('consultation').select('id').eq('patient_id', historyFor).eq('doctor_id', currentAppUserId).limit(1).maybeSingle()]);

			if (appointmentCheck.error || consultationCheck.error) {
				console.error('Error verifying relation', appointmentCheck.error || consultationCheck.error);
				return NextResponse.json({ error: 'Error al verificar relación', detail: (appointmentCheck.error || consultationCheck.error)?.message }, { status: 500 });
			}

			const hasRelation = appointmentCheck.data || consultationCheck.data;
			if (!hasRelation) {
				return NextResponse.json({ error: 'Acceso denegado: sin relación médica previa' }, { status: 403 });
			}

			// Obtener appointments (citas), recetas y labs
			const [appointmentRes, prescRes, labRes] = await Promise.all([
				supabase.from('appointment').select('id,patient_id,doctor_id,organization_id,scheduled_at,duration_minutes,status,reason,location,created_at,updated_at').eq('patient_id', historyFor).order('scheduled_at', { ascending: false }),
				supabase
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
					.order('created_at', { ascending: false }),
				supabase.from('lab_result').select('id,patient_id,consultation_id,result_type,result,is_critical,reported_at,created_at').eq('patient_id', historyFor).order('created_at', { ascending: false }),
			]);

			const e = appointmentRes.error || prescRes.error || labRes.error;
			if (e) {
				console.error('Error obteniendo historial', e);
				return NextResponse.json({ error: 'Error al obtener historial', detail: e.message }, { status: 500 });
			}

			const normalizeRows = (arr: any[], dates: string[]) =>
				(arr ?? []).map((r) => ({
					...r,
					createdAt: normalizeDate(r, ...dates),
				}));

			// Obtener IDs únicos de doctores para obtener sus nombres
			const doctorIds = [...new Set([...(appointmentRes.data ?? []).map((a: any) => a.doctor_id).filter(Boolean), ...(prescRes.data ?? []).map((p: any) => p.doctor_id).filter(Boolean)])];

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

			// Normalizar appointments (citas): mapear datos de appointment
			const normalizedConsultations = (appointmentRes.data ?? []).map((a: any) => ({
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
				notes: null, // appointment no tiene notes, pero lo dejamos para compatibilidad
			}));

			const history = {
				patientId: historyFor,
				summary: {
					consultationsCount: appointmentRes.data?.length ?? 0,
					prescriptionsCount: prescRes.data?.length ?? 0,
					labResultsCount: labRes.data?.length ?? 0,
					billingsCount: 0, // TODO: agregar si es necesario
				},
				organizations: [], // TODO: agregar si es necesario
				consultations: normalizedConsultations,
				prescriptions: normalizedPrescriptions,
				lab_results: normalizeRows(labRes.data ?? [], ['created_at', 'reported_at']),
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

		// Buscar el usuario en la tabla User usando authId (el user.id es el auth user ID)
		const { data: userData, error: userError } = await supabase.from('User').select('id, role').eq('authId', user.id).maybeSingle();

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
			const { data: patientIdsData, error: idsError } = await supabase.from('consultation').select('patient_id').eq('doctor_id', appUserId);

			if (idsError) {
				console.error('Error fetching patient IDs for medic', idsError);
				return NextResponse.json({ error: 'Error fetching patient data', detail: idsError.message }, { status: 500 });
			}

			const patientIds = [...new Set(patientIdsData.map((p) => p.patient_id))];
			if (patientIds.length === 0) {
				return NextResponse.json({
					data: [],
					meta: { page, per_page, total: 0 },
				});
			}
			baseQuery = baseQuery.in('id', patientIds);
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
			const [consultRowsRes, prescRowsRes, labRowsRes] = await Promise.all([supabase.from('consultation').select('id,patient_id,created_at').in('patient_id', ids), supabase.from('prescription').select('id,patient_id,created_at').in('patient_id', ids), supabase.from('lab_result').select('id,patient_id,created_at').in('patient_id', ids)]);

			const consultRows = consultRowsRes.data ?? [];
			const prescRows = prescRowsRes.data ?? [];
			const labRows = labRowsRes.data ?? [];

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

		const payload = {
			firstName,
			lastName,
			identifier: body.identifier ?? null,
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
