import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

export async function GET(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();

		// Obtener el perfil del consultorio (clinic_profile) para la organización del role-user
		const { data: profile, error: profileError } = await supabase.from('clinic_profile').select('address_operational, address_fiscal, city_municipality, state_province, postal_code').eq('organization_id', session.organizationId).maybeSingle();

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
