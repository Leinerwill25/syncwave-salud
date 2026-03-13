import { createSupabaseServerClient } from '@/app/adapters/server';
import { createSupabaseAdminClient } from '@/app/adapters/admin';
import { apiRequireRole } from '@/lib/auth-guards';
import { adminPatientSchema } from '@/lib/schemas/adminPatientSchema';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const supabase = await createSupabaseServerClient();

  // 1. Intentar buscar en patient primero
  const { data: regPatient, error: regError } = await supabase
    .from('patient')
    .select('*')
    .eq('id', id)
    .single();

  if (regPatient) {
    return NextResponse.json({
        ...regPatient,
        first_name: regPatient.firstName || regPatient.first_name,
        last_name: regPatient.lastName || regPatient.last_name,
        date_of_birth: regPatient.dob || regPatient.date_of_birth,
        phone_number: regPatient.phone,
        current_medications: regPatient.current_medications || regPatient.current_medication || '',
        medical_history: regPatient.medical_history || regPatient.background || regPatient.notes || '',
        type: 'REG'
    });
  }

  // 2. Si no es registrado, buscar en unregisteredpatients usando adminSupabase para evitar RLS
  const adminSupabase = createSupabaseAdminClient();
  const { data: unregPatient, error: unregError } = await adminSupabase
    .from('unregisteredpatients')
    .select('*')
    .eq('id', id)
    .single();

  if (unregError || !unregPatient) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
  }

  return NextResponse.json({
      ...unregPatient,
      date_of_birth: unregPatient.birth_date,
      phone_number: unregPatient.phone,
      current_medications: unregPatient.current_medication || '',
      medical_history: [
        unregPatient.motive ? `Motivo: ${unregPatient.motive}` : '',
        unregPatient.chronic_conditions ? `Condiciones Crónicas: ${unregPatient.chronic_conditions}` : '',
        unregPatient.family_history ? `Historial Familiar: ${unregPatient.family_history}` : ''
      ].filter(Boolean).join('\n\n') || '',
      type: 'UNREG'
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  try {
    const body = await request.json();
    const partialSchema = adminPatientSchema.partial();
    const validatedData = partialSchema.parse(body);

    // Use admin client to bypass RLS for update
    const adminSupabase = createSupabaseAdminClient();

    const { data, error } = await adminSupabase
      .from('unregisteredpatients')
      .update({
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        birth_date: validatedData.dateOfBirth,
        phone: validatedData.phoneNumber,
        email: validatedData.email,
        address: validatedData.address,
        emergency_contact_name: validatedData.emergencyContactName,
        emergency_contact_phone: validatedData.emergencyContactPhone,
        emergency_contact_relation: validatedData.emergencyContactRelation,
        current_medication: validatedData.currentMedications,
        allergies: validatedData.allergies,
      })
      .eq('id', id)
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const adminSupabase = createSupabaseAdminClient();

  const { error } = await adminSupabase
    .from('unregisteredpatients')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Paciente eliminado correctamente' });
}
