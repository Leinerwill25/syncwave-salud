import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { clinicalDocumentSchema } from '@/lib/schemas/documentSchema';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const supabase = await createSupabaseServerClient();
  const clinicId = authResult.user?.organizationId;

  const { data, error } = await supabase
    .from('clinical_documents')
    .select(`
      *,
      patients!inner (first_name, last_name),
      users:uploaded_by (email)
    `)
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const clinicId = authResult.user?.organizationId;

  try {
    const body = await request.json();
    const partialSchema = clinicalDocumentSchema.partial();
    const validatedData = partialSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('clinical_documents')
      .update({
        document_type: validatedData.documentType,
        description: validatedData.description,
        file_name: validatedData.fileName,
      })
      .eq('id', id)
      .eq('clinic_id', clinicId)
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const clinicId = authResult.user?.organizationId;
  const supabase = await createSupabaseServerClient();

  // En un sistema real, aquí también borraríamos el archivo físico de Storage
  const { error } = await supabase
    .from('clinical_documents')
    .delete()
    .eq('id', id)
    .eq('clinic_id', clinicId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Documento eliminado' });
}
