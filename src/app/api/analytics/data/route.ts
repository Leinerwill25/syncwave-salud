import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usar service role key para evitar RLS
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? '';

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

async function getPharmacyMedications(admin: any, startDate: string, endDate: string, limit: number) {
  const { data: prescriptions, error: prescError } = await admin
    .from('prescription')
    .select('id')
    .gte('issued_at', startDate)
    .lte('issued_at', endDate);

  if (prescError) throw prescError;
  const prescriptionIds = (prescriptions || []).map((p: any) => p.id);
  if (prescriptionIds.length === 0) return [];

  const { data: items, error: itemsError } = await admin
    .from('prescription_item')
    .select('name, dosage, quantity, prescription_id')
    .in('prescription_id', prescriptionIds);

  if (itemsError) throw itemsError;

  const prescriptionDoctorMap = new Map();
  const { data: prescDoctors } = await admin.from('prescription').select('id, doctor_id').in('id', prescriptionIds);
  if (prescDoctors) {
    const docIds = [...new Set(prescDoctors.map((p: any) => p.doctor_id).filter(Boolean))];
    if (docIds.length > 0) {
      const { data: doctors } = await admin.from('users').select('id, medic_profile(specialty)').in('id', docIds);
      const doctorsMap = new Map((doctors || []).map((d: any) => [d.id, d]));
      prescDoctors.forEach((p: any) => prescriptionDoctorMap.set(p.id, doctorsMap.get(p.doctor_id)));
    }
  }

  const grouped = (items || []).reduce((acc: any, item: any) => {
    const doctor = prescriptionDoctorMap.get(item.prescription_id);
    const specialty = (doctor as any)?.medic_profile?.specialty || 'Sin especialidad';
    const key = `${specialty}-${item.name}`;
    if (!acc[key]) acc[key] = { specialty, medication: item.name, total_prescriptions: 0, quantities: [], dosages: new Set() };
    acc[key].total_prescriptions++;
    if (item.quantity) acc[key].quantities.push(item.quantity);
    if (item.dosage) acc[key].dosages.add(item.dosage);
    return acc;
  }, {});

  return Object.values(grouped).map((item: any) => ({
    specialty: item.specialty,
    medication: item.medication,
    total_prescriptions: item.total_prescriptions,
    avg_quantity: item.quantities.length > 0 ? item.quantities.reduce((sum: number, q: number) => sum + q, 0) / item.quantities.length : 0,
    common_dosages: Array.from(item.dosages)
  })).sort((a: any, b: any) => b.total_prescriptions - a.total_prescriptions).slice(0, limit);
}

async function getConsultationDuration(admin: any, startDate: string, endDate: string) {
  const { data: consultations, error } = await admin
    .from('consultation')
    .select('started_at, ended_at')
    .not('started_at', 'is', null)
    .not('ended_at', 'is', null)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) throw error;
  const durations = (consultations || []).map((item: any) => {
    const start = new Date(item.started_at).getTime();
    const end = new Date(item.ended_at).getTime();
    return (end - start) / (1000 * 60);
  }).filter((d: number) => d > 0 && d < 480);

  const avg = durations.length > 0 ? durations.reduce((sum: number, d: number) => sum + d, 0) / durations.length : 0;
  durations.sort((a: number, b: number) => a - b);
  const median = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;
  return { avg_duration_minutes: Math.round(avg), median_duration_minutes: Math.round(median) };
}

async function getPaymentMethodsStats(admin: any, startDate: string, endDate: string) {
  const { data: facturaciones, error } = await admin
    .from('facturacion')
    .select('metodo_pago, total')
    .eq('estado_pago', 'pagado')
    .gte('fecha_emision', startDate)
    .lte('fecha_emision', endDate);

  if (error) throw error;
  const grouped = (facturaciones || []).reduce((acc: any, item: any) => {
    const method = item.metodo_pago || 'No especificado';
    if (!acc[method]) acc[method] = { method, count: 0, total_amount: 0 };
    acc[method].count++;
    acc[method].total_amount += parseFloat(item.total || '0');
    return acc;
  }, {});
  return Object.values(grouped).sort((a: any, b: any) => b.total_amount - a.total_amount);
}

async function getLabResults(admin: any, startDate: string, endDate: string) {
  const { data: labResults, error } = await admin
    .from('lab_result')
    .select('result_type, is_critical, created_at, reported_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) throw error;
  const grouped = (labResults || []).reduce((acc: any, item: any) => {
    const type = item.result_type || 'Sin tipo';
    if (!acc[type]) acc[type] = { result_type: type, total_orders: 0, critical_count: 0, turnarounds: [] };
    acc[type].total_orders++;
    if (item.is_critical) acc[type].critical_count++;
    if (item.created_at && item.reported_at) {
      const days = (new Date(item.reported_at).getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 0 && days < 365) acc[type].turnarounds.push(days);
    }
    return acc;
  }, {});
  return Object.values(grouped).map((item: any) => ({
    result_type: item.result_type,
    total_orders: item.total_orders,
    critical_count: item.critical_count,
    avg_turnaround_days: item.turnarounds.length > 0 ? Math.round((item.turnarounds.reduce((s: number, d: number) => s + d, 0) / item.turnarounds.length) * 10) / 10 : 0
  })).sort((a: any, b: any) => b.total_orders - a.total_orders);
}

async function getPatientDemographics(admin: any, startDate: string, endDate: string) {
  const { data: patients, error } = await admin
    .from('patient')
    .select('dob, gender, address, createdAt')
    .gte('createdAt', startDate)
    .lte('createdAt', endDate);

  if (error) throw error;
  const grouped = (patients || []).reduce((acc: any, item: any) => {
    let ageGroup = 'Desconocido';
    if (item.dob) {
      const age = Math.floor((new Date().getTime() - new Date(item.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      if (age < 18) ageGroup = '0-17';
      else if (age < 30) ageGroup = '18-29';
      else if (age < 45) ageGroup = '30-44';
      else if (age < 60) ageGroup = '45-59';
      else if (age < 75) ageGroup = '60-74';
      else ageGroup = '75+';
    }
    const region = item.address || 'Sin región';
    const key = `${ageGroup}-${item.gender || 'No especificado'}-${region}`;
    if (!acc[key]) acc[key] = { age_group: ageGroup, gender: item.gender || 'No especificado', count: 0, region };
    acc[key].count++;
    return acc;
  }, {});
  return Object.values(grouped);
}

async function getPatientGrowth(admin: any, endDate: string) {
  const { data: patients, error } = await admin.from('patient').select('createdAt').lte('createdAt', endDate);
  if (error) throw error;
  
  // Agrupar por mes usando sortKey para ordenamiento correcto
  const grouped = (patients || []).reduce((acc: any, item: any) => {
    const date = new Date(item.createdAt);
    const monthLabel = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
    const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[sortKey]) acc[sortKey] = { month: monthLabel, count: 0, sortKey };
    acc[sortKey].count++;
    return acc;
  }, {});

  let total = 0;
  return Object.values(grouped)
    .sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
    .map((item: any) => {
      total += item.count;
      return { month: item.month, new_patients: item.count, total_patients: total };
    });
}

async function getCommunicationMetrics(admin: any, startDate: string, endDate: string) {
  const { data: messages, error } = await admin
    .from('message')
    .select('id, created_at, read, read_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) throw error;
  const grouped = (messages || []).reduce((acc: any, item: any) => {
    const date = new Date(item.created_at).toLocaleDateString('es-ES');
    if (!acc[date]) acc[date] = { date, messages_sent: 0, messages_read: 0, response_times: [] };
    acc[date].messages_sent++;
    if (item.read && item.read_at) {
      acc[date].messages_read++;
      const minutes = (new Date(item.read_at).getTime() - new Date(item.created_at).getTime()) / (1000 * 60);
      if (minutes > 0 && minutes < 10080) acc[date].response_times.push(minutes);
    }
    return acc;
  }, {});
  return Object.values(grouped).map((item: any) => ({
    date: item.date,
    messages_sent: item.messages_sent,
    response_rate: item.messages_sent > 0 ? (item.messages_read / item.messages_sent) * 100 : 0,
    avg_response_time_minutes: item.response_times.length > 0 ? Math.round((item.response_times.reduce((s: number, t: number) => s + t, 0) / item.response_times.length) * 10) / 10 : 0
  })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

async function getAuditLogs(admin: any, startDate: string, endDate: string, limit: number) {
  const { data: logs, error } = await admin
    .from('audit_log')
    .select('id, user_name, action_type, entity_type, description, metadata, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (logs || []).map((item: any) => ({
    id: item.id,
    user_name: item.user_name || 'Usuario desconocido',
    action_type: item.action_type,
    module: item.entity_type,
    timestamp: item.created_at,
    details: item.description || JSON.stringify(item.metadata || {})
  }));
}

async function getActionDistribution(admin: any, startDate: string, endDate: string) {
  const { data: logs, error } = await admin
    .from('audit_log')
    .select('action_type')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) throw error;
  const grouped = (logs || []).reduce((acc: any, item: any) => {
    const type = item.action_type || 'Desconocido';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(grouped).map(([action_type, count]) => ({ action_type, count: count as number })).sort((a: any, b: any) => b.count - a.count);
}


async function getAppointmentStats(admin: any, filters: any) {
  const { startDate, endDate, organizationId } = filters;
  
  let query = admin
    .from('appointment')
    .select('status, scheduled_at, organization(name)')
    .gte('scheduled_at', startDate)
    .lte('scheduled_at', endDate);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: apps, error } = await query;

  if (error) throw error;

  const grouped = (apps || []).reduce((acc: any, item: any) => {
    const orgName = item.organization?.name || 'Otros';
    if (!acc[orgName]) {
      acc[orgName] = { 
        consultorio: orgName, 
        completed: 0, 
        cancelled: 0, 
        scheduled: 0,
        total: 0 
      };
    }
    
    const status = item.status; // Usar el estatus directo de la DB
    if (status === 'COMPLETADA') acc[orgName].completed++;
    else if (status === 'CANCELADA') acc[orgName].cancelled++;
    else acc[orgName].scheduled++;
    
    acc[orgName].total++;
    return acc;
  }, {});

  return Object.values(grouped).sort((a: any, b: any) => b.total - a.total);
}

async function getRevenueData(admin: any, filters: any) {
  const { startDate, endDate, organizationId } = filters;
  try {
    let query = admin
      .from('appointment')
      .select(`
        scheduled_at,
        selected_service,
        consultation!inner(id)
      `)
      .eq('status', 'COMPLETADA')
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: appointments, error } = await query;

    if (error) throw error;

    const grouped = (appointments || []).reduce((acc: any, item: any) => {
      const date = new Date(item.scheduled_at);
      const monthLabel = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
      const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[sortKey]) acc[sortKey] = { period: monthLabel, total_revenue: 0, sortKey };
      
      let price = 0;
      const services = item.selected_service;
      if (Array.isArray(services)) {
        price = services.reduce((sum: number, s: any) => sum + (parseFloat(s.price) || 0), 0);
      } else if (services && typeof services === 'object') {
        price = parseFloat(services.price) || 0;
      }
      
      acc[sortKey].total_revenue += price;
      return acc;
    }, {});

    return Object.values(grouped).sort((a: any, b: any) => (a as any).sortKey.localeCompare((b as any).sortKey));
  } catch (err) {
    console.error('Error fetching revenue data:', err);
    return [];
  }
}

async function getTopDiagnoses(admin: any, filters: any) {
  const { startDate, endDate, organizationId, specialty } = filters;
  try {
    let query = admin
      .from('consultation')
      .select('diagnosis, icd11_title, doctor_id')
      .not('diagnosis', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: consultations, error } = await query;

    // Si hay filtro por especialidad, necesitamos filtrar por el perfil del médico
    let finalConsultations = consultations || [];
    if (specialty && finalConsultations.length > 0) {
      const doctorIds = [...new Set(finalConsultations.map((c: any) => c.doctor_id))];
      const { data: doctors } = await admin
        .from('medic_profile')
        .select('user_id, specialty')
        .in('user_id', doctorIds)
        .eq('specialty', specialty);
      
      const specializedDoctorIds = new Set((doctors || []).map((d: any) => d.user_id));
      finalConsultations = finalConsultations.filter((c: any) => specializedDoctorIds.has(c.doctor_id));
    }

    const counts = finalConsultations.reduce((acc: any, item: any) => {
      const diagnosis = item.icd11_title || item.diagnosis;
      acc[diagnosis] = (acc[diagnosis] || 0) + 1;
      return acc;
    }, {});

    const total = Object.values(counts).reduce((sum: number, count: any) => sum + count, 0);
    return Object.entries(counts)
      .map(([diagnosis, count]) => ({
        diagnosis,
        count: count as number,
        percentage: total > 0 ? ((count as number) / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  } catch (err) {
    console.error('Error fetching top diagnoses:', err);
    return [];
  }
}

async function getPatientCount(admin: any, startDate: string, endDate: string) {
  const { count, error } = await admin
    .from('patient')
    .select('*', { count: 'exact', head: true })
    .gte('createdAt', startDate)
    .lte('createdAt', endDate);

  if (error) throw error;
  return { count: count || 0 };
}

async function getDiagnosisByRegion(admin: any, startDate: string, endDate: string) {
  const { data: consultations, error } = await admin
    .from('consultation')
    .select(`id, diagnosis, icd11_code, icd11_title, created_at, patient_id, unregistered_patient_id, doctor_id`)
    .not('diagnosis', 'is', null)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) throw error;

  const patientIds = [...new Set((consultations || []).map((c: any) => c.patient_id).filter(Boolean))];
  const unregisteredIds = [...new Set((consultations || []).map((c: any) => c.unregistered_patient_id).filter(Boolean))];
  const doctorIds = [...new Set((consultations || []).map((c: any) => c.doctor_id).filter(Boolean))];

  const [patients, unregistered, doctors] = await Promise.all([
    patientIds.length > 0 ? admin.from('patient').select('id, address').in('id', patientIds) : { data: [] },
    unregisteredIds.length > 0 ? admin.from('unregisteredpatients').select('id, address').in('id', unregisteredIds) : { data: [] },
    doctorIds.length > 0 ? admin.from('users').select('id, medic_profile(specialty)').in('id', doctorIds) : { data: [] }
  ]);

  const patientsMap = new Map((patients.data || []).map((p: any) => [p.id, p]));
  const unregisteredMap = new Map((unregistered.data || []).map((u: any) => [u.id, u]));
  const doctorsMap = new Map((doctors.data || []).map((d: any) => [d.id, d]));

  const grouped = (consultations || []).reduce((acc: any, item: any) => {
    const patient = item.patient_id ? patientsMap.get(item.patient_id) : null;
    const unregisteredPatient = item.unregistered_patient_id ? unregisteredMap.get(item.unregistered_patient_id) : null;
    const doctor = item.doctor_id ? doctorsMap.get(item.doctor_id) : null;
    const region = (patient as any)?.address || (unregisteredPatient as any)?.address || 'Sin región';
    const specialty = (doctor as any)?.medic_profile?.specialty || 'Sin especialidad';
    const month = new Date(item.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
    const key = `${region}-${item.diagnosis}-${specialty}-${month}`;
    
    if (!acc[key]) {
      acc[key] = { region, diagnosis: item.diagnosis, icd11_code: item.icd11_code, icd11_title: item.icd11_title, count: 0, specialty, month };
    }
    acc[key].count++;
    return acc;
  }, {});

  return Object.values(grouped);
}

// ... handlers continue ... (I'll add the rest in subsequent chunks or one big one if lines allow)

// GET: Obtener datos de analytics según el tipo
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const region = searchParams.get('region');
    const specialty = searchParams.get('specialty');
    const organizationId = searchParams.get('organizationId');

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 });
    }

    const filters = { startDate, endDate, region, specialty, organizationId };
    let data = null;

    switch (type) {
      case 'network-stats':
        const [orgCount, patCount, staffCount] = await Promise.all([
          supabaseAdmin.from('organization').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('patient').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
            .neq('role', 'PACIENTE') 
        ]);
        
        data = {
          organizations: orgCount.count || 0,
          patients: patCount.count || 0,
          staff: staffCount.count || 0
        };
        break;

      case 'organizations':
        const { data: orgs, error: orgError } = await supabaseAdmin
          .from('organization')
          .select('id, name')
          .order('name');
        if (orgError) throw orgError;
        data = orgs;
        break;

      case 'top-diagnoses':
        data = await getTopDiagnoses(supabaseAdmin, filters);
        break;

      case 'appointment-stats':
        data = await getAppointmentStats(supabaseAdmin, filters);
        break;

      case 'revenue':
        data = await getRevenueData(supabaseAdmin, filters);
        break;

      case 'patient-count':
        data = await getPatientCount(supabaseAdmin, startDate, endDate);
        break;

      case 'diagnosis-by-region':
        data = await getDiagnosisByRegion(supabaseAdmin, startDate, endDate);
        break;
      
      // ... more switch updates in next step ...


      case 'pharmacy-medications':
        data = await getPharmacyMedications(supabaseAdmin, startDate, endDate, parseInt(searchParams.get('limit') || '20', 10));
        break;

      case 'consultation-duration':
        data = await getConsultationDuration(supabaseAdmin, startDate, endDate);
        break;

      case 'payment-methods':
        data = await getPaymentMethodsStats(supabaseAdmin, startDate, endDate);
        break;

      case 'lab-results':
        data = await getLabResults(supabaseAdmin, startDate, endDate);
        break;

      case 'patient-demographics':
        data = await getPatientDemographics(supabaseAdmin, startDate, endDate);
        break;

      case 'patient-growth':
        data = await getPatientGrowth(supabaseAdmin, endDate);
        break;

      case 'communication-metrics':
        data = await getCommunicationMetrics(supabaseAdmin, startDate, endDate);
        break;

      case 'audit-logs':
        data = await getAuditLogs(supabaseAdmin, startDate, endDate, parseInt(searchParams.get('limit') || '100', 10));
        break;

      case 'action-distribution':
        data = await getActionDistribution(supabaseAdmin, startDate, endDate);
        break;

      case 'unregistered-stats':
        let unregQuery = supabaseAdmin
          .from('appointment')
          .select('unregistered_patient_id')
          .not('unregistered_patient_id', 'is', null)
          .gte('scheduled_at', startDate)
          .lte('scheduled_at', endDate);
        
        if (organizationId) {
          unregQuery = unregQuery.eq('organization_id', organizationId);
        }

        const { data: unregApps, error: unregError } = await unregQuery;
        if (unregError) throw unregError;

        const activeUnregIds = [...new Set((unregApps || []).map((a: any) => a.unregistered_patient_id))];
        const totalUnregistered = activeUnregIds.length;
        
        // Calcular recurrencia real: ¿Cuántos de estos IDs tienen 2 o más citas en total?
        let recurringCount = 0;
        if (activeUnregIds.length > 0) {
          const { data: allHistory } = await supabaseAdmin
            .from('appointment')
            .select('unregistered_patient_id')
            .in('unregistered_patient_id', activeUnregIds);
          
          const historyCounts = (allHistory || []).reduce((acc: any, item: any) => {
            acc[item.unregistered_patient_id] = (acc[item.unregistered_patient_id] || 0) + 1;
            return acc;
          }, {});

          recurringCount = Object.values(historyCounts).filter((count: any) => count >= 2).length;
        }
        
        data = {
          unregistered: {
            total: totalUnregistered || 0,
            recurring: recurringCount || 0
          }
        };
        break;

      case 'organization-evolution':
        // Obtener todas las citas para calcular evolución por organización
        const { data: orgAppts } = await supabaseAdmin
          .from('appointment')
          .select('scheduled_at, organization(name)')
          .order('scheduled_at', { ascending: true });

        const evolutionData: any = {};
        const organizations = new Set<string>();
        
        // Agrupar por mes y organización usando sortKey
        (orgAppts || []).forEach((app: any) => {
          const orgName = app.organization?.name || 'Otros';
          const date = new Date(app.scheduled_at);
          const monthLabel = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
          const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          organizations.add(orgName);

          if (!evolutionData[sortKey]) {
            evolutionData[sortKey] = { label: monthLabel, orgs: {} };
          }
          if (!evolutionData[sortKey].orgs[orgName]) evolutionData[sortKey].orgs[orgName] = 0;
          evolutionData[sortKey].orgs[orgName]++;
        });

        // Convertir a formato Recharts y calcular acumulado (ordenado por sortKey)
        const runningTotals: any = {};
        organizations.forEach(name => runningTotals[name] = 0);

        const sortedEntries = Object.entries(evolutionData).sort((a, b) => a[0].localeCompare(b[0]));

        data = {
          chartData: sortedEntries.map(([_, details]: [string, any]) => {
            const entry: any = { month: details.label };
            organizations.forEach(name => {
              runningTotals[name] += (details.orgs[name] || 0);
              entry[name] = runningTotals[name];
            });
            return entry;
          }),
          organizations: Array.from(organizations)
        };
        break;


      default:
        return NextResponse.json({ error: 'Tipo de consulta no válido' }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[Analytics API] Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

