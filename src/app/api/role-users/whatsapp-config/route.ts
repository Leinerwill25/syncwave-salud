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

		// Obtener el número de WhatsApp del asistente desde su propio registro
		const { data: roleUser, error: roleUserError } = await supabase
			.from('consultorio_role_users')
			.select('whatsapp_number')
			.eq('id', session.roleUserId)
			.maybeSingle();

		if (roleUserError) {
			console.error('[Role User WhatsApp Config API] Error obteniendo role user:', roleUserError);
		}

		// Obtener el primer médico de la organización para la plantilla y nombre del doctor
		const { data: doctor, error: doctorError } = await supabase
			.from('users')
			.select('id, name')
			.eq('organizationId', session.organizationId)
			.eq('role', 'MEDICO')
			.limit(1)
			.maybeSingle();

		// Obtener la plantilla de mensaje desde medic_profile (compartida para la organización)
		let whatsappMessageTemplate = null;
		if (doctor) {
			const { data: profile } = await supabase
				.from('medic_profile')
				.select('whatsapp_message_template')
				.eq('doctor_id', doctor.id)
				.maybeSingle();

			whatsappMessageTemplate = profile?.whatsapp_message_template || null;
		}

		const defaultTemplate =
			'Hola {NOMBRE_PACIENTE}, le recordamos su cita el {FECHA} a las {HORA} con el Dr/a {NOMBRE_DOCTORA} en {CLÍNICA}. Por los servicios de:\n\n{SERVICIOS}\n\npor favor confirmar con un "Asistiré" o "No Asistiré"';

		return NextResponse.json(
			{
				success: true,
				config: {
					whatsappNumber: roleUser?.whatsapp_number || null, // Número personal del asistente
					whatsappMessageTemplate: whatsappMessageTemplate || defaultTemplate,
					doctorName: (doctor as any)?.name || null,
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

		// Solo Asistente De Citas puede editar la configuración
		if (!roleNameEquals(session.roleName, 'Asistente De Citas')) {
			return NextResponse.json(
				{ error: 'Solo el rol "Asistente De Citas" puede editar la configuración de WhatsApp' },
				{ status: 403 },
			);
		}

		const body = await req.json().catch(() => ({}));
		const { whatsappNumber, whatsappMessageTemplate } = body || {};

		const supabase = await createSupabaseServerClient();

		// Actualizar el número de WhatsApp del asistente en su propio registro
		if (whatsappNumber !== undefined) {
			const value = String(whatsappNumber).trim();
			const { error: updateRoleUserError } = await supabase
				.from('consultorio_role_users')
				.update({ whatsapp_number: value.length > 0 ? value : null })
				.eq('id', session.roleUserId);

			if (updateRoleUserError) {
				console.error('[Role User WhatsApp Config API] Error actualizando role user:', updateRoleUserError);
				return NextResponse.json(
					{ error: 'Error al actualizar número de WhatsApp del asistente' },
					{ status: 500 },
				);
			}
		}

		// Actualizar la plantilla de mensaje en medic_profile (compartida para la organización)
		if (whatsappMessageTemplate !== undefined) {
			// Obtener el primer médico de la organización
			const { data: doctor, error: doctorError } = await supabase
				.from('users')
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

			const value = String(whatsappMessageTemplate);
			const templateValue = value.trim().length > 0 ? value : null;

			if (!existingProfile) {
				const { error: insertError } = await supabase.from('medic_profile').insert({
					doctor_id: doctor.id,
					whatsapp_message_template: templateValue,
				});

				if (insertError) {
					console.error('[Role User WhatsApp Config API] Error creando perfil:', insertError);
					return NextResponse.json(
						{ error: 'Error al crear configuración de plantilla de WhatsApp' },
						{ status: 500 },
					);
				}
			} else {
				const { error: updateError } = await supabase
					.from('medic_profile')
					.update({ whatsapp_message_template: templateValue })
					.eq('doctor_id', doctor.id);

				if (updateError) {
					console.error('[Role User WhatsApp Config API] Error actualizando perfil:', updateError);
					return NextResponse.json(
						{ error: 'Error al actualizar configuración de plantilla de WhatsApp' },
						{ status: 500 },
					);
				}
			}
		}

		return NextResponse.json({ success: true });
	} catch (err: any) {
		console.error('[Role User WhatsApp Config API] Error en PATCH:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

