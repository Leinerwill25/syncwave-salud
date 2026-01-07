import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer, roleNameEquals } from '@/lib/role-user-auth';

type RawCombo = {
	id?: string;
	name: string;
	description?: string | null;
	price: number;
	currency: string;
	serviceIds: string[];
	is_active?: boolean;
};

function parseJsonArray(field: unknown): any[] {
	if (!field) return [];
	try {
		if (typeof field === 'string') {
			const parsed = JSON.parse(field);
			return Array.isArray(parsed) ? parsed : [];
		}
		if (Array.isArray(field)) return field;
		return [];
	} catch {
		return [];
	}
}

async function getDoctorProfileForOrg(organizationId: string) {
	const supabase = await createSupabaseServerClient();

	const { data: doctor, error: doctorError } = await supabase
		.from('user')
		.select('id')
		.eq('organizationId', organizationId)
		.eq('role', 'MEDICO')
		.limit(1)
		.maybeSingle();

	if (doctorError || !doctor) {
		console.warn('[Role User Service Combos API - [id]] No se encontró médico para la organización', {
			organizationId,
			error: doctorError,
		});
		return { doctorId: null, supabase };
	}

	return { doctorId: doctor.id as string, supabase };
}

// PUT: Actualizar un combo específico
export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Solo Asistente De Citas puede editar combos
		if (!roleNameEquals(session.roleName, 'Asistente De Citas')) {
			return NextResponse.json(
				{ error: 'Solo el rol "Asistente De Citas" puede modificar combos de servicios' },
				{ status: 403 },
			);
		}

		const { id } = await params;
		const comboId = id;
		if (!comboId) {
			return NextResponse.json({ error: 'ID de combo requerido' }, { status: 400 });
		}

		const body = await req.json();
		const { name, description, price, currency, serviceIds } = body as Partial<RawCombo>;

		const { doctorId, supabase } = await getDoctorProfileForOrg(session.organizationId);

		if (!doctorId) {
			return NextResponse.json(
				{ error: 'No se encontró un médico asociado a esta organización' },
				{ status: 400 },
			);
		}

		const { data: profile, error: profileError } = await supabase
			.from('medic_profile')
			.select('id, service_combos')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError || !profile) {
			console.error('[Role User Service Combos API - [id]] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener combos' }, { status: 500 });
		}

		const combos = parseJsonArray(profile.service_combos);

		// Buscar el combo por id (comparación flexible)
		let found = false;
		const comboIdStr = String(comboId).trim();
		const updatedCombos = combos.map((c: RawCombo) => {
			const comboIdFromArray = c.id ? String(c.id).trim() : null;
			
			if (comboIdFromArray === comboIdStr) {
				found = true;
				const updated: RawCombo = { ...c };

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

				if (Array.isArray(serviceIds)) {
					updated.serviceIds = serviceIds;
				}

				if (body.is_active !== undefined) {
					updated.is_active = Boolean(body.is_active);
				}

				return updated;
			}
			return c;
		});

		if (!found) {
			console.error('[Role User Service Combos API - [id]] Combo no encontrado en PUT:', {
				comboId,
				comboIdStr,
				availableIds: combos.map((c: RawCombo) => c.id).filter(Boolean),
				combosCount: combos.length,
			});
			return NextResponse.json({ error: 'Combo no encontrado' }, { status: 404 });
		}

		const { error: updateError } = await supabase
			.from('medic_profile')
			.update({ service_combos: updatedCombos })
			.eq('doctor_id', doctorId);

		if (updateError) {
			console.error('[Role User Service Combos API - [id]] Error actualizando combo:', updateError);
			return NextResponse.json({ error: 'Error al actualizar el combo' }, { status: 500 });
		}

		const updatedCombo = updatedCombos.find((c: RawCombo) => {
			const comboIdFromArray = c.id ? String(c.id).trim() : null;
			return comboIdFromArray === comboIdStr;
		});

		return NextResponse.json({ success: true, combo: updatedCombo }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Service Combos API - [id]] Error en PUT:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

// DELETE: Desactivar (is_active = false) un combo específico
export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Solo Asistente De Citas puede desactivar combos
		if (!roleNameEquals(session.roleName, 'Asistente De Citas')) {
			return NextResponse.json(
				{ error: 'Solo el rol "Asistente De Citas" puede modificar combos de servicios' },
				{ status: 403 },
			);
		}

		const { id } = await params;
		const comboId = id;
		if (!comboId) {
			return NextResponse.json({ error: 'ID de combo requerido' }, { status: 400 });
		}

		const { doctorId, supabase } = await getDoctorProfileForOrg(session.organizationId);

		if (!doctorId) {
			return NextResponse.json(
				{ error: 'No se encontró un médico asociado a esta organización' },
				{ status: 400 },
			);
		}

		const { data: profile, error: profileError } = await supabase
			.from('medic_profile')
			.select('id, service_combos')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError || !profile) {
			console.error('[Role User Service Combos API - [id]] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener combos' }, { status: 500 });
		}

		const combos = parseJsonArray(profile.service_combos);

		// Buscar el combo por id (comparación flexible)
		let found = false;
		const comboIdStr = String(comboId).trim();
		const updatedCombos = combos.map((c: RawCombo) => {
			const comboIdFromArray = c.id ? String(c.id).trim() : null;
			
			if (comboIdFromArray === comboIdStr) {
				found = true;
				return { ...c, is_active: false };
			}
			return c;
		});

		if (!found) {
			console.error('[Role User Service Combos API - [id]] Combo no encontrado en DELETE:', {
				comboId,
				comboIdStr,
				availableIds: combos.map((c: RawCombo) => c.id).filter(Boolean),
				combosCount: combos.length,
			});
			return NextResponse.json({ error: 'Combo no encontrado' }, { status: 404 });
		}

		const { error: updateError } = await supabase
			.from('medic_profile')
			.update({ service_combos: updatedCombos })
			.eq('doctor_id', doctorId);

		if (updateError) {
			console.error('[Role User Service Combos API - [id]] Error desactivando combo:', updateError);
			return NextResponse.json({ error: 'Error al eliminar el combo' }, { status: 500 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Service Combos API - [id]] Error en DELETE:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

