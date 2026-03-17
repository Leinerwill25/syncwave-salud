import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = await createSupabaseServerClient();
  const organizationId = authResult.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

    let query = supabase
      .from('admin_appointments')
      .select(`
        *,
        specialists:specialists!admin_appointments_specialist_id_fkey (first_name, last_name, role),
        patient (firstName, lastName, phone),
        unregistered_patient:unregisteredpatients (first_name, last_name, phone)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .range(from, to);

    if (status) {
      query = query.eq('status', status);
    }
    
    const patientId = searchParams.get('patient_id');
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data, count, error } = await query
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('[Appointments API Query Error]:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error,
        hint: error.hint 
      }, { status: 500 });
    }

    // Inyección manual del nombre del servicio desde clinic_profile
    let enhancedData = data;
    if (data && data.length > 0) {
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

      enhancedData = data.map((appt: any) => {
        let serviceName = null;
        if (appt.service_id) {
          const s = services.find(s => s.id === appt.service_id);
          if (s) serviceName = s.name;
        }

        // Consolidar datos del paciente (Registrado o No Registrado)
        let first_name = '';
        let last_name = '';
        let phone_number = '';

        if (appt.patient) {
          first_name = appt.patient.firstName || '';
          last_name = appt.patient.lastName || '';
          phone_number = appt.patient.phone || '';
        } else if (appt.unregistered_patient) {
          first_name = appt.unregistered_patient.first_name || '';
          last_name = appt.unregistered_patient.last_name || '';
          phone_number = appt.unregistered_patient.phone || '';
        }

        return {
          ...appt,
          patients: {
            first_name,
            last_name,
            phone_number,
            displayName: `${first_name} ${last_name}`.trim()
          },
          clinic_services: serviceName ? { name: serviceName } : null
        };
      });
    }

    return NextResponse.json({
      data: enhancedData,
      total: count,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0
    });
}
