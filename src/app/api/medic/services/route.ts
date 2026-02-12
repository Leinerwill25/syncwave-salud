import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { getApiResponseHeaders } from '@/lib/api-cache-utils';

// Configurar caché optimizada (semi-static: servicios cambian ocasionalmente)
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();
		
		// Obtener usuario autenticado
		const { data: authData, error: authError } = await supabase.auth.getUser();
		
		if (authError || !authData?.user) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const authId = authData.user.id;

		// Buscar el usuario en la tabla User usando authId
		const { data: appUser, error: userError } = await supabase
			.from('users')
			.select('id')
			.eq('authId', authId)
			.maybeSingle();

		if (userError || !appUser) {
			console.error('Error buscando usuario:', userError);
			return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
		}

		const doctorId = appUser.id;

		// Obtener el medic_profile del doctor
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('services')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError) {
			console.error('Error obteniendo medic_profile:', profileError);
			return NextResponse.json({ error: 'Error al obtener el perfil médico' }, { status: 500 });
		}

		// Extraer y parsear servicios
		let services: any[] = [];
		
		if (medicProfile?.services) {
			try {
				if (Array.isArray(medicProfile.services)) {
					services = medicProfile.services;
				} else if (typeof medicProfile.services === 'string') {
					services = JSON.parse(medicProfile.services);
				} else {
					services = [];
				}
			} catch (parseError) {
				console.error('Error parseando servicios:', parseError);
				services = [];
			}
		}

		// Filtrar por activos si se solicita
		const { searchParams } = new URL(req.url);
		const activeOnly = searchParams.get('active') === 'true';
		
		if (activeOnly) {
			services = services.filter((service: any) => {
				// Un servicio está activo si no tiene is_active o si is_active es true
				return service.is_active !== false;
			});
		}

		return NextResponse.json({
			success: true,
			services: services || [],
		}, {
			headers: getApiResponseHeaders('semi-static'),
		});
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Error interno';
		console.error('Error en GET /api/medic/services:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

