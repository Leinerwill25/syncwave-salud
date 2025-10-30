// app/api/patients/route.ts
import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server'; // ajusta la ruta si es necesario

/** Helpers */
function parseIntOrDefault(v: string | null, d = 1) {
	if (!v) return d;
	const n = parseInt(v, 10);
	return Number.isNaN(n) ? d : n;
}
function isoOrNull(v: string | null) {
	if (!v) return null;
	const d = new Date(v);
	return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
// leer un campo (soporta snake_case / camelCase)
function readMaybe<T = any>(row: any, ...names: string[]) {
	for (const n of names) {
		if (row == null) break;
		if (n in row && row[n] != null) return row[n];
	}
	return undefined;
}
// normalizar fecha: acepta created_at / createdAt etc
function normalizeDate(row: any, ...names: string[]) {
	const v = readMaybe(row, ...names);
	if (!v) return null;
	try {
		const d = new Date(v);
		return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
	} catch {
		return String(v);
	}
}

export async function GET(request: Request) {
	try {
		const { supabase } = createSupabaseServerClient();
		const url = new URL(request.url);
		const qp = url.searchParams;

		// history for a single patient
		const historyFor = qp.get('historyFor');
		if (historyFor) {
			if (!historyFor || historyFor.length < 8) {
				return NextResponse.json({ error: 'historyFor inválido' }, { status: 400 });
			}

			// consultas (tabla "consultation")
			const consultationsPromise = supabase.from('consultation').select(`id,appointment_id,patient_id,doctor_id,organization_id,started_at,ended_at,chief_complaint,diagnosis,notes,vitals,medical_record_id,created_at,updated_at`).eq('patient_id', historyFor).order('created_at', { ascending: false });

			// recetas (tabla "prescription")
			const prescriptionsPromise = supabase.from('prescription').select(`id,patient_id,doctor_id,consultation_id,issued_at,valid_until,status,notes,created_at`).eq('patient_id', historyFor).order('created_at', { ascending: false });

			// lab results (tabla "lab_result") - traemos also consultation(organization_id) para resolver organización
			const labResultsPromise = supabase.from('lab_result').select(`id,patient_id,consultation_id,result_type,result,attachments,is_critical,reported_at,created_at,consultation(organization_id)`).eq('patient_id', historyFor).order('created_at', { ascending: false });

			// facturación (tabla "facturacion")
			const billingPromise = supabase.from('facturacion').select(`id,appointment_id,patient_id,doctor_id,organization_id,subtotal,impuestos,total,currency,tipo_cambio,billing_series,numero_factura,estado_factura,estado_pago,metodo_pago,fecha_emision,fecha_pago,notas,created_at,updated_at`).eq('patient_id', historyFor).order('created_at', { ascending: false });

			const [consultRes, prescRes, labRes, billRes] = await Promise.all([consultationsPromise, prescriptionsPromise, labResultsPromise, billingPromise]);

			const e = consultRes.error || prescRes.error || labRes.error || billRes.error;
			if (e) {
				console.error('Error reading history data', e);
				return NextResponse.json({ error: 'Error al obtener historial', detail: e?.message ?? String(e) }, { status: 500 });
			}

			// Consolidar organizaciones tocadas
			const orgMap = new Map<string, { id: string; lastSeenAt: string; types: string[] }>();
			const addOrgSeen = (orgId: string | null | undefined, at?: string | null, tag?: string) => {
				if (!orgId) return;
				const nowIso = at ? new Date(at).toISOString() : new Date().toISOString();
				const entry = orgMap.get(orgId) ?? { id: orgId, lastSeenAt: nowIso, types: [] as string[] };
				if (at && new Date(at) > new Date(entry.lastSeenAt)) entry.lastSeenAt = new Date(at).toISOString();
				if (tag && !entry.types.includes(tag)) entry.types.push(tag);
				orgMap.set(orgId, entry);
			};

			// consultations
			(consultRes.data ?? []).forEach((c: any) => {
				const orgId = readMaybe(c, 'organization_id', 'organizationId');
				const at = normalizeDate(c, 'created_at', 'createdAt', 'started_at');
				addOrgSeen(orgId, at, 'consultation');
			});

			// labs: try to get organization via consultation relation if exists
			(labRes.data ?? []).forEach((l: any) => {
				const orgFromConsultation = readMaybe(l, 'consultation') ? readMaybe(l.consultation, 'organization_id', 'organizationId') : null;
				const at = normalizeDate(l, 'created_at', 'createdAt', 'reported_at');
				addOrgSeen(orgFromConsultation ?? null, at, 'lab_result');
			});

			// billing
			(billRes.data ?? []).forEach((b: any) => {
				const orgId = readMaybe(b, 'organization_id', 'organizationId');
				const at = normalizeDate(b, 'created_at', 'createdAt', 'fecha_emision');
				addOrgSeen(orgId, at, 'billing');
			});

			// prescriptions: try to resolve org via consultation join (if present)
			(prescRes.data ?? []).forEach((p: any) => {
				const consultId = readMaybe(p, 'consultation_id', 'consultationId');
				// try to find consultation with that id in previously fetched consultations
				const consult = (consultRes.data ?? []).find((c: any) => readMaybe(c, 'id') === consultId);
				const orgId = consult ? readMaybe(consult, 'organization_id', 'organizationId') : null;
				const at = normalizeDate(p, 'created_at', 'createdAt', 'issued_at');
				addOrgSeen(orgId, at, 'prescription');
			});

			const orgs = Array.from(orgMap.values());

			// Build normalized response: keep DB rows but also return createdAt/iso fields consistent
			const normalizeRows = (arr: any[], knownDateFields: string[] = ['created_at', 'createdAt']) =>
				(arr ?? []).map((r: any) => {
					const createdAt = normalizeDate(r, ...knownDateFields);
					return { ...r, createdAt };
				});

			const history = {
				patientId: historyFor,
				summary: {
					consultationsCount: (consultRes.data ?? []).length,
					prescriptionsCount: (prescRes.data ?? []).length,
					labResultsCount: (labRes.data ?? []).length,
					billingsCount: (billRes.data ?? []).length,
				},
				organizations: orgs,
				consultations: normalizeRows(consultRes.data, ['created_at', 'createdAt', 'started_at']),
				prescriptions: normalizeRows(prescRes.data, ['created_at', 'createdAt', 'issued_at']),
				lab_results: normalizeRows(labRes.data, ['created_at', 'createdAt', 'reported_at']),
				facturacion: normalizeRows(billRes.data, ['created_at', 'createdAt', 'fecha_emision']),
			};

			return NextResponse.json(history);
		}

		// LIST MODE
		const page = parseIntOrDefault(qp.get('page'), 1);
		const per_page = Math.min(parseIntOrDefault(qp.get('per_page'), 25), 200);
		const offset = (page - 1) * per_page;
		const q = qp.get('q');
		const gender = qp.get('gender');
		const includeSummary = qp.get('include_summary') === 'true';

		// Query base a tabla Patient (schema muestra Patient con camelCase fields)
		let baseQuery = supabase.from('Patient').select('id,firstName,lastName,identifier,dob,gender,phone,address,createdAt,updatedAt', { count: 'exact' });

		if (q) {
			const escaped = q.replace(/'/g, "''");
			// usar or para buscar en los tres campos
			baseQuery = baseQuery.or(`firstName.ilike.%${escaped}%,lastName.ilike.%${escaped}%,identifier.ilike.%${escaped}%`);
		}
		if (gender) baseQuery = baseQuery.eq('gender', gender);

		baseQuery = baseQuery.order('createdAt', { ascending: false });
		const { data: patients, error, count } = await baseQuery.range(offset, offset + per_page - 1);

		if (error) {
			console.error('Error listing patients', error);
			return NextResponse.json({ error: 'Error al listar pacientes', detail: error.message ?? String(error) }, { status: 500 });
		}

		// include_summary: agregados por paciente
		if (includeSummary && Array.isArray(patients) && patients.length > 0) {
			const ids = patients.map((p: any) => readMaybe(p, 'id'));

			// fetch related rows (consultation, prescription, lab_result, facturacion)
			const consultRowsP = supabase.from('consultation').select('id,patient_id,organization_id,created_at,started_at').in('patient_id', ids).order('created_at', { ascending: false });

			const prescRowsP = supabase.from('prescription').select('id,patient_id,consultation_id,created_at,issued_at,status').in('patient_id', ids).order('created_at', { ascending: false });

			const labRowsP = supabase.from('lab_result').select('id,patient_id,consultation_id,created_at,is_critical,reported_at').in('patient_id', ids).order('created_at', { ascending: false });

			const billRowsP = supabase.from('facturacion').select('id,patient_id,organization_id,created_at,total,fecha_emision,estado_factura').in('patient_id', ids).order('created_at', { ascending: false });

			const [consultRowsRes, prescRowsRes, labRowsRes, billRowsRes] = await Promise.all([consultRowsP, prescRowsP, labRowsP, billRowsP]);

			const anyError = consultRowsRes.error || prescRowsRes.error || labRowsRes.error || billRowsRes.error;
			if (anyError) {
				console.error('Error fetching related rows for summary', anyError);
				// devolvemos pacientes pero avisamos del warning
				return NextResponse.json({
					data: patients,
					meta: { page, per_page, total: count ?? patients.length },
					warning: 'No se pudo obtener resumen completo de pacientes',
				});
			}

			const consultRows = consultRowsRes.data ?? [];
			const prescRows = prescRowsRes.data ?? [];
			const labRows = labRowsRes.data ?? [];
			const billRows = billRowsRes.data ?? [];

			// construir mapa por patient id
			const mapById = new Map<string, any>();
			patients.forEach((p: any) => {
				// normalizar patient fields y asegurar camelCase output
				mapById.set(p.id, {
					id: p.id,
					firstName: readMaybe(p, 'firstName', 'first_name'),
					lastName: readMaybe(p, 'lastName', 'last_name'),
					identifier: readMaybe(p, 'identifier'),
					dob: normalizeDate(p, 'dob'),
					gender: readMaybe(p, 'gender'),
					phone: readMaybe(p, 'phone'),
					address: readMaybe(p, 'address'),
					createdAt: normalizeDate(p, 'createdAt', 'created_at'),
					updatedAt: normalizeDate(p, 'updatedAt', 'updated_at'),
					consultationsCount: 0,
					prescriptionsCount: 0,
					labResultsCount: 0,
					billingsCount: 0,
					lastConsultationAt: null,
					lastPrescriptionAt: null,
					lastLabResultAt: null,
					organizationsTouched: [] as string[],
				});
			});

			const pushOrg = (patientId: string, orgId: string | null | undefined) => {
				if (!orgId) return;
				const m = mapById.get(patientId);
				if (!m) return;
				if (!m.organizationsTouched.includes(orgId)) m.organizationsTouched.push(orgId);
			};

			consultRows.forEach((r: any) => {
				const pid = readMaybe(r, 'patient_id', 'patientId');
				const m = mapById.get(pid);
				if (!m) return;
				m.consultationsCount = (m.consultationsCount || 0) + 1;
				const rCreated = normalizeDate(r, 'created_at', 'createdAt', 'started_at');
				if (!m.lastConsultationAt || (rCreated && new Date(rCreated) > new Date(m.lastConsultationAt))) {
					m.lastConsultationAt = rCreated;
				}
				const orgId = readMaybe(r, 'organization_id', 'organizationId');
				pushOrg(pid, orgId);
			});

			prescRows.forEach((r: any) => {
				const pid = readMaybe(r, 'patient_id', 'patientId');
				const m = mapById.get(pid);
				if (!m) return;
				m.prescriptionsCount = (m.prescriptionsCount || 0) + 1;
				const rCreated = normalizeDate(r, 'created_at', 'createdAt', 'issued_at');
				if (!m.lastPrescriptionAt || (rCreated && new Date(rCreated) > new Date(m.lastPrescriptionAt))) {
					m.lastPrescriptionAt = rCreated;
				}
				// try to resolve org via consultation if available in consultRows
				const consultId = readMaybe(r, 'consultation_id', 'consultationId');
				const consult = consultRows.find((c: any) => readMaybe(c, 'id') === consultId);
				if (consult) pushOrg(pid, readMaybe(consult, 'organization_id', 'organizationId'));
			});

			labRows.forEach((r: any) => {
				const pid = readMaybe(r, 'patient_id', 'patientId');
				const m = mapById.get(pid);
				if (!m) return;
				m.labResultsCount = (m.labResultsCount || 0) + 1;
				const rCreated = normalizeDate(r, 'created_at', 'createdAt', 'reported_at');
				if (!m.lastLabResultAt || (rCreated && new Date(rCreated) > new Date(m.lastLabResultAt))) {
					m.lastLabResultAt = rCreated;
				}
				// resolve org via associated consultation if possible (we didn't include consultation relation here to keep query simpler)
				const consultId = readMaybe(r, 'consultation_id', 'consultationId');
				const consult = consultRows.find((c: any) => readMaybe(c, 'id') === consultId);
				if (consult) pushOrg(pid, readMaybe(consult, 'organization_id', 'organizationId'));
			});

			billRows.forEach((r: any) => {
				const pid = readMaybe(r, 'patient_id', 'patientId');
				const m = mapById.get(pid);
				if (!m) return;
				m.billingsCount = (m.billingsCount || 0) + 1;
				pushOrg(pid, readMaybe(r, 'organization_id', 'organizationId'));
			});

			const finalPatients = Array.from(mapById.values());

			return NextResponse.json({
				data: finalPatients,
				meta: { page, per_page, total: count ?? finalPatients.length },
			});
		}

		// default: return raw patient rows (but still normalize createdAt/updatedAt)
		const normalized = (patients ?? []).map((p: any) => ({
			id: p.id,
			firstName: readMaybe(p, 'firstName', 'first_name'),
			lastName: readMaybe(p, 'lastName', 'last_name'),
			identifier: readMaybe(p, 'identifier'),
			dob: normalizeDate(p, 'dob'),
			gender: readMaybe(p, 'gender'),
			phone: readMaybe(p, 'phone'),
			address: readMaybe(p, 'address'),
			createdAt: normalizeDate(p, 'createdAt', 'created_at'),
			updatedAt: normalizeDate(p, 'updatedAt', 'updated_at'),
		}));

		return NextResponse.json({
			data: normalized,
			meta: { page, per_page, total: count ?? (Array.isArray(patients) ? patients.length : 0) },
		});
	} catch (err: any) {
		console.error('Unhandled GET /api/patients error', err);
		return NextResponse.json({ error: 'Error interno', detail: err?.message ?? String(err) }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const { supabase } = createSupabaseServerClient();
		const body = await request.json();

		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
		}
		const firstName = (body.firstName || body.first_name || '').trim();
		const lastName = (body.lastName || body.last_name || '').trim();
		if (!firstName || !lastName) {
			return NextResponse.json({ error: 'firstName y lastName son requeridos' }, { status: 400 });
		}

		const payload: any = {
			firstName,
			lastName,
			identifier: body.identifier ?? body.id_number ?? null,
			dob: isoOrNull(body.dob ?? body.dateOfBirth ?? null),
			gender: body.gender ?? null,
			phone: body.phone ?? null,
			address: body.address ?? null,
		};

		const { data, error } = await supabase.from('Patient').insert(payload).select().maybeSingle();
		if (error) {
			console.error('Error creating patient', error);
			return NextResponse.json({ error: 'Error al crear paciente', detail: error.message ?? String(error) }, { status: 500 });
		}

		// Normalize createdAt/updatedAt if present
		const created = data ? { ...data, createdAt: normalizeDate(data, 'createdAt', 'created_at'), updatedAt: normalizeDate(data, 'updatedAt', 'updated_at') } : data;

		return NextResponse.json({ data: created }, { status: 201 });
	} catch (err: any) {
		console.error('Unhandled POST /api/patients error', err);
		return NextResponse.json({ error: 'Error interno', detail: err?.message ?? String(err) }, { status: 500 });
	}
}
