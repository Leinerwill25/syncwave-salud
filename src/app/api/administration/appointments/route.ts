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
        specialists!inner (first_name, last_name, role),
        patient!inner (firstName, lastName, phone)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .range(from, to);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
        return {
          ...appt,
          admin_clinic_services: serviceName ? { name: serviceName } : null
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
