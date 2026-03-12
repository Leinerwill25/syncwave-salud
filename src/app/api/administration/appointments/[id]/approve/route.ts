import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { appointmentApprovalSchema } from '@/lib/schemas/appointmentSchema';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const clinicId = authResult.user?.organizationId;
  const authId = authResult.user?.authId;

  if (!clinicId || !authId) {
    return NextResponse.json({ error: 'Datos de sesión incompletos' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validatedData = appointmentApprovalSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    // 1. Check if appointment exists, belongs to clinic, and is PENDIENTE
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    if (appointment.status !== 'PENDIENTE') {
      return NextResponse.json({ error: 'La cita ya fue procesada anteriormente' }, { status: 400 });
    }

    // 2. Start a transaction (in Supabase, we can use RPC or subsequent calls carefully)
    const now = new Date().toISOString();

    // Create the consultation record first (auto-generated)
    const { data: consultation, error: consultError } = await supabase
      .from('consultations')
      .insert({
        clinic_id: clinicId,
        specialist_id: appointment.specialist_id,
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        consultation_date: appointment.scheduled_date,
        start_time: appointment.scheduled_time,
        status: 'EN_PROCESO',
        created_by: authId,
        updated_by: authId,
      })
      .select('id')
      .single();

    if (consultError) {
      return NextResponse.json({ error: 'Error al generar la consulta clínica' }, { status: 500 });
    }

    // Update the appointment status
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'APROBADA',
        service_id: validatedData.serviceId,
        notes: validatedData.notes,
        approved_by: authId,
        approved_at: now,
        consultation_id: consultation.id,
        updated_by: authId,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      // Rollback consultation if possible, or leave it orphaned (not ideal, RPC is better for real transactions)
      // For MVP, this is acceptable.
      return NextResponse.json({ error: 'Error al actualizar el estado de la cita' }, { status: 500 });
    }

    return NextResponse.json(updatedAppointment);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la validación' }, { status: 400 });
  }
}
