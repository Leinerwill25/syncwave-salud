import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(data: EmailData) {
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ASHIRA <noreply@ashira.app>',
      to: data.to,
      subject: data.subject,
      html: data.html
    });

    return {
      success: true,
      id: result.data?.id
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error
    };
  }
}

export function getLabResultNotificationEmailForDoctor(data: {
  doctorName: string;
  patientName: string;
  resultTitle: string;
  labName: string;
  isCritical: boolean;
  dashboardUrl: string;
}) {
  const criticalBadge = data.isCritical
    ? `<span style="display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-left: 8px;">⚠️ CRÍTICO</span>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo Resultado de Laboratorio</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🔬 Nuevo Resultado de Laboratorio
              </h1>
              ${criticalBadge}
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #334155; font-size: 16px; line-height: 1.6;">
                Hola <strong>${data.doctorName}</strong>,
              </p>

              <p style="margin: 0 0 30px; color: #334155; font-size: 16px; line-height: 1.6;">
                Se ha cargado un nuevo resultado de laboratorio que requiere tu revisión:
              </p>

              <!-- Result Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdfa; border-left: 4px solid #0d9488; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; color: #0f766e; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Detalles del Resultado
                    </p>
                    <p style="margin: 0 0 8px; color: #334155; font-size: 16px;">
                      <strong>Paciente:</strong> ${data.patientName}
                    </p>
                    <p style="margin: 0 0 8px; color: #334155; font-size: 16px;">
                      <strong>Resultado:</strong> ${data.resultTitle}
                    </p>
                    <p style="margin: 0; color: #334155; font-size: 16px;">
                      <strong>Laboratorio:</strong> ${data.labName}
                    </p>
                  </td>
                </tr>
              </table>

              ${data.isCritical ? `
              <!-- Critical Alert -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
                      ⚠️ Este resultado ha sido marcado como CRÍTICO y requiere atención inmediata.
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(13, 148, 136, 0.3);">
                      Revisar Resultado →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Por favor, revisa y aprueba este resultado para que el paciente pueda acceder a él desde su dashboard.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">
                ASHIRA SOFTWARE - Sistema de Gestión Médica
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function getLabResultNotificationEmailForPatient(data: {
  patientName: string;
  resultTitle: string;
  labName: string;
  doctorName: string;
  dashboardUrl: string;
  isApproved: boolean;
}) {
  if (data.isApproved) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resultado de Laboratorio Disponible</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                ✅ Resultado de Laboratorio Disponible
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #334155; font-size: 16px; line-height: 1.6;">
                Hola <strong>${data.patientName}</strong>,
              </p>

              <p style="margin: 0 0 30px; color: #334155; font-size: 16px; line-height: 1.6;">
                Tu resultado de laboratorio ya está disponible en tu historial médico:
              </p>

              <!-- Result Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; color: #15803d; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Detalles del Resultado
                    </p>
                    <p style="margin: 0 0 8px; color: #334155; font-size: 16px;">
                      <strong>Resultado:</strong> ${data.resultTitle}
                    </p>
                    <p style="margin: 0 0 8px; color: #334155; font-size: 16px;">
                      <strong>Laboratorio:</strong> ${data.labName}
                    </p>
                    <p style="margin: 0; color: #334155; font-size: 16px;">
                      <strong>Revisado por:</strong> Dr. ${data.doctorName}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(13, 148, 136, 0.3);">
                      Ver Mi Resultado →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Puedes ver y descargar tu resultado en cualquier momento desde tu dashboard de paciente.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">
                ASHIRA SOFTWARE - Tu Salud, Siempre Contigo
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  } else {
    // Email para cuando se carga el resultado (pendiente de aprobación)
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resultado de Laboratorio Recibido</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                📋 Resultado de Laboratorio Recibido
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #334155; font-size: 16px; line-height: 1.6;">
                Hola <strong>${data.patientName}</strong>,
              </p>

              <p style="margin: 0 0 30px; color: #334155; font-size: 16px; line-height: 1.6;">
                Hemos recibido un nuevo resultado de laboratorio a tu nombre:
              </p>

              <!-- Result Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; color: #92400e; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Detalles del Resultado
                    </p>
                    <p style="margin: 0 0 8px; color: #334155; font-size: 16px;">
                      <strong>Resultado:</strong> ${data.resultTitle}
                    </p>
                    <p style="margin: 0; color: #334155; font-size: 16px;">
                      <strong>Laboratorio:</strong> ${data.labName}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                      ℹ️ Tu médico está revisando este resultado. Te notificaremos cuando esté disponible en tu dashboard.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Una vez que el Dr. ${data.doctorName} apruebe el resultado, podrás verlo y descargarlo desde tu dashboard de paciente.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">
                ASHIRA SOFTWARE - Tu Salud, Siempre Contigo
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
