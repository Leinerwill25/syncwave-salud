import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { serviceSchema } from '@/lib/schemas/serviceSchema';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const supabase = await createSupabaseServerClient();
  const organizationId = authResult.user?.organizationId;

  const { data, error } = await supabase
    .from('admin_clinic_services')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
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

  const organizationId = authResult.user?.organizationId;
  const authId = authResult.user?.authId;

  try {
    const body = await request.json();
    const partialSchema = serviceSchema.partial();
    const validatedData = partialSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('admin_clinic_services')
      .update({
        name: validatedData.name,
        description: validatedData.description,
        service_code: validatedData.serviceCode,
        price: validatedData.price,
        is_active: validatedData.isActive,
        updated_by: authId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
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

  const organizationId = authResult.user?.organizationId;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('admin_clinic_services')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Servicio eliminado' });
}
