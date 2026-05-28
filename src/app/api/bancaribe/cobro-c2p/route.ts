import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { bancaribeRequest } from '@/lib/bancaribe/client';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface CobroC2PRequest {
  organizationId: string;
  monto: string | number;
  telefonoPaciente: string;       // Teléfono del paciente a cobrar
  bancoPaciente: string;          // Código del banco del paciente (ej: 0105)
  cedulaPaciente: string;
  conceptoCita: string;           // Ej: "Consulta Cardiología - Dr. González"
  appointmentId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body: CobroC2PRequest = await request.json();

    if (!body.organizationId || !body.monto || !body.telefonoPaciente || !body.bancoPaciente || !body.cedulaPaciente) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const { data: config, error: configError } = await supabaseAdmin
      .from('bancaribe_config')
      .select('*')
      .eq('organization_id', body.organizationId)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'El consultorio destino no tiene configurado Bancaribe' }, { status: 400 });
    }

    if (process.env.BANCARIBE_MOCK_MODE === 'true' || config.is_sandbox) {
      return NextResponse.json({
        Envelope: {
          Body: {
            registrarPagoC2pApiResponse: {
              out: {
                codigoError: 0,
                descripcionError: 'Transaccion Exitosa',
                secuencial: Math.floor(100000000 + Math.random() * 900000000),
              },
            },
          },
        },
      });
    }

    // Método registrarPagoC2p según especificación C2P
    const resultado = await bancaribeRequest('/B2P/1.0.0/registrarPagoC2p', {
      method: 'POST',
      body: JSON.stringify({
        identificadorExterno: crypto.randomUUID(), // Token único por transacción
        direccionInternet: '0.0.0.0',
        rif: config.rif,
        telefonoCredito: config.telefono_comercio,
        telefonoPersona: body.telefonoPaciente,
        bancoPersona: body.bancoPaciente,
        cedulaPersona: body.cedulaPaciente,
        montoTransaccion: String(body.monto),
        concepto: body.conceptoCita,
        canal: '1',           // 1 = Internet
        terminal: 'ASHIRA-WEB/10.0.0.1',
        tipoTerminal: 'WEB',
        factura: body.appointmentId || '0',
      }),
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('[Bancaribe C2P] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
