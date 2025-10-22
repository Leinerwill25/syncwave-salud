// app/api/appointments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// 🔹 Configurar pool de conexión
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

export async function POST(req: NextRequest) {
	try {
		// 🔹 Leer cuerpo JSON
		const body = await req.json();

		const { patientId, doctorId, organizationId, scheduledAt, durationMinutes, reason, location, billing } = body;

		// 🔹 Extraer datos de facturación con valores por defecto
		const subtotal = typeof billing?.subtotal === 'number' ? billing.subtotal : parseFloat(billing?.subtotal) || 0;
		const impuestos = typeof billing?.impuestos === 'number' ? billing.impuestos : parseFloat(billing?.impuestos) || 0;
		const total = typeof billing?.total === 'number' ? billing.total : parseFloat(billing?.total) || 0;
		const currency = billing?.currency ?? 'USD';

		// 🔹 Validaciones básicas
		const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

		if (!isUUID(patientId) || !isUUID(doctorId) || !isUUID(organizationId)) {
			return NextResponse.json({ success: false, error: 'IDs inválidos. Deben ser UUID válidos.' }, { status: 400 });
		}

		if (!scheduledAt) {
			return NextResponse.json({ success: false, error: 'La fecha de la cita es obligatoria.' }, { status: 400 });
		}

		// 🔹 Crear conexión
		const client = await pool.connect();

		try {
			await client.query('BEGIN');

			// 🔹 Insertar cita
			const appointmentResult = await client.query(
				`
        INSERT INTO public.appointment
          (patient_id, doctor_id, organization_id, scheduled_at, duration_minutes, reason, location)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id
      `,
				[patientId, doctorId, organizationId, scheduledAt, durationMinutes ?? 30, reason || null, location || null]
			);

			const appointmentId = appointmentResult.rows[0]?.id;

			if (!appointmentId) {
				throw new Error('No se generó ID para la cita.');
			}

			// 🔹 Insertar facturación asociada
			await client.query(
				`
        INSERT INTO public.facturacion
          (appointment_id, patient_id, doctor_id, organization_id, subtotal, impuestos, total, currency)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
				[appointmentId, patientId, doctorId, organizationId, subtotal, impuestos, total, currency]
			);

			await client.query('COMMIT');
			return NextResponse.json({ success: true, appointmentId });
		} catch (error) {
			await client.query('ROLLBACK');
			console.error('[DB ERROR]', error);
			return NextResponse.json({ success: false, error: 'Error al crear la cita y facturación.' }, { status: 500 });
		} finally {
			client.release();
		}
	} catch (error) {
		console.error('[API ERROR]', error);
		return NextResponse.json({ success: false, error: 'Error en la solicitud al crear la cita.' }, { status: 400 });
	}
}
