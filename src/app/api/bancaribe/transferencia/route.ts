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
        Envelope: {
          Body: {
            CredInmediatoApiResponse: {
              out: {
                codigoConfirmacion: 0,
                codigoError: 0,
                descripcionError: 'Transaccion Exitosa',
                secuencial: Math.floor(100000000 + Math.random() * 900000000),
              },
            },
          },
        },
      });
    }

    // Método CredInmediato según especificación Transferencia Inmediata
    const resultado = await bancaribeRequest('/B2P/1.0.0/credInmediato', {
      method: 'POST',
      body: JSON.stringify({
        bancoDestino: body.bancoDestino,
        cedulaRifBeneficiario: body.cedulaBeneficiario,
        concepto: body.concepto,
        cuentaOrigen: body.cuentaOrigen,
        hash: body.hash,
        identificadorExterno: crypto.randomUUID(),
        ipOrigen: '0.0.0.0',
        montoTransaccion: body.monto,
        terminal: 'ASHIRA-WEB/10.0.0.1',
        tipoCtaCele: body.tipoCuenta || 'CNTA',
      }),
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('[Bancaribe Transferencia] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
