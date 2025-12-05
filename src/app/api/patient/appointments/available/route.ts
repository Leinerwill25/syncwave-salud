// app/api/patient/appointments/available/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import { parseOpeningHours } from '@/lib/safe-json-parse';

export async function GET(request: Request) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const url = new URL(request.url);
		const doctorId = url.searchParams.get('doctor_id');
		const organizationId = url.searchParams.get('organization_id');
		const date = url.searchParams.get('date'); // YYYY-MM-DD
		const excludeAppointmentId = url.searchParams.get('exclude_appointment_id'); // Para excluir la cita actual al reagendar

		if (!doctorId && !organizationId) {
			return NextResponse.json({ error: 'doctor_id o organization_id es requerido' }, { status: 400 });
		}

		// Obtener citas existentes para el día
		// Usar la zona horaria local para evitar problemas de conversión
		const dateStr = date || new Date().toISOString().split('T')[0];
		const dateStart = new Date(dateStr + 'T00:00:00');
		const dateEnd = new Date(dateStr + 'T23:59:59');
		
		// Convertir a ISO para la consulta
		const dateStartISO = dateStart.toISOString();
		const dateEndISO = dateEnd.toISOString();

		let appointmentsQuery = supabase
			.from('appointment')
			.select('id, scheduled_at, duration_minutes, status, doctor_id')
			.gte('scheduled_at', dateStartISO)
			.lte('scheduled_at', dateEndISO)
			.in('status', ['SCHEDULED', 'IN_PROGRESS', 'CONFIRMED']); // Incluir CONFIRMED también

		// Excluir la cita actual si se está reagendando
		if (excludeAppointmentId) {
			appointmentsQuery = appointmentsQuery.neq('id', excludeAppointmentId);
		}

		if (doctorId) {
			appointmentsQuery = appointmentsQuery.eq('doctor_id', doctorId);
		}
		if (organizationId) {
			appointmentsQuery = appointmentsQuery.eq('organization_id', organizationId);
		}

		const { data: existingAppointments, error: appointmentsError } = await appointmentsQuery;
		
		if (appointmentsError) {
			console.error('[Available Appointments API] Error obteniendo citas existentes:', appointmentsError);
		}

		// Obtener disponibilidad del médico si se proporciona doctorId
		let availability: any = null;
		let appointmentDuration = 30; // minutos por defecto
		let breakTime = 15; // minutos por defecto
		
		if (doctorId) {
			const { data: medicProfile, error: medicError } = await supabase
				.from('medic_profile')
				.select('availability')
				.eq('doctor_id', doctorId)
				.maybeSingle();

			if (medicError) {
				console.error('[Available Appointments API] Error obteniendo perfil médico:', medicError);
			}

			if (medicProfile?.availability) {
				availability = typeof medicProfile.availability === 'string'
					? JSON.parse(medicProfile.availability)
					: medicProfile.availability;
				
				console.log('[Available Appointments API] Disponibilidad del médico obtenida:', {
					hasSchedule: !!(availability?.schedule),
					scheduleType: typeof availability?.schedule,
					scheduleIsArray: Array.isArray(availability?.schedule),
					scheduleKeys: availability?.schedule ? Object.keys(availability.schedule) : null,
				});
				
				// Extraer appointmentDuration y breakTime
				if (typeof availability.appointmentDuration === 'number') {
					appointmentDuration = availability.appointmentDuration;
				}
				if (typeof availability.breakTime === 'number') {
					breakTime = availability.breakTime;
				}
			} else {
				console.log('[Available Appointments API] No se encontró disponibilidad en medic_profile para doctor_id:', doctorId);
			}
		}

		// Obtener horarios de la clínica si se proporciona organizationId
		let clinicHours: any = null;
		if (organizationId) {
			const { data: clinicProfile, error: clinicError } = await supabase
				.from('clinic_profile')
				.select('opening_hours')
				.eq('organization_id', organizationId)
				.maybeSingle();

			if (clinicError) {
				console.error('[Available Appointments API] Error obteniendo perfil de clínica:', clinicError);
			}

			if (clinicProfile?.opening_hours) {
				clinicHours = parseOpeningHours(clinicProfile.opening_hours);
			}
		}

		// Generar slots disponibles
		const slots: string[] = [];
		const defaultStart = '08:00';
		const defaultEnd = '18:00';
		const slotDuration = appointmentDuration; // Usar la duración configurada por el médico

		const selectedDate = date ? new Date(date) : new Date();
		const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
		const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
		const currentDay = dayNames[dayOfWeek];

		// Convertir horas a minutos desde medianoche
		const timeToMinutes = (time: string) => {
			const [hours, minutes] = time.split(':').map(Number);
			return hours * 60 + (minutes || 0);
		};

		const minutesToTime = (minutes: number) => {
			const h = Math.floor(minutes / 60);
			const m = minutes % 60;
			return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
		};

		// Procesar disponibilidad del médico (estructura: schedule es un objeto con días como claves)
		let usedMedicSchedule = false;
		if (availability?.schedule && typeof availability.schedule === 'object' && !Array.isArray(availability.schedule)) {
			console.log('[Available Appointments API] Schedule encontrado:', {
				currentDay,
				dayOfWeek,
				dateStr,
				scheduleKeys: Object.keys(availability.schedule),
				daySchedule: availability.schedule[currentDay],
			});
			
			const daySchedule = availability.schedule[currentDay];
			
			if (Array.isArray(daySchedule) && daySchedule.length > 0) {
				// Verificar si hay al menos un slot habilitado
				const hasEnabledSlot = daySchedule.some((slot: any) => slot.enabled === true);
				
				if (hasEnabledSlot) {
					usedMedicSchedule = true;
					console.log('[Available Appointments API] Procesando', daySchedule.length, 'slots para', currentDay);
					// Procesar cada slot de tiempo configurado para ese día
					for (const timeSlot of daySchedule) {
						if (!timeSlot.enabled) {
							console.log('[Available Appointments API] Slot deshabilitado:', timeSlot);
							continue;
						}
						
						const startTime = timeSlot.startTime || defaultStart;
						const endTime = timeSlot.endTime || defaultEnd;
						
						let currentMinutes = timeToMinutes(startTime);
						const endMinutes = timeToMinutes(endTime);
						
						while (currentMinutes + slotDuration <= endMinutes) {
							const slotTime = minutesToTime(currentMinutes);
							const slotDateTime = `${dateStr}T${slotTime}:00`;
							
							// Verificar si el slot está ocupado
							const isOccupied = existingAppointments?.some((apt: any) => {
								// Solo verificar citas del mismo doctor si hay doctorId
								if (doctorId && apt.doctor_id !== doctorId) {
									return false;
								}
								
								const aptTime = new Date(apt.scheduled_at);
								const slotTimeObj = new Date(slotDateTime);
								
								// Obtener duración de la cita existente
								const aptDuration = apt.duration_minutes || appointmentDuration;
								
								// Calcular inicio y fin de la cita existente
								const aptStart = aptTime.getTime();
								const aptEnd = aptStart + (aptDuration * 60 * 1000);
								
								// Calcular inicio y fin del slot propuesto
								const slotStart = slotTimeObj.getTime();
								const slotEnd = slotStart + (slotDuration * 60 * 1000);
								
								// Verificar solapamiento: el slot está ocupado si se solapa con la cita
								// Dos intervalos se solapan si: slotStart < aptEnd && slotEnd > aptStart
								return slotStart < aptEnd && slotEnd > aptStart;
							});
							
							if (!isOccupied) {
								slots.push(slotTime);
							}
							
							// Avanzar por la duración del slot + tiempo de descanso
							currentMinutes += slotDuration + breakTime;
						}
					}
					console.log('[Available Appointments API] Slots generados para', currentDay, ':', slots.length);
				} else {
					console.log('[Available Appointments API] Hay slots configurados para', currentDay, 'pero ninguno está habilitado');
				}
			} else {
				console.log('[Available Appointments API] No hay slots configurados para', currentDay, 'o el array está vacío');
			}
		}
		
		// Si no se usó el schedule del médico o no generó slots, usar horarios de la clínica como fallback
		if (!usedMedicSchedule && Array.isArray(clinicHours) && clinicHours.length > 0) {
			console.log('[Available Appointments API] Usando horarios de clínica:', clinicHours);
			// Usar horarios de la clínica (estructura: array de objetos con day, open, close)
			const daySchedule = clinicHours.find((h: any) => {
				const day = h.day || h.dayOfWeek || '';
				return day.toLowerCase() === currentDay;
			});
			
			if (daySchedule) {
				const openTime = daySchedule.open || daySchedule.start || defaultStart;
				const closeTime = daySchedule.close || daySchedule.end || defaultEnd;
				
				let currentMinutes = timeToMinutes(openTime);
				const endMinutes = timeToMinutes(closeTime);
				
				while (currentMinutes + slotDuration <= endMinutes) {
					const slotTime = minutesToTime(currentMinutes);
					const slotDateTime = `${dateStr}T${slotTime}:00`;
					
					// Verificar si el slot está ocupado
					const isOccupied = existingAppointments?.some((apt: any) => {
						// Solo verificar citas del mismo doctor si hay doctorId
						if (doctorId && apt.doctor_id !== doctorId) {
							return false;
						}
						
						const aptTime = new Date(apt.scheduled_at);
						const slotTimeObj = new Date(slotDateTime);
						
						const aptDuration = apt.duration_minutes || appointmentDuration;
						const aptStart = aptTime.getTime();
						const aptEnd = aptStart + (aptDuration * 60 * 1000);
						
						const slotStart = slotTimeObj.getTime();
						const slotEnd = slotStart + (slotDuration * 60 * 1000);
						
						// Verificar solapamiento
						return slotStart < aptEnd && slotEnd > aptStart;
					});
					
					if (!isOccupied) {
						slots.push(slotTime);
					}
					
					currentMinutes += slotDuration + breakTime;
				}
			}
		} else {
			// Horarios por defecto si no hay configuración
			console.log('[Available Appointments API] Usando horarios por defecto (08:00-18:00)');
			let currentMinutes = timeToMinutes(defaultStart);
			const endMinutes = timeToMinutes(defaultEnd);
			
			while (currentMinutes + slotDuration <= endMinutes) {
				const slotTime = minutesToTime(currentMinutes);
				const slotDateTime = `${dateStr}T${slotTime}:00`;
				
				// Verificar si el slot está ocupado
				const isOccupied = existingAppointments?.some((apt: any) => {
					// Solo verificar citas del mismo doctor si hay doctorId
					if (doctorId && apt.doctor_id !== doctorId) {
						return false;
					}
					
					const aptTime = new Date(apt.scheduled_at);
					const slotTimeObj = new Date(slotDateTime);
					
					const aptDuration = apt.duration_minutes || appointmentDuration;
					const aptStart = aptTime.getTime();
					const aptEnd = aptStart + (aptDuration * 60 * 1000);
					
					const slotStart = slotTimeObj.getTime();
					const slotEnd = slotStart + (slotDuration * 60 * 1000);
					
					// Verificar solapamiento
					return slotStart < aptEnd && slotEnd > aptStart;
				});
				
				if (!isOccupied) {
					slots.push(slotTime);
				}
				
				currentMinutes += slotDuration + breakTime;
			}
		}

		// Ordenar slots por hora
		slots.sort((a, b) => {
			const [hA, mA] = a.split(':').map(Number);
			const [hB, mB] = b.split(':').map(Number);
			return hA * 60 + mA - (hB * 60 + mB);
		});

		console.log('[Available Appointments API] Resultado final:', {
			date: dateStr,
			currentDay,
			dayOfWeek,
			totalSlots: slots.length,
			slots: slots.slice(0, 5), // Primeros 5 para logging
			hasAvailability: !!availability,
			hasSchedule: !!(availability?.schedule),
			hasClinicHours: !!clinicHours,
		});

		return NextResponse.json({
			date: dateStr,
			availableSlots: slots,
			existingAppointments: existingAppointments || [],
			appointmentDuration,
			breakTime,
		});
	} catch (err: any) {
		console.error('[Available Appointments API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

