import { createSupabaseAdminClient } from '@/app/adapters/admin';
import { apiRequireRole } from '@/lib/auth-guards';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const organizationId = authResult.user?.organizationId;
  const adminSupabase = createSupabaseAdminClient();

  try {
    // 1. Consultas (admin_consultations) con sus especialistas
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
      .or(`patient_id.eq.${id},unregistered_patient_id.eq.${id}`)
      .order('consultation_date', { ascending: false });

    // 2. Documentos (clinical_documents)
    const { data: documents } = await adminSupabase
      .from('clinical_documents')
      .select('*')
      .or(`patient_id.eq.${id},unregistered_patient_id.eq.${id}`)
      .order('uploaded_at', { ascending: false });

    // 3. Notas de Enfermería / Kardex (nurse_kardex_notes) - Solo PÚBLICAS y EVOLUTIVAS
    const { data: nursingNotes } = await adminSupabase
      .from('nurse_kardex_notes')
      .select(`
        *,
        nurse:nurse_id (
          full_name,
          nurse_type
        )
      `)
      .or(`patient_id.eq.${id},unregistered_patient_id.eq.${id}`)
      .in('note_type', ['public', 'evolution'])
      .order('created_at', { ascending: false });

    // 4. Atenciones / Recordatorios (Completadas son parte de la historia)
    const { data: attentions } = await adminSupabase
      .from('patient_attentions')
      .select(`
        *,
        specialist:specialist_id (*)
      `)
      .or(`patient_id.eq.${id},unregistered_patient_id.eq.${id}`)
      .order('attention_date', { ascending: false });

    return NextResponse.json({
      consultations: consultations || [],
      documents: documents || [],
      nursingNotes: nursingNotes || [],
      attentions: attentions || []
    });

  } catch (error: any) {
    console.error('[Full History API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
