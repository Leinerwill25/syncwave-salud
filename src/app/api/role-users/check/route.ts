import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/app/adapters/server';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY 
	? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
	: null;

/**
 * Endpoint para verificar si un usuario con email está en consultorio_role_users
 */
export async function GET(req: NextRequest) {
	try {
		if (!supabaseAdmin) {
			return NextResponse.json({ exists: false, error: 'Error de configuración' }, { status: 500 });
		}

		const { searchParams } = new URL(req.url);
		const email = searchParams.get('email');

		if (!email) {
			return NextResponse.json({ exists: false, error: 'Email requerido' }, { status: 400 });
		}

		// Buscar en consultorio_role_users por email
		const { data: roleUser, error } = await supabaseAdmin
			.from('consultorio_role_users')
			.select('id, email, is_active, role_id, consultorio_roles(*)')
			.eq('email', email.trim())
			.eq('is_active', true)
			.maybeSingle();

		if (error) {
			console.error('[Role Users Check] Error:', error);
			return NextResponse.json({ exists: false, error: 'Error al buscar usuario' }, { status: 500 });
		}

		if (roleUser) {
			return NextResponse.json({ 
				exists: true, 
				roleUser: {
					id: roleUser.id,
					email: roleUser.email,
					roleId: roleUser.role_id,
					role: Array.isArray(roleUser.consultorio_roles) ? roleUser.consultorio_roles[0] : roleUser.consultorio_roles,
				}
			});
		}

		return NextResponse.json({ exists: false });
	} catch (err) {
		console.error('[Role Users Check] Error:', err);
		return NextResponse.json({ exists: false, error: 'Error interno' }, { status: 500 });
	}
}

