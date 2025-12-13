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

		// Los servicios están almacenados en medic_profile por doctor_id
		// Para role-users, necesitamos obtener los servicios de algún médico de la organización
		// Primero, obtener el primer médico de la organización
		const { data: doctors, error: doctorsError } = await supabase
			.from('User')
			.select('id')
			.eq('organizationId', session.organizationId)
			.eq('role', 'MEDICO')
			.limit(1);

		if (doctorsError || !doctors || doctors.length === 0) {
			console.warn('[Role User Services API] No se encontraron médicos en la organización');
			return NextResponse.json({ success: true, services: [] }, { status: 200 });
		}

		const doctorId = doctors[0].id;

		// Obtener el medic_profile del primer médico de la organización
		const { data: profile, error: profileError } = await supabase
			.from('medic_profile')
			.select('id, doctor_id, services')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError) {
			console.error('[Role User Services API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 });
		}

		if (!profile) {
			return NextResponse.json({ success: true, services: [] }, { status: 200 });
		}

		// Los servicios están almacenados como JSON en el campo services
		let services: any[] = [];
		if (profile.services) {
			try {
				// Si services es un string, parsearlo
				if (typeof profile.services === 'string') {
					services = JSON.parse(profile.services);
				} else if (Array.isArray(profile.services)) {
					services = profile.services;
				}
			} catch (parseError) {
				console.error('[Role User Services API] Error parseando servicios:', parseError);
				services = [];
			}
		}

		// Filtrar solo servicios activos
		const activeServices = services.filter((s: any) => s.is_active !== false);

		return NextResponse.json({ success: true, services: activeServices }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Services API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

