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

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      specialists!inner (first_name, last_name, role),
      patients!inner (first_name, last_name, phone_number, email),
      clinic_services (name)
    `)
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
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
  const authId = authResult.user?.authId;

  try {
    const body = await request.json();

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('appointments')
      .update({
        notes: body.notes,
        status: body.status, // Allow direct status update if needed (e.g., CANCELADA), though approve is better via RPC/separate logic
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

  // Only allow deleting PENDIENTE appointments
  const { data: appointment } = await supabase
    .from('appointments')
    .select('status')
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .single();

  if (!appointment) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
  }

  if (appointment.status !== 'PENDIENTE') {
      return NextResponse.json({ error: 'No se puede eliminar una cita que no está pendiente' }, { status: 400 });
  }

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('clinic_id', clinicId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Cita eliminada correctamente' });
}
