// API endpoint to create unregistered patients
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

/**
 * Helper: intenta reconstruir sesión a partir de cookies conocidas.
 * Retorna true si logró setear sesión en el cliente.
 */
async function tryRestoreSessionFromCookies(supabase: any, cookieStore: any): Promise<boolean> {
	if (!cookieStore) return false;

	const tried: string[] = [];
	const cookieCandidates = ['sb-session', 'sb:token', 'supabase-auth-token', 'sb-access-token', 'sb-refresh-token'];

	for (const name of cookieCandidates) {
		tried.push(name);
		try {
			const c = typeof cookieStore.get === 'function' ? cookieStore.get(name) : undefined;
			const raw = c?.value ?? null;
			if (!raw) continue;

			let parsed: any = null;
			try {
				parsed = JSON.parse(raw);
			} catch {
				parsed = null;
			}

			let access_token: string | null = null;
			let refresh_token: string | null = null;

			if (parsed) {
				access_token = parsed?.access_token ?? parsed?.session?.access_token ?? parsed?.currentSession?.access_token ?? null;
				refresh_token = parsed?.refresh_token ?? parsed?.session?.refresh_token ?? parsed?.currentSession?.refresh_token ?? null;
			} else {
				if (name === 'sb-access-token') access_token = raw;
				else if (name === 'sb-refresh-token') refresh_token = raw;
			}

			if (!access_token && !refresh_token) continue;

			const payload: any = {};
			if (access_token) payload.access_token = access_token;
			if (refresh_token) payload.refresh_token = refresh_token;

			const { data, error } = await supabase.auth.setSession(payload);
			if (error) {
				if (refresh_token && !access_token) {
					try {
						const { data: refreshData } = await supabase.auth.refreshSession({ refresh_token });
						if (refreshData?.session) return true;
					} catch {
						// ignore
					}
				}
				continue;
			}

			if (data?.session) return true;

			const { data: sessionAfter } = await supabase.auth.getSession();
			if (sessionAfter?.session) return true;
		} catch (err: any) {
			continue;
		}
	}

	return false;
}

export async function POST(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();
        const cookieStore = await cookies();
		
        // Initialize Admin Client to bypass RLS for table without organization_id
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        });

		const body = await req.json();

		const {
			first_name,
			last_name,
			identification,
			birth_date,
			sex,
			phone,
			email,
			address,
			height_cm,
			weight_kg,
			bmi,
			allergies,
			chronic_conditions,
			current_medication,
			family_history,
			motive,
			vital_bp_systolic,
			vital_bp_diastolic,
			vital_heart_rate,
			vital_respiratory_rate,
			vital_temperature,
			vital_spo2,
			vital_glucose,
		} = body;

		if (!first_name || !last_name || !phone) {
			return NextResponse.json({ error: 'first_name, last_name y phone son obligatorios' }, { status: 400 });
		}

		// Validar que la cédula de identidad sea única (si se proporciona)
		if (identification) {
			// Verificar en pacientes registrados (Admin check for global uniqueness)
			const { data: existingRegistered, error: registeredCheckError } = await supabaseAdmin
				.from('patient')
				.select('id, identifier')
				.eq('identifier', identification.trim())
				.maybeSingle();

			if (registeredCheckError) {
				console.error('Error verificando cédula en Patient:', registeredCheckError);
				return NextResponse.json({ error: 'Error al verificar la cédula de identidad' }, { status: 500 });
			}

			if (existingRegistered) {
				return NextResponse.json(
					{
						error: `La cédula de identidad "${identification}" ya está registrada para un paciente en el sistema. Por favor, busca al paciente en la lista de pacientes registrados.`,
						existingPatientId: existingRegistered.id,
					},
					{ status: 409 }
				);
			}

			// Verificar en pacientes no registrados (Admin check)
			const { data: existingUnregistered, error: unregisteredCheckError } = await supabaseAdmin
				.from('unregisteredpatients')
				.select('id, identification')
				.eq('identification', identification.trim())
				.maybeSingle();

			if (unregisteredCheckError) {
				console.error('Error verificando cédula en unregisteredpatients:', unregisteredCheckError);
				return NextResponse.json({ error: 'Error al verificar la cédula de identidad' }, { status: 500 });
			}

			if (existingUnregistered) {
				return NextResponse.json(
					{
						error: `La cédula de identidad "${identification}" ya está registrada. Por favor, busca al paciente en la lista de pacientes no registrados.`,
						existingPatientId: existingUnregistered.id,
					},
					{ status: 409 }
				);
			}
		}

		// Intentar obtener el usuario desde la sesión (Mantener validación de usuario)
		let authUser = null;
		const { data: { user }, error: getUserError } = await supabase.auth.getUser();

		if (getUserError || !user) {
			// Si no hay sesión, intentar restaurar desde cookies
			const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
			if (restored) {
				const { data: { user: restoredUser } } = await supabase.auth.getUser();
				authUser = restoredUser;
			}
		} else {
			authUser = user;
		}

		if (!authUser) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Obtener el app user ID desde la tabla User usando authId
		const { data: appUser, error: appUserError } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('authId', authUser.id)
			.maybeSingle();

		if (appUserError) {
			console.error('Error buscando User por authId:', appUserError);
			return NextResponse.json({ error: 'Error interno buscando perfil de usuario' }, { status: 500 });
		}

		if (!appUser) {
			return NextResponse.json({ error: 'Perfil de usuario no encontrado' }, { status: 403 });
		}

		// Get medic profile to get created_by (opcional - puede ser null)
		let createdBy = null;
		if (appUser) {
			const { data: medicProfile } = await supabaseAdmin
				.from('medic_profile')
				.select('id')
				.eq('doctor_id', appUser.id)
				.maybeSingle();
			createdBy = medicProfile?.id || null;
		}

		const insertData: any = {
			first_name,
			last_name,
			phone,
			identification: identification || null,
			birth_date: birth_date || null,
			sex: sex || null,
			email: email || null,
			address: address || null,
			height_cm: height_cm || null,
			weight_kg: weight_kg || null,
			bmi: bmi || null,
			allergies: allergies || null,
			chronic_conditions: chronic_conditions || null,
			current_medication: current_medication || null,
			family_history: family_history || null,
			motive: motive || null,
			vital_bp_systolic: vital_bp_systolic || null,
			vital_bp_diastolic: vital_bp_diastolic || null,
			vital_heart_rate: vital_heart_rate || null,
			vital_respiratory_rate: vital_respiratory_rate || null,
			vital_temperature: vital_temperature || null,
			vital_spo2: vital_spo2 || null,
			vital_glucose: vital_glucose || null,
			created_by: createdBy,
		};

        // Use Admin client for insert
		const { data, error } = await supabaseAdmin.from('unregisteredpatients').insert([insertData]).select('id').single();

		if (error) {
			console.error('Error creating unregistered patient:', error);
			return NextResponse.json({ error: 'Error al crear paciente no registrado' }, { status: 500 });
		}

		return NextResponse.json({ id: data.id, data }, { status: 201 });
	} catch (error: any) {
		console.error('❌ Error POST /unregistered-patients:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}

