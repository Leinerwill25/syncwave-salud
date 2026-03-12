import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { specialistSchema } from '@/lib/schemas/specialistSchema';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const active = searchParams.get('active') === 'false' ? false : true;
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
    .from('specialists')
    .select('*', { count: 'exact' })
    .eq('clinic_id', clinicId)
    .range(from, to);

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,inpres_sax.ilike.%${search}%`);
  }

  if (role) {
    query = query.eq('role', role);
  }

  if (active !== undefined) {
    query = query.eq('is_active', active);
  }

  const { data, count, error } = await query.order('created_at', { ascending: false });

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

  const clinicId = authResult.user?.organizationId;
  const authId = authResult.user?.authId;

  if (!clinicId || !authId) {
    return NextResponse.json({ error: 'Datos de sesión incompletos' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validatedData = specialistSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('specialists')
      .insert({
        clinic_id: clinicId,
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        phone_number: validatedData.phoneNumber,
        email: validatedData.email,
        inpres_sax: validatedData.inpresSax,
        role: validatedData.role,
        is_active: validatedData.isActive,
        created_by: authId,
        updated_by: authId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El email o el INPRES ya están registrados para esta clínica' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la validación de datos' }, { status: 400 });
  }
}
