/**
 * API Route para gestionar servicios del consultorio
 * Los servicios se almacenan en medic_profile.services (JSONB)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

type Service = {
	id: string;
	name: string;
	description?: string | null;
	price: number;
	currency: string;
	is_active?: boolean;
};

/**
 * GET: Obtener servicios del médico autenticado desde medic_profile.services
 */
export async function GET(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { supabase } = createSupabaseServerClient();
		const { searchParams } = new URL(req.url);
		const activeOnly = searchParams.get('active') !== 'false';

		// Obtener perfil del médico
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('services')
			.eq('doctor_id', user.userId)
			.maybeSingle();

		if (profileError) {
			console.error('[Services API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error obteniendo perfil del médico' }, { status: 500 });
		}

		// Parsear servicios desde JSONB
		let services: Service[] = [];
		if (medicProfile?.services) {
			try {
				const parsed = typeof medicProfile.services === 'string' 
					? JSON.parse(medicProfile.services) 
					: medicProfile.services;
				
				services = Array.isArray(parsed) ? parsed : [];
			} catch (err) {
				console.error('[Services API] Error parseando servicios:', err);
				services = [];
			}
		}

		// Filtrar servicios activos si es necesario
		if (activeOnly) {
			services = services.filter((s) => s.is_active !== false);
		}

		// Ordenar por nombre
		services.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

		return NextResponse.json({ success: true, services });
	} catch (error: any) {
		console.error('[Services API] Error:', error);
		return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
	}
}

/**
 * POST: Agregar un nuevo servicio al array de servicios en medic_profile
 */
export async function POST(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const body = await req.json();
		const { name, description, price, currency = 'USD', is_active = true } = body;

		if (!name || price === undefined || price === null) {
			return NextResponse.json({ error: 'Nombre y precio son requeridos' }, { status: 400 });
		}

		const priceNum = parseFloat(String(price));
		if (isNaN(priceNum) || priceNum < 0) {
			return NextResponse.json({ error: 'El precio debe ser un número válido mayor o igual a 0' }, { status: 400 });
		}

		const { supabase } = createSupabaseServerClient();

		// Obtener servicios actuales
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('services')
			.eq('doctor_id', user.userId)
			.maybeSingle();

		if (profileError && profileError.code !== 'PGRST116') {
			console.error('[Services API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error obteniendo perfil del médico' }, { status: 500 });
		}

		// Parsear servicios existentes
		let existingServices: Service[] = [];
		if (medicProfile?.services) {
			try {
				const parsed = typeof medicProfile.services === 'string' 
					? JSON.parse(medicProfile.services) 
					: medicProfile.services;
				existingServices = Array.isArray(parsed) ? parsed : [];
			} catch {
				existingServices = [];
			}
		}

		// Crear nuevo servicio con ID único
		const newService: Service = {
			id: crypto.randomUUID(),
			name: name.trim(),
			description: description?.trim() || null,
			price: priceNum,
			currency: currency.toUpperCase(),
			is_active: is_active !== false,
		};

		// Agregar nuevo servicio al array
		const updatedServices = [...existingServices, newService];

		// Actualizar medic_profile
		if (medicProfile) {
			// Actualizar perfil existente
			const { error: updateError } = await supabase
				.from('medic_profile')
				.update({ services: updatedServices })
				.eq('doctor_id', user.userId);

			if (updateError) {
				console.error('[Services API] Error actualizando servicios:', updateError);
				return NextResponse.json({ error: 'Error actualizando servicios' }, { status: 500 });
			}
		} else {
			// Crear nuevo perfil si no existe
			const { error: insertError } = await supabase
				.from('medic_profile')
				.insert({
					doctor_id: user.userId,
					services: updatedServices,
					credentials: {},
					credit_history: {},
					availability: {},
					notifications: { email: true, whatsapp: false, push: false },
					payment_methods: [],
				});

			if (insertError) {
				console.error('[Services API] Error creando perfil:', insertError);
				return NextResponse.json({ error: 'Error creando perfil del médico' }, { status: 500 });
			}
		}

		return NextResponse.json({ success: true, service: newService });
	} catch (error: any) {
		console.error('[Services API] Error:', error);
		return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
	}
}

/**
 * PUT: Actualizar un servicio existente
 */
export async function PUT(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const body = await req.json();
		const { id, name, description, price, currency, is_active } = body;

		if (!id) {
			return NextResponse.json({ error: 'ID del servicio es requerido' }, { status: 400 });
		}

		const { supabase } = createSupabaseServerClient();

		// Obtener servicios actuales
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('services')
			.eq('doctor_id', user.userId)
			.maybeSingle();

		if (profileError || !medicProfile) {
			return NextResponse.json({ error: 'Perfil del médico no encontrado' }, { status: 404 });
		}

		// Parsear servicios existentes
		let services: Service[] = [];
		try {
			const parsed = typeof medicProfile.services === 'string' 
				? JSON.parse(medicProfile.services) 
				: medicProfile.services;
			services = Array.isArray(parsed) ? parsed : [];
		} catch {
			services = [];
		}

		// Buscar y actualizar el servicio
		const serviceIndex = services.findIndex((s) => s.id === id);
		if (serviceIndex === -1) {
			return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
		}

		// Actualizar campos del servicio
		if (name !== undefined) services[serviceIndex].name = name.trim();
		if (description !== undefined) services[serviceIndex].description = description?.trim() || null;
		if (price !== undefined) {
			const priceNum = parseFloat(String(price));
			if (isNaN(priceNum) || priceNum < 0) {
				return NextResponse.json({ error: 'El precio debe ser un número válido mayor o igual a 0' }, { status: 400 });
			}
			services[serviceIndex].price = priceNum;
		}
		if (currency !== undefined) services[serviceIndex].currency = currency.toUpperCase();
		if (is_active !== undefined) services[serviceIndex].is_active = is_active;

		// Actualizar en la base de datos
		const { error: updateError } = await supabase
			.from('medic_profile')
			.update({ services })
			.eq('doctor_id', user.userId);

		if (updateError) {
			console.error('[Services API] Error actualizando servicio:', updateError);
			return NextResponse.json({ error: 'Error actualizando servicio' }, { status: 500 });
		}

		return NextResponse.json({ success: true, service: services[serviceIndex] });
	} catch (error: any) {
		console.error('[Services API] Error:', error);
		return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
	}
}

/**
 * DELETE: Eliminar un servicio
 */
export async function DELETE(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user || !user.userId) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const serviceId = searchParams.get('id');

		if (!serviceId) {
			return NextResponse.json({ error: 'ID del servicio es requerido' }, { status: 400 });
		}

		const { supabase } = createSupabaseServerClient();

		// Obtener servicios actuales
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('services')
			.eq('doctor_id', user.userId)
			.maybeSingle();

		if (profileError || !medicProfile) {
			return NextResponse.json({ error: 'Perfil del médico no encontrado' }, { status: 404 });
		}

		// Parsear servicios existentes
		let services: Service[] = [];
		try {
			const parsed = typeof medicProfile.services === 'string' 
				? JSON.parse(medicProfile.services) 
				: medicProfile.services;
			services = Array.isArray(parsed) ? parsed : [];
		} catch {
			services = [];
		}

		// Filtrar el servicio a eliminar
		const filteredServices = services.filter((s) => s.id !== serviceId);

		if (filteredServices.length === services.length) {
			return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
		}

		// Actualizar en la base de datos
		const { error: updateError } = await supabase
			.from('medic_profile')
			.update({ services: filteredServices })
			.eq('doctor_id', user.userId);

		if (updateError) {
			console.error('[Services API] Error eliminando servicio:', updateError);
			return NextResponse.json({ error: 'Error eliminando servicio' }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Servicio eliminado correctamente' });
	} catch (error: any) {
		console.error('[Services API] Error:', error);
		return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
	}
}

