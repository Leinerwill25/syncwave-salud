import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getAuthenticatedUser } from '@/lib/auth-guards';
import { bancaribeRequest } from '@/lib/bancaribe/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'No autorizado o sin organización' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: config, error: configError } = await supabase
      .from('bancaribe_config')
      .select('*')
      .eq('organization_id', user.organizationId)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Bancaribe no configurado en este consultorio' }, { status: 400 });
    }

    if (process.env.BANCARIBE_MOCK_MODE === 'true' || config.is_sandbox) {
      return NextResponse.json({
        producto: { numeroCuenta: config.cuenta_bancaribe || '01140000000000000001' },
        moneda: { descripcion: 'BOLIVAR', codigo: 'VES' },
        saldo: { disponible: 125430.50, contable: 125430.50, bloqueado: 0 },
      });
    }

    // Según especificación Consulta de Saldo Disponible
    const resultado = await bancaribeRequest('/B2P/1.0.0/consultaSaldo', {
      method: 'POST',
      body: JSON.stringify({
        canal: 'API',
        clienteHash: config.hash_cliente,
        clienteRIF: config.rif,
        numeroCuenta: config.cuenta_bancaribe, // null o vacío para todas las cuentas
        requestIP: '0.0.0.0',
      }),
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('[Bancaribe Saldo] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
