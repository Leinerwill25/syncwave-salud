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

async function getOrganizationAndDoctorForRoleUser(client: any, roleUserId: string) {
  const { rows } = await client.query(`SELECT organization_id FROM public.consultorio_role_users WHERE id = $1`, [roleUserId]);
  if (rows.length === 0) throw new Error('Role-user no encontrado.');
  
  const orgId = rows[0].organization_id;
  if (!orgId) throw new Error('El role-user no tiene una organización asignada.');

  const doctorQuery = await client.query(`SELECT id FROM public.users WHERE "organizationId" = $1 AND role = 'MEDICO' LIMIT 1`, [orgId]);
  if (doctorQuery.rows.length === 0) throw new Error('No se encontró un médico asociado a la organización del role-user.');
  
  return { orgId, doctorId: doctorQuery.rows[0].id };
}

async function getAuthenticatedDoctorId(expectedDoctorId: string) {
  try {
    const { getAuthenticatedUser } = await import('@/lib/auth-guards');
    const user = await getAuthenticatedUser();
    if (user && user.role === 'MEDICO' && user.userId === expectedDoctorId) {
      return user.userId;
    }
  } catch (err) {
    console.warn('[Appointments API] No se pudo verificar autenticación del doctor:', err);
  }
  return null;
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    let { 
      patientId, unregisteredPatientId, doctorId, organizationId, scheduledAt, 
      durationMinutes, reason, location, referralSource, createdByRoleUserId, 
      createdByDoctorId, selectedService, billing, notes 
    } = body;

    // Authorization & ID Resolution
    if (createdByRoleUserId) {
      const resolved = await getOrganizationAndDoctorForRoleUser(client, createdByRoleUserId);
      organizationId = resolved.orgId;
      doctorId = resolved.doctorId;
      createdByDoctorId = null;
    } else if (!createdByDoctorId) {
      createdByDoctorId = await getAuthenticatedDoctorId(doctorId);
    }

    // Billing data extraction
    const subtotal = typeof billing?.subtotal === 'number' ? billing.subtotal : parseFloat(billing?.subtotal) || 0;
    const impuestos = typeof billing?.impuestos === 'number' ? billing.impuestos : parseFloat(billing?.impuestos) || 0;
    const total = typeof billing?.total === 'number' ? billing.total : parseFloat(billing?.total) || 0;
    const currency = billing?.currency ?? 'USD';
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

async function validatePatientEntity(client: any, patientId: string | null, unregisteredPatientId: string | null) {
  if (!patientId && !unregisteredPatientId) throw new Error('Debe proporcionar patientId o unregisteredPatientId.');

  if (unregisteredPatientId) {
    const { rows } = await client.query(`SELECT id FROM public.unregisteredpatients WHERE id = $1`, [unregisteredPatientId]);
    if (rows.length === 0) throw new Error('Paciente no registrado no encontrado.');
    return { finalPatientId: null, finalUnregisteredPatientId: unregisteredPatientId };
  }

  if (patientId) {
    const { rows } = await client.query(`SELECT id FROM public."patient" WHERE id = $1`, [patientId]);
    if (rows.length === 0) throw new Error('Paciente registrado no encontrado.');
    return { finalPatientId: patientId, finalUnregisteredPatientId: null };
  }
  
  return { finalPatientId: null, finalUnregisteredPatientId: null };
}

// ... inside POST ...
    try {
      await client.query('BEGIN');

      const { finalPatientId, finalUnregisteredPatientId } = await validatePatientEntity(client, patientId, unregisteredPatientId);


async function insertAppointment(client: any, data: any) {
  const { 
    finalPatientId, finalUnregisteredPatientId, doctorId, organizationId, 
    scheduledAt, durationMinutes, reason, location, referralSource, 
    createdByRoleUserId, createdByDoctorId, selectedService, notes 
  } = data;

  await client.query('SAVEPOINT attempt_insert_with_doctor');

  try {
    const result = await client.query(
      `INSERT INTO public.appointment 
        (patient_id, unregistered_patient_id, doctor_id, organization_id, scheduled_at, duration_minutes, reason, location, referral_source, created_by_role_user_id, created_by_doctor_id, selected_service, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [finalPatientId, finalUnregisteredPatientId, doctorId, organizationId, scheduledAt, durationMinutes ?? 30, reason || null, location || null, referralSource || null, createdByRoleUserId || null, createdByDoctorId || null, selectedService || null, notes || null]
    );
    await client.query('RELEASE SAVEPOINT attempt_insert_with_doctor');
    return result.rows[0].id;
  } catch (err: any) {
    await client.query('ROLLBACK TO SAVEPOINT attempt_insert_with_doctor');
    if (err.message?.includes('created_by_doctor_id') || err.code === '42703') {
      const result = await client.query(
        `INSERT INTO public.appointment 
          (patient_id, unregistered_patient_id, doctor_id, organization_id, scheduled_at, duration_minutes, reason, location, referral_source, created_by_role_user_id, selected_service, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [finalPatientId, finalUnregisteredPatientId, doctorId, organizationId, scheduledAt, durationMinutes ?? 30, reason || null, location || null, referralSource || null, createdByRoleUserId || null, selectedService || null, notes || null]
      );
      return result.rows[0].id;
    }
    throw err;
  }
}

async function notifyPatientOfAppointment(patientId: string, organizationId: string, appointmentId: string, scheduledAt: string, reason: string | null, location: string | null, total: number, currency: string) {
  try {
    const { data: userData } = await supabaseAdmin.from('users').select('id').eq('patientProfileId', patientId).maybeSingle();
    const patientUserId = userData?.id;

    if (patientUserId) {
      const formattedDate = new Date(scheduledAt).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      await createNotification({
        userId: patientUserId,
        organizationId: organizationId || null,
        type: 'APPOINTMENT_CREATED',
        title: 'Nueva Cita Programada',
        message: `Se ha programado una cita para el ${formattedDate}. El pago estará disponible una vez que el médico confirme la cita.`,
        payload: { appointmentId, scheduledAt: formattedDate, reason, location, total, currency },
        sendEmail: true,
      });
    }
  } catch (err) {
    console.error('[Appointments API] Notification error:', err);
  }
}

// ... inside POST ...
      const appointmentId = await insertAppointment(client, {
        finalPatientId, finalUnregisteredPatientId, doctorId, organizationId, 
        scheduledAt, durationMinutes, reason, location, referralSource, 
        createdByRoleUserId, createdByDoctorId, selectedService, notes
      });

      await client.query(
        `INSERT INTO public.facturacion (appointment_id, patient_id, unregistered_patient_id, doctor_id, organization_id, subtotal, impuestos, total, currency, tipo_cambio, estado_pago, estado_factura, fecha_emision)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [appointmentId, finalPatientId, finalUnregisteredPatientId, doctorId, organizationId, subtotal, impuestos, total, currency, tipoCambio, 'pendiente', 'emitida', new Date().toISOString()]
      );

      await client.query('COMMIT');

      if (finalPatientId) {
        await notifyPatientOfAppointment(finalPatientId, organizationId, appointmentId, scheduledAt, reason, location, total, currency);
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
