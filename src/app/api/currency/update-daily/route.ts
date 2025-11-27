/**
 * API Route para actualizar la tasa de cambio diariamente
 * Este endpoint debe ser llamado por un cron job a las 6:01 PM
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLatestRate, ratesSupabase } from '@/lib/rates-client';

export async function GET(req: NextRequest) {
	try {
		// Verificar autenticación del cron job
		const authHeader = req.headers.get('authorization');
		const cronSecret = process.env.CRON_SECRET;

		if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
		}

		// Obtener la tasa más reciente de USD
		const rate = await getLatestRate('USD');

		if (!rate) {
			return NextResponse.json(
				{
					success: false,
					error: 'No se pudo obtener la tasa de cambio',
					timestamp: new Date().toISOString(),
				},
				{ status: 404 }
			);
		}

		// La tasa ya está actualizada en la base de datos externa
		// Este endpoint solo verifica y confirma que está disponible
		return NextResponse.json({
			success: true,
			rate: {
				code: rate.code,
				rate: Number(rate.rate),
				date: rate.curr_date,
				time: rate.curr_time,
				rate_datetime: rate.rate_datetime,
			},
			message: 'Tasa de cambio verificada y disponible',
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error('[Currency Update Daily] Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: error.message || 'Error actualizando tasa de cambio',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

