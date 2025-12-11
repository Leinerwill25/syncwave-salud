import { NextRequest, NextResponse } from 'next/server';
import { getCurrencyRate } from '@/lib/currency-utils';

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const currency = searchParams.get('currency') || 'EUR';

		const rate = await getCurrencyRate(currency.toUpperCase());
		
		if (!rate) {
			return NextResponse.json({ error: 'No se pudo obtener la tasa de cambio' }, { status: 404 });
		}

		return NextResponse.json({ currency: currency.toUpperCase(), rate }, { status: 200 });
	} catch (error: any) {
		console.error('Error en GET /api/currency-rate:', error);
		return NextResponse.json({ error: error.message || 'Error al obtener tasa de cambio' }, { status: 500 });
	}
}

