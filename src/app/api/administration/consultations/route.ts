import { createSupabaseAdminClient } from '@/app/adapters/admin';
import { apiRequireRole } from '@/lib/auth-guards';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const specialistId = searchParams.get('specialist_id') || '';
  const patientId = searchParams.get('patient_id') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Usar admin client para bypassear RLS
  const supabase = createSupabaseAdminClient();
  const organizationId = authResult.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

    let query = supabase
      .from('admin_consultations')
      .select(`
        *,
        specialists!inner (first_name, last_name, role, inpres_sax),
        patient!inner (firstName, lastName, phone),
        admin_appointments!admin_consultations_appointment_id_fkey (appointment_type, scheduled_date, scheduled_time, service_id)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .range(from, to);

    if (status) query = query.eq('status', status);
    if (specialistId) query = query.eq('specialist_id', specialistId);
    if (patientId) query = query.eq('patient_id', patientId);
    
    const search = searchParams.get('search');
    if (search) {
      // Filter on joined tables using !inner requirement
      query = query.or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%`, { foreignTable: 'patient' });
    }

    const { data, count, error } = await query
      .order('consultation_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) {
      console.error('[Consultations API Error]:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error,
        hint: error.hint
      }, { status: 500 });
    }

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

      enhancedData = data.map((cons: any) => {
        let serviceName = null;
        if (cons.admin_appointments && cons.admin_appointments.service_id) {
          const s = services.find(s => s.id === cons.admin_appointments.service_id);
          if (s) serviceName = s.name;
        }
        
        return {
          ...cons,
          admin_appointments: cons.admin_appointments ? {
            ...cons.admin_appointments,
            admin_clinic_services: serviceName ? { name: serviceName } : null
          } : null
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
