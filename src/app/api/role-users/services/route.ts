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
	createdBy?: string; // ID del role-user que creó el servicio
};

async function getDoctorIdForOrganization(organizationId: string) {
	const supabase = await createSupabaseServerClient();

	const { data: doctors, error: doctorsError } = await supabase
		.from('user')
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
		// Usar .single() en lugar de .maybeSingle() para forzar recarga sin caché
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

		// Debug: Log para ver qué servicios hay en la BD
		console.log('[Role User Services API] Servicios en BD:', JSON.stringify(services, null, 2));
		console.log('[Role User Services API] session.roleUserId:', session.roleUserId);
		console.log('[Role User Services API] session.roleUserId type:', typeof session.roleUserId);
		console.log('[Role User Services API] Total servicios en BD:', services.length);
		
		// Debug: Verificar servicios con createdBy
		const servicesWithCreatedBy = services.filter((s: RawService) => s.createdBy);
		console.log('[Role User Services API] Servicios con createdBy:', servicesWithCreatedBy.length);
		servicesWithCreatedBy.forEach((s: RawService) => {
			console.log(`[Role User Services API] - ${s.name}: createdBy="${s.createdBy}" (type: ${typeof s.createdBy})`);
		});

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

		// Filtrar servicios creados por este usuario (asistente de citas)
		// Si el servicio no tiene createdBy, también incluirlo (pueden ser servicios antiguos o compartidos)
		const userServices = servicesWithIds.filter((s: RawService) => {
			// Normalizar valores para comparación
			const serviceCreatedBy = s.createdBy ? String(s.createdBy).trim() : null;
			const sessionRoleUserId = session.roleUserId ? String(session.roleUserId).trim() : null;
			
			// Si no tiene createdBy, incluirlo (servicios antiguos o compartidos de la organización)
			if (!serviceCreatedBy || serviceCreatedBy === 'null' || serviceCreatedBy === 'undefined') {
				console.log('[Role User Services API] Incluyendo servicio sin createdBy:', s.name);
				return true;
			}
			
			// Si tiene createdBy, solo incluirlo si coincide con el usuario actual
			const matches = serviceCreatedBy === sessionRoleUserId;
			
			if (!matches) {
				console.log('[Role User Services API] Excluyendo servicio - createdBy no coincide:', {
					serviceName: s.name,
					serviceId: s.id,
					serviceCreatedBy: serviceCreatedBy,
					serviceCreatedByType: typeof s.createdBy,
					sessionRoleUserId: sessionRoleUserId,
					sessionRoleUserIdType: typeof session.roleUserId,
					comparison: `"${serviceCreatedBy}" === "${sessionRoleUserId}"`,
					matches: matches
				});
			} else {
				console.log('[Role User Services API] Incluyendo servicio - createdBy coincide:', {
					serviceName: s.name,
					serviceId: s.id,
					createdBy: serviceCreatedBy
				});
			}
			
			return matches;
		});

		// Debug: Log para ver qué servicios se filtraron
		console.log('[Role User Services API] Servicios filtrados:', JSON.stringify(userServices, null, 2));
		console.log('[Role User Services API] Total servicios antes del filtro:', servicesWithIds.length);
		console.log('[Role User Services API] Total servicios después del filtro:', userServices.length);

		// Filtrar solo servicios activos
		const activeServices = userServices.filter((s: RawService) => s.is_active !== false);

		// Debug: Log final
		console.log('[Role User Services API] Servicios activos finales:', activeServices.length);

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
			createdBy: session.roleUserId, // Guardar el ID del usuario que crea el servicio
		};

		// Debug: Log del servicio que se va a crear
		console.log('[Role User Services API] Creando servicio:', JSON.stringify(newService, null, 2));
		console.log('[Role User Services API] session.roleUserId:', session.roleUserId);
		console.log('[Role User Services API] Servicios actuales antes de agregar:', currentServices.length);

		const updatedServices = [...currentServices, newService];

		// Debug: Log de servicios actualizados
		console.log('[Role User Services API] Servicios actualizados después de agregar:', updatedServices.length);

		if (existingProfile) {
			// Usar RPC o actualización directa para evitar problemas de caché
			const { error: updateError, data: updateData } = await supabase
				.from('medic_profile')
				.update({ 
					services: updatedServices,
					updated_at: new Date().toISOString() // Forzar actualización de timestamp
				})
				.eq('doctor_id', doctorId)
				.select('services');

			if (updateError) {
				console.error('[Role User Services API] Error actualizando servicios:', updateError);
				return NextResponse.json({ error: 'Error al guardar el servicio' }, { status: 500 });
			}

			// Debug: Verificar que se guardó correctamente
			const savedServices = updateData?.[0]?.services;
			console.log('[Role User Services API] Servicios guardados en BD:', JSON.stringify(savedServices, null, 2));
			
			// Verificar que el nuevo servicio está en los datos guardados
			const savedServicesArray = parseServicesField(savedServices);
			const newServiceInDb = savedServicesArray.find((s: RawService) => s.id === newService.id);
			console.log('[Role User Services API] Nuevo servicio encontrado en BD después de guardar:', newServiceInDb ? 'SÍ' : 'NO');
			if (newServiceInDb) {
				console.log('[Role User Services API] createdBy del servicio guardado:', newServiceInDb.createdBy);
				console.log('[Role User Services API] createdBy esperado:', session.roleUserId);
				console.log('[Role User Services API] Coinciden:', String(newServiceInDb.createdBy) === String(session.roleUserId));
			}
		} else {
			const { error: insertError, data: insertData } = await supabase.from('medic_profile').insert({
				doctor_id: doctorId,
				services: updatedServices,
			}).select('services');

			if (insertError) {
				console.error('[Role User Services API] Error creando perfil con servicios:', insertError);
				return NextResponse.json({ error: 'Error al guardar el servicio' }, { status: 500 });
			}

			// Debug: Verificar que se guardó correctamente
			const savedServices = insertData?.[0]?.services;
			console.log('[Role User Services API] Servicios guardados en BD (nuevo perfil):', JSON.stringify(savedServices, null, 2));
			
			// Verificar que el nuevo servicio está en los datos guardados
			const savedServicesArray = parseServicesField(savedServices);
			const newServiceInDb = savedServicesArray.find((s: RawService) => s.id === newService.id);
			console.log('[Role User Services API] Nuevo servicio encontrado en BD después de guardar:', newServiceInDb ? 'SÍ' : 'NO');
		}

		// Después de guardar, obtener los servicios actualizados para devolverlos
		// Esto ayuda a evitar problemas de caché
		const { data: updatedProfile, error: fetchError } = await supabase
			.from('medic_profile')
			.select('services')
			.eq('doctor_id', doctorId)
			.single();

		if (fetchError) {
			console.warn('[Role User Services API] Error obteniendo servicios actualizados después de guardar:', fetchError);
			// Devolver el servicio creado de todas formas
			return NextResponse.json({ success: true, service: newService }, { status: 201 });
		}

		// Parsear y filtrar servicios actualizados
		const allUpdatedServices = parseServicesField(updatedProfile?.services);
		const userUpdatedServices = allUpdatedServices.filter((s: RawService) => {
			if (!s.createdBy) return true; // Servicios antiguos
			return String(s.createdBy).trim() === String(session.roleUserId).trim();
		});
		const activeUpdatedServices = userUpdatedServices.filter((s: RawService) => s.is_active !== false);

		console.log('[Role User Services API] Servicios actualizados después de guardar:', activeUpdatedServices.length);

		return NextResponse.json({ 
			success: true, 
			service: newService,
			services: activeUpdatedServices // Devolver todos los servicios actualizados
		}, { status: 201 });
	} catch (err: any) {
		console.error('[Role User Services API] Error en POST:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

