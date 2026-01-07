import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer, roleNameEquals } from '@/lib/role-user-auth';
import { randomUUID } from 'crypto';

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
		console.warn('[Role User Service Combos API] No se encontró médico para la organización', {
			organizationId,
			error: doctorError,
		});
		return { doctorId: null, supabase };
	}

	return { doctorId: doctor.id as string, supabase };
}

export async function GET(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const { doctorId, supabase } = await getDoctorProfileForOrg(session.organizationId);
		if (!doctorId) {
			return NextResponse.json({ success: true, combos: [] }, { status: 200 });
		}

		const { data: profile, error: profileError } = await supabase
			.from('medic_profile')
			.select('id, service_combos')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (profileError) {
			console.error('[Role User Service Combos API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener combos' }, { status: 500 });
		}

		const combos = parseJsonArray(profile?.service_combos || []);

		// Filtrar solo combos activos
		const activeCombos = combos.filter((c: RawCombo) => c.is_active !== false);

		return NextResponse.json({ success: true, combos: activeCombos || [] }, { status: 200 });
	} catch (err: any) {
		console.error('[Role User Service Combos API] Error en GET:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Solo Asistente De Citas crea/edita combos (Recepción solo ve)
		if (!roleNameEquals(session.roleName, 'Asistente De Citas')) {
			return NextResponse.json(
				{ error: 'Solo el rol "Asistente De Citas" puede crear combos de servicios' },
				{ status: 403 },
			);
		}

		const body = await req.json();
		const { name, description, price, currency, serviceIds } = body as {
			name?: string;
			description?: string | null;
			price?: number | string;
			currency?: string;
			serviceIds?: string[];
		};

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return NextResponse.json({ error: 'El nombre del combo es requerido' }, { status: 400 });
		}

		const numericPrice = typeof price === 'string' ? Number(price) : price;
		if (numericPrice === undefined || Number.isNaN(numericPrice) || numericPrice < 0) {
			return NextResponse.json({ error: 'El precio del combo es inválido' }, { status: 400 });
		}

		if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
			return NextResponse.json({ error: 'Debe seleccionar al menos un servicio para el combo' }, { status: 400 });
		}

		const allowedCurrencies = ['USD', 'VES', 'EUR'];
		const finalCurrency = (currency || 'USD').toUpperCase();
		if (!allowedCurrencies.includes(finalCurrency)) {
			return NextResponse.json(
				{ error: `Moneda inválida. Debe ser una de: ${allowedCurrencies.join(', ')}` },
				{ status: 400 },
			);
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

		if (profileError) {
			console.error('[Role User Service Combos API] Error obteniendo perfil para crear combo:', profileError);
			return NextResponse.json({ error: 'Error al obtener perfil del médico' }, { status: 500 });
		}

		const existingCombos = parseJsonArray(profile?.service_combos || []);

		const newCombo: RawCombo = {
			id: randomUUID(),
			name: name.trim(),
			description: description?.toString().trim() || null,
			price: Number(numericPrice),
			currency: finalCurrency,
			serviceIds,
			is_active: true,
		};

		const updatedCombos = [...existingCombos, newCombo];

		const { error: updateError } = await supabase
			.from('medic_profile')
			.update({ service_combos: updatedCombos })
			.eq('doctor_id', doctorId);

		if (updateError) {
			console.error('[Role User Service Combos API] Error guardando combo:', updateError);
			return NextResponse.json({ error: 'Error al guardar combo de servicios' }, { status: 500 });
		}

		return NextResponse.json({ success: true, combo: newCombo }, { status: 201 });
	} catch (err: any) {
		console.error('[Role User Service Combos API] Error en POST:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}



