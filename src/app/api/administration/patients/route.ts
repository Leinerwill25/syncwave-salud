import { createSupabaseServerClient } from '@/app/adapters/server';
import { createSupabaseAdminClient } from '@/app/adapters/admin';
import { apiRequireRole } from '@/lib/auth-guards';
import { adminPatientSchema } from '@/lib/schemas/adminPatientSchema';
import { NextResponse } from 'next/server';

// Patients registered via the Administration panel go into `unregisteredpatients`
// (patients who don't have an account on the platform)

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Use normal client for reads (RLS allows reads with auth)
  const supabase = await createSupabaseServerClient();
  const organizationId = authResult.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

  // 1. Obtener Pacientes Registrados (Paginados)
  const { data: regPatients } = await supabase
    .from('patient')
    .select('*')
    .eq('organization_id', organizationId)
    .range(from, to)
    .order('created_at', { ascending: false });

  // 2. Obtener Pacientes No Registrados (Paginados)
  const adminSupabase = createSupabaseAdminClient();
  const { data: orgUsers } = await supabase
    .from('users')
    .select('authId')
    .eq('organizationId', organizationId);

  const orgUserIds = orgUsers?.map(u => u.authId).filter(Boolean) || [];

  let unregPatients: any[] = [];
  if (orgUserIds.length > 0) {
    const { data: unregData } = await adminSupabase
      .from('unregisteredpatients')
      .select('*')
      .in('created_by', orgUserIds)
      .range(from, to)
      .order('created_at', { ascending: false });
    unregPatients = unregData || [];
  }

  // 3. Unificar y Deduplicar
  const allPatientsMap = new Map<string, any>();

  const formatRegPatient = (p: any) => ({
    id: p.id,
    first_name: p.firstName || p.first_name,
    last_name: p.lastName || p.last_name,
    email: p.email,
    phone_number: p.phone,
    is_active: p.status === 'ACTIVE' || true,
    date_of_birth: p.dob || p.date_of_birth,
    identifier: p.identifier,
    type: 'REG',
    emergency_contact_name: p.emergency_contact_name,
    created_at: p.created_at || ''
  });

  const formatUnregPatient = (p: any) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    phone_number: p.phone,
    is_active: true,
    date_of_birth: p.birth_date,
    identifier: p.identification,
    type: 'UNREG',
    emergency_contact_name: p.emergency_contact_name,
    created_at: p.created_at || ''
  });

  [
    ...(regPatients || []).map(formatRegPatient),
    ...unregPatients.map(formatUnregPatient)
  ].forEach(patient => {
    if (!patient.identifier) {
      allPatientsMap.set(patient.id, patient);
      return;
    }

    const normalizedId = patient.identifier.toUpperCase().replace(/\s+/g, '');
    const existing = allPatientsMap.get(normalizedId);

    if (!existing) {
      allPatientsMap.set(normalizedId, patient);
    } else {
      const existingScore = (existing.emergency_contact_name ? 2 : 0) + (existing.phone_number ? 1 : 0);
      const currentScore = (patient.emergency_contact_name ? 2 : 0) + (patient.phone_number ? 1 : 0);
      
      if (currentScore > existingScore) {
        allPatientsMap.set(normalizedId, patient);
      } else if (currentScore === existingScore) {
        if (patient.type === 'REG' && existing.type === 'UNREG') {
          allPatientsMap.set(normalizedId, patient);
        }
      }
    }
  });

  let unifiedPatients = Array.from(allPatientsMap.values());

  // 4. Ordenar (los más recientes primero)
  unifiedPatients.sort((a, b) => {
    if (!a.created_at || !b.created_at) return 0;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // 5. Aplicar Filtro de Búsqueda (en Memoria)
  if (search) {
    const s = search.toLowerCase();
    unifiedPatients = unifiedPatients.filter(p => 
      p.first_name?.toLowerCase().includes(s) ||
      p.last_name?.toLowerCase().includes(s) ||
      p.email?.toLowerCase().includes(s) ||
      p.phone_number?.includes(s) ||
      p.identifier?.toLowerCase().includes(s)
    );
  }

  // 6. Paginación Manual
  const count = unifiedPatients.length;
  const paginatedData = unifiedPatients.slice(from, to + 1);

  return NextResponse.json({
    data: paginatedData,
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

    // Use admin client to bypass RLS for insert into unregisteredpatients
    const adminSupabase = createSupabaseAdminClient();

    const { data, error } = await adminSupabase
      .from('unregisteredpatients')
      .insert({
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        birth_date: validatedData.dateOfBirth || null,
        phone: validatedData.phoneNumber || null,
        email: validatedData.email || null,
        address: validatedData.address || null,
        emergency_contact_name: validatedData.emergencyContactName || null,
        emergency_contact_phone: validatedData.emergencyContactPhone || null,
        emergency_contact_relation: validatedData.emergencyContactRelation || null,
        current_medication: validatedData.currentMedications || null,
        allergies: validatedData.allergies || null,
        created_by: authId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Un paciente con este email ya existe' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const newPatient = data;

    // --- LOGICA DE ATENCION DOMICILIARIA (CITA + ESPECIALISTAS) ---
    if (validatedData.serviceId && validatedData.careDate) {
      const organizationId = authResult.user?.organizationId;
      
      // 1. Crear la Cita Administrativa
      // Usamos el primer especialista como el 'responsable' principal de la cita
      const mainSpecialistId = validatedData.specialistIds?.[0];
      
      if (mainSpecialistId) {
        const { data: appointment, error: apptError } = await adminSupabase
          .from('admin_appointments')
          .insert({
            organization_id: organizationId,
            specialist_id: mainSpecialistId,
            unregistered_patient_id: newPatient.id,
            service_id: validatedData.serviceId,
            scheduled_date: validatedData.careDate,
            scheduled_time: '08:00:00', // Default time for home care if not specified
            status: 'APROBADA',
            appointment_type: 'DOMICILIARIO',
            created_by: authId,
            approved_by: authId,
            approved_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!apptError && appointment && validatedData.specialistIds) {
          // 2. Registrar todo el equipo en la tabla relacional de la cita
          const teamAssignments = validatedData.specialistIds.map(specId => ({
            appointment_id: appointment.id,
            specialist_id: specId
          }));

          await adminSupabase
            .from('admin_appointment_specialists')
            .insert(teamAssignments);

          // 3. Registrar asignaciones permanentes de especialistas al paciente
          const permanentAssignments = validatedData.specialistIds.map(specId => ({
            specialist_id: specId,
            unregistered_patient_id: newPatient.id,
            assignment_date: validatedData.careDate,
            status: 'ACTIVE'
          }));

          await adminSupabase
            .from('specialist_patient_assignments')
            .insert(permanentAssignments);

          // 4. Crear la Consulta Automática (para que aparezca en el historial y lista de consultas)
          await adminSupabase
            .from('admin_consultations')
            .insert({
              organization_id: organizationId,
              appointment_id: appointment.id,
              specialist_id: mainSpecialistId,
              unregistered_patient_id: newPatient.id,
              consultation_date: validatedData.careDate,
              start_time: '08:00:00',
              status: 'PROGRAMADA'
            });
        }
      }
    }

    // 5. LOGICA DE INVENTARIO DOMICILIARIO
    if (validatedData.inventoryItems && validatedData.inventoryItems.length > 0) {
      const organizationId = authResult.user?.organizationId;
      
      for (const item of validatedData.inventoryItems) {
        // a. Registrar la asignación al paciente (uso domiciliario)
        await adminSupabase
          .from('admin_inventory_assignments')
          .insert({
            organization_id: organizationId,
            unregistered_patient_id: newPatient.id,
            medication_id: item.type === 'medication' ? item.id : null,
            material_id: item.type === 'material' ? item.id : null,
            quantity_assigned: item.quantity,
            assigned_by: authId,
            assigned_at: new Date().toISOString()
          });

        // b. Descontar del inventario de la clinica (Stock Restante)
        const table = item.type === 'medication' ? 'admin_inventory_medications' : 'admin_inventory_materials';
        
        // Obtenemos cantidad actual directamente del servidor para evitar race conditions
        const { data: currentItem } = await adminSupabase
          .from(table)
          .select('quantity')
          .eq('id', item.id)
          .single();

        if (currentItem) {
          const newQty = Math.max(0, currentItem.quantity - item.quantity);
          await adminSupabase
            .from(table)
            .update({ quantity: newQty })
            .eq('id', item.id);
        }
      }
    }

    return NextResponse.json(newPatient);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la validación de datos' }, { status: 400 });
  }
}
