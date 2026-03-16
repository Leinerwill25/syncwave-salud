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
        patient!inner (firstName, lastName, phone, address, dob),
        admin_appointments!admin_consultations_appointment_id_fkey (appointment_type, scheduled_date, scheduled_time, service_id),
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

    let enhancedData = data;
    if (data) {
      const { data: profile } = await supabase
        .from('clinic_profile')
        .select('services')
        .eq('organization_id', organizationId)
        .single();
        
      let services: any[] = [];
      if (profile?.services) {
        if (typeof profile.services === 'string') {
          try { services = JSON.parse(profile.services); } catch(e) {}
        } else if (Array.isArray(profile.services)) {
          services = profile.services;
        }
      }

      let serviceName = null;
      if (data.admin_appointments && data.admin_appointments.service_id) {
        const s = services.find(s => s.id === data.admin_appointments.service_id);
        if (s) serviceName = s.name;
      }

      enhancedData = {
        ...data,
        admin_appointments: data.admin_appointments ? {
          ...data.admin_appointments,
          admin_clinic_services: serviceName ? { name: serviceName } : null
        } : null
      };
    }

    return NextResponse.json(enhancedData);
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
      console.error(`[Consultation Detail Error ID: ${id}]:`, error);
      return NextResponse.json({
        error: error.message,
        details: error,
        hint: error.hint
      }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'Error al actualizar la consulta' }, { status: 400 });
  }
}
