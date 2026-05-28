import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getAuthenticatedUser } from '@/lib/auth-guards';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'No autorizado o sin organización' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: config, error } = await supabase
      .from('bancaribe_config')
      .select('*')
      .eq('organization_id', user.organizationId)
      .maybeSingle();

    if (error) {
      console.error('[Bancaribe Config GET] DB Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('[Bancaribe Config GET] Global Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'No autorizado o sin organización' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const body = await request.json(); // { rif, cuenta_bancaribe, telefono_comercio, hash_cliente, notificaciones_activas, webhook_configurado, is_sandbox }

    // Rellena la organización
    const configData = {
      organization_id: user.organizationId,
      rif: body.rif,
      cuenta_bancaribe: body.cuenta_bancaribe,
      telefono_comercio: body.telefono_comercio?.replace(/\D/g, '').replace(/^0/, '0'), // Normalizar formato
      hash_cliente: body.hash_cliente,
      notificaciones_activas: !!body.notificaciones_activas,
      webhook_configurado: !!body.webhook_configurado,
      is_sandbox: body.is_sandbox !== undefined ? !!body.is_sandbox : true,
      updatedAt: new Date().toISOString(),
    };

    // Hacer upsert
    const { data: existing } = await supabase
      .from('bancaribe_config')
      .select('id')
      .eq('organization_id', user.organizationId)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase
        .from('bancaribe_config')
        .update(configData)
        .eq('organization_id', user.organizationId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('bancaribe_config')
        .insert({
          ...configData,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('[Bancaribe Config POST] DB Error:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: result.data });
  } catch (error: any) {
    console.error('[Bancaribe Config POST] Global Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
