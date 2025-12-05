import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';
import { logRoleUserAction } from '@/lib/consultorio-role-audit';

// POST: Crear una cita (ejemplo de API modificada para usuarios de roles)
export async function POST(request: NextRequest) {
	try {
		// Verificar sesión del usuario de rol
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado. Debe iniciar sesión como usuario de rol.' }, { status: 401 });
		}

		// Verificar permisos: debe tener permiso de 'create' en el módulo 'citas'
		const hasCreatePermission = session.permissions.some(
			(p) => p.module === 'citas' && p.permissions.create === true
		);

		if (!hasCreatePermission) {
			return NextResponse.json({ error: 'No tienes permisos para crear citas' }, { status: 403 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const { patient_id, scheduled_at, duration_minutes = 30, status = 'SCHEDULED', reason, location } = body;

		if (!patient_id || !scheduled_at) {
			return NextResponse.json({ error: 'Campos requeridos: patient_id y scheduled_at.' }, { status: 400 });
		}

		// Obtener el doctor_id de la organización (el médico principal de la organización)
		// Buscar el primer médico (MEDICO) asociado a la organización
		const { data: orgDoctor, error: doctorError } = await supabase
			.from('User')
			.select('id')
			.eq('organizationId', session.organizationId)
			.eq('role', 'MEDICO')
			.maybeSingle();

		if (doctorError || !orgDoctor) {
			console.error('[Role User Appointments] Error obteniendo doctor:', doctorError);
			return NextResponse.json({ error: 'No se pudo determinar el médico de la organización' }, { status: 500 });
		}

		// Crear la cita a nombre de la organización
		const { data: appointment, error: createError } = await supabase
			.from('appointment')
			.insert([
				{
					patient_id,
					doctor_id: orgDoctor.id, // Usar el doctor de la organización
					organization_id: session.organizationId, // A nombre de la organización
					scheduled_at,
					duration_minutes,
					status,
					reason: reason || null,
					location: location || null,
				},
			])
			.select('id, scheduled_at, status, reason, location')
			.single();

		if (createError) {
			console.error('[Role User Appointments] Error al crear cita:', createError);
			return NextResponse.json({ error: 'No se pudo crear la cita.' }, { status: 500 });
		}

		// Registrar la acción en el audit log
		await logRoleUserAction({
			actionType: 'create',
			module: 'citas',
			entityType: 'appointment',
			entityId: appointment.id,
			actionDetails: {
				description: `Cita creada para paciente ${patient_id}`,
				scheduled_at: scheduled_at,
				status: status,
				reason: reason,
				location: location,
				created_by_role_user: `${session.firstName} ${session.lastName} (${session.identifier})`,
				role_name: session.roleName,
			},
		});

		return NextResponse.json(
			{
				success: true,
				appointment,
				message: `Cita creada exitosamente por ${session.firstName} ${session.lastName} (${session.roleName})`,
			},
			{ status: 201 }
		);
	} catch (err) {
		console.error('[Role User Appointments] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error al crear la cita', detail: errorMessage }, { status: 500 });
	}
}

// GET: Listar citas (solo las de la organización del usuario de rol)
export async function GET(request: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Verificar permisos: debe tener permiso de 'view' en el módulo 'citas'
		const hasViewPermission = session.permissions.some(
			(p) => p.module === 'citas' && p.permissions.view === true
		);

		if (!hasViewPermission) {
			return NextResponse.json({ error: 'No tienes permisos para ver citas' }, { status: 403 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const { searchParams } = new URL(request.url);
		const date = searchParams.get('date');

		// Obtener citas de la organización
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
				patient:patient_id (
					id,
					firstName,
					lastName
				)
				`
			)
			.eq('organization_id', session.organizationId)
			.order('scheduled_at', { ascending: true });

		// Filtrar por fecha si se proporciona
		if (date) {
			const localDate = new Date(`${date}T00:00:00`);
			const startOfDay = new Date(localDate);
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date(localDate);
			endOfDay.setHours(23, 59, 59, 999);

			const startIso = startOfDay.toISOString().replace('Z', '+00:00');
			const endIso = endOfDay.toISOString().replace('Z', '+00:00');

			query = query.gte('scheduled_at', startIso).lte('scheduled_at', endIso);
		}

		const { data: appointments, error: fetchError } = await query;

		if (fetchError) {
			console.error('[Role User Appointments] Error obteniendo citas:', fetchError);
			return NextResponse.json({ error: 'Error al obtener citas' }, { status: 500 });
		}

		// Registrar visualización en audit log
		await logRoleUserAction({
			actionType: 'view',
			module: 'citas',
			entityType: 'appointment',
			actionDetails: {
				description: 'Listado de citas consultado',
				filter_date: date || 'all',
			},
		});

		return NextResponse.json({ success: true, appointments: appointments || [] });
	} catch (err) {
		console.error('[Role User Appointments] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error al obtener citas', detail: errorMessage }, { status: 500 });
	}
}

