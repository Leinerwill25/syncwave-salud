import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getAuthenticatedUser } from '@/lib/auth-guards';
import { bancaribeRequest } from '@/lib/bancaribe/client';
import { MOCK_EXTRACTO } from '@/lib/bancaribe/mock-data';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'No autorizado o sin organización' }, { status: 401 });
    }

    const body = await request.json(); // { from, to, page, limit }

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
      return NextResponse.json(MOCK_EXTRACTO);
    }

    // Método histórico según especificación Extracto Bancario
    const resultado = await bancaribeRequest('/B2P/1.0.0/extracto/historico', {
      method: 'POST',
      body: JSON.stringify({
        account: config.cuenta_bancaribe,
        rif: config.rif,
        from: body.from,   // "YYYY-MM-DD"
        to: body.to,       // "YYYY-MM-DD"
        limit: body.limit || 50,
        page: body.page || 1,
      }),
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('[Bancaribe Extracto] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
