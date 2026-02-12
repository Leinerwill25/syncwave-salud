import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH /api/medic/lab-results/[id]/reject
 * Rechazar resultado de laboratorio
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
    const body = await req.json();
    const { reason } = body;

    // Verificar que el resultado pertenece a la organización del médico
    // Obtener información del médico
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organizationId')
      .eq('authId', user.id)
      .single();

    const { data: result } = await supabase
      .from('lab_result_upload')
      .select('organization_id')
      .eq('id', resultId)
      .single();

    if (!result || result.organization_id !== userData?.organizationId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Rechazar resultado
    const { data: updated, error: updateError } = await supabase
      .from('lab_result_upload')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_reason: reason || 'Sin razón especificada'
      })
      .eq('id', resultId)
      .select()
      .single();

    if (updateError) {
      console.error('Error rejecting result:', updateError);
      return NextResponse.json({ error: 'Error al rechazar resultado' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      result: updated
    }, { status: 200 });

  } catch (error) {
    console.error('Error rejecting result:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
