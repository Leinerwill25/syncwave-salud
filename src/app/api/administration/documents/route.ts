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
  const organizationId = authResult.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

  let query = supabase
    .from('clinical_documents')
    .select(`
      *,
      patient!inner (firstName, lastName)
    `, { count: 'exact' })
    .eq('organization_id', organizationId)
    .range(from, to);

  if (patientId) query = query.eq('patient_id', patientId);
  const docType = searchParams.get('document_type');
  if (docType) query = query.eq('document_type', docType);

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

  const organizationId = authResult.user?.organizationId;
  const authId = authResult.user?.authId;

  if (!organizationId || !authId) {
    return NextResponse.json({ error: 'Datos de sesión incompletos' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validatedData = clinicalDocumentSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('clinical_documents')
      .insert({
        organization_id: organizationId,
        patient_id: validatedData.patientId,
        consultation_id: validatedData.consultationId || null,
        document_type: validatedData.documentType,
        file_name: validatedData.fileName,
        file_path: validatedData.filePath,
        file_size_bytes: validatedData.fileSizeBytes || null,
        mime_type: validatedData.mimeType || null,
        description: validatedData.description || '',
        uploaded_by: authId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Registrar en auditoría
    await supabase.from('admin_audit_logs').insert({
      organization_id: organizationId,
      user_id: authId,
      action: 'UPLOAD_CLINICAL_DOCUMENT',
      table_name: 'clinical_documents',
      record_id: data.id,
      new_values: data
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la validación' }, { status: 400 });
  }
}
