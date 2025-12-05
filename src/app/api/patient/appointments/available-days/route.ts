// app/api/patient/appointments/available-days/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

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

		if (!doctorId && !organizationId) {
			return NextResponse.json({ error: 'doctor_id o organization_id es requerido' }, { status: 400 });
		}

		const availableDays: number[] = []; // 0 = Sunday, 1 = Monday, etc.

		// Obtener disponibilidad del médico si se proporciona doctorId
		if (doctorId) {
			const { data: medicProfile, error: medicError } = await supabase
				.from('medic_profile')
				.select('availability')
				.eq('doctor_id', doctorId)
				.maybeSingle();

			if (medicError) {
				console.error('[Available Days API] Error obteniendo perfil médico:', medicError);
			}

			if (medicProfile?.availability) {
				let availability: any = null;
				try {
					availability = typeof medicProfile.availability === 'string'
						? JSON.parse(medicProfile.availability)
						: medicProfile.availability;
				} catch {
					console.error('[Available Days API] Error parseando availability');
				}

				if (availability?.schedule && typeof availability.schedule === 'object' && !Array.isArray(availability.schedule)) {
					// Mapeo de nombres de días a números
					const dayMap: Record<string, number> = {
						sunday: 0,
						monday: 1,
						tuesday: 2,
						wednesday: 3,
						thursday: 4,
						friday: 5,
						saturday: 6,
					};

					// Verificar cada día en el schedule
					Object.keys(availability.schedule).forEach((dayName) => {
						const daySlots = availability.schedule[dayName];
						if (Array.isArray(daySlots) && daySlots.length > 0) {
							// Verificar si hay al menos un slot habilitado
							const hasEnabledSlot = daySlots.some((slot: any) => slot.enabled === true);
							if (hasEnabledSlot && dayMap[dayName.toLowerCase()] !== undefined) {
								availableDays.push(dayMap[dayName.toLowerCase()]);
							}
						}
					});
				}
			}
		}

		// Si no hay días disponibles del médico, usar horarios de la clínica
		if (availableDays.length === 0 && organizationId) {
			const { data: clinicProfile, error: clinicError } = await supabase
				.from('clinic_profile')
				.select('opening_hours')
				.eq('organization_id', organizationId)
				.maybeSingle();

			if (clinicError) {
				console.error('[Available Days API] Error obteniendo perfil de clínica:', clinicError);
			}

			if (clinicProfile?.opening_hours) {
				let openingHours: any = null;
				try {
					openingHours = typeof clinicProfile.opening_hours === 'string'
						? JSON.parse(clinicProfile.opening_hours)
						: clinicProfile.opening_hours;
				} catch {
					console.error('[Available Days API] Error parseando opening_hours');
				}

				if (Array.isArray(openingHours) && openingHours.length > 0) {
					const dayMap: Record<string, number> = {
						sunday: 0,
						monday: 1,
						tuesday: 2,
						wednesday: 3,
						thursday: 4,
						friday: 5,
						saturday: 6,
					};

					openingHours.forEach((hour: any) => {
						const dayName = (hour.day || hour.dayOfWeek || '').toLowerCase();
						if (dayMap[dayName] !== undefined) {
							availableDays.push(dayMap[dayName]);
						}
					});
				}
			}
		}

		// Si aún no hay días, usar días laborables por defecto (lunes a viernes)
		if (availableDays.length === 0) {
			availableDays.push(1, 2, 3, 4, 5); // Monday to Friday
		}

		// Eliminar duplicados y ordenar
		const uniqueDays = [...new Set(availableDays)].sort((a, b) => a - b);

		return NextResponse.json({
			availableDays: uniqueDays,
			doctorId: doctorId || null,
			organizationId: organizationId || null,
		});
	} catch (err) {
		console.error('[Available Days API] Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Error interno';
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

