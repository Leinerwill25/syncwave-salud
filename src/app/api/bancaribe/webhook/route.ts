import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface BancaribeNotificacion {
  amount: number;
  bankName: string;
  clientPhone: string;      // Teléfono del paciente pagador (ej. 00584141234567 o 04141234567)
  commercePhone: string;    // Teléfono del consultorio receptor
  creditorAccount: string;
  currencyCode: string;
  date: string;             // "23-10-2024"
  debtorAccount: string;
  debtorID: string;         // Cédula del paciente
  destinyBankReference: string;
  originBankCode: string;
  originBankReference: string;
  paymentType: string;      // TRF | P2P | DEP
  time: string;             // "08:45:00"
  Udf1?: string;
  Udf2?: string;
  Udf3?: string;
}

export async function POST(request: NextRequest) {
  try {
    // PASO 1: Validar ApiKey que envía Bancaribe en el header
    const apiKey = request.headers.get('Authorization');
    const expectedKey = `ApiKey ${process.env.BANCARIBE_WEBHOOK_API_KEY}`;

    if (apiKey !== expectedKey) {
      console.error('[Bancaribe Webhook] Authorization key mismatch:', { received: apiKey, expected: expectedKey });
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const notificacion: BancaribeNotificacion = await request.json();
    console.log('[Bancaribe Webhook] Received notification:', notificacion);

    // Normalizar números de teléfono (removiendo 0058, +58, 58 al inicio, y dejando solo 10 dígitos)
    const normalizePhone = (ph: string) => {
      if (!ph) return '';
      const numbersOnly = ph.replace(/\D/g, '');
      // Si empieza con 0058, quitarlo
      let cleaned = numbersOnly;
      if (cleaned.startsWith('0058')) {
        cleaned = cleaned.substring(4);
      } else if (cleaned.startsWith('58')) {
        cleaned = cleaned.substring(2);
      }
      // Asegurar que comience con 0 si tiene 10 dígitos y es formato local
      if (cleaned.length === 10) {
        cleaned = '0' + cleaned;
      }
      return cleaned;
    };

    const commercePhoneNormalized = normalizePhone(notificacion.commercePhone);

    // PASO 2: Buscar la organización por su organización_id (Udf1) o teléfono de comercio afiliado
    let config: { organization_id: string } | null = null;
    let configError = null;

    if (notificacion.Udf1) {
      const { data, error } = await supabaseAdmin
        .from('bancaribe_config')
        .select('organization_id')
        .eq('organization_id', notificacion.Udf1)
        .maybeSingle();
      config = data;
      configError = error;
    }

    if (!config && !configError) {
      const { data, error } = await supabaseAdmin
        .from('bancaribe_config')
        .select('organization_id')
        .eq('telefono_comercio', commercePhoneNormalized)
        .limit(1);
      
      if (data && data.length > 0) {
        config = data[0];
      }
      configError = error;
    }

    if (configError || !config) {
      console.warn('[Bancaribe Webhook] Notification received for non-configured commerce phone/org:', notificacion.commercePhone, configError);
      // Igualmente guardamos para auditoría si podemos deducirlo o simplemente retornamos 200 para el banco
      return NextResponse.json({ message: 'Success', statusCode: 200 });
    }

    // PASO 3: Guardar el pago en la tabla bancaribe_pagos
    const { data: pago, error: insertError } = await supabaseAdmin
      .from('bancaribe_pagos')
      .insert({
        organization_id: config.organization_id,
        amount: notificacion.amount,
        currency_code: notificacion.currencyCode,
        bank_name: notificacion.bankName,
        client_phone: notificacion.clientPhone,
        commerce_phone: notificacion.commercePhone,
        creditor_account: notificacion.creditorAccount,
        debtor_account: notificacion.debtorAccount,
        debtor_id: notificacion.debtorID,
        destiny_bank_reference: notificacion.destinyBankReference,
        origin_bank_code: notificacion.originBankCode,
        origin_bank_reference: notificacion.originBankReference,
        payment_type: notificacion.paymentType,
        transaction_date: notificacion.date,
        transaction_time: notificacion.time,
        status: 'received',
      })
      .select()
      .single();

    if (insertError || !pago) {
      console.error('[Bancaribe Webhook] Error persisting payment record:', insertError);
      return NextResponse.json({ error: 'Database write failed' }, { status: 500 });
    }

    // PASO 4: Intentar cruzar con una cita pendiente de pago
    // Obtener citas del día en estado "pending" de pago para esta organización
    const { data: appointments, error: apptError } = await supabaseAdmin
      .from('appointment')
      .select(`
        id,
        scheduled_at,
        patient_id,
        unregistered_patient_id,
        patient:patient_id (
          id,
          firstName,
          lastName,
          phone,
          email
        ),
        unregistered_patient:unregistered_patient_id (
          id,
          first_name,
          last_name,
          phone,
          email
        )
      `)
      .eq('organization_id', config.organization_id)
      .eq('payment_status', 'pending');

    if (apptError) {
      console.error('[Bancaribe Webhook] Error fetching pending appointments:', apptError);
    }

    const clientPhoneNormalized = normalizePhone(notificacion.clientPhone);
    const last10DigitsClient = clientPhoneNormalized.slice(-10);

    // Buscar cita. Si viene Udf2 (appointmentId), usarlo directamente.
    // De lo contrario, buscar una cita en la que el teléfono coincida.
    let matchingAppt = null;

    if (notificacion.Udf2) {
      matchingAppt = appointments?.find(app => app.id === notificacion.Udf2);
    }

    if (!matchingAppt) {
      matchingAppt = appointments?.find(app => {
        const patientData: any = Array.isArray(app.patient) ? app.patient[0] : app.patient;
        const unregPatientData: any = Array.isArray(app.unregistered_patient) ? app.unregistered_patient[0] : app.unregistered_patient;
        const pPhone = patientData?.phone || unregPatientData?.phone || '';
        const pPhoneNormalized = normalizePhone(pPhone);
        return pPhoneNormalized.slice(-10) === last10DigitsClient;
      });
    }

    if (matchingAppt) {
      // PASO 5: Marcar cita como pago verificado
      const { error: updateApptError } = await supabaseAdmin
        .from('appointment')
        .update({
          payment_status: 'verified_bancaribe',
          payment_reference: notificacion.originBankReference,
          payment_amount: notificacion.amount,
          payment_verified_at: new Date().toISOString(),
        })
        .eq('id', matchingAppt.id);

      if (updateApptError) {
        console.error('[Bancaribe Webhook] Error updating appointment payment status:', updateApptError);
      }

      // Actualizar el pago con el ID de la cita y estado 'matched'
      await supabaseAdmin
        .from('bancaribe_pagos')
        .update({ appointment_id: matchingAppt.id, status: 'matched' })
        .eq('id', pago.id);

      // PASO 5.5: Buscar y conciliar la factura correspondiente a la cita
      const { data: factura, error: fetchFacturaError } = await supabaseAdmin
        .from('facturacion')
        .select('id, total, currency, doctor_id, notas')
        .eq('appointment_id', matchingAppt.id)
        .eq('estado_pago', 'pendiente')
        .maybeSingle();

      if (factura && !fetchFacturaError) {
        const notasParts: string[] = [];
        if (factura.notas) {
          notasParts.push(factura.notas);
        }
        notasParts.push(`[REFERENCIA BANCARIBE C2P] ${notificacion.originBankReference}`);

        const { error: updateFacturaError } = await supabaseAdmin
          .from('facturacion')
          .update({
            estado_pago: 'pagada',
            metodo_pago: 'BANCARIBE_C2P',
            fecha_pago: new Date().toISOString(),
            notas: notasParts.join('\n'),
          })
          .eq('id', factura.id);

        if (updateFacturaError) {
          console.error('[Bancaribe Webhook] Error updating factura status:', updateFacturaError);
        }

        // Crear notificación para el médico
        if (factura.doctor_id) {
          try {
            const { createNotification } = await import('@/lib/notifications');
            await createNotification({
              userId: factura.doctor_id,
              type: 'PAYMENT_RECEIVED',
              title: 'Pago Recibido (Bancaribe C2P)',
              message: `El paciente ha pagado la factura de ${factura.total} ${factura.currency} vía Bancaribe C2P.`,
              payload: {
                facturaId: factura.id,
                patientId: matchingAppt.patient_id,
                total: factura.total,
                currency: factura.currency,
                metodoPago: 'BANCARIBE_C2P',
                facturaUrl: `/dashboard/medic/pagos`,
              },
              sendEmail: true,
            });
          } catch (notifError) {
            console.error('[Bancaribe Webhook] Error creating doctor notification:', notifError);
          }
        }

        // Otorgar puntos de referidos/gamificación si aplica
        try {
          const { data: userData } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('patientProfileId', matchingAppt.patient_id)
            .maybeSingle();
            
          if (userData?.id) {
            const { awardPoints } = await import('@/lib/actions/points');
            await awardPoints(userData.id, 'invoice_paid_online', factura.id, 'facturacion');
          }
        } catch (pointsErr) {
          console.error('[Bancaribe Webhook] Error awarding points:', pointsErr);
        }
      }

      const patientData: any = Array.isArray(matchingAppt.patient) ? matchingAppt.patient[0] : matchingAppt.patient;
      const unregPatientData: any = Array.isArray(matchingAppt.unregistered_patient) ? matchingAppt.unregistered_patient[0] : matchingAppt.unregistered_patient;

      // Obtener datos de contacto para notificar
      const patientName = patientData
        ? `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim()
        : unregPatientData
          ? `${unregPatientData.first_name || ''} ${unregPatientData.last_name || ''}`.trim()
          : 'Paciente';

      const patientEmail = patientData?.email || unregPatientData?.email;

      // PASO 6: Enviar email de confirmación al paciente vía Resend
      if (patientEmail && process.env.RESEND_API_KEY) {
        try {
          await resend.emails.send({
            from: 'ASHIRA <notificaciones@ashira.app>',
            to: patientEmail,
            subject: '✅ Tu pago fue recibido — Cita confirmada',
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 40px;">✅</span>
                </div>
                <h2 style="color: #0d9488; text-align: center; margin-top: 0;">Pago Recibido Exitosamente</h2>
                <p>Hola <strong>${patientName}</strong>,</p>
                <p>Te informamos que tu pago por un monto de <strong>Bs. ${notificacion.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong> ha sido verificado automáticamente mediante los servicios bancarios de Bancaribe.</p>
                
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="margin: 0 0 8px 0; color: #166534;">Detalles de la Transacción:</h4>
                  <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 4px 0; color: #4b5563;">Referencia:</td>
                      <td style="padding: 4px 0; font-weight: bold; color: #1f2937;">${notificacion.originBankReference}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #4b5563;">Fecha y Hora:</td>
                      <td style="padding: 4px 0; font-weight: bold; color: #1f2937;">${notificacion.date} a las ${notificacion.time}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #4b5563;">Banco Emisor:</td>
                      <td style="padding: 4px 0; font-weight: bold; color: #1f2937;">${notificacion.bankName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #4b5563;">Método:</td>
                      <td style="padding: 4px 0; font-weight: bold; color: #1f2937;">${notificacion.paymentType === 'P2P' ? 'Pago Móvil C2P' : 'Transferencia Bancaria'}</td>
                    </tr>
                  </table>
                </div>
                
                <p>Tu cita ya está confirmada en nuestra agenda. No requieres realizar ninguna otra validación manual.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #64748b; font-size: 11px; text-align: center; margin-bottom: 0;">Este correo electrónico fue generado automáticamente por ASHIRA en alianza con Bancaribe Open Banking.</p>
              </div>
            `,
          });
          console.log('[Bancaribe Webhook] Resend confirmation email sent to:', patientEmail);
        } catch (mailError) {
          console.error('[Bancaribe Webhook] Error sending Resend email:', mailError);
        }
      } else {
        console.log('[Bancaribe Webhook] Skip sending email (no email found or RESEND_API_KEY missing):', { hasEmail: !!patientEmail, hasKey: !!process.env.RESEND_API_KEY });
      }
    } else {
      // Marcar para revisión manual
      console.warn('[Bancaribe Webhook] Payment matched no pending appointment for client phone:', notificacion.clientPhone);
      await supabaseAdmin
        .from('bancaribe_pagos')
        .update({ status: 'unmatched' })
        .eq('id', pago.id);
    }

    return NextResponse.json({ message: 'Success', statusCode: 200 });
  } catch (error: any) {
    console.error('[Bancaribe Webhook] Global error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
