// app/api/patient/medication-reminders/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { cookies } from 'next/headers';

/**
 * GET /api/patient/medication-reminders
 * Obtiene las prescripciones activas del paciente con información de recordatorios
 */
export async function GET(req: Request) {
	try {
		const patientAuth = await getAuthenticatedPatient();

		if (!patientAuth) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const { patient } = patientAuth;
		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		// Obtener prescripciones activas del paciente
		const { data: prescriptions, error: presError } = await supabase
			.from('prescription')
			.select(`
				id,
				issued_at,
				valid_until,
				status,
				notes,
				doctor_id,
				doctor:User!fk_prescription_doctor (
					id,
					name,
					email
				),
				prescription_item:prescription_item!fk_prescriptionitem_prescription (
					id,
					name,
					dosage,
					form,
					frequency,
					duration,
					quantity,
					instructions
				)
			`)
			.eq('patient_id', patientAuth.patientId)
			.eq('status', 'ACTIVE')
			.or(`valid_until.is.null,valid_until.gte.${today.toISOString()}`)
			.order('issued_at', { ascending: false });

		if (presError) {
			console.error('Error obteniendo prescripciones:', presError);
			return NextResponse.json({ error: 'Error al cargar prescripciones' }, { status: 500 });
		}

		// Obtener registros de tomas de medicamentos
		const { data: doses, error: dosesError } = await supabase
			.from('medication_dose')
			.select('prescription_item_id, taken_at')
			.eq('patient_id', patientAuth.patientId)
			.gte('taken_at', today.toISOString());

		if (dosesError) {
			console.error('Error obteniendo tomas:', dosesError);
			// Continuar sin las tomas si hay error
		}

		// Crear un mapa de tomas por prescription_item_id
		const dosesMap = new Map<string, Date[]>();
		(doses || []).forEach((dose) => {
			const itemId = dose.prescription_item_id;
			if (!dosesMap.has(itemId)) {
				dosesMap.set(itemId, []);
			}
			dosesMap.get(itemId)!.push(new Date(dose.taken_at));
		});

		// Procesar cada prescripción y calcular recordatorios
		const reminders = prescriptions
			?.filter((prescription) => {
				// Filtrar solo prescripciones con items
				return prescription.prescription_item && prescription.prescription_item.length > 0;
			})
			.flatMap((prescription) => {
				return (prescription.prescription_item || []).map((item: any) => {
					const itemDoses = dosesMap.get(item.id) || [];
					
					// Calcular próximos recordatorios basados en frequency
					const nextReminders = calculateNextReminders(
						item.frequency,
						prescription.issued_at,
						prescription.valid_until,
						itemDoses
					);

					// Determinar si hay un recordatorio pendiente para hoy
					const hasPendingToday = nextReminders.some((reminder) => {
						const reminderDate = new Date(reminder);
						return (
							reminderDate.getDate() === today.getDate() &&
							reminderDate.getMonth() === today.getMonth() &&
							reminderDate.getFullYear() === today.getFullYear() &&
							reminderDate <= now
						);
					});

					return {
						prescription_id: prescription.id,
						prescription_item_id: item.id,
						medication_name: item.name,
						dosage: item.dosage,
						form: item.form,
						frequency: item.frequency,
						duration: item.duration,
						instructions: item.instructions,
						doctor: prescription.doctor,
						issued_at: prescription.issued_at,
						valid_until: prescription.valid_until,
						next_reminders: nextReminders,
						has_pending_today: hasPendingToday,
						taken_today: itemDoses.some((dose) => {
							const doseDate = new Date(dose);
							return (
								doseDate.getDate() === today.getDate() &&
								doseDate.getMonth() === today.getMonth() &&
								doseDate.getFullYear() === today.getFullYear()
							);
						}),
						total_taken: itemDoses.length,
					};
				});
			}) || [];

		// Ordenar por recordatorios pendientes primero
		reminders.sort((a, b) => {
			if (a.has_pending_today && !b.has_pending_today) return -1;
			if (!a.has_pending_today && b.has_pending_today) return 1;
			if (a.next_reminders.length > 0 && b.next_reminders.length > 0) {
				return new Date(a.next_reminders[0]).getTime() - new Date(b.next_reminders[0]).getTime();
			}
			return 0;
		});

		return NextResponse.json({
			reminders,
			total: reminders.length,
			pending_today: reminders.filter((r) => r.has_pending_today).length,
		});
	} catch (error: any) {
		console.error('Error en GET /api/patient/medication-reminders:', error);
		return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
	}
}

/**
 * Calcula los próximos recordatorios basados en la frecuencia del medicamento
 */
function calculateNextReminders(
	frequency: string | null,
	issuedAt: string,
	validUntil: string | null,
	takenDoses: Date[]
): string[] {
	if (!frequency) return [];

	const now = new Date();
	const issued = new Date(issuedAt);
	const validUntilDate = validUntil ? new Date(validUntil) : null;

	// Si la prescripción ya expiró, no hay recordatorios
	if (validUntilDate && validUntilDate < now) {
		return [];
	}

	const reminders: Date[] = [];

	// Parsear frecuencia común (ej: "cada 8 horas", "2 veces al día", "cada 12 horas")
	const frequencyLower = frequency.toLowerCase().trim();

	// Detectar patrones comunes
	let hoursBetween = 0;
	if (frequencyLower.includes('cada')) {
		const match = frequencyLower.match(/cada\s+(\d+)\s+horas?/);
		if (match) {
			hoursBetween = parseInt(match[1], 10);
		}
	} else if (frequencyLower.includes('veces al día') || frequencyLower.includes('veces al dia')) {
		const match = frequencyLower.match(/(\d+)\s+veces/);
		if (match) {
			const timesPerDay = parseInt(match[1], 10);
			hoursBetween = 24 / timesPerDay;
		}
	} else if (frequencyLower.includes('diario') || frequencyLower === '1 vez al día' || frequencyLower === '1 vez al dia') {
		hoursBetween = 24;
	} else if (frequencyLower.includes('cada 12 horas') || frequencyLower === '2 veces al día' || frequencyLower === '2 veces al dia') {
		hoursBetween = 12;
	} else if (frequencyLower.includes('cada 6 horas') || frequencyLower === '4 veces al día' || frequencyLower === '4 veces al dia') {
		hoursBetween = 6;
	} else if (frequencyLower.includes('cada 8 horas') || frequencyLower === '3 veces al día' || frequencyLower === '3 veces al dia') {
		hoursBetween = 8;
	}

	if (hoursBetween === 0) {
		// Frecuencia no reconocida, usar 12 horas por defecto
		hoursBetween = 12;
	}

	// Calcular próximos recordatorios desde ahora hasta 7 días adelante
	const startDate = new Date(now);
	startDate.setHours(Math.floor(startDate.getHours() / hoursBetween) * hoursBetween, 0, 0, 0);

	for (let i = 0; i < 7 * (24 / hoursBetween); i++) {
		const reminderDate = new Date(startDate);
		reminderDate.setHours(reminderDate.getHours() + i * hoursBetween);

		// No incluir recordatorios pasados
		if (reminderDate < now) continue;

		// No incluir recordatorios después de la fecha de validez
		if (validUntilDate && reminderDate > validUntilDate) break;

		// Verificar si ya se tomó en este horario (con margen de 2 horas)
		const wasTaken = takenDoses.some((dose) => {
			const diffHours = Math.abs(reminderDate.getTime() - dose.getTime()) / (1000 * 60 * 60);
			return diffHours < 2;
		});

		if (!wasTaken) {
			reminders.push(reminderDate);
		}

		// Limitar a los próximos 10 recordatorios
		if (reminders.length >= 10) break;
	}

	return reminders.map((d) => d.toISOString());
}

