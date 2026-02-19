import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { getAuthenticatedUser } from '@/lib/auth-guards';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const month = searchParams.get('month'); // 1-12
		const year = searchParams.get('year');

		if (!month || !year) {
			return NextResponse.json({ error: 'Mes y año son requeridos' }, { status: 400 });
		}

		// 1. Intentar obtener usuario médico/admin
		const user = await getAuthenticatedUser();
		let organizationId: string | null = null;
		let doctorId: string | null = null;
		let isRoleUser = false;

		if (user) {
			organizationId = user.organizationId || null;
			if (user.role === 'MEDICO') {
				doctorId = user.userId;
			}
		} else {
			// 2. Intentar obtener usuario de rol (Asistente/Recepción)
			const roleSession = await getRoleUserSessionFromServer();
			if (roleSession) {
				organizationId = roleSession.organizationId;
				isRoleUser = true;
			}
		}

		if (!organizationId) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
		}

		// Configurar Supabase (Usar service role si es role user para bypass RLS si es necesario, 
		// aunque la tabla appointment debería ser accesible si está bien configurada)
		const supabase = await createSupabaseServerClient();

		// Rango del mes
		const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
		const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

		const startIso = startDate.toISOString();
		const endIso = endDate.toISOString();

		let query = supabase
			.from('appointment')
			.select('scheduled_at')
			.eq('organization_id', organizationId)
			.gte('scheduled_at', startIso)
			.lte('scheduled_at', endIso)
			.neq('status', 'CANCELADA');

		// Si es médico, filtrar solo sus citas
		if (doctorId && !isRoleUser) {
			query = query.eq('doctor_id', doctorId);
		}

		const { data, error } = await query;

		if (error) {
			console.error('[Indicators API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener indicadores' }, { status: 500 });
		}

		// Extraer fechas únicas (solo YYYY-MM-DD)
		const dates = Array.from(new Set(
			data?.map(apt => new Date(apt.scheduled_at).toISOString().split('T')[0])
		));

		return NextResponse.json({ dates });

	} catch (error) {
		console.error('[Indicators API] Error general:', error);
		return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
	}
}
