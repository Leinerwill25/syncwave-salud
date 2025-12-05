// app/api/medic/pagos/efectuados/route.ts
// API para obtener pagos efectuados del médico (con referencia y captura)

import { NextResponse } from 'next/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET() {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		// Obtener facturas pagadas del médico actual que tengan número de referencia o captura
		const { data: facturas, error } = await supabase
			.from('facturacion')
			.select(`
				id,
				numero_factura,
				total,
				currency,
				metodo_pago,
				fecha_emision,
				fecha_pago,
				notas,
				patient_id,
				unregistered_patient_id,
				appointment:appointment_id (
					id,
					scheduled_at,
					status,
					reason,
					patient:patient_id (
						id,
						firstName,
						lastName,
						identifier
					),
					unregisteredPatient:unregistered_patient_id (
						id,
						first_name,
						last_name,
						identification
					)
				),
				patient:patient_id (
					id,
					firstName,
					lastName,
					identifier
				),
				unregisteredPatient:unregistered_patient_id (
					id,
					first_name,
					last_name,
					identification
				)
			`)
			.eq('doctor_id', user.userId)
			.in('estado_pago', ['pagada', 'pendiente_verificacion'])
			.order('fecha_pago', { ascending: false, nullsFirst: false })
			.order('fecha_emision', { ascending: false });

		if (error) {
			console.error('[Medic Pagos Efectuados API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener pagos efectuados' }, { status: 500 });
		}

		// Filtrar solo los que tienen referencia o captura en las notas
		const pagosConReferencia = (facturas || []).filter((factura) => {
			if (!factura.notas) return false;
			return factura.notas.includes('[REFERENCIA]') || factura.notas.includes('[CAPTURA]');
		});

		// Para cada pago, obtener las consultas asociadas al appointment y normalizar pacientes
		const pagosConConsultas = await Promise.all(
			pagosConReferencia.map(async (pago: any) => {
				// Supabase puede devolver appointment como array o objeto, normalizar a objeto
				const appointment = Array.isArray(pago.appointment) ? pago.appointment[0] : pago.appointment;
				
				// Normalizar paciente (puede ser registrado o no registrado)
				let patient = Array.isArray(pago.patient) ? pago.patient[0] : pago.patient;
				let unregisteredPatient = Array.isArray(pago.unregisteredPatient) ? pago.unregisteredPatient[0] : pago.unregisteredPatient;

				// Si no hay patient pero hay unregisteredPatient, usar ese
				if (!patient && unregisteredPatient) {
					patient = {
						id: unregisteredPatient.id,
						firstName: unregisteredPatient.first_name,
						lastName: unregisteredPatient.last_name,
						identifier: unregisteredPatient.identification,
						isUnregistered: true,
					};
				}

				// Normalizar paciente en appointment si existe
				if (appointment) {
					const aptPatient = Array.isArray(appointment.patient) ? appointment.patient[0] : appointment.patient;
					const aptUnregisteredPatient = Array.isArray(appointment.unregisteredPatient) ? appointment.unregisteredPatient[0] : appointment.unregisteredPatient;

					if (!aptPatient && aptUnregisteredPatient) {
						appointment.patient = {
							id: aptUnregisteredPatient.id,
							firstName: aptUnregisteredPatient.first_name,
							lastName: aptUnregisteredPatient.last_name,
							identifier: aptUnregisteredPatient.identification,
							isUnregistered: true,
						};
					} else if (aptPatient) {
						appointment.patient = aptPatient;
					}
				}
				
				if (!appointment?.id) {
					return {
						...pago,
						appointment: null,
						patient,
					};
				}

				const { data: consultas } = await supabase
					.from('consultation')
					.select('id, chief_complaint, diagnosis, created_at')
					.eq('appointment_id', appointment.id)
					.eq('doctor_id', user.userId)
					.order('created_at', { ascending: false });

				return {
					...pago,
					appointment: {
						...appointment,
						consultations: consultas || [],
					},
					patient,
				};
			})
		);

		return NextResponse.json({
			data: pagosConConsultas,
		});
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[Medic Pagos Efectuados API] Error:', errorMessage);
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

