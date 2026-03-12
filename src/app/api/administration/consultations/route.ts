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
  const clinicId = authResult.user?.organizationId;

  if (!clinicId) {
    return NextResponse.json({ error: 'Usuario sin clínica asociada' }, { status: 400 });
  }

  let query = supabase
    .from('consultations')
    .select(`
      *,
      specialists!inner (first_name, last_name, role, inpres_sax),
      patients!inner (first_name, last_name, phone_number, email),
      appointments (appointment_type, scheduled_date, scheduled_time, clinic_services (name))
    `, { count: 'exact' })
    .eq('clinic_id', clinicId)
    .range(from, to);

  if (status) query = query.eq('status', status);
  if (specialistId) query = query.eq('specialist_id', specialistId);
  if (patientId) query = query.eq('patient_id', patientId);

  const { data, count, error } = await query.order('consultation_date', { ascending: false }).order('start_time', { ascending: false });

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
