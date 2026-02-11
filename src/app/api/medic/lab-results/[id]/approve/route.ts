import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH /api/medic/lab-results/[id]/approve
 * Aprobar resultado de laboratorio
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const resultId = id;

    // Verificar que el resultado pertenece    // Obtener información del médico
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('organizationId')
      .eq('authId', user.id)
      .single();

    const { data: result } = await supabase
      .from('lab_result_upload')
      .select('organization_id, patient_id')
      .eq('id', resultId)
      .single();

    if (!result || result.organization_id !== userData?.organizationId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Aprobar resultado
    const { data: updated, error: updateError } = await supabase
      .from('lab_result_upload')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id
      })
      .eq('id', resultId)
      .select()
      .single();

    if (updateError) {
      console.error('Error approving result:', updateError);
      return NextResponse.json({ error: 'Error al aprobar resultado' }, { status: 500 });
    }

    // Crear notificación de aprobación para el paciente
    if (result.patient_id) {
      const { data: patient } = await supabase
        .from('patient')
        .select('id')
        .eq('id', result.patient_id)
        .single();

      const { data: patientUser } = await supabase
        .from('user')
        .select('email')
        .eq('id', result.patient_id)
        .single();

      if (patientUser?.email) {
        // Crear notificaciones de aprobación
        await supabase
          .from('lab_upload_notification')
          .insert([
            {
              lab_result_id: updated.id,
              recipient_type: 'patient',
              recipient_id: result.patient_id,
              recipient_email: patientUser.email,
              notification_type: 'email',
              status: 'pending'
            },
            {
              lab_result_id: updated.id,
              recipient_type: 'patient',
              recipient_id: result.patient_id,
              recipient_email: patientUser.email,
              notification_type: 'in_app',
              status: 'pending'
            }
          ]);

        // Trigger notification processing
        try {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send-lab-result-notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).catch(err => console.error('Error triggering notifications:', err));
        } catch (err) {
          console.error('Error triggering notifications:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      result: updated
    }, { status: 200 });

  } catch (error) {
    console.error('Error approving result:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
