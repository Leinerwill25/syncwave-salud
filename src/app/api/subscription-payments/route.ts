import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrencyRate } from '@/lib/currency-utils';

// Cliente admin de Supabase para operaciones sin autenticación
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
	? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
	: null;

export async function POST(req: NextRequest) {
	try {
		if (!supabaseAdmin) {
			return NextResponse.json({ error: 'Configuración de Supabase no disponible' }, { status: 500 });
		}
		
		const body = await req.json();
		const {
			organizationId,
			userId,
			paymentMethod,
			amountEuros,
			amountBs,
			exchangeRate,
			organizationName,
			organizationPhone,
			// Binance
			binanceId,
			binanceTransactionHash,
			// Pago Móvil
			paymentMobileCi,
			paymentMobilePhone,
			paymentMobileBank,
			paymentReferenceNumber,
			paymentScreenshotUrl,
		} = body;

		// Validaciones
		if (!organizationId || !userId || !paymentMethod || !amountEuros || !organizationName || !organizationPhone) {
			return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
		}

		// Validar que el organizationId y userId existan en la base de datos
		// Esto asegura que los datos son válidos sin requerir autenticación
		const { data: orgData, error: orgError } = await supabaseAdmin
			.from('organization')
			.select('id')
			.eq('id', organizationId)
			.single();

		if (orgError || !orgData) {
			return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
		}

		const { data: userData, error: userError } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('id', userId)
			.single();

		if (userError || !userData) {
			return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
		}

		if (paymentMethod !== 'BINANCE' && paymentMethod !== 'PAGO_MOVIL') {
			return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 });
		}

		if (paymentMethod === 'BINANCE' && !binanceTransactionHash) {
			return NextResponse.json({ error: 'Hash de transacción de Binance requerido' }, { status: 400 });
		}

		if (paymentMethod === 'PAGO_MOVIL') {
			if (!paymentReferenceNumber) {
				return NextResponse.json({ error: 'Número de referencia requerido' }, { status: 400 });
			}
			if (!paymentScreenshotUrl) {
				return NextResponse.json({ error: 'Captura de pantalla requerida' }, { status: 400 });
			}
			// Obtener tasa de cambio si no se proporcionó
			let finalExchangeRate = exchangeRate;
			let finalAmountBs = amountBs;
			if (!finalExchangeRate || !finalAmountBs) {
				const rate = await getCurrencyRate('EUR');
				if (rate) {
					finalExchangeRate = rate;
					finalAmountBs = amountEuros * rate;
				}
			}
		}

		// Insertar pago en la base de datos
		const { data: payment, error: insertError } = await supabaseAdmin
			.from('subscription_payments')
			.insert({
				organization_id: organizationId,
				user_id: userId,
				payment_method: paymentMethod,
				amount_euros: amountEuros,
				amount_bs: paymentMethod === 'PAGO_MOVIL' ? (amountBs || null) : null,
				exchange_rate: paymentMethod === 'PAGO_MOVIL' ? (exchangeRate || null) : null,
				binance_id: paymentMethod === 'BINANCE' ? (binanceId || '791706063') : null,
				binance_transaction_hash: paymentMethod === 'BINANCE' ? binanceTransactionHash : null,
				payment_mobile_ci: paymentMethod === 'PAGO_MOVIL' ? (paymentMobileCi || '29897548') : null,
				payment_mobile_phone: paymentMethod === 'PAGO_MOVIL' ? (paymentMobilePhone || '04126111969') : null,
				payment_mobile_bank: paymentMethod === 'PAGO_MOVIL' ? (paymentMobileBank || 'Banco Venezuela') : null,
				payment_reference_number: paymentMethod === 'PAGO_MOVIL' ? paymentReferenceNumber : null,
				payment_screenshot_url: paymentMethod === 'PAGO_MOVIL' ? paymentScreenshotUrl : null,
				organization_name: organizationName,
				organization_phone: organizationPhone,
				status: 'PENDING',
			})
			.select()
			.single();

		if (insertError) {
			console.error('Error insertando pago:', insertError);
			return NextResponse.json({ error: 'Error al registrar el pago' }, { status: 500 });
		}

		return NextResponse.json({ 
			success: true, 
			payment,
			message: 'Pago registrado exitosamente. Será verificado por nuestro equipo.' 
		}, { status: 201 });
	} catch (error: any) {
		console.error('Error en POST /api/subscription-payments:', error);
		return NextResponse.json({ error: error.message || 'Error al procesar el pago' }, { status: 500 });
	}
}

export async function GET(req: NextRequest) {
	try {
		if (!supabaseAdmin) {
			return NextResponse.json({ error: 'Configuración de Supabase no disponible' }, { status: 500 });
		}

		const { searchParams } = new URL(req.url);
		const organizationId = searchParams.get('organizationId');

		if (!organizationId) {
			return NextResponse.json({ error: 'organizationId requerido' }, { status: 400 });
		}

		// Obtener pagos de la organización
		const { data: payments, error } = await supabaseAdmin
			.from('subscription_payments')
			.select('*')
			.eq('organization_id', organizationId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error obteniendo pagos:', error);
			return NextResponse.json({ error: 'Error al obtener pagos' }, { status: 500 });
		}

		return NextResponse.json({ success: true, payments }, { status: 200 });
	} catch (error: any) {
		console.error('Error en GET /api/subscription-payments:', error);
		return NextResponse.json({ error: error.message || 'Error al obtener pagos' }, { status: 500 });
	}
}

