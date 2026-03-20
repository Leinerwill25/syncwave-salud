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
    const organizationId = authResult.user?.organizationId;
    const authId = authResult.user?.authId;

    // 1. Identificar si es UNREG o REG
    const { data: unregPatient } = await adminSupabase
      .from('unregisteredpatients')
      .select('id')
      .eq('id', id)
      .single();

    let targetTable = unregPatient ? 'unregisteredpatients' : null;
    let patientTypeIdField = unregPatient ? 'unregistered_patient_id' : 'patient_id';

    if (!targetTable) {
      // Verificar si es un paciente REG de esta organización
      const { data: orgUser } = await adminSupabase
        .from('users')
        .select('patientProfileId')
        .eq('organizationId', organizationId)
        .eq('patientProfileId', id)
        .single();
      
      if (orgUser) targetTable = 'patient';
    }

    if (!targetTable) {
      return NextResponse.json({ error: 'Paciente no encontrado o sin permisos' }, { status: 404 });
    }

    // 2. Actualizar datos básicos (Mapeo según tabla)
    let updateData: any = {};
    if (targetTable === 'unregisteredpatients') {
      updateData = {
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        birth_date: validatedData.dateOfBirth,
        phone: validatedData.phoneNumber,
        email: validatedData.email,
        address: validatedData.address,
        identification: validatedData.identifier,
        emergency_contact_name: validatedData.emergencyContactName,
        emergency_contact_phone: validatedData.emergencyContactPhone,
        emergency_contact_relation: validatedData.emergencyContactRelation,
        current_medication: validatedData.currentMedications,
        allergies: validatedData.allergies,
        is_active: validatedData.isActive,
      };
    } else {
      updateData = {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        dob: validatedData.dateOfBirth,
        phone: validatedData.phoneNumber,
        email: validatedData.email,
        address: validatedData.address,
        identifier: validatedData.identifier,
        emergency_contact_name: validatedData.emergencyContactName,
        emergency_contact_phone: validatedData.emergencyContactPhone,
        emergency_contact_relation: validatedData.emergencyContactRelation,
        current_medications: validatedData.currentMedications,
        allergies: validatedData.allergies,
        is_active: validatedData.isActive,
      };
    }

    // Limpiar campos undefined
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const { data, error } = await adminSupabase
      .from(targetTable)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 3. Sincronización de Recordatorios (Sincronización limpia: Borrar y re-insertar)
    if (validatedData.attentions) {
      // Borrar anteriores para este paciente y esta organización
      await adminSupabase
        .from('patient_attentions')
        .delete()
        .eq(patientTypeIdField, id)
        .eq('organization_id', organizationId);
      
      if (validatedData.attentions.length > 0) {
        const attentionInserts = validatedData.attentions.map(att => ({
          organization_id: organizationId,
          [patientTypeIdField]: id,
          title: att.title,
          description: att.description || null,
          attention_date: att.attentionDate,
          is_internal: att.isInternal ?? true,
          specialist_id: att.specialistId || null,
          status: att.status || 'PENDIENTE',
          created_by: authId
        }));

        const { error: attError } = await adminSupabase
          .from('patient_attentions')
          .insert(attentionInserts);
          
        if (attError) console.error('[PATCH Patient] Error inserting attentions:', attError);
      }
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[PATCH Patient] Error:', err);
    return NextResponse.json({ error: err.message || 'Error en la actualización' }, { status: 500 });
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
