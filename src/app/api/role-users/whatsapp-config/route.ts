import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer, roleNameEquals } from '@/lib/role-user-auth';

export async function GET(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();

		// Obtener el primer médico de la organización
		const { data: doctor, error: doctorError } = await supabase
			.from('User')
			.select('id, name')
			.eq('organizationId', session.organizationId)
			.eq('role', 'MEDICO')
			.limit(1)
			.maybeSingle();

		if (doctorError || !doctor) {
			return NextResponse.json(
				{
					success: true,
					config: null,
				},
				{ status: 200 },
			);
		}

		const { data: profile, error: profileError } = await supabase
			.from('medic_profile')
			.select('whatsapp_number, whatsapp_message_template')
			.eq('doctor_id', doctor.id)
			.maybeSingle();

		if (profileError) {
			console.error('[Role User WhatsApp Config API] Error obteniendo perfil:', profileError);
			return NextResponse.json({ error: 'Error al obtener configuración de WhatsApp' }, { status: 500 });
		}

		const defaultTemplate =
			'Hola {NOMBRE_PACIENTE}, le recordamos su cita el {FECHA} a las {HORA} con el Dr/a {NOMBRE_DOCTORA} en {CLÍNICA}. Por los servicios de:\n\n{SERVICIOS}\n\npor favor confirmar con un "Asistiré" o "No Asistiré"';

		return NextResponse.json(
			{
				success: true,
				config: {
					whatsappNumber: profile?.whatsapp_number || null,
					whatsappMessageTemplate: profile?.whatsapp_message_template || defaultTemplate,
					doctorName: (doctor as any).name || null,
				},
			},
			{ status: 200 },
		);
	} catch (err: any) {
		console.error('[Role User WhatsApp Config API] Error en GET:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

export async function PATCH(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		// Solo Asistente De Citas puede editar la plantilla
		if (!roleNameEquals(session.roleName, 'Asistente De Citas')) {
			return NextResponse.json(
				{ error: 'Solo el rol "Asistente De Citas" puede editar la plantilla de WhatsApp' },
				{ status: 403 },
			);
		}

		const body = await req.json().catch(() => ({}));
		const { whatsappNumber, whatsappMessageTemplate } = body || {};

		const supabase = await createSupabaseServerClient();

		// Obtener el primer médico de la organización
		const { data: doctor, error: doctorError } = await supabase
			.from('User')
			.select('id')
			.eq('organizationId', session.organizationId)
			.eq('role', 'MEDICO')
			.limit(1)
			.maybeSingle();

		if (doctorError || !doctor) {
			return NextResponse.json(
				{ error: 'No se encontró un médico asociado a esta organización' },
				{ status: 400 },
			);
		}

		// Verificar si ya existe medic_profile
		const { data: existingProfile } = await supabase
			.from('medic_profile')
			.select('id')
			.eq('doctor_id', doctor.id)
			.maybeSingle();

		const payload: Record<string, unknown> = {};

		if (whatsappNumber !== undefined) {
			const value = String(whatsappNumber).trim();
			payload.whatsapp_number = value.length > 0 ? value : null;
		}

		if (whatsappMessageTemplate !== undefined) {
			const value = String(whatsappMessageTemplate);
			payload.whatsapp_message_template = value.trim().length > 0 ? value : null;
		}

		if (!existingProfile) {
			const { error: insertError } = await supabase.from('medic_profile').insert({
				doctor_id: doctor.id,
				...payload,
			});

			if (insertError) {
				console.error('[Role User WhatsApp Config API] Error creando perfil:', insertError);
				return NextResponse.json(
					{ error: 'Error al crear configuración de WhatsApp' },
					{ status: 500 },
				);
			}
		} else {
			const { error: updateError } = await supabase
				.from('medic_profile')
				.update(payload)
				.eq('doctor_id', doctor.id);

			if (updateError) {
				console.error('[Role User WhatsApp Config API] Error actualizando perfil:', updateError);
				return NextResponse.json(
					{ error: 'Error al actualizar configuración de WhatsApp' },
					{ status: 500 },
				);
			}
		}

		return NextResponse.json({ success: true });
	} catch (err: any) {
		console.error('[Role User WhatsApp Config API] Error en PATCH:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

