import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { clinicalDocumentSchema } from '@/lib/schemas/documentSchema';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patient_id') || '';
  const consultationId = searchParams.get('consultation_id') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = await createSupabaseServerClient();
  const clinicId = authResult.user?.organizationId;

  if (!clinicId) {
    return NextResponse.json({ error: 'Usuario sin clínica asociada' }, { status: 400 });
  }

  let query = supabase
    .from('clinical_documents')
    .select(`
      *,
      patients!inner (first_name, last_name),
      users:uploaded_by (email)
    `, { count: 'exact' })
    .eq('clinic_id', clinicId)
    .range(from, to);

  if (patientId) query = query.eq('patient_id', patientId);
  if (consultationId) query = query.eq('consultation_id', consultationId);

  const { data, count, error } = await query.order('uploaded_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    total: count,
    page,
    limit,
    totalPages: count ? Math.ceil(count / limit) : 0
  });
}

export async function POST(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const clinicId = authResult.user?.organizationId;
  const authId = authResult.user?.authId;

  try {
    const body = await request.json();
    const validatedData = clinicalDocumentSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('clinical_documents')
      .insert({
        clinic_id: clinicId,
        patient_id: validatedData.patientId,
        consultation_id: validatedData.consultationId || null,
        document_type: validatedData.documentType || null,
        description: validatedData.description || null,
        file_path: validatedData.filePath,
        file_name: validatedData.fileName,
        file_size_bytes: validatedData.fileSizeBytes || null,
        mime_type: validatedData.mimeType || null,
        uploaded_by: authId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la validación' }, { status: 400 });
  }
}
