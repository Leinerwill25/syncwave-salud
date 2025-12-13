import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getRoleUserSessionFromServer } from '@/lib/role-user-auth';

export async function GET(req: NextRequest) {
	try {
		const session = await getRoleUserSessionFromServer();
		if (!session) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();
		const url = new URL(req.url);
		const month = url.searchParams.get('month'); // Formato: YYYY-MM
		const year = url.searchParams.get('year'); // Formato: YYYY

		if (!month || !year) {
			return NextResponse.json({ error: 'Mes y año son requeridos (formato: YYYY-MM)' }, { status: 400 });
		}

		const startDate = `${year}-${month}-01`;
		const endDate = `${year}-${month}-31`;

		// Obtener todas las citas del mes para este asistente
		const { data: appointments, error } = await supabase
			.from('appointment')
			.select('id, referral_source, scheduled_at')
			.eq('created_by_role_user_id', session.roleUserId)
			.eq('organization_id', session.organizationId)
			.gte('scheduled_at', startDate)
			.lte('scheduled_at', endDate);

		if (error) {
			console.error('[Role User Reports API] Error:', error);
			return NextResponse.json({ error: 'Error al obtener datos para reporte' }, { status: 500 });
		}

		// Calcular estadísticas por origen
		const stats: Record<string, number> = {
			FACEBOOK: 0,
			INSTAGRAM: 0,
			WHATSAPP: 0,
			REFERIDO: 0,
			OTRO: 0,
			SIN_ORIGEN: 0,
		};

		(appointments || []).forEach((apt: any) => {
			const source = apt.referral_source;
			if (source && stats.hasOwnProperty(source)) {
				stats[source]++;
			} else if (!source) {
				stats.SIN_ORIGEN++;
			} else {
				stats.OTRO++;
			}
		});

		const totalAppointments = appointments?.length || 0;

		// Calcular porcentajes
		const statsWithPercentages = Object.entries(stats).map(([source, count]) => ({
			source,
			count,
			percentage: totalAppointments > 0 ? ((count / totalAppointments) * 100).toFixed(2) : '0.00',
		}));

		// Ordenar por cantidad (mayor a menor)
		statsWithPercentages.sort((a, b) => b.count - a.count);

		// Etiquetas en español
		const sourceLabels: Record<string, string> = {
			FACEBOOK: 'Facebook',
			INSTAGRAM: 'Instagram',
			WHATSAPP: 'WhatsApp',
			REFERIDO: 'Boca en Boca (Referido)',
			OTRO: 'Otro',
			SIN_ORIGEN: 'Sin Origen Especificado',
		};

		const statsFormatted = statsWithPercentages.map((stat) => ({
			...stat,
			label: sourceLabels[stat.source] || stat.source,
		}));

		return NextResponse.json(
			{
				month,
				year,
				totalAppointments,
				stats: statsFormatted,
			},
			{ status: 200 }
		);
	} catch (err: any) {
		console.error('[Role User Reports API] Error:', err);
		return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
	}
}

