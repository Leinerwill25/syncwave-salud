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
  const clinicId = authResult.user?.organizationId;

  // Retrieve consultation with all vital relationships
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      *,
      specialists!inner (first_name, last_name, email, role, inpres_sax),
      patients!inner (first_name, last_name, phone_number, email, address, date_of_birth),
      appointments!inner (appointment_type, scheduled_date, scheduled_time, clinic_services (name)),
      prescriptions (*),
      clinical_documents (*),
      inventory_assignments (*, 
        inventory_medications (name, dosage, presentation), 
        inventory_materials (name, specifications)
      )
    `)
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// Admins might need to update notes or status (e.g. mark as COMPLETADA if it got stuck, or CANCELADA)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const clinicId = authResult.user?.organizationId;
  const authId = authResult.user?.authId;

  try {
    const body = await request.json();

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('consultations')
      .update({
        status: body.status,
        notes: body.notes,
        // Admins shouldn't normally override clinical findings, but could correct typos if authorized
        // We'll restrict it to basic admin fields here to prevent altering medical records
        updated_by: authId,
        updated_at: new Date().toISOString(),
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
    return NextResponse.json({ error: 'Error al actualizar la consulta' }, { status: 400 });
  }
}
