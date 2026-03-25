import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';

export async function GET() {
  try {
    const patient = await getAuthenticatedPatient();
    if (!patient) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    // Obtener resultados aprobados del paciente usando patientId (NO authId)
    const { data, error } = await supabase
      .from('lab_result_upload')
      .select(`
        *,
        consultation:consultation_id (
          id,
          started_at,
          chief_complaint
        ),
        doctor:doctor_id (
          id,
          name
        )
      `)
      .eq('patient_id', patient.patientId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Patient Lab Results API] Error:', error);
      return NextResponse.json({ error: 'Error al obtener resultados' }, { status: 500 });
    }

    // Marcar como visto de forma asíncrona si hay pendientes
    if (data && data.length > 0) {
      const unseenIds = data.filter(r => !r.viewed_by_patient).map(r => r.id);
      if (unseenIds.length > 0) {
        // Ejecutar en segundo plano sin esperar (fire and forget)
        supabase
          .from('lab_result_upload')
          .update({ viewed_by_patient: true })
          .in('id', unseenIds)
          .then(({ error: updateError }) => {
            if (updateError) console.error('[Patient Lab Results API] Error updating viewed status:', updateError);
          });
      }
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('[Patient Lab Results API] Internal error:', err);
    return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
  }
}
