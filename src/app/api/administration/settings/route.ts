import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { NextResponse } from 'next/server';

export async function GET() {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const organizationId = authResult.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('organization')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const organizationId = authResult.user?.organizationId;
  const authId = authResult.user?.authId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

  try {
    const body = await request.json();
    
    // Validaciones básicas (se podría usar un Zod schema aquí también)
    if (!body.name) {
      return NextResponse.json({ error: 'El nombre de la organización es requerido' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('organization')
      .update({
        name: body.name,
        address: body.address,
        contactEmail: body.contactEmail,
        phone: body.phone,
        updatedAt: new Date().toISOString()
      })
      .eq('id', organizationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Opcional: Registrar en auditoría
    await supabase.from('admin_audit_logs').insert({
      organization_id: organizationId,
      user_id: authId,
      action: 'UPDATE_CLINIC_SETTINGS',
      table_name: 'organization',
      record_id: organizationId,
      new_values: data
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al procesar la solicitud' }, { status: 400 });
  }
}
