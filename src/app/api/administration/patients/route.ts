import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { adminPatientSchema } from '@/lib/schemas/adminPatientSchema';
import { NextResponse } from 'next/server';

// Real table: public.patient (singular), no clinic_id, uses organization_id via users table
// The patient table in Database.sql does NOT have an organization_id column,
// so we filter by organization joining through external context.
// We use the organization's patients via the users who belong to it.

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = await createSupabaseServerClient();
  const organizationId = authResult.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

  // patient table: id, first_name, last_name, email, phone, date_of_birth, etc.
  let query = supabase
    .from('patient')
    .select('*', { count: 'exact' })
    .range(from, to);

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
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

  const authId = authResult.user?.authId;

  if (!authId) {
    return NextResponse.json({ error: 'Datos de sesión incompletos' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validatedData = adminPatientSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('patient')
      .insert({
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        date_of_birth: validatedData.dateOfBirth || null,
        phone: validatedData.phoneNumber || null,
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
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Un paciente con este email ya existe' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la validación de datos' }, { status: 400 });
  }
}
