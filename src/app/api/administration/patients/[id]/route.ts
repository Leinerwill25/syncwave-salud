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

  const organizationId = authResult.user?.organizationId;
  const adminSupabase = createSupabaseAdminClient();

  // 1. Buscar en unregisteredpatients primero (prioridad administración)
  const { data: unregPatient } = await adminSupabase
    .from('unregisteredpatients')
    .select('*')
    .eq('id', id)
    .single();

  if (unregPatient) {
    // Verificar que el creador pertenezca a la organización
    const { data: creator } = await adminSupabase
      .from('users')
      .select('organizationId')
      .eq('authId', unregPatient.created_by)
      .single();

    if (creator?.organizationId === organizationId) {
      return NextResponse.json({
          ...unregPatient,
          identifier: unregPatient.identification,
          date_of_birth: unregPatient.birth_date,
          phone_number: unregPatient.phone,
          current_medications: unregPatient.current_medication || '',
          medical_history: [
            unregPatient.motive ? `Motivo: ${unregPatient.motive}` : '',
            unregPatient.chronic_conditions ? `Condiciones Crónicas: ${unregPatient.chronic_conditions}` : '',
            unregPatient.family_history ? `Historial Familiar: ${unregPatient.family_history}` : ''
          ].filter(Boolean).join('\n\n') || '',
          type: 'UNREG',
          is_active: unregPatient.is_active ?? true,
          attentions: (await adminSupabase.from('patient_attentions').select('*, specialist:specialist_id(*)').eq('unregistered_patient_id', id)).data || []
      });
    }
  }

  // 2. Fallback: Buscar en patient si el administrador tiene permiso (pacientes de su organización)
  // Nota: Esto asume que el paciente tiene un perfil de usuario en la organización
  const { data: orgUser } = await adminSupabase
    .from('users')
    .select('patientProfileId')
    .eq('organizationId', organizationId)
    .eq('patientProfileId', id)
    .single();

  if (orgUser) {
    const { data: regPatient } = await adminSupabase
      .from('patient')
      .select('*')
      .eq('id', id)
      .single();

    if (regPatient) {
      return NextResponse.json({
          ...regPatient,
          identifier: regPatient.identifier,
          first_name: regPatient.firstName || regPatient.first_name,
          last_name: regPatient.lastName || regPatient.last_name,
          date_of_birth: regPatient.dob || regPatient.date_of_birth,
          phone_number: regPatient.phone,
          current_medications: regPatient.current_medications || regPatient.current_medication || '',
          medical_history: regPatient.medical_history || regPatient.background || regPatient.notes || '',
          type: 'REG',
          attentions: (await adminSupabase.from('patient_attentions').select('*, specialist:specialist_id(*)').eq('patient_id', id)).data || []
      });
    }
  }

  return NextResponse.json({ error: 'Paciente no encontrado o no pertenece a su organización' }, { status: 404 });
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

    const adminSupabase = createSupabaseAdminClient();

    const { data: unregPatient } = await adminSupabase
      .from('unregisteredpatients')
      .select('id')
      .eq('id', id)
      .single();

    if (!unregPatient) {
      return NextResponse.json({ error: 'Solo se pueden editar pacientes registrados directamente por la administración' }, { status: 403 });
    }

    const { data, error } = await adminSupabase
      .from('unregisteredpatients')
      .update({
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        birth_date: validatedData.dateOfBirth,
        phone: validatedData.phoneNumber,
        email: validatedData.email,
        address: validatedData.address,
        identification: validatedData.identifier, // Mapeado correctamente
        emergency_contact_name: validatedData.emergencyContactName,
        emergency_contact_phone: validatedData.emergencyContactPhone,
        emergency_contact_relation: validatedData.emergencyContactRelation,
        current_medication: validatedData.currentMedications,
        allergies: validatedData.allergies,
        is_active: validatedData.isActive,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sincronización de atenciones en PATCH
    if (validatedData.attentions && validatedData.attentions.length > 0) {
      const organizationId = authResult.user?.organizationId;
      const authId = authResult.user?.authId;
      
      // Para simplificar: En el PATCH de paciente, si vienen atenciones, son "nuevas" atenciones 
      // o atenciones que se desean sobreescribir. Dado que el esquema es nuevo, 
      // insertaremos las que vengan que no tengan ID asignado.
      const attentionInserts = validatedData.attentions.map(att => ({
        organization_id: organizationId,
        unregistered_patient_id: id,
        title: att.title,
        description: att.description || null,
        attention_date: att.attentionDate,
        is_internal: att.isInternal ?? true,
        specialist_id: att.specialistId || null,
        status: att.status || 'PENDIENTE',
        created_by: authId
      }));

      await adminSupabase
        .from('patient_attentions')
        .insert(attentionInserts);
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
