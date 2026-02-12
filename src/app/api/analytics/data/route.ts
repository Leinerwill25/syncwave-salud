import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usar service role key para evitar RLS
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? '';

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// GET: Obtener datos de analytics según el tipo
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // epidemiology, pharmacy, operations, financial, etc.
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 });
    }

    let data = null;

    switch (type) {
      case 'top-diagnoses': {
        const { data: consultations, error } = await supabaseAdmin
          .from('consultation')
          .select('diagnosis')
          .not('diagnosis', 'is', null)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        // Contar diagnósticos
        const counts = (consultations || []).reduce((acc: any, item: any) => {
          const diagnosis = item.diagnosis;
          acc[diagnosis] = (acc[diagnosis] || 0) + 1;
          return acc;
        }, {});

        const total = Object.values(counts).reduce((sum: number, count: any) => sum + count, 0);
        const sorted = Object.entries(counts)
          .map(([diagnosis, count]) => ({
            diagnosis,
            count: count as number,
            percentage: total > 0 ? ((count as number) / total) * 100 : 0
          }))
          .sort((a, b) => b.count - a.count);

        data = sorted;
        break;
      }

      case 'appointment-stats': {
        const { data: appointments, error } = await supabaseAdmin
          .from('appointment')
          .select(`
            id,
            status,
            organization:organization_id (
              name
            )
          `)
          .gte('scheduled_at', startDate)
          .lte('scheduled_at', endDate);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        // Agrupar por organización
        const grouped = (appointments || []).reduce((acc: any, item: any) => {
          const orgName = item.organization?.name || 'Sin organización';
          if (!acc[orgName]) {
            acc[orgName] = { consultorio: orgName, completed: 0, cancelled: 0, scheduled: 0, total: 0 };
          }
          acc[orgName].total++;
          if (item.status === 'COMPLETED') acc[orgName].completed++;
          if (item.status === 'CANCELLED') acc[orgName].cancelled++;
          if (item.status === 'SCHEDULED') acc[orgName].scheduled++;
          return acc;
        }, {});

        data = Object.values(grouped).map((item: any) => ({
          consultorio: item.consultorio,
          completed: item.completed,
          cancelled: item.cancelled,
          scheduled: item.scheduled,
          attendance_rate: item.total > 0 ? (item.completed / item.total) * 100 : 0
        }));
        break;
      }

      case 'revenue': {
        const { data: facturaciones, error } = await supabaseAdmin
          .from('facturacion')
          .select('total, currency, metodo_pago, fecha_emision, estado_pago')
          .eq('estado_pago', 'pagado')
          .gte('fecha_emision', startDate)
          .lte('fecha_emision', endDate);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        // Agrupar por período mensual
        const grouped = (facturaciones || []).reduce((acc: any, item: any) => {
          const date = new Date(item.fecha_emision);
          const period = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
          const currency = item.currency || 'USD';
          const key = `${period}-${currency}`;
          
          if (!acc[key]) {
            acc[key] = { total_revenue: 0, currency, payment_method: 'Varios', count: 0, period };
          }
          acc[key].total_revenue += parseFloat(item.total || '0');
          acc[key].count++;
          return acc;
        }, {});

        data = Object.values(grouped);
        break;
      }

      case 'patient-count': {
        const { count, error } = await supabaseAdmin
          .from('patient')
          .select('*', { count: 'exact', head: true })
          .gte('createdAt', startDate)
          .lte('createdAt', endDate);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        data = { count: count || 0 };
        break;
      }

      case 'diagnosis-by-region': {
        const { data: consultations, error } = await supabaseAdmin
          .from('consultation')
          .select(`
            id,
            diagnosis,
            icd11_code,
            icd11_title,
            created_at,
            patient_id,
            unregistered_patient_id,
            doctor_id
          `)
          .not('diagnosis', 'is', null)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        // Obtener pacientes y doctores en paralelo
        const patientIds = [...new Set((consultations || []).map((c: any) => c.patient_id).filter(Boolean))];
        const unregisteredIds = [...new Set((consultations || []).map((c: any) => c.unregistered_patient_id).filter(Boolean))];
        const doctorIds = [...new Set((consultations || []).map((c: any) => c.doctor_id).filter(Boolean))];

        const [patients, unregistered, doctors] = await Promise.all([
          patientIds.length > 0 ? supabaseAdmin.from('patient').select('id, address').in('id', patientIds) : { data: [] },
          unregisteredIds.length > 0 ? supabaseAdmin.from('unregisteredpatients').select('id, address').in('id', unregisteredIds) : { data: [] },
          doctorIds.length > 0 ? supabaseAdmin.from('users').select('id, medic_profile(specialty)').in('id', doctorIds) : { data: [] }
        ]);

        const patientsMap = new Map((patients.data || []).map((p: any) => [p.id, p]));
        const unregisteredMap = new Map((unregistered.data || []).map((u: any) => [u.id, u]));
        const doctorsMap = new Map((doctors.data || []).map((d: any) => [d.id, d]));

        // Procesar y agrupar
        const grouped = (consultations || []).reduce((acc: any, item: any) => {
          const patient = item.patient_id ? patientsMap.get(item.patient_id) : null;
          const unregisteredPatient = item.unregistered_patient_id ? unregisteredMap.get(item.unregistered_patient_id) : null;
          const doctor = item.doctor_id ? doctorsMap.get(item.doctor_id) : null;
          
          const region = patient?.address || unregisteredPatient?.address || 'Sin región';
          const specialty = (doctor as any)?.medic_profile?.specialty || 'Sin especialidad';
          const diagnosis = item.diagnosis;
          const month = new Date(item.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
          
          const key = `${region}-${diagnosis}-${specialty}-${month}`;
          
          if (!acc[key]) {
            acc[key] = {
              region,
              diagnosis,
              icd11_code: item.icd11_code,
              icd11_title: item.icd11_title,
              count: 0,
              specialty,
              month
            };
          }
          
          acc[key].count++;
          return acc;
        }, {});

        data = Object.values(grouped);
        break;
      }

      case 'pharmacy-medications': {
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        
        // Primero obtener prescripciones en el rango de fechas
        const { data: prescriptions, error: prescError } = await supabaseAdmin
          .from('prescription')
          .select('id')
          .gte('issued_at', startDate)
          .lte('issued_at', endDate);

        if (prescError) {
          console.error('[Analytics API] Error:', prescError);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        const prescriptionIds = (prescriptions || []).map((p: any) => p.id);
        
        if (prescriptionIds.length === 0) {
          data = [];
          break;
        }

        // Obtener items de prescripción
        const { data: items, error: itemsError } = await supabaseAdmin
          .from('prescription_item')
          .select('name, dosage, quantity, prescription_id')
          .in('prescription_id', prescriptionIds);

        if (itemsError) {
          console.error('[Analytics API] Error:', itemsError);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        // Obtener información de doctores
        const prescriptionDoctorMap = new Map();
        if (prescriptionIds.length > 0) {
          const { data: prescDoctors } = await supabaseAdmin
            .from('prescription')
            .select('id, doctor_id')
            .in('id', prescriptionIds);

          if (prescDoctors) {
            const docIds = [...new Set(prescDoctors.map((p: any) => p.doctor_id).filter(Boolean))];
            if (docIds.length > 0) {
              const { data: doctors } = await supabaseAdmin
                .from('users')
                .select('id, medic_profile(specialty)')
                .in('id', docIds);

              const doctorsMap = new Map((doctors || []).map((d: any) => [d.id, d]));
              prescDoctors.forEach((p: any) => {
                prescriptionDoctorMap.set(p.id, doctorsMap.get(p.doctor_id));
              });
            }
          }
        }

        // Agrupar por especialidad y medicamento
        const grouped = (items || []).reduce((acc: any, item: any) => {
          const doctor = prescriptionDoctorMap.get(item.prescription_id);
          const specialty = (doctor as any)?.medic_profile?.specialty || 'Sin especialidad';
          const medication = item.name;
          const key = `${specialty}-${medication}`;
          
          if (!acc[key]) {
            acc[key] = {
              specialty,
              medication,
              total_prescriptions: 0,
              quantities: [],
              dosages: new Set()
            };
          }
          
          acc[key].total_prescriptions++;
          if (item.quantity) acc[key].quantities.push(item.quantity);
          if (item.dosage) acc[key].dosages.add(item.dosage);
          
          return acc;
        }, {});

        // Calcular promedios
        const result = Object.values(grouped).map((item: any) => ({
          specialty: item.specialty,
          medication: item.medication,
          total_prescriptions: item.total_prescriptions,
          avg_quantity: item.quantities.length > 0 
            ? item.quantities.reduce((sum: number, q: number) => sum + q, 0) / item.quantities.length 
            : 0,
          common_dosages: Array.from(item.dosages)
        }));

        data = result.sort((a: any, b: any) => b.total_prescriptions - a.total_prescriptions).slice(0, limit);
        break;
      }

      case 'consultation-duration': {
        const { data: consultations, error } = await supabaseAdmin
          .from('consultation')
          .select('started_at, ended_at')
          .not('started_at', 'is', null)
          .not('ended_at', 'is', null)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        const durations = (consultations || [])
          .map((item: any) => {
            const start = new Date(item.started_at).getTime();
            const end = new Date(item.ended_at).getTime();
            return (end - start) / (1000 * 60); // Minutos
          })
          .filter(d => d > 0 && d < 480); // Filtrar valores anómalos

        const avg = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
        durations.sort((a, b) => a - b);
        const median = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;

        data = {
          avg_duration_minutes: Math.round(avg),
          median_duration_minutes: Math.round(median)
        };
        break;
      }

      case 'payment-methods': {
        const { data: facturaciones, error } = await supabaseAdmin
          .from('facturacion')
          .select('metodo_pago, total')
          .eq('estado_pago', 'pagado')
          .gte('fecha_emision', startDate)
          .lte('fecha_emision', endDate);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        const grouped = (facturaciones || []).reduce((acc: any, item: any) => {
          const method = item.metodo_pago || 'No especificado';
          if (!acc[method]) {
            acc[method] = { method, count: 0, total_amount: 0 };
          }
          acc[method].count++;
          acc[method].total_amount += parseFloat(item.total || '0');
          return acc;
        }, {});

        data = Object.values(grouped).sort((a: any, b: any) => b.total_amount - a.total_amount);
        break;
      }

      case 'lab-results': {
        const { data: labResults, error } = await supabaseAdmin
          .from('lab_result')
          .select('result_type, is_critical, created_at, reported_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        const grouped = (labResults || []).reduce((acc: any, item: any) => {
          const resultType = item.result_type || 'Sin tipo';
          if (!acc[resultType]) {
            acc[resultType] = {
              result_type: resultType,
              total_orders: 0,
              critical_count: 0,
              turnarounds: []
            };
          }
          acc[resultType].total_orders++;
          if (item.is_critical) acc[resultType].critical_count++;
          
          if (item.created_at && item.reported_at) {
            const created = new Date(item.created_at).getTime();
            const reported = new Date(item.reported_at).getTime();
            const days = (reported - created) / (1000 * 60 * 60 * 24);
            if (days > 0 && days < 365) {
              acc[resultType].turnarounds.push(days);
            }
          }
          return acc;
        }, {});

        data = Object.values(grouped).map((item: any) => ({
          result_type: item.result_type,
          total_orders: item.total_orders,
          critical_count: item.critical_count,
          avg_turnaround_days: item.turnarounds.length > 0
            ? Math.round((item.turnarounds.reduce((sum: number, d: number) => sum + d, 0) / item.turnarounds.length) * 10) / 10
            : 0
        })).sort((a: any, b: any) => b.total_orders - a.total_orders);
        break;
      }

      case 'patient-demographics': {
        const { data: patients, error } = await supabaseAdmin
          .from('patient')
          .select('dob, gender, address, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

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
          
          const gender = item.gender || 'No especificado';
          const region = item.address || 'Sin región';
          const key = `${ageGroup}-${gender}-${region}`;
          
          if (!acc[key]) {
            acc[key] = { age_group: ageGroup, gender, count: 0, region };
          }
          acc[key].count++;
          return acc;
        }, {});

        data = Object.values(grouped);
        break;
      }

      case 'patient-growth': {
        const { data: patients, error } = await supabaseAdmin
          .from('patient')
          .select('created_at')
          .lte('created_at', endDate);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        const monthly = (patients || []).reduce((acc: any, item: any) => {
          const date = new Date(item.created_at);
          const month = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});

        let total = 0;
        data = Object.entries(monthly)
          .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
          .map(([month, count]) => {
            total += count as number;
            return { month, new_patients: count as number, total_patients: total };
          });
        break;
      }

      case 'communication-metrics': {
        const { data: messages, error } = await supabaseAdmin
          .from('message')
          .select('id, created_at, read, read_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        const grouped = (messages || []).reduce((acc: any, item: any) => {
          const date = new Date(item.created_at).toLocaleDateString('es-ES');
          if (!acc[date]) {
            acc[date] = { date, messages_sent: 0, messages_read: 0, response_times: [] };
          }
          acc[date].messages_sent++;
          if (item.read && item.read_at) {
            acc[date].messages_read++;
            const sent = new Date(item.created_at).getTime();
            const read = new Date(item.read_at).getTime();
            const minutes = (read - sent) / (1000 * 60);
            if (minutes > 0 && minutes < 10080) {
              acc[date].response_times.push(minutes);
            }
          }
          return acc;
        }, {});

        data = Object.values(grouped).map((item: any) => ({
          date: item.date,
          messages_sent: item.messages_sent,
          response_rate: item.messages_sent > 0 ? (item.messages_read / item.messages_sent) * 100 : 0,
          avg_response_time_minutes: item.response_times.length > 0
            ? Math.round((item.response_times.reduce((sum: number, t: number) => sum + t, 0) / item.response_times.length) * 10) / 10
            : 0
        })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      }

      case 'audit-logs': {
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const { data: logs, error } = await supabaseAdmin
          .from('audit_log')
          .select('id, user_name, action_type, entity_type, description, metadata, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        data = (logs || []).map((item: any) => ({
          id: item.id,
          user_name: item.user_name || 'Usuario desconocido',
          action_type: item.action_type,
          module: item.entity_type,
          timestamp: item.created_at,
          details: item.description || JSON.stringify(item.metadata || {})
        }));
        break;
      }

      case 'action-distribution': {
        const { data: logs, error } = await supabaseAdmin
          .from('audit_log')
          .select('action_type')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (error) {
          console.error('[Analytics API] Error:', error);
          return NextResponse.json({ error: 'Error consultando datos' }, { status: 500 });
        }

        const grouped = (logs || []).reduce((acc: any, item: any) => {
          const actionType = item.action_type || 'Desconocido';
          acc[actionType] = (acc[actionType] || 0) + 1;
          return acc;
        }, {});

        data = Object.entries(grouped)
          .map(([action_type, count]) => ({ action_type, count: count as number }))
          .sort((a: any, b: any) => b.count - a.count);
        break;
      }

      default:
        return NextResponse.json({ error: 'Tipo de consulta no válido' }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[Analytics API] Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

