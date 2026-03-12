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

  // clinical_documents doesn't exist in real schema, use consultation_files instead
  let query = supabase
    .from('consultation_files')
    .select(`
      *,
      consultation!inner (id, patient_id, organization_id)
    `, { count: 'exact' })
    .eq('consultation.organization_id', organizationId)
    .range(from, to);

  if (consultationId) query = query.eq('consultation_id', consultationId);

  const { data, count, error } = await query.order('created_at', { ascending: false });

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

  try {
    const body = await request.json();
    const validatedData = clinicalDocumentSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    // Store in consultation_files (existing real table)
    const { data, error } = await supabase
      .from('consultation_files')
      .insert({
        consultation_id: validatedData.consultationId,
        file_name: validatedData.fileName,
        path: validatedData.filePath,
        url: validatedData.filePath,
        content_type: validatedData.mimeType || null,
        size: validatedData.fileSizeBytes || null,
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
