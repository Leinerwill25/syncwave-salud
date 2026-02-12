import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer, roleNameEquals } from '@/lib/role-user-auth';
import { createClient } from '@supabase/supabase-js';
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

async function getSupabaseClientWithServiceRole() {
	const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
	const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

	if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
		console.error('[Role User Services API] Variables de entorno de Supabase no configuradas');
		return null;
	}

	// Crear cliente con service role para evitar RLS
	return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false },
	});
}

async function getDoctorIdForOrganization(organizationId: string) {
	const supabase = await getSupabaseClientWithServiceRole();
	
	if (!supabase) {
		return { doctorId: null, supabase: null };
	}

	const { data: doctors, error: doctorsError } = await supabase
		.from('users')
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
		let parsed: any;
		
		if (typeof servicesField === 'string') {
			parsed = JSON.parse(servicesField);
		} else if (Array.isArray(servicesField)) {
			parsed = servicesField;
		} else {
			// Si es un objeto, intentar parsearlo
			parsed = servicesField;
		}

		if (!Array.isArray(parsed)) {
			console.warn('[Role User Services API] parseServicesField: El campo no es un array:', typeof parsed, parsed);
			return [];
		}

		// Asegurar que todos los servicios tengan la estructura correcta
		return parsed.map((s: any) => {
			const service: any = {
				id: s.id || undefined,
				name: s.name || '',
				description: s.description || null,
				price: typeof s.price === 'string' ? Number(s.price) : s.price || 0,
				currency: s.currency || 'USD',
				is_active: s.is_active !== undefined ? s.is_active : true,
			};
			
			// Solo incluir createdBy si tiene un valor válido (no undefined ni "undefined" string)
			if (s.createdBy && s.createdBy !== 'undefined' && s.createdBy !== undefined) {
				service.createdBy = s.createdBy;
			}
			
			return service;
		});
	} catch (err) {
		console.error('[Role User Services API] Error parseando servicios:', err);
		console.error('[Role User Services API] servicesField que causó el error:', servicesField);
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

		if (!doctorId || !supabase) {
			console.error('[Role User Services API] No se pudo obtener doctorId o cliente Supabase');
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

		if (!doctorId || !supabase) {
			console.error('[Role User Services API] No se pudo obtener doctorId o cliente Supabase para crear servicio');
			return NextResponse.json(
				{ error: 'No se encontró un médico asociado a esta organización o error de configuración' },
				{ status: 500 },
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
			createdBy: String(session.roleUserId), // Asegurar que sea string
		};

		// Debug: Log del servicio que se va a crear
		console.log('[Role User Services API] Creando servicio:', JSON.stringify(newService, null, 2));
		console.log('[Role User Services API] session.roleUserId:', session.roleUserId);
		console.log('[Role User Services API] session.roleUserId type:', typeof session.roleUserId);
		console.log('[Role User Services API] newService.createdBy:', newService.createdBy);
		console.log('[Role User Services API] newService.createdBy type:', typeof newService.createdBy);
		console.log('[Role User Services API] Servicios actuales antes de agregar:', currentServices.length);

		const updatedServices = [...currentServices, newService];

		// Debug: Log de servicios actualizados
		console.log('[Role User Services API] Servicios actualizados después de agregar:', updatedServices.length);
		console.log('[Role User Services API] Último servicio en array:', JSON.stringify(updatedServices[updatedServices.length - 1], null, 2));

		if (existingProfile) {
			// Asegurar que todos los servicios tengan la estructura correcta antes de guardar
			// Filtrar valores undefined y "undefined" (string) para createdBy
			const servicesToSave = updatedServices.map((s: RawService) => {
				const service: any = {
					id: s.id || undefined,
					name: s.name || '',
					description: s.description || null,
					price: typeof s.price === 'string' ? Number(s.price) : s.price || 0,
					currency: s.currency || 'USD',
					is_active: s.is_active !== undefined ? s.is_active : true,
				};
				
				// Solo incluir createdBy si tiene un valor válido (no undefined ni "undefined")
				if (s.createdBy && s.createdBy !== 'undefined' && s.createdBy !== undefined) {
					service.createdBy = s.createdBy;
				}
				
				return service;
			});

			const servicesJson = JSON.stringify(servicesToSave);
			console.log('[Role User Services API] JSON a guardar (con createdBy):', servicesJson);
			console.log('[Role User Services API] Verificando createdBy en cada servicio:');
			servicesToSave.forEach((s: RawService, idx: number) => {
				console.log(`[Role User Services API] Servicio ${idx}: name="${s.name}", createdBy="${s.createdBy}"`);
			});
			
			// Actualizar el perfil - usar el array directamente, Supabase lo serializa a JSONB
			// IMPORTANTE: Usar SERVICE_ROLE_KEY bypass RLS, así que el update debería funcionar
			const { error: updateError, data: updateData } = await supabase
				.from('medic_profile')
				.update({ 
					services: servicesToSave, // Supabase serializa automáticamente arrays/objetos a JSONB
					updated_at: new Date().toISOString()
				})
				.eq('doctor_id', doctorId)
				.select('services'); // Intentar obtener los datos actualizados

			if (updateError) {
				console.error('[Role User Services API] Error actualizando servicios:', updateError);
				console.error('[Role User Services API] Detalles del error:', JSON.stringify(updateError, null, 2));
				return NextResponse.json({ error: 'Error al guardar el servicio' }, { status: 500 });
			}

			console.log('[Role User Services API] Update exitoso');
			console.log('[Role User Services API] updateData recibido:', updateData);
			
			// Si updateData tiene información, usarla directamente
			if (updateData && updateData.length > 0 && updateData[0]?.services) {
				const savedServices = updateData[0].services;
				console.log('[Role User Services API] Servicios desde updateData:', JSON.stringify(savedServices, null, 2));
				
				const savedServicesArray = parseServicesField(savedServices);
				const newServiceInDb = savedServicesArray.find((s: RawService) => s.id === newService.id);
				console.log('[Role User Services API] Nuevo servicio encontrado en updateData:', newServiceInDb ? 'SÍ' : 'NO');
				
				if (newServiceInDb) {
					console.log('[Role User Services API] Servicio completo desde updateData:', JSON.stringify(newServiceInDb, null, 2));
				}
			}
			
			console.log('[Role User Services API] Verificando datos guardados con select separado...');

			// Hacer un select separado para verificar que se guardó correctamente
			// Esto evita problemas con el .select() después del update
			const { data: verifyData, error: verifyError } = await supabase
				.from('medic_profile')
				.select('services')
				.eq('doctor_id', doctorId)
				.single();

			if (verifyError) {
				console.error('[Role User Services API] Error verificando servicios guardados:', verifyError);
				// No fallar aquí, el update ya se hizo
			} else {
				const savedServices = verifyData?.services;
				console.log('[Role User Services API] Servicios guardados en BD (raw):', savedServices);
				console.log('[Role User Services API] Servicios guardados en BD (stringified):', JSON.stringify(savedServices, null, 2));
				console.log('[Role User Services API] Tipo de savedServices:', typeof savedServices);
				
				// Verificar que el nuevo servicio está en los datos guardados
				const savedServicesArray = parseServicesField(savedServices);
				console.log('[Role User Services API] Servicios parseados:', savedServicesArray.length);
				const newServiceInDb = savedServicesArray.find((s: RawService) => s.id === newService.id);
				console.log('[Role User Services API] Nuevo servicio encontrado en BD después de guardar:', newServiceInDb ? 'SÍ' : 'NO');
				if (newServiceInDb) {
					console.log('[Role User Services API] Servicio completo encontrado:', JSON.stringify(newServiceInDb, null, 2));
					console.log('[Role User Services API] createdBy del servicio guardado:', newServiceInDb.createdBy);
					console.log('[Role User Services API] createdBy type:', typeof newServiceInDb.createdBy);
					console.log('[Role User Services API] createdBy esperado:', session.roleUserId);
					console.log('[Role User Services API] Coinciden:', String(newServiceInDb.createdBy) === String(session.roleUserId));
				} else {
					console.error('[Role User Services API] ERROR: El nuevo servicio NO se encontró en la BD después de guardar');
					console.error('[Role User Services API] ID buscado:', newService.id);
					console.error('[Role User Services API] IDs en BD:', savedServicesArray.map((s: RawService) => s.id));
				}
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

		// Filtrar servicios para devolver solo los del usuario actual
		const userUpdatedServices = updatedServices.filter((s: RawService) => {
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

