import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
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
    .from('admin_consultations')
    .select(`
      *,
      specialists!inner (first_name, last_name, email, role, inpres_sax),
      patient!inner (first_name, last_name, phone, email, address, date_of_birth),
      admin_appointments (appointment_type, scheduled_date, scheduled_time, admin_clinic_services (name)),
      admin_inventory_assignments (*,
        admin_inventory_medications (name, dosage, presentation),
        admin_inventory_materials (name, specifications)
      )
    `)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
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
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('admin_consultations')
      .update({
        status: body.status,
        shared_notes: body.shared_notes,
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
    return NextResponse.json({ error: 'Error al actualizar la consulta' }, { status: 400 });
  }
}
