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
const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
	{ auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
	const client = await pool.connect();
	try {
		// 🔹 Leer cuerpo JSON
		const body = await req.json();

		const { patientId, unregisteredPatientId, doctorId, organizationId, scheduledAt, durationMinutes, reason, location, billing } = body;

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
				const unregisteredCheck = await client.query(
					`SELECT id FROM public.unregisteredpatients WHERE id = $1`,
					[finalUnregisteredPatientId]
				);

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
				const patientCheck = await client.query(
					`SELECT id FROM public."Patient" WHERE id = $1`,
					[finalPatientId]
				);

				if (patientCheck.rows.length === 0) {
					throw new Error('Paciente registrado no encontrado.');
				}
			}

			// 🔹 Insertar cita con unregistered_patient_id (si aplica)
			// NOTA: La migración debe ejecutarse primero para agregar el campo unregistered_patient_id
			const appointmentResult = await client.query(
				`
        INSERT INTO public.appointment
          (patient_id, unregistered_patient_id, doctor_id, organization_id, scheduled_at, duration_minutes, reason, location)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
				]
			);

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
					const { data: patientData } = await supabaseAdmin
						.from('Patient')
						.select('firstName, lastName')
						.eq('id', finalPatientId)
						.maybeSingle();

					// Obtener el user_id del paciente
					const { data: userData } = await supabaseAdmin
						.from('User')
						.select('id')
						.eq('patientProfileId', finalPatientId)
						.maybeSingle();

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
