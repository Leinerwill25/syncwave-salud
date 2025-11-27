/**
 * Endpoint para cron job que actualiza la tasa de cambio diariamente a las 6:01 PM
 * Este endpoint puede ser llamado por Vercel Cron, GitHub Actions, o cualquier servicio de cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLatestRate } from '@/lib/rates-client';

export async function GET(req: NextRequest) {
	try {
		// Verificar que la llamada viene de un cron job autorizado
		const authHeader = req.headers.get('authorization');
		const cronSecret = process.env.CRON_SECRET;

		// Si hay un CRON_SECRET configurado, validarlo
		if (cronSecret) {
			if (authHeader !== `Bearer ${cronSecret}`) {
				return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
			}
		}

		// Obtener la tasa más reciente
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

		// La base de datos externa ya tiene la tasa actualizada
		// Este endpoint solo verifica que esté disponible
		return NextResponse.json({
			success: true,
			rate: {
				code: rate.code,
				rate: Number(rate.rate),
				date: rate.curr_date,
				time: rate.curr_time,
				rate_datetime: rate.rate_datetime,
			},
			message: 'Tasa de cambio verificada correctamente',
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error('[Cron Update Currency Rate] Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: error.message || 'Error en el cron job de actualización de tasa',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

