import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getAuthenticatedUser } from '@/lib/auth-guards';
import { bancaribeRequest } from '@/lib/bancaribe/client';
import { MOCK_MOVIMIENTOS } from '@/lib/bancaribe/mock-data';

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
      // Obtener pagos reales registrados para este consultorio en la tabla bancaribe_pagos
      const { data: dbPagos } = await supabase
        .from('bancaribe_pagos')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('createdAt', { ascending: false });

      const dbMovimientos = (dbPagos || []).map((pago: any) => {
        let fecha = new Date(pago.createdAt || new Date()).toISOString().split('T')[0];
        let hora = new Date(pago.createdAt || new Date()).toTimeString().split(' ')[0];

        if (pago.transaction_date) {
          const parts = pago.transaction_date.split(/[-/]/);
          if (parts.length === 3) {
            if (parts[2].length === 4) {
              fecha = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else if (parts[0].length === 4) {
              fecha = `${parts[0]}-${parts[1]}-${parts[2]}`;
            }
          }
        }
        if (pago.transaction_time) {
          hora = pago.transaction_time;
        }

        return {
          fecha,
          hora,
          tipo: pago.payment_type || 'P2P',
          monto: pago.amount,
          referencia: pago.origin_bank_reference || pago.destiny_bank_reference || '00000000',
          descripcion: pago.payment_type === 'TRF' ? 'Transferencia recibida' : 'Pago móvil recibido',
          banco: pago.bank_name || 'BANCARIBE',
          telefono: pago.client_phone || '',
          signo: 'C',
        };
      });

      const combinados = [...dbMovimientos, ...MOCK_MOVIMIENTOS.movimientos];
      return NextResponse.json({ movimientos: combinados });
    }

    // Servicio ctasMovimientos según especificación
    const resultado = await bancaribeRequest('/B2P/1.0.0/ctasMovimientos', {
      method: 'POST',
      body: JSON.stringify({
        canal: 'API',
        clienteRIF: config.rif,
        clienteHash: config.hash_cliente,
        requestIP: '0.0.0.0', // Se reemplaza por IP real o genérica de servidor
        numeroCuenta: config.cuenta_bancaribe,
      }),
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('[Bancaribe Movimientos] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
