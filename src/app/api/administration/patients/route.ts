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

  const adminSupabase = createSupabaseAdminClient();
  const organizationId = authResult.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

  // Obtener todos los authIds del staff de la organización
  // (medicos, enfermeras, recepcionistas, admin, etc.)
  const { data: allOrgUsers } = await adminSupabase
    .from('users')
    .select('authId')
    .eq('organizationId', organizationId);

  const allOrgAuthIds = allOrgUsers?.map((u: any) => u.authId).filter(Boolean) || [];

  if (allOrgAuthIds.length === 0) {
    return NextResponse.json({ data: [], total: 0, page, limit, totalPages: 0 });
  }

  // Consultar la tabla unregisteredpatients
  // Filtrar por creadores que pertenezcan a la organización
  // Obtenemos todos los registros para deduplicar correctamente antes de paginar
  let query = adminSupabase
    .from('unregisteredpatients')
    .select('*')
    .in('created_by', allOrgAuthIds);

  // Búsqueda en servidor
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,identification.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data: patients, error } = await query
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin Patients API]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Deduplicación en Memoria
  const deduplicatedMap = new Map();
  (patients || []).forEach((p: any) => {
    // Generar una llave de deduplicación: Identificación > Combinación de Nombre/Email
    let dedupKey = p.identification ? `ID_${p.identification.trim().toUpperCase()}` : null;
    
    if (!dedupKey) {
      const nameKey = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().trim();
      const emailKey = p.email ? p.email.toLowerCase().trim() : '';
      dedupKey = `NAME_${nameKey}_${emailKey}`;
    }

    // Si ya existe, nos quedamos con el registro que tenga más información o sea más reciente (el primero lo es por el order)
    if (!deduplicatedMap.has(dedupKey)) {
      deduplicatedMap.set(dedupKey, p);
    }
  });

  const uniquePatients = Array.from(deduplicatedMap.values());

  // Normalizar al formato que espera el frontend
  const formattedPatients = uniquePatients.map((p: any) => ({
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
  }));

  // Paginación Manual tras deduplicación
  const total = formattedPatients.length;
  const paginatedData = formattedPatients.slice(from, to + 1);

  return NextResponse.json({
    data: paginatedData,
    total: total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
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
        identification: validatedData.identifier || null,
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
