import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getAuthenticatedUser } from '@/lib/auth-guards';
import { bancaribeRequest } from '@/lib/bancaribe/client';
import { MOCK_HISTORICO } from '@/lib/bancaribe/mock-data';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'No autorizado o sin organización' }, { status: 401 });
    }

    const body = await request.json(); // { fecha, tipoTrx, referencia, monto, cedulaPaciente, telefonoPaciente }

    const supabase = await createSupabaseServerClient();
    // Obtener config Bancaribe de la organización
    const { data: config, error: configError } = await supabase
      .from('bancaribe_config')
      .select('*')
      .eq('organization_id', user.organizationId)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Bancaribe no configurado en este consultorio' }, { status: 400 });
    }

    if (process.env.BANCARIBE_MOCK_MODE === 'true' || config.is_sandbox) {
      return NextResponse.json(MOCK_HISTORICO);
    }

    // Método queryPaymentB2P según especificación histórico
    const resultado = await bancaribeRequest('/B2P/1.0.0/queryPaymentB2P', {
      method: 'POST',
      body: JSON.stringify({
        tipoTrx: body.tipoTrx || 'PM',
        rif: config.rif,
        referencia: body.referencia,
        montoTransaccion: body.monto,
        identificadorPersona: body.cedulaPaciente,
        telefonoDebito: body.telefonoPaciente,
        factura: body.factura || '',
        fecha: body.fecha,
      }),
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('[Bancaribe Histórico] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
