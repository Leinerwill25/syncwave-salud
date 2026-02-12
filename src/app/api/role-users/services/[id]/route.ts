import { NextRequest, NextResponse } from 'next/server';
import { getRoleUserSessionFromServer, roleNameEquals } from '@/lib/role-user-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';

type RawService = {
	id?: string;
	name: string;
	description?: string | null;
	price: number;
	currency: string;
	is_active?: boolean;
	createdBy?: string; // ID del role-user que creó el servicio
};

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
		console.error('[Role User Services API - [id]] Error parseando servicios:', err);
		return [];
	}
}

async function getDoctorIdForOrganization(organizationId: string) {
	const supabase = await createSupabaseServerClient();

	const { data: doctors, error: doctorsError } = await supabase
		.from('users')
		.select('id')
		.eq('organizationId', organizationId)
		.eq('role', 'MEDICO')
		.limit(1);

	if (doctorsError || !doctors || doctors.length === 0) {
		console.warn('[Role User Services API - [id]] No se encontraron médicos en la organización', {
			organizationId,
			error: doctorsError,
		});
		return { doctorId: null, supabase };
	}

	return { doctorId: doctors[0].id as string, supabase };
}

// PUT: Actualizar un servicio específico (por id) en medic_profile.services
export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Solo el rol "Asistente De Citas" puede editar servicios
		if (!roleNameEquals(session.roleName, 'Asistente De Citas')) {
			return NextResponse.json(
				{ error: 'Solo el rol "Asistente De Citas" puede modificar servicios' },
				{ status: 403 },
			);
		}

		const { id } = await params;
		const serviceId = id;
		if (!serviceId) {
			return NextResponse.json({ error: 'ID de servicio requerido' }, { status: 400 });
		}

		const body = await req.json();
		const { name, description, price, currency, is_active } = body as Partial<RawService>;

		const { doctorId, supabase } = await getDoctorIdForOrganization(session.organizationId);

		if (!doctorId) {
			return NextResponse.json(
				{ error: 'No se encontró un médico asociado a esta organización' },
				{ status: 400 },
			);
		}

		const { data: profile, error: profileError } = await supabase
			.from('medic_profile')
			.select('id, services')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError || !profile) {
			console.error('[Role User Services API - [id]] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 });
		}

		const services = parseServicesField(profile.services);

		// Buscar el servicio por id (comparación flexible para manejar diferentes formatos)
		let found = false;
		let serviceBelongsToUser = false;
		const serviceIdStr = String(serviceId).trim();
		const updatedServices = services.map((s) => {
			// Comparar id de manera flexible (string, con/sin espacios, etc.)
			const serviceIdFromArray = s.id ? String(s.id).trim() : null;
			
			if (serviceIdFromArray === serviceIdStr) {
				found = true;
				// Validar que el servicio pertenezca al usuario actual
				if (s.createdBy !== session.roleUserId) {
					return s; // No modificar servicios de otros usuarios
				}
				serviceBelongsToUser = true;
				const updated: RawService = { ...s };

				if (typeof name === 'string') {
					updated.name = name.trim();
				}

				if (description !== undefined) {
					updated.description = description === null ? null : String(description).trim();
				}

				if (price !== undefined) {
					const numericPrice = typeof price === 'string' ? Number(price) : price;
					if (!Number.isNaN(numericPrice) && numericPrice >= 0) {
						updated.price = Number(numericPrice);
					}
				}

				if (currency !== undefined) {
					const allowedCurrencies = ['USD', 'VES', 'EUR'];
					const finalCurrency = String(currency).toUpperCase();
					if (allowedCurrencies.includes(finalCurrency)) {
						updated.currency = finalCurrency;
					}
				}

				if (is_active !== undefined) {
					updated.is_active = Boolean(is_active);
				}

				return updated;
			}
			return s;
		});

		if (!found) {
			// Log para debugging
			console.error('[Role User Services API - [id]] Servicio no encontrado en PUT:', {
				serviceId,
				serviceIdStr,
				availableIds: services.map(s => s.id).filter(Boolean),
				servicesCount: services.length,
			});
			return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
		}

		if (!serviceBelongsToUser) {
			return NextResponse.json(
				{ error: 'No tienes permiso para editar este servicio. Solo puedes editar los servicios que creaste.' },
				{ status: 403 },
			);
		}

		const { error: updateError } = await supabase
			.from('medic_profile')
			.update({ services: updatedServices })
			.eq('doctor_id', doctorId);

		if (updateError) {
			console.error('[Role User Services API - [id]] Error actualizando servicio:', updateError);
			return NextResponse.json({ error: 'Error al actualizar el servicio' }, { status: 500 });
		}

		const updatedService = updatedServices.find((s) => s.id === serviceId);

		return NextResponse.json({ success: true, service: updatedService }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Services API - [id]] Error en PUT:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

// DELETE: Desactivar (is_active = false) un servicio específico
export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Solo el rol "Asistente De Citas" puede desactivar servicios
		if (!roleNameEquals(session.roleName, 'Asistente De Citas')) {
			return NextResponse.json(
				{ error: 'Solo el rol "Asistente De Citas" puede modificar servicios' },
				{ status: 403 },
			);
		}

		const { id } = await params;
		const serviceId = id;
		if (!serviceId) {
			return NextResponse.json({ error: 'ID de servicio requerido' }, { status: 400 });
		}

		const { doctorId, supabase } = await getDoctorIdForOrganization(session.organizationId);

		if (!doctorId) {
			return NextResponse.json(
				{ error: 'No se encontró un médico asociado a esta organización' },
				{ status: 400 },
			);
		}

		const { data: profile, error: profileError } = await supabase
			.from('medic_profile')
			.select('id, services')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError || !profile) {
			console.error('[Role User Services API - [id]] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 });
		}

		const services = parseServicesField(profile.services);

		// Buscar el servicio por id (comparación flexible para manejar diferentes formatos)
		let found = false;
		let serviceBelongsToUser = false;
		const serviceIdStr = String(serviceId).trim();
		const updatedServices = services.map((s) => {
			// Comparar id de manera flexible (string, con/sin espacios, etc.)
			const serviceIdFromArray = s.id ? String(s.id).trim() : null;
			
			if (serviceIdFromArray === serviceIdStr) {
				found = true;
				// Validar que el servicio pertenezca al usuario actual
				if (s.createdBy !== session.roleUserId) {
					return s; // No modificar servicios de otros usuarios
				}
				serviceBelongsToUser = true;
				return { ...s, is_active: false };
			}
			return s;
		});

		if (!found) {
			// Log para debugging
			console.error('[Role User Services API - [id]] Servicio no encontrado:', {
				serviceId,
				serviceIdStr: String(serviceId).trim(),
				availableIds: services.map(s => s.id).filter(Boolean),
				servicesCount: services.length,
			});
			return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
		}

		if (!serviceBelongsToUser) {
			return NextResponse.json(
				{ error: 'No tienes permiso para eliminar este servicio. Solo puedes eliminar los servicios que creaste.' },
				{ status: 403 },
			);
		}

		const { error: updateError } = await supabase
			.from('medic_profile')
			.update({ services: updatedServices })
			.eq('doctor_id', doctorId);

		if (updateError) {
			console.error('[Role User Services API - [id]] Error desactivando servicio:', updateError);
			return NextResponse.json({ error: 'Error al eliminar el servicio' }, { status: 500 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Services API - [id]] Error en DELETE:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}


