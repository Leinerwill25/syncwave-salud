// app/api/public/appointments/availability/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Cliente Supabase con service_role para operaciones públicas
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: { persistSession: false },
});

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const doctorId = searchParams.get('doctorId');
		const date = searchParams.get('date'); // YYYY-MM-DD

		if (!doctorId || !date) {
			return NextResponse.json({ error: 'doctorId y date son requeridos' }, { status: 400 });
		}

		// 1. Obtener citas para el día (confirmadas o programadas)
		const startOfDay = `${date}T00:00:00Z`;
		const endOfDay = `${date}T23:59:59Z`;

		const { data: appointments, error: appointmentsError } = await supabaseAdmin
			.from('appointment')
			.select('scheduled_at, duration_minutes, status')
			.eq('doctor_id', doctorId)
			.gte('scheduled_at', startOfDay)
			.lte('scheduled_at', endOfDay)
			.in('status', ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']);

		if (appointmentsError) {
			console.error('[Availability API] Error fetching appointments:', appointmentsError);
			return NextResponse.json({ error: 'Error al obtener disponibilidad' }, { status: 500 });
		}

		// 2. Obtener configuración de capacidad del médico
		const { data: config, error: configError } = await supabaseAdmin
			.from('doctor_schedule_config')
			.select('consultation_type, max_patients_per_day, shift_config')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (configError) {
			console.error('[Availability API] Error fetching config:', configError);
		}

		// Filtrar slots ocupados (HH:mm)
		const busySlots = appointments?.map(apt => {
			const d = new Date(apt.scheduled_at);
			return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
		}) || [];

		// Contar por turnos (Mañana: antes de las 12:00 UTC, Tarde: después)
		// NOTA: Esto es una simplificación, deberíamos usar la configuración de turnos del médico
		let morningCount = 0;
		let afternoonCount = 0;

		appointments?.forEach(apt => {
			const hour = new Date(apt.scheduled_at).getUTCHours();
			if (hour < 12) morningCount++;
			else afternoonCount++;
		});

		return NextResponse.json({
			busySlots,
			stats: {
				total: appointments?.length || 0,
				morning: morningCount,
				afternoon: afternoonCount
			},
			config: config || {
                consultation_type: 'TURNOS',
                max_patients_per_day: 20,
                shift_config: null
            }
		});

	} catch (err) {
		console.error('[Availability API] Error:', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}
