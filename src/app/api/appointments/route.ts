// app/api/appointments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createNotification } from '@/lib/notifications';
import { createClient } from '@supabase/supabase-js';
import { getExchangeRateForCurrency } from '@/lib/currency-utils';

// 🔹 Configurar pool de conexión
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

// Cliente Supabase Admin para notificaciones
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function POST(req: NextRequest) {
	const client = await pool.connect();
	try {
		// 🔹 Leer cuerpo JSON
		const body = await req.json();

		let { patientId, unregisteredPatientId, doctorId, organizationId, scheduledAt, durationMinutes, reason, location, referralSource, createdByRoleUserId, createdByDoctorId, selectedService, billing } = body;

		// 🔹 PRIORIDAD: Si la cita fue creada por un role-user (asistente de citas)
		// NOTA: El asistente puede crear citas para pacientes registrados O no registrados
		// NO establecer created_by_doctor_id cuando viene de un role-user
		if (createdByRoleUserId) {
			// Asegurar que NO se establezca createdByDoctorId cuando viene de role-user
			createdByDoctorId = null;
			try {
				// Obtener el organizationId del role-user
				const roleUserQuery = await client.query(`SELECT organization_id FROM public.consultorio_role_users WHERE id = $1`, [createdByRoleUserId]);

				if (roleUserQuery.rows.length === 0) {
					return NextResponse.json({ success: false, error: 'Role-user no encontrado.' }, { status: 404 });
				}

				const roleUserOrgId = roleUserQuery.rows[0].organization_id;
				if (!roleUserOrgId) {
					return NextResponse.json({ success: false, error: 'El role-user no tiene una organización asignada.' }, { status: 400 });
				}

				// Usar el organizationId del role-user
				organizationId = roleUserOrgId;

				// Obtener el primer doctor (User con role='MEDICO') asociado a esa organización
				const doctorQuery = await client.query(`SELECT id FROM public."user" WHERE "organizationId" = $1 AND role = 'MEDICO' LIMIT 1`, [roleUserOrgId]);

				if (doctorQuery.rows.length === 0) {
					return NextResponse.json({ success: false, error: 'No se encontró un médico asociado a la organización del role-user.' }, { status: 404 });
				}

				// Usar el doctorId encontrado
				doctorId = doctorQuery.rows[0].id;

				console.log(`[Appointments API] Cita creada por role-user ${createdByRoleUserId} (puede ser para paciente registrado o no registrado), usando organizationId: ${organizationId}, doctorId: ${doctorId}`);
			} catch (roleUserError: any) {
				console.error('[Appointments API] Error obteniendo datos del role-user:', roleUserError);
				return NextResponse.json({ success: false, error: 'Error al obtener información del role-user.' }, { status: 500 });
			}
		} else {
			// 🔹 Si NO viene de role-user, verificar si viene de un doctor autenticado
			// NOTA: El doctor puede crear citas para pacientes registrados O no registrados
			// Solo establecer createdByDoctorId si NO hay createdByRoleUserId
			if (!createdByDoctorId) {
				try {
					const { createSupabaseServerClient } = await import('@/app/adapters/server');
					const { getAuthenticatedUser } = await import('@/lib/auth-guards');
					const user = await getAuthenticatedUser();
					if (user && user.role === 'MEDICO' && user.userId === doctorId) {
						createdByDoctorId = user.userId;
						console.log(`[Appointments API] Cita creada por doctor ${createdByDoctorId} (puede ser para paciente registrado o no registrado) desde dashboard`);
					}
				} catch (err) {
					// Si falla la autenticación, continuar sin createdByDoctorId
					console.warn('[Appointments API] No se pudo verificar autenticación del doctor:', err);
				}
			}
		}

		// 🔹 Extraer datos de facturación con valores por defecto
		const subtotal = typeof billing?.subtotal === 'number' ? billing.subtotal : parseFloat(billing?.subtotal) || 0;
		const impuestos = typeof billing?.impuestos === 'number' ? billing.impuestos : parseFloat(billing?.impuestos) || 0;
		const total = typeof billing?.total === 'number' ? billing.total : parseFloat(billing?.total) || 0;
		const currency = billing?.currency ?? 'USD';

		// Obtener la tasa de cambio de la moneda especificada desde la base de datos rates
		const tipoCambio = await getExchangeRateForCurrency(currency);

		// 🔹 Validaciones básicas
		const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

		if (!patientId && !unregisteredPatientId) {
			return NextResponse.json({ success: false, error: 'Debe proporcionar patientId o unregisteredPatientId.' }, { status: 400 });
		}

		if (!doctorId || !isUUID(doctorId)) {
			return NextResponse.json({ success: false, error: 'doctorId inválido. Debe ser un UUID válido.' }, { status: 400 });
		}

		if (!organizationId || !isUUID(organizationId)) {
			return NextResponse.json({ success: false, error: 'organizationId inválido. Debe ser un UUID válido.' }, { status: 400 });
		}

		if (!scheduledAt) {
			return NextResponse.json({ success: false, error: 'La fecha de la cita es obligatoria.' }, { status: 400 });
		}

		try {
			await client.query('BEGIN');

			let finalPatientId: string | null = patientId || null;
			let finalUnregisteredPatientId: string | null = unregisteredPatientId || null;

			// Validar que al menos uno de los dos IDs esté presente
			if (!finalPatientId && !finalUnregisteredPatientId) {
				throw new Error('Debe proporcionar patientId o unregisteredPatientId.');
			}

			// Si es un paciente no registrado, validar que existe
			if (finalUnregisteredPatientId) {
				if (!isUUID(finalUnregisteredPatientId)) {
					throw new Error('unregisteredPatientId inválido. Debe ser un UUID válido.');
				}

				// Verificar que el paciente no registrado existe
				const unregisteredCheck = await client.query(`SELECT id FROM public.unregisteredpatients WHERE id = $1`, [finalUnregisteredPatientId]);

				if (unregisteredCheck.rows.length === 0) {
					throw new Error('Paciente no registrado no encontrado.');
				}
			}

			// Si es un paciente registrado, validar que existe
			if (finalPatientId) {
				if (!isUUID(finalPatientId)) {
					throw new Error('patientId inválido. Debe ser un UUID válido.');
				}

				// Verificar que el paciente registrado existe
				const patientCheck = await client.query(`SELECT id FROM public."patient" WHERE id = $1`, [finalPatientId]);

				if (patientCheck.rows.length === 0) {
					throw new Error('Paciente registrado no encontrado.');
				}
			}

			// 🔹 Insertar cita con unregistered_patient_id (si aplica)
			// NOTA: La migración debe ejecutarse primero para agregar el campo unregistered_patient_id
			// Intentar insertar con created_by_doctor_id si existe el campo
			// Si el campo no existe en la BD, la query fallará y usaremos una versión sin ese campo
			let appointmentResult;
			try {
				appointmentResult = await client.query(
						`
          INSERT INTO public.appointment
            (patient_id, unregistered_patient_id, doctor_id, organization_id, scheduled_at, duration_minutes, reason, location, referral_source, created_by_role_user_id, created_by_doctor_id, selected_service)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id
        `,
						[
							finalPatientId, // Puede ser NULL si es paciente no registrado
							finalUnregisteredPatientId, // Puede ser NULL si es paciente registrado
							doctorId,
							organizationId,
							scheduledAt,
							durationMinutes ?? 30,
							reason || null,
							location || null,
							referralSource || null,
							createdByRoleUserId || null,
							createdByDoctorId || null,
							selectedService || null,
						]
					);
				} catch (insertError: any) {
					// Si el campo created_by_doctor_id no existe, intentar sin ese campo
					if (insertError.message?.includes('created_by_doctor_id') || insertError.code === '42703') {
						console.warn('[Appointments API] Campo created_by_doctor_id no existe, insertando sin ese campo');
						appointmentResult = await client.query(
							`
          INSERT INTO public.appointment
            (patient_id, unregistered_patient_id, doctor_id, organization_id, scheduled_at, duration_minutes, reason, location, referral_source, created_by_role_user_id, selected_service)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `,
							[
								finalPatientId,
								finalUnregisteredPatientId,
								doctorId,
								organizationId,
								scheduledAt,
								durationMinutes ?? 30,
								reason || null,
								location || null,
								referralSource || null,
								createdByRoleUserId || null,
								selectedService || null,
							]
						);
					} else {
						throw insertError;
					}
				}

			const appointmentId = appointmentResult.rows[0]?.id;

			if (!appointmentId) {
				throw new Error('No se generó ID para la cita.');
			}

			// 🔹 Insertar facturación asociada como PENDIENTE DE PAGO
			// La facturación se crea automáticamente cuando se crea la cita con servicios seleccionados
			// Incluir unregistered_patient_id si aplica y tipo_cambio
			await client.query(
				`
        INSERT INTO public.facturacion
          (appointment_id, patient_id, unregistered_patient_id, doctor_id, organization_id, subtotal, impuestos, total, currency, tipo_cambio, estado_pago, estado_factura, fecha_emision)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
				[appointmentId, finalPatientId, finalUnregisteredPatientId, doctorId, organizationId, subtotal, impuestos, total, currency, tipoCambio, 'pendiente', 'emitida', new Date().toISOString()]
			);

			await client.query('COMMIT');

			// 🔹 Crear notificación al paciente si es paciente registrado
			if (finalPatientId) {
				try {
					// Obtener información del paciente y su user_id
					const { data: patientData } = await supabaseAdmin.from('patient').select('firstName, lastName').eq('id', finalPatientId).maybeSingle();

					// Obtener el user_id del paciente
					const { data: userData } = await supabaseAdmin.from('user').select('id').eq('patientProfileId', finalPatientId).maybeSingle();

					const patientName = patientData ? `${patientData.firstName} ${patientData.lastName}` : 'Paciente';
					const patientUserId = userData?.id || null;

					if (patientUserId) {
						const appointmentDate = new Date(scheduledAt);
						const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
							weekday: 'long',
							year: 'numeric',
							month: 'long',
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit',
						});

						await createNotification({
							userId: patientUserId,
							organizationId: organizationId || null,
							type: 'APPOINTMENT_CREATED',
							title: 'Nueva Cita Programada',
							message: `Se ha programado una cita para el ${formattedDate}. El pago estará disponible una vez que el médico confirme la cita.`,
							payload: {
								appointmentId: appointmentId,
								appointment_id: appointmentId,
								scheduledAt: formattedDate,
								scheduled_at: scheduledAt,
								reason: reason || null,
								location: location || null,
								total: total,
								currency: currency,
								appointmentUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'}/dashboard/patient/pagos`,
							},
							sendEmail: true,
						});
					}
				} catch (notifError) {
					console.error('[Appointments API] Error creando notificación al paciente:', notifError);
					// No fallar la creación de la cita si la notificación falla
				}
			}

			return NextResponse.json({
				success: true,
				appointmentId,
				isUnregisteredPatient: !!finalUnregisteredPatientId,
				unregisteredPatientId: finalUnregisteredPatientId,
				patientId: finalPatientId,
			});
		} catch (error: any) {
			await client.query('ROLLBACK');
			console.error('[DB ERROR]', error);
			return NextResponse.json({ success: false, error: error.message || 'Error al crear la cita y facturación.' }, { status: 500 });
		}
	} catch (error: any) {
		console.error('[API ERROR]', error);
		return NextResponse.json({ success: false, error: error.message || 'Error en la solicitud al crear la cita.' }, { status: 400 });
	} finally {
		// Solo liberar el cliente una vez, al final
		if (client) {
			client.release();
		}
	}
}
