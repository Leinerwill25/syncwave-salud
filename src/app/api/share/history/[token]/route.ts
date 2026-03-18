import { createSupabaseAdminClient } from '@/app/adapters/admin';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const adminSupabase = createSupabaseAdminClient();

  try {
    // 1. Validar el token y obtener el ID del paciente
    const { data: sharedLink, error: linkError } = await adminSupabase
      .from('shared_history_links')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (linkError || !sharedLink) {
      return NextResponse.json({ error: 'El enlace ha expirado o no es válido' }, { status: 404 });
    }

    const patientId = sharedLink.patient_id || sharedLink.unregistered_patient_id;

    // 2. Obtener datos del paciente (Info básica)
    let patientData = null;
    if (sharedLink.patient_id) {
        const { data } = await adminSupabase.from('patient').select('*').eq('id', patientId).single();
        patientData = data;
    } else {
        const { data } = await adminSupabase.from('unregisteredpatients').select('*').eq('id', patientId).single();
        patientData = data;
    }

    // 3. Consultas (admin_consultations) con sus especialistas
    const { data: consultations } = await adminSupabase
      .from('admin_consultations')
      .select(`
        *,
        specialist:specialist_id (
          first_name,
          last_name,
          role
        )
      `)
      .or(`patient_id.eq.${patientId},unregistered_patient_id.eq.${patientId}`)
      .order('consultation_date', { ascending: false });

    // 4. Documentos (clinical_documents)
    const { data: documents } = await adminSupabase
      .from('clinical_documents')
      .select('*')
      .or(`patient_id.eq.${patientId},unregistered_patient_id.eq.${patientId}`)
      .order('uploaded_at', { ascending: false });

    // 5. Notas de Enfermería / Kardex (nurse_kardex_notes) - Solo PÚBLICAS y EVOLUTIVAS
    const { data: nursingNotes } = await adminSupabase
      .from('nurse_kardex_notes')
      .select(`
        *,
        nurse:nurse_id (
          full_name,
          nurse_type
        )
      `)
      .or(`patient_id.eq.${patientId},unregistered_patient_id.eq.${patientId}`)
      .in('note_type', ['public', 'evolution'])
      .order('created_at', { ascending: false });

    return NextResponse.json({
      patient: {
          first_name: patientData?.firstName || patientData?.first_name,
          last_name: patientData?.lastName || patientData?.last_name,
          identifier: patientData?.identifier || patientData?.identification,
          date_of_birth: patientData?.dob || patientData?.birth_date,
      },
      consultations: consultations || [],
      documents: documents || [],
      nursingNotes: nursingNotes || [],
    });

  } catch (error: any) {
    console.error('[Public Share API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
