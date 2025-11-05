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
		const { patient_id, doctor_id: providedDoctorId, organization_id: providedOrgId = null, chief_complaint, diagnosis = null, notes = null } = body || {};

		// Validaciones básicas
		if (!patient_id) return NextResponse.json({ error: 'patient_id es obligatorio' }, { status: 400 });
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
		const insertPayload: any = {
			patient_id,
			doctor_id: doctorIdToUse,
			organization_id: organizationIdToUse,
			chief_complaint,
			diagnosis,
			notes,
		};

		// Insert y devolver fila completa
		const { data: insertData, error: insertErr } = await supabase.from('consultation').insert([insertPayload]).select('*').maybeSingle();

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
