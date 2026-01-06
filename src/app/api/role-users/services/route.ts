import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer, roleNameEquals } from '@/lib/role-user-auth';
import { randomUUID } from 'crypto';

type RawService = {
	id?: string;
	name: string;
	description?: string | null;
	price: number;
	currency: string;
	is_active?: boolean;
};

async function getDoctorIdForOrganization(organizationId: string) {
	const supabase = await createSupabaseServerClient();

	const { data: doctors, error: doctorsError } = await supabase
		.from('User')
		.select('id')
		.eq('organizationId', organizationId)
		.eq('role', 'MEDICO')
		.limit(1);

	if (doctorsError || !doctors || doctors.length === 0) {
		console.warn('[Role User Services API] No se encontraron médicos en la organización', {
			organizationId,
			error: doctorsError,
		});
		return { doctorId: null, supabase };
	}

	return { doctorId: doctors[0].id as string, supabase };
}

function parseServicesField(servicesField: unknown): RawService[] {
	if (!servicesField) return [];

	try {
		if (typeof servicesField === 'string') {
			const parsed = JSON.parse(servicesField);
			return Array.isArray(parsed) ? (parsed as RawService[]) : [];
		}

		if (Array.isArray(servicesField)) {
			return servicesField as RawService[];
		}

		return [];
	} catch (err) {
		console.error('[Role User Services API] Error parseando servicios:', err);
		return [];
	}
}

export async function GET(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const { doctorId, supabase } = await getDoctorIdForOrganization(session.organizationId);

		if (!doctorId) {
			return NextResponse.json({ success: true, services: [] }, { status: 200 });
		}

		// Obtener el medic_profile del primer médico de la organización
		const { data: profile, error: profileError } = await supabase
			.from('medic_profile')
			.select('id, doctor_id, services, service_combos')
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
		const services = parseServicesField(profile.services);

		// Asegurar que todos los servicios tengan un id (para servicios antiguos que no lo tienen)
		const servicesWithIds = services.map((s: RawService) => {
			if (!s.id) {
				return { ...s, id: randomUUID() };
			}
			return s;
		});

		// Si se agregaron IDs nuevos, actualizar en la base de datos
		if (servicesWithIds.length !== services.length || services.some((s: RawService) => !s.id)) {
			const { error: updateError } = await supabase
				.from('medic_profile')
				.update({ services: servicesWithIds })
				.eq('doctor_id', doctorId);
			
			if (updateError) {
				console.warn('[Role User Services API] Error actualizando servicios con IDs:', updateError);
			}
		}

		// Filtrar solo servicios activos
		const activeServices = servicesWithIds.filter((s: RawService) => s.is_active !== false);

		return NextResponse.json({ success: true, services: activeServices }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Services API] Error en GET:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

// POST: Crear nuevo servicio del consultorio (guardado en medic_profile.services)
export async function POST(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Solo el rol "Asistente De Citas" puede crear/editar servicios
		if (!roleNameEquals(session.roleName, 'Asistente De Citas')) {
			return NextResponse.json(
				{ error: 'Solo el rol "Asistente De Citas" puede modificar servicios' },
				{ status: 403 },
			);
		}

		const body = await req.json();
		const { name, description, price, currency } = body as {
			name?: string;
			description?: string | null;
			price?: number | string;
			currency?: string;
		};

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return NextResponse.json({ error: 'El nombre del servicio es requerido' }, { status: 400 });
		}

		const numericPrice = typeof price === 'string' ? Number(price) : price;

		if (numericPrice === undefined || Number.isNaN(numericPrice) || numericPrice < 0) {
			return NextResponse.json({ error: 'El precio del servicio es inválido' }, { status: 400 });
		}

		const allowedCurrencies = ['USD', 'VES', 'EUR'];
		const finalCurrency = (currency || 'USD').toUpperCase();

		if (!allowedCurrencies.includes(finalCurrency)) {
			return NextResponse.json(
				{ error: `Moneda inválida. Debe ser una de: ${allowedCurrencies.join(', ')}` },
				{ status: 400 },
			);
		}

		const { doctorId, supabase } = await getDoctorIdForOrganization(session.organizationId);

		if (!doctorId) {
			return NextResponse.json(
				{ error: 'No se encontró un médico asociado a esta organización' },
				{ status: 400 },
			);
		}

		// Asegurar que exista un medic_profile para el médico
		const { data: existingProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('id, services')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError) {
			console.error('[Role User Services API] Error obteniendo perfil para crear servicio:', profileError);
			return NextResponse.json({ error: 'Error al obtener perfil del médico' }, { status: 500 });
		}

		let currentServices: RawService[] = [];

		if (existingProfile) {
			currentServices = parseServicesField(existingProfile.services);
		}

		const newService: RawService = {
			id: randomUUID(),
			name: name.trim(),
			description: description?.toString().trim() || null,
			price: Number(numericPrice),
			currency: finalCurrency,
			is_active: true,
		};

		const updatedServices = [...currentServices, newService];

		if (existingProfile) {
			const { error: updateError } = await supabase
				.from('medic_profile')
				.update({ services: updatedServices })
				.eq('doctor_id', doctorId);

			if (updateError) {
				console.error('[Role User Services API] Error actualizando servicios:', updateError);
				return NextResponse.json({ error: 'Error al guardar el servicio' }, { status: 500 });
			}
		} else {
			const { error: insertError } = await supabase.from('medic_profile').insert({
				doctor_id: doctorId,
				services: updatedServices,
			});

			if (insertError) {
				console.error('[Role User Services API] Error creando perfil con servicios:', insertError);
				return NextResponse.json({ error: 'Error al guardar el servicio' }, { status: 500 });
			}
		}

		return NextResponse.json({ success: true, service: newService }, { status: 201 });
	} catch (err: any) {
		console.error('[Role User Services API] Error en POST:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

