import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { adminPatientSchema } from '@/lib/schemas/adminPatientSchema';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
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
    .from('patients')
    .select('*', { count: 'exact' })
    .eq('clinic_id', clinicId)
    .range(from, to);

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`);
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
    const validatedData = adminPatientSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('patients')
      .insert({
        clinic_id: clinicId,
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        date_of_birth: validatedData.dateOfBirth || null,
        phone_number: validatedData.phoneNumber || null,
        email: validatedData.email || null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        country: validatedData.country || null,
        emergency_contact_name: validatedData.emergencyContactName || null,
        emergency_contact_phone: validatedData.emergencyContactPhone || null,
        emergency_contact_relation: validatedData.emergencyContactRelation || null,
        medical_history: validatedData.medicalHistory || null,
        allergies: validatedData.allergies || null,
        current_medications: validatedData.currentMedications || null,
        is_active: validatedData.isActive,
        created_by: authId,
        updated_by: authId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Un paciente con este email ya existe en esta clínica' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la validación de datos' }, { status: 400 });
  }
}
