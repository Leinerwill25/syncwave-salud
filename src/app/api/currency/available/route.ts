// app/api/currency/available/route.ts
// API para obtener todas las monedas disponibles en la tabla rates con su tasa más reciente

import { NextResponse } from 'next/server';
import { ratesSupabase } from '@/lib/rates-client';

export async function GET() {
	try {
		if (!ratesSupabase) {
			return NextResponse.json({ error: 'Cliente de tasas no configurado' }, { status: 500 });
		}

		// Obtener todos los códigos únicos de monedas
		const { data: uniqueCodes, error: codesError } = await ratesSupabase
			.from('rates')
			.select('code')
			.order('code', { ascending: true });

		if (codesError) {
			console.error('[Currency Available API] Error obteniendo códigos:', codesError);
			return NextResponse.json({ error: 'Error obteniendo códigos de moneda' }, { status: 500 });
		}

		// Obtener códigos únicos
		const codesSet = new Set((uniqueCodes || []).map((r: any) => r.code));
		const codes = Array.from(codesSet);

		// Para cada código, obtener la tasa más reciente
		const currenciesWithRates = await Promise.all(
			codes.map(async (code: string) => {
				const { data: latestRate, error: rateError } = await ratesSupabase
					.from('rates')
					.select('code, rate, rate_datetime, curr_date')
					.eq('code', code)
					.order('rate_datetime', { ascending: false })
					.limit(1)
					.maybeSingle();

				if (rateError || !latestRate) {
					console.error(`[Currency Available API] Error obteniendo tasa para ${code}:`, rateError);
					return {
						code,
						rate: null,
						rate_datetime: null,
						curr_date: null,
					};
				}

				return {
					code: latestRate.code,
					rate: Number(latestRate.rate),
					rate_datetime: latestRate.rate_datetime,
					curr_date: latestRate.curr_date,
				};
			})
		);

		// Filtrar solo las que tienen tasa válida
		const validCurrencies = currenciesWithRates.filter((c) => c.rate !== null);

		return NextResponse.json({
			success: true,
			currencies: validCurrencies,
			total: validCurrencies.length,
		});
	} catch (err: any) {
		console.error('[Currency Available API] Error:', err);
		return NextResponse.json({ error: 'Error interno del servidor', detail: err.message }, { status: 500 });
	}
}

