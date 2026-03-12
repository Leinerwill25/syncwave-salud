import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { specialistAssignmentSchema } from '@/lib/schemas/assignmentSchema';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patient_id') || '';
  const specialistId = searchParams.get('specialist_id') || '';
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
    .from('specialist_patient_assignments')
    .select(`
      *,
      specialists!inner (first_name, last_name, role),
      patient!inner (first_name, last_name)
    `, { count: 'exact' })
    .eq('organization_id', organizationId)
    .range(from, to);

  if (patientId) query = query.eq('patient_id', patientId);
  if (specialistId) query = query.eq('specialist_id', specialistId);
  if (status) query = query.eq('status', status);

  const { data, count, error } = await query.order('assignment_date', { ascending: false });

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

export async function POST(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const organizationId = authResult.user?.organizationId;
  const authId = authResult.user?.authId;

  try {
    const body = await request.json();
    const validatedData = specialistAssignmentSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('specialist_patient_assignments')
      .upsert({
        organization_id: organizationId,
        specialist_id: validatedData.specialistId,
        patient_id: validatedData.patientId,
        status: validatedData.status,
        notes: validatedData.notes || null,
        created_by: authId,
        updated_by: authId,
      }, { onConflict: 'specialist_id,patient_id' })
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
