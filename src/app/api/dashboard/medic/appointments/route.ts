// app/api/appointments/list/route.ts
import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

export async function GET(req: Request) {
	try {
		const { supabase } = createSupabaseServerClient();
		const { searchParams } = new URL(req.url);
		const date = searchParams.get('date');

		if (!date) {
			return NextResponse.json({ error: 'Debe especificarse una fecha (YYYY-MM-DD).' }, { status: 400 });
		}

		// 🕐 1️⃣ Calcular rango de día local (sin convertir a UTC)
		const localDate = new Date(`${date}T00:00:00`);
		const startOfDay = new Date(localDate);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(localDate);
		endOfDay.setHours(23, 59, 59, 999);

		// 🕑 2️⃣ Convertir a formato compatible con Postgres timestamptz
		const startIso = startOfDay.toISOString().replace('Z', '+00:00');
		const endIso = endOfDay.toISOString().replace('Z', '+00:00');

		// 🩺 3️⃣ Consultar citas entre ese rango (incluyendo unregistered_patient_id)
		const { data, error } = await supabase
			.from('appointment')
			.select(
				`
				id,
				scheduled_at,
				duration_minutes,
				status,
				reason,
				location,
				patient_id,
				unregistered_patient_id,
				patient:patient_id (
					id,
					firstName,
					lastName,
					identifier
				)
				`
			)
			.gte('scheduled_at', startIso)
			.lte('scheduled_at', endIso)
			.order('scheduled_at', { ascending: true });

		if (error) {
			console.error('❌ Error al obtener citas:', error.message);
			return NextResponse.json({ error: 'Error consultando citas en la base de datos.' }, { status: 500 });
		}

		if (!data || data.length === 0) {
			return NextResponse.json([], { status: 200 });
		}

		// 🧮 4️⃣ Formatear resultados y obtener datos de pacientes no registrados
		// Obtener todos los IDs de pacientes no registrados de una vez
		const unregisteredPatientIds = [...new Set(data.map((cita: any) => cita.unregistered_patient_id).filter(Boolean))];
		
		let unregisteredPatientsMap: Map<string, { first_name: string; last_name: string }> = new Map();
		
		if (unregisteredPatientIds.length > 0) {
			const { data: unregisteredPatients } = await supabase
				.from('unregisteredpatients')
				.select('id, first_name, last_name')
				.in('id', unregisteredPatientIds);

			if (unregisteredPatients) {
				unregisteredPatients.forEach((up: any) => {
					unregisteredPatientsMap.set(up.id, { first_name: up.first_name, last_name: up.last_name });
				});
			}
		}

		const citas = data.map((cita: any) => {
			const start = new Date(cita.scheduled_at);
			const startTime = start.toLocaleTimeString('es-ES', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: true,
			});

			let endTime = '';
			if (cita.duration_minutes) {
				const end = new Date(start.getTime() + cita.duration_minutes * 60000);
				endTime = end.toLocaleTimeString('es-ES', {
					hour: '2-digit',
					minute: '2-digit',
					hour12: true,
				});
			}

			// Determinar el nombre del paciente
			let patientName = 'Paciente no identificado';
			let isUnregistered = false;

			if (cita.unregistered_patient_id) {
				// Es un paciente no registrado
				const unregisteredPatient = unregisteredPatientsMap.get(cita.unregistered_patient_id);
				if (unregisteredPatient) {
					patientName = `${unregisteredPatient.first_name} ${unregisteredPatient.last_name}`;
					isUnregistered = true;
				}
			} else if (cita.patient) {
				// Es un paciente registrado - normalizar (puede venir como array)
				const patient = Array.isArray(cita.patient) ? cita.patient[0] : cita.patient;
				if (patient) {
					patientName = `${patient.firstName} ${patient.lastName}`;
				}
			}

			return {
				id: cita.id,
				patient: patientName,
				isUnregistered,
				time: endTime ? `${startTime} - ${endTime}` : startTime,
				status: cita.status ?? 'SCHEDULED',
				reason: cita.reason ?? '',
				location: cita.location ?? '',
			};
		});

		return NextResponse.json(citas, { status: 200 });
	} catch (error: any) {
		console.error('❌ Error general al obtener citas:', error);
		return NextResponse.json({ error: 'Error obteniendo citas médicas.' }, { status: 500 });
	}
}
