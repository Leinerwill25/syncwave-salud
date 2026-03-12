
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAssignmentNotification(params: {
    to: string;
    professionalName: string;
    patientName: string;
    clinicName: string;
    role: 'MEDICO' | 'ENFERMERO';
}) {
    const { to, professionalName, patientName, clinicName, role } = params;

    const subject = `Asignación de Paciente: ${patientName} en ${clinicName}`;
    
    // Simplificando el diseño para que sea limpio y profesional
    const html = `
        <div style="font-family: sans-serif; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; rounded: 24px;">
            <div style="background-color: #0d9488; padding: 20px; text-align: center; border-radius: 16px 16px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Syncwave Salud</h1>
            </div>
            <div style="padding: 30px; background-color: white; border-radius: 0 0 16px 16px;">
                <h2 style="color: #0f172a;">Hola, ${professionalName}</h2>
                <p style="font-size: 16px; line-height: 1.6;">
                    Te informamos que la clínica <strong>${clinicName}</strong> te ha asignado al equipo de cuidado del paciente:
                </p>
                
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <p style="margin: 0; font-weight: bold; color: #0d9488;">Paciente:</p>
                    <p style="margin: 5px 0 0 0; font-size: 18px; color: #1e293b;">${patientName}</p>
                </div>

                <p style="font-size: 14px; color: #64748b;">
                    Como <strong>${role === 'MEDICO' ? 'Médico Especialista' : 'Personal de Enfermería'}</strong>, ahora tienes acceso a la historia clínica y evoluciones de este paciente para esta institución.
                </p>

                <div style="margin-top: 30px; text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                       style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold;">
                        Ir a mi Panel
                    </a>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
                © 2026 Syncwave Salud. Este es un mensaje automático para profesionales registrados.
            </div>
        </div>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: 'Syncwave Salud <notifications@resend.dev>', // Usar dominio verificado en prod
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error('[Resend Error]', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error('[Resend Exception]', err);
        return { success: false, error: err };
    }
}
