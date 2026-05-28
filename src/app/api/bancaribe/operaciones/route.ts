import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getAuthenticatedUser } from '@/lib/auth-guards';
import { bancaribeRequest } from '@/lib/bancaribe/client';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'No autorizado o sin organización' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    // Verificar que la organización sea de tipo CONSULTORIO
    const { data: org, error: orgError } = await supabase
      .from('organization')
      .select('id, type')
      .eq('id', user.organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    if (org.type !== 'CONSULTORIO') {
      return NextResponse.json({ error: 'Solo disponible para consultorios' }, { status: 403 });
    }

    const body = await request.json(); // { referencia, monto, cedulaPaciente, telefonoPaciente, fecha, tipoTrx }

    // Obtener config Bancaribe de la organización
    const { data: config, error: configError } = await supabase
      .from('bancaribe_config')
      .select('*')
      .eq('organization_id', org.id)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Bancaribe no configurado en este consultorio' }, { status: 400 });
    }

    // Si estamos en mock mode o si config fuerza sandbox
    if (process.env.BANCARIBE_MOCK_MODE === 'true' || config.is_sandbox) {
      return NextResponse.json(getMockOperacion(body));
    }

    // Request real a Bancaribe - consultaoperacion
    const resultado = await bancaribeRequest('/B2P/1.0.0/consultaoperacion', {
      method: 'POST',
      body: JSON.stringify({
        tipoTrx: body.tipoTrx || 'PM',           // PM=Pago Móvil, TRF=Transferencia
        montoTransaccion: body.monto,
        rif: config.rif,
        identificadorPersona: body.cedulaPaciente,
        referencia: body.referencia,
        telefonoDebito: body.telefonoPaciente,
        factura: body.factura || '',
        fecha: body.fecha, // formato dd/mm/aaaa
        hash: config.hash_cliente,
        numCuenta: config.cuenta_bancaribe,
        IO: 'I',                                  // I = Ingreso (cobros recibidos)
        BCV: 'S',                                 // S = incluir equivalente BCV
      }),
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('[Bancaribe Operaciones] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// Mock data para demo
function getMockOperacion(body: any) {
  return {
    success: true,
    data: {
      success: 'true',
      ejecucion: '0',
      descripcion: 'EJECUTADO CORRECTAMENTE',
      docCliente: body.cedulaPaciente || 'V12345678',
      telfCtaCliente: body.telefonoPaciente || '04141234567',
      fecha: body.fecha || new Date().toLocaleDateString('es-VE'),
      hora: new Date().toLocaleTimeString('es-VE'),
      signo: 'C',
      valor: body.monto || '150.00',
      secuencial: body.referencia || '90120380',
      estadoEjecucion: 'EJ',
    },
  };
}
