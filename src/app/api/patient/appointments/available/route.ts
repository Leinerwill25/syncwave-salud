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
		const { supabase } = createSupabaseServerClient(cookieStore);

		const url = new URL(request.url);
		const doctorId = url.searchParams.get('doctor_id');
		const organizationId = url.searchParams.get('organization_id');
		const date = url.searchParams.get('date'); // YYYY-MM-DD

		if (!doctorId && !organizationId) {
			return NextResponse.json({ error: 'doctor_id o organization_id es requerido' }, { status: 400 });
		}

		// Obtener citas existentes para el día
		const dateStart = date ? new Date(date + 'T00:00:00Z').toISOString() : new Date().toISOString();
		const dateEnd = date ? new Date(date + 'T23:59:59Z').toISOString() : new Date().toISOString();

		let appointmentsQuery = supabase
			.from('appointment')
			.select('scheduled_at, duration_minutes, status')
			.gte('scheduled_at', dateStart)
			.lte('scheduled_at', dateEnd)
			.in('status', ['SCHEDULED', 'IN_PROGRESS']);

		if (doctorId) {
			appointmentsQuery = appointmentsQuery.eq('doctor_id', doctorId);
		}
		if (organizationId) {
			appointmentsQuery = appointmentsQuery.eq('organization_id', organizationId);
		}

		const { data: existingAppointments } = await appointmentsQuery;

		// Obtener disponibilidad del médico si se proporciona doctorId
		let availability: any = null;
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

		// Generar slots disponibles (30 minutos por defecto)
		const slots: string[] = [];
		const defaultStart = '08:00';
		const defaultEnd = '18:00';
		const slotDuration = 30; // minutos

		// Usar disponibilidad del médico o horarios de la clínica
		const workingHours = availability?.schedule || clinicHours || [
			{ day: 'monday', open: defaultStart, close: defaultEnd },
			{ day: 'tuesday', open: defaultStart, close: defaultEnd },
			{ day: 'wednesday', open: defaultStart, close: defaultEnd },
			{ day: 'thursday', open: defaultStart, close: defaultEnd },
			{ day: 'friday', open: defaultStart, close: defaultEnd },
		];

		const selectedDate = date ? new Date(date) : new Date();
		const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
		const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
		const currentDay = dayNames[dayOfWeek];

		const daySchedule = Array.isArray(workingHours)
			? workingHours.find((h: any) => {
				const day = h.day || h.dayOfWeek || '';
				return day.toLowerCase() === currentDay;
			})
			: null;

		if (daySchedule) {
			const openTime = daySchedule.open || daySchedule.start || defaultStart;
			const closeTime = daySchedule.close || daySchedule.end || defaultEnd;

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

			let currentMinutes = timeToMinutes(openTime);
			const endMinutes = timeToMinutes(closeTime);

			while (currentMinutes + slotDuration <= endMinutes) {
				const slotTime = minutesToTime(currentMinutes);
				const slotDateTime = `${date || selectedDate.toISOString().split('T')[0]}T${slotTime}:00`;

				// Verificar si el slot está ocupado
				const isOccupied = existingAppointments?.some((apt: any) => {
					const aptTime = new Date(apt.scheduled_at);
					const slotTimeObj = new Date(slotDateTime);
					const diffMinutes = Math.abs((aptTime.getTime() - slotTimeObj.getTime()) / (1000 * 60));
					return diffMinutes < (apt.duration_minutes || 30);
				});

				if (!isOccupied) {
					slots.push(slotTime);
				}

				currentMinutes += slotDuration;
			}
		}

		return NextResponse.json({
			date: date || selectedDate.toISOString().split('T')[0],
			availableSlots: slots,
			existingAppointments: existingAppointments || [],
		});
	} catch (err: any) {
		console.error('[Available Appointments API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

