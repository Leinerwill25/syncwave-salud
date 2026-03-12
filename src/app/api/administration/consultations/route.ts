import { createSupabaseServerClient } from '@/app/adapters/server';
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

  const supabase = await createSupabaseServerClient();
  const organizationId = authResult.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

  let query = supabase
    .from('admin_consultations')
    .select(`
      *,
      specialists!inner (first_name, last_name, role, inpres_sax),
      patient!inner (first_name, last_name, phone, email),
      admin_appointments (appointment_type, scheduled_date, scheduled_time, admin_clinic_services (name))
    `, { count: 'exact' })
    .eq('organization_id', organizationId)
    .range(from, to);

  if (status) query = query.eq('status', status);
  if (specialistId) query = query.eq('specialist_id', specialistId);
  if (patientId) query = query.eq('patient_id', patientId);

  const { data, count, error } = await query
    .order('consultation_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    total: count,
    page,
    limit,
    totalPages: count ? Math.ceil(count / limit) : 0
  });
}
