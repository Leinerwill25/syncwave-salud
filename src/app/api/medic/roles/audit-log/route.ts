import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// POST: Registrar una acción en el audit log
export async function POST(request: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);
		if (user.role !== 'MEDICO') {
			return NextResponse.json({ error: 'Acceso denegado: solo médicos' }, { status: 403 });
		}

		if (!user.organizationId) {
			return NextResponse.json({ error: 'Usuario no asociado a una organización' }, { status: 400 });
		}

		const body = await request.json();
		const {
			roleId,
			roleUserId,
			userFirstName,
			userLastName,
			userIdentifier,
			actionType,
			module,
			entityType,
			entityId,
			actionDetails,
			ipAddress,
			userAgent,
		} = body;

		// Validaciones básicas
		if (!userFirstName || !userLastName || !userIdentifier || !actionType || !module || !entityType) {
			return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
		}

		// Obtener IP y User-Agent del request si no se proporcionaron
		const clientIp = ipAddress || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
		const clientUserAgent = userAgent || request.headers.get('user-agent') || 'unknown';

		// Insertar en audit log
		const { data: auditLog, error: insertError } = await supabase
			.from('consultorio_role_audit_log')
			.insert({
				organization_id: user.organizationId,
				role_id: roleId || null,
				role_user_id: roleUserId || null,
				user_first_name: userFirstName,
				user_last_name: userLastName,
				user_identifier: userIdentifier,
				action_type: actionType,
				module: module,
				entity_type: entityType,
				entity_id: entityId || null,
				action_details: actionDetails || {},
				ip_address: clientIp,
				user_agent: clientUserAgent,
			})
			.select()
			.single();

		if (insertError) {
			console.error('[Audit Log API] Error insertando log:', insertError);
			return NextResponse.json({ error: 'Error al registrar la acción' }, { status: 500 });
		}

		return NextResponse.json({ success: true, auditLog });
	} catch (err) {
		console.error('[Audit Log API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

// GET: Obtener logs de auditoría (con filtros opcionales)
export async function GET(request: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);
		if (user.role !== 'MEDICO') {
			return NextResponse.json({ error: 'Acceso denegado: solo médicos' }, { status: 403 });
		}

		if (!user.organizationId) {
			return NextResponse.json({ error: 'Usuario no asociado a una organización' }, { status: 400 });
		}

		const { searchParams } = new URL(request.url);
		const roleId = searchParams.get('roleId');
		const roleUserId = searchParams.get('roleUserId');
		const module = searchParams.get('module');
		const actionType = searchParams.get('actionType');
		const limit = parseInt(searchParams.get('limit') || '100', 10);

		// Construir query
		let query = supabase
			.from('consultorio_role_audit_log')
			.select('*')
			.eq('organization_id', user.organizationId)
			.order('created_at', { ascending: false })
			.limit(limit);

		if (roleId) query = query.eq('role_id', roleId);
		if (roleUserId) query = query.eq('role_user_id', roleUserId);
		if (module) query = query.eq('module', module);
		if (actionType) query = query.eq('action_type', actionType);

		const { data: logs, error: logsError } = await query;

		if (logsError) {
			console.error('[Audit Log API] Error obteniendo logs:', logsError);
			return NextResponse.json({ error: 'Error al obtener logs' }, { status: 500 });
		}

		return NextResponse.json({ success: true, logs: logs || [] });
	} catch (err) {
		console.error('[Audit Log API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: 'Error interno', detail: errorMessage }, { status: 500 });
	}
}

