import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    if (process.env.BANCARIBE_MOCK_MODE !== 'true') {
      return NextResponse.json({ error: 'Solo disponible en modo demo/mock' }, { status: 403 });
    }

    const { monto, telefonoPaciente, organizationId, appointmentId } = await request.json();

    let commercePhone = '00584168327199'; // fallback

    if (organizationId) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: config } = await supabase
          .from('bancaribe_config')
          .select('telefono_comercio')
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (config?.telefono_comercio) {
          let ph = config.telefono_comercio.replace(/\D/g, '');
          if (ph.startsWith('0058')) {
            // Ya tiene prefijo
          } else if (ph.startsWith('58') && ph.length === 12) {
            ph = '00' + ph;
          } else {
            // Quitar 0 inicial y poner 0058
            if (ph.startsWith('0')) ph = ph.substring(1);
            ph = '0058' + ph;
          }
          commercePhone = ph;
        }
      }
    }

    const notificacion = {
      amount: Number(monto) || 150,
      bankName: 'BANCO MERCANTIL',
      clientPhone: `0058${telefonoPaciente?.replace(/\D/g, '').replace(/^0/, '').replace(/^58/, '') || '4141234567'}`,
      commercePhone,
      creditorAccount: '01140152001520123861',
      currencyCode: 'VES',
      date: new Date().toLocaleDateString('es-VE'),
      debtorAccount: '01050152001520123746',
      debtorID: '12345678',
      destinyBankReference: `000${Math.floor(Math.random() * 999999999)}`,
      originBankCode: '0105',
      originBankReference: `${Math.floor(100000000 + Math.random() * 900000000)}`,
      paymentType: 'P2P',
      time: new Date().toLocaleTimeString('es-VE'),
      Udf1: organizationId,
      Udf2: appointmentId || '',
    };

    // Llamada interna al webhook — misma lógica que si viniera de Bancaribe
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${appUrl}/api/bancaribe/webhook`;
    
    console.log('[Bancaribe Simular Pago] Discharging payload to webhook:', webhookUrl, notificacion);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${process.env.BANCARIBE_WEBHOOK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificacion),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `Webhook returned status ${response.status}: ${errorText}`,
      }, { status: 500 });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Pago simulado enviado. Revisa la cita y el correo del paciente.',
      webhookResult: result,
      notificacion,
    });
  } catch (error: any) {
    console.error('[Bancaribe Simular Pago] Global error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
