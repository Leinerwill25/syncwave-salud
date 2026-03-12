import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { medicationSchema } from '@/lib/schemas/inventorySchema';
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
    .from('admin_inventory_medications')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Medicamento no encontrado' }, { status: 404 });
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
    const partialSchema = medicationSchema.partial();
    const validatedData = partialSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('admin_inventory_medications')
      .update({
        name: validatedData.name,
        dosage: validatedData.dosage,
        presentation: validatedData.presentation,
        quantity: validatedData.quantity,
        expiration_date: validatedData.expirationDate,
        supplier: validatedData.supplier,
        notes: validatedData.notes,
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
    .from('admin_inventory_medications')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Medicamento eliminado' });
}
