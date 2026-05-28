import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { bancaribeRequest } from '@/lib/bancaribe/client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    if (process.env.BANCARIBE_MOCK_MODE === 'true') {
      return NextResponse.json({
        success: true,
        message: null,
        codigoConfirmacion: Math.floor(100000000 + Math.random() * 900000000),
        codigoError: 0,
        descripcionError: '',
        secuencial: Math.floor(100000000 + Math.random() * 900000000),
      });
    }

    // Método sendPaymentB2P según especificación PaP
    const resultado = await bancaribeRequest('/B2P/1.0.0/sendPaymentB2P', {
      method: 'POST',
      body: JSON.stringify({
        montoTransaccion: body.monto,
        bancoCredito: body.bancoBeneficiario,
        canalVirtual: '1',
        oficina: 800,
        identificadorPersona: body.cedulaBeneficiario,
        telefonoCredito: body.telefonoBeneficiario,
        vendedor: 2525,
        concepto: body.concepto,
        direccionInternet: '0.0.0.0',
        bancoPagador: '0114',
        cajaTerminal: 1,
        codigoMoneda: 928,
        nombreComercio: body.nombreComercio,
        rif: body.rif,
        sucursal: 1,
        telefonoDebito: body.telefonoOrigen,
        tipoTerminal: 'WEB',
        factura: '0',
      }),
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('[Bancaribe Pago Personas] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
