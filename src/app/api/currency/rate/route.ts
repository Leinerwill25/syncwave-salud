/**
 * API Route para obtener y actualizar la tasa de cambio
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLatestRate, getAllRates, ratesSupabase } from '@/lib/rates-client';

/**
 * GET: Obtener la tasa de cambio más reciente
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const code = searchParams.get('code') || 'USD';

		const rate = await getLatestRate(code);

		if (!rate) {
			return NextResponse.json({ error: 'No se encontró tasa de cambio' }, { status: 404 });
		}

		return NextResponse.json({ success: true, rate });
	} catch (error: any) {
		console.error('[Currency Rate API] Error:', error);
		return NextResponse.json({ error: error.message || 'Error obteniendo tasa de cambio' }, { status: 500 });
	}
}

/**
 * POST: Forzar actualización de la tasa (para uso en cron jobs)
 */
export async function POST(req: NextRequest) {
	try {
		// Verificar que sea una llamada autorizada (puedes agregar autenticación aquí)
		const authHeader = req.headers.get('authorization');
		const cronSecret = process.env.CRON_SECRET;

		if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
		}

		// Obtener la tasa más reciente (esto fuerza una actualización del cache si existe)
		const rate = await getLatestRate('USD');

		if (!rate) {
			return NextResponse.json({ error: 'No se encontró tasa de cambio' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			rate,
			message: 'Tasa actualizada correctamente',
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error('[Currency Rate API] Error actualizando tasa:', error);
		return NextResponse.json({ error: error.message || 'Error actualizando tasa de cambio' }, { status: 500 });
	}
}

