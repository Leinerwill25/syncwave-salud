// app/api/facturacion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/notifications';
import createSupabaseServerClient from '@/app/adapters/server';
import { getExchangeRateForCurrency } from '@/lib/currency-utils';

export async function POST(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();

		// Intentamos obtener el user desde la sesión server-side
		const maybeUser = await supabase.auth.getUser();
		const sessionUser = maybeUser?.data?.user ?? null;

		// Body
		const body = await req.json().catch(() => ({}));
		const {
			appointment_id,
			consultation_id, // opcional, para obtener datos si no hay appointment_id
			patient_id,
			unregistered_patient_id,
			doctor_id,
			organization_id,
			subtotal,
			impuestos,
			total,
			currency = 'USD',
			tipo_cambio, // Si no se proporciona, se obtendrá automáticamente
			billing_series,
			numero_factura,
			estado_factura = 'emitida',
			estado_pago = 'pendiente',
			metodo_pago,
			fecha_pago,
			notas,
		} = body || {};

		// Obtener la tasa de cambio de la moneda especificada desde la base de datos rates
		let exchangeRate = tipo_cambio ? Number(tipo_cambio) : null;
		if (!exchangeRate || exchangeRate === 1) {
			// Si no se proporciona tipo_cambio o es 1 (por defecto), obtener la tasa real
			exchangeRate = await getExchangeRateForCurrency(currency);
		}

		// Validaciones básicas
		if (!patient_id && !unregistered_patient_id) {
			return NextResponse.json({ error: 'patient_id o unregistered_patient_id es obligatorio' }, { status: 400 });
		}
		if (subtotal === undefined || subtotal === null) return NextResponse.json({ error: 'subtotal es obligatorio' }, { status: 400 });
		if (total === undefined || total === null) return NextResponse.json({ error: 'total es obligatorio' }, { status: 400 });
		// metodo_pago solo es obligatorio si estado_pago es 'pagado'
		if (estado_pago === 'pagado' && !metodo_pago) {
			return NextResponse.json({ error: 'metodo_pago es obligatorio cuando el estado de pago es "pagado"' }, { status: 400 });
		}

		let appointmentIdToUse: string | null = appointment_id || null;
		let doctorIdToUse: string | null = doctor_id || null;
		let organizationIdToUse: string | null = organization_id || null;

		// Si hay sesión server-side, obtener información del usuario
		if (sessionUser?.id) {
			const { data: appUser, error: appUserErr } = await supabase.from('user').select('id, organizationId').eq('authId', sessionUser.id).maybeSingle();

			if (appUserErr) {
				console.error('Error buscando User por authId:', appUserErr);
				return NextResponse.json({ error: 'Error interno buscando perfil de usuario' }, { status: 500 });
			}

			if (appUser) {
				// Si no se proporcionó doctor_id, usar el de la sesión
				if (!doctorIdToUse) doctorIdToUse = appUser.id;
				// Si no se proporcionó organization_id, usar el de la sesión
				if (!organizationIdToUse && (appUser as any).organizationId) organizationIdToUse = (appUser as any).organizationId;
			}
		}

		// Si no hay appointment_id pero hay consultation_id, intentar obtener o crear appointment
		if (!appointmentIdToUse && consultation_id) {
			// Obtener la consulta para ver si tiene appointment_id
			const { data: consultation, error: consultationErr } = await supabase.from('consultation').select('appointment_id, patient_id, unregistered_patient_id, doctor_id, organization_id, started_at, created_at').eq('id', consultation_id).single();

			if (consultationErr) {
				console.error('Error buscando consultation:', consultationErr);
				return NextResponse.json({ error: 'Error al buscar la consulta' }, { status: 500 });
			}

			if (consultation) {
				// Si la consulta tiene appointment_id, usarlo
				if (consultation.appointment_id) {
					appointmentIdToUse = consultation.appointment_id;
					// Usar datos de la consulta si no se proporcionaron
					if (!doctorIdToUse && consultation.doctor_id) doctorIdToUse = consultation.doctor_id;
					if (!organizationIdToUse && consultation.organization_id) organizationIdToUse = consultation.organization_id;
				} else {
					// Si no hay appointment_id, crear uno nuevo
					// NOTA: Esta cita se crea retroactivamente desde facturación
					// Intentar identificar si fue creada por un doctor para rastrear el origen
					const scheduledAt = consultation.started_at ? new Date(consultation.started_at) : consultation.created_at ? new Date(consultation.created_at) : new Date();

					const appointmentPayload: any = {
						patient_id: consultation.patient_id || null,
						unregistered_patient_id: consultation.unregistered_patient_id || null,
						doctor_id: consultation.doctor_id || doctorIdToUse,
						organization_id: consultation.organization_id || organizationIdToUse,
						scheduled_at: scheduledAt.toISOString(),
						duration_minutes: 30,
						status: 'COMPLETED',
						reason: 'Consulta completada',
					};

					// Si el doctor_id coincide con el usuario autenticado y es un doctor, establecer created_by_doctor_id
					// Esto indica que la consulta (y por tanto la cita retroactiva) fue creada por el doctor
					if (doctorIdToUse && consultation.doctor_id === doctorIdToUse) {
						try {
							const { getAuthenticatedUser } = await import('@/lib/auth-guards');
							const user = await getAuthenticatedUser();
							if (user && user.role === 'MEDICO' && user.userId === doctorIdToUse) {
								appointmentPayload.created_by_doctor_id = user.userId;
							}
						} catch (err) {
							// Si no se puede verificar, continuar sin el campo
							console.warn('[Facturacion API] No se pudo verificar autenticación para created_by_doctor_id:', err);
						}
					}

					const { data: newAppointment, error: appointmentErr } = await supabase
						.from('appointment')
						.insert([appointmentPayload])
						.select('id')
						.single();

					if (appointmentErr) {
						console.error('Error creando appointment:', appointmentErr);
						return NextResponse.json({ error: 'Error al crear la cita asociada. Se requiere appointment_id para facturar.' }, { status: 500 });
					}

					if (newAppointment) {
						appointmentIdToUse = newAppointment.id;

						// Actualizar la consulta con el nuevo appointment_id
						await supabase.from('consultation').update({ appointment_id: appointmentIdToUse }).eq('id', consultation_id);
					}
				}
			}
		}

		// appointment_id es obligatorio en la tabla facturacion
		if (!appointmentIdToUse) {
			return NextResponse.json({ error: 'appointment_id es obligatorio. La consulta debe estar vinculada a una cita.' }, { status: 400 });
		}

		// Validar que numero_factura sea único si se proporciona
		if (numero_factura) {
			const { data: existingFactura, error: checkErr } = await supabase.from('facturacion').select('id').eq('numero_factura', numero_factura).maybeSingle();

			if (checkErr) {
				console.error('Error verificando numero_factura:', checkErr);
				return NextResponse.json({ error: 'Error al verificar número de factura' }, { status: 500 });
			}

			if (existingFactura) {
				return NextResponse.json({ error: 'El número de factura ya existe' }, { status: 400 });
			}
		}

		// Preparar payload de inserción
		const insertPayload: any = {
			appointment_id: appointmentIdToUse,
			consultation_id: consultation_id || null, // Agregar consultation_id si está disponible
			patient_id: patient_id || null,
			unregistered_patient_id: unregistered_patient_id || null,
			doctor_id: doctorIdToUse,
			organization_id: organizationIdToUse,
			subtotal: Number(subtotal) || 0,
			impuestos: Number(impuestos) || 0,
			total: Number(total) || 0,
			currency: currency || 'USD',
			tipo_cambio: exchangeRate,
			billing_series: billing_series || null,
			numero_factura: numero_factura || null,
			estado_factura: estado_factura || 'emitida',
			estado_pago: estado_pago || 'pendiente',
			metodo_pago: metodo_pago || null,
			fecha_pago: fecha_pago ? new Date(fecha_pago).toISOString() : null,
			notas: notas || null,
		};

		// Insertar facturación
		const { data: insertData, error: insertErr } = await supabase.from('facturacion').insert([insertPayload]).select('*').single();

		if (insertErr) {
			console.error('❌ Error insert facturacion:', insertErr);
			return NextResponse.json({ error: insertErr.message || 'Error al crear facturación' }, { status: 500 });
		}

		// Crear notificación y enviar email al paciente (solo para pacientes registrados)
		try {
			let patientName: string | undefined;
			let patientUserId: string | null = null;

			if (patient_id) {
				// Obtener información del paciente registrado
				const { data: patientData } = await supabase
					.from('patient')
					.select('firstName, lastName')
					.eq('id', patient_id)
					.maybeSingle();

				patientName = patientData ? `${patientData.firstName} ${patientData.lastName}` : undefined;

				// Obtener userId del paciente
				try {
					const { data: patientUser } = await supabase
						.from('user')
						.select('id')
						.eq('patientProfileId', patient_id)
						.maybeSingle();
					patientUserId = patientUser?.id || null;
				} catch {
					// Ignorar error
				}
			}
			// Para pacientes no registrados, no enviamos notificaciones por ahora

			const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'}/dashboard/patient/pagos`;
			const dueDate = insertData.fecha_pago 
				? new Date(insertData.fecha_pago).toLocaleDateString('es-ES')
				: undefined;

			if (patientUserId) {
				await createNotification({
					userId: patientUserId,
					organizationId: organizationIdToUse,
					type: 'INVOICE',
					title: 'Nueva Factura Disponible',
					message: `Se ha generado una nueva factura por un monto de ${total} ${currency}.`,
					payload: {
						invoiceId: insertData.id,
						invoice_id: insertData.id,
						invoiceNumber: insertData.numero_factura || insertData.id,
						numero_factura: insertData.numero_factura,
						patient_id,
						patientName,
						amount: total.toString(),
						currency,
						dueDate,
						invoiceUrl,
					},
					sendEmail: true,
				});
			}
		} catch (notifErr) {
			console.error('Error creando notificación/email para factura:', notifErr);
			// No fallar la creación de la factura si la notificación falla
		}

		return NextResponse.json({ data: insertData }, { status: 201 });
	} catch (error) {
		console.error('❌ Error POST /facturacion:', error);
		const errorMessage = error instanceof Error ? error.message : 'Error interno';
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

export async function GET(req: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();
		const url = new URL(req.url);
		const appointmentId = url.searchParams.get('appointment_id');
		const consultationId = url.searchParams.get('consultation_id');
		const patientId = url.searchParams.get('patient_id');
		const doctorId = url.searchParams.get('doctor_id');
		const organizationId = url.searchParams.get('organization_id');
		const estadoPago = url.searchParams.get('estado_pago');
		const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
		const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') || '10'));

		const start = (page - 1) * pageSize;
		const end = start + pageSize - 1;

		let query = supabase
			.from('facturacion')
			.select(
				`id, appointment_id, patient_id, doctor_id, organization_id, subtotal, impuestos, total, currency, tipo_cambio, billing_series, numero_factura, estado_factura, estado_pago, metodo_pago, fecha_emision, fecha_pago, notas, created_at, updated_at,
         patient:patient_id(firstName, lastName, identifier),
         doctor:doctor_id(id, name),
         appointment:appointment_id(id, scheduled_at)`,
				{ count: 'exact' }
			)
			.order('created_at', { ascending: false });

		if (appointmentId) query = query.eq('appointment_id', appointmentId);
		if (consultationId) {
			// Si se busca por consultation_id, primero obtener el appointment_id
			const { data: consultation } = await supabase.from('consultation').select('appointment_id').eq('id', consultationId).single();
			if (consultation?.appointment_id) {
				query = query.eq('appointment_id', consultation.appointment_id);
			} else {
				// Si no hay appointment_id, retornar vacío
				return NextResponse.json({ items: [], total: 0 }, { status: 200 });
			}
		}
		if (patientId) query = query.eq('patient_id', patientId);
		if (doctorId) query = query.eq('doctor_id', doctorId);
		if (organizationId) query = query.eq('organization_id', organizationId);
		if (estadoPago) query = query.eq('estado_pago', estadoPago);

		query = query.range(start, end);

		const { data, error, count } = await query;
		if (error) throw error;

		const items = (data || []).map((f: any) => ({
			...f,
			patient: Array.isArray(f.patient) ? f.patient[0] : f.patient,
			doctor: Array.isArray(f.doctor) ? f.doctor[0] : f.doctor,
			appointment: Array.isArray(f.appointment) ? f.appointment[0] : f.appointment,
		}));

		return NextResponse.json({ items, total: typeof count === 'number' ? count : items.length }, { status: 200 });
	} catch (error: any) {
		console.error('❌ Error GET /facturacion:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}

