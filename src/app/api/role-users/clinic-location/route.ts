import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

export async function GET(req: NextRequest) {
	try {
        const supabase = await createSupabaseServerClient();
		let organizationId: string | null = null;

		// 1. Intentar obtener sesión de RoleUser
		const roleSession = await getRoleUserSessionFromServer();
		if (roleSession) {
			organizationId = roleSession.organizationId;
		} else {
			// 2. Intentar obtener sesión de Usuario Estándar (Médico)
			const { data: { user } } = await supabase.auth.getUser();
			if (user) {
				const { data: appUser } = await supabase
					.from('users')
					.select('organizationId')
					.eq('authId', user.id)
					.single();
				organizationId = appUser?.organizationId || null;
			}
		}

		if (!organizationId) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Obtener el perfil del consultorio (clinic_profile) para la organización
		const { data: profile, error: profileError } = await supabase.from('clinic_profile').select('address_operational, address_fiscal, city_municipality, state_province, postal_code').eq('organization_id', organizationId).maybeSingle();

		if (profileError) {
			console.error('[Role User Clinic Location API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener ubicación' }, { status: 500 });
		}

		if (!profile) {
			return NextResponse.json({ location: '' }, { status: 200 });
		}

		// Construir la ubicación completa
		// Priorizar address_operational, si no existe usar address_fiscal
		const address = profile.address_operational || profile.address_fiscal || '';

		const parts: string[] = [];
		if (address) parts.push(address);
		if (profile.city_municipality) parts.push(profile.city_municipality);
		if (profile.state_province) parts.push(profile.state_province);
		if (profile.postal_code) parts.push(profile.postal_code);

		const location = parts.join(', ');

		return NextResponse.json({ location }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Clinic Location API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}
