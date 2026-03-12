import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const specialty = searchParams.get('specialty') || ''; // Could filter by specialist role
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
    .from('appointments')
    .select(`
      *,
      specialists!inner (first_name, last_name, role),
      patients!inner (first_name, last_name, phone_number, email),
      clinic_services (name)
    `, { count: 'exact' })
    .eq('clinic_id', clinicId)
    .range(from, to);

  if (status) {
    query = query.eq('status', status);
  }

  if (specialty) {
    query = query.eq('specialists.role', specialty);
  }

  const { data, count, error } = await query.order('scheduled_date', { ascending: true }).order('scheduled_time', { ascending: true });

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
