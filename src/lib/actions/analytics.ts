'use server';

import { createSupabaseServerClient } from '@/app/adapters/server';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

export type Period = 'week' | 'month' | 'year' | 'all';

function getDateRange(period: Period) {
  const now = new Date();
  switch (period) {
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'all':
    default:
      return { start: new Date(0), end: now };
  }
}

/**
 * Obtiene estadísticas generales de la clínica para un periodo dado.
 */
export async function getClinicGeneralStats(organizationId: string, period: Period = 'month') {
  const { start, end } = getDateRange(period);
  const supabase = await createSupabaseServerClient();

  try {
    // 1. Total Consultations
    const { count: totalConsultations, error: consultationsError } = await supabase
      .from('consultation')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (consultationsError) console.error('Error fetching consultations count:', consultationsError);

    // 2. Total Patients (approximate via consultations or direct relation if exists)
    // Since we don't have a direct "Patient belongs to Organization" easily queryable without join,
    // we can count patients who had consultations in this period.
    // Or if we want all patients ever, we query Patient table if linked.
    // Based on previous Prisma code: consultations: { some: { organizationId... } }
    // We'll query distinct patient_id from consultations in this period.
    const { data: distinctPatients, error: patientsError } = await supabase
      .from('consultation')
      .select('patient_id')
      .eq('organization_id', organizationId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
    
    const totalPatients = distinctPatients ? new Set(distinctPatients.map(p => p.patient_id)).size : 0;
    if (patientsError) console.error('Error fetching patients count:', patientsError);

    // 3. Total Income
    const { data: incomeData, error: incomeError } = await supabase
      .from('facturacion')
      .select('total')
      .eq('organization_id', organizationId)
      .gte('fecha_emision', start.toISOString())
      .lte('fecha_emision', end.toISOString())
      .eq('estado_pago', 'pagada');

    const totalIncome = incomeData?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0;
    if (incomeError) console.error('Error fetching income:', incomeError);

    // 4. Active Specialists
    const { count: activeSpecialists, error: specialistsError } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true })
      .eq('organizationId', organizationId)
      .eq('role', 'MEDICO');
      // .eq('status', 'ACTIVE'); // Uncomment if status exists

    if (specialistsError) console.error('Error fetching specialists count:', specialistsError);

    return {
      totalConsultations: totalConsultations || 0,
      totalPatients,
      totalIncome,
      activeSpecialists: activeSpecialists || 0
    };
  } catch (error) {
    console.error('Error fetching clinic stats:', error);
    return {
      totalConsultations: 0,
      totalPatients: 0,
      totalIncome: 0,
      activeSpecialists: 0
    };
  }
}

/**
 * Obtiene el rendimiento de los especialistas.
 */
export async function getSpecialistsPerformance(organizationId: string, period: Period = 'month') {
  const { start, end } = getDateRange(period);
  const supabase = await createSupabaseServerClient();

  try {
    // Get specialists
    const { data: specialists, error: specialistsError } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('organizationId', organizationId)
      .eq('role', 'MEDICO');

    if (specialistsError || !specialists) {
      console.error('Error fetching specialists:', specialistsError);
      return [];
    }

    // For each specialist, get metrics (this might be N+1, but acceptable for small number of specialists)
    // Optimization: Could use RPC or complex join, but parallel promises is fine for now.
    const performanceData = await Promise.all(specialists.map(async (s) => {
      // Consultations count & unique patients
      const { data: consultations } = await supabase
        .from('consultation')
        .select('patient_id')
        .eq('doctor_id', s.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const consultationCount = consultations?.length || 0;
      const uniquePatients = consultations ? new Set(consultations.map(c => c.patient_id)).size : 0;

      // Income
      const { data: invoices } = await supabase
        .from('facturacion')
        .select('total')
        .eq('doctor_id', s.id) // Assuming doctor_id exists in facturacion based on previous code context
        .gte('fecha_emision', start.toISOString())
        .lte('fecha_emision', end.toISOString())
        .eq('estado_pago', 'pagada');

      const income = invoices?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0;

      return {
        id: s.id,
        name: s.name || 'Sin nombre',
        email: s.email,
        consultations: consultationCount,
        patients: uniquePatients,
        income
      };
    }));

    return performanceData;
  } catch (error) {
    console.error('Error fetching specialists performance:', error);
    return [];
  }
}

/**
 * Obtiene datos para gráficas de ingresos y consultas.
 */
export async function getFinancialReports(organizationId: string, period: Period = 'year') {
    const { start, end } = getDateRange(period);
    const supabase = await createSupabaseServerClient();
    
    try {
        const { data: invoices, error } = await supabase
            .from('facturacion')
            .select('fecha_emision, total')
            .eq('organization_id', organizationId)
            .gte('fecha_emision', start.toISOString())
            .lte('fecha_emision', end.toISOString())
            .eq('estado_pago', 'pagada');

        if (error) throw error;

        // Agrupar por mes
        const grouped = (invoices || []).reduce((acc: Record<string, number>, curr: any) => {
            const date = new Date(curr.fecha_emision);
            const month = format(date, 'MMM', { locale: es });
            acc[month] = (acc[month] || 0) + (Number(curr.total) || 0);
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    } catch (error) {
        console.error('Error fetching financial reports:', error);
        return [];
    }
}

/**
 * Obtiene estadísticas de diagnósticos.
 */
export async function getDiagnosesStats(organizationId: string) {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: consultations, error } = await supabase
            .from('consultation')
            .select('diagnosis')
            .eq('organization_id', organizationId)
            .not('diagnosis', 'is', null)
            .limit(1000);

        if (error) throw error;

        const diagnosisCounts = (consultations || []).reduce((acc: Record<string, number>, curr: any) => {
            const diag = curr.diagnosis?.trim();
            if (diag) {
                acc[diag] = (acc[diag] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(diagnosisCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

    } catch (error) {
        console.error('Error fetching diagnoses stats:', error);
        return [];
    }
}

/**
 * Comparativa Citas vs Consultas
 */
export async function getAppointmentVsConsultationStats(organizationId: string, period: Period = 'month') {
    const { start, end } = getDateRange(period);
    const supabase = await createSupabaseServerClient();

    try {
        const [appointmentsRes, consultationsRes] = await Promise.all([
            supabase
                .from('appointment')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
                .gte('scheduled_at', start.toISOString())
                .lte('scheduled_at', end.toISOString()),
            supabase
                .from('consultation')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString())
        ]);

        return [
            { name: 'Citas Agendadas', value: appointmentsRes.count || 0 },
            { name: 'Consultas Realizadas', value: consultationsRes.count || 0 }
        ];
    } catch (error) {
        console.error('Error fetching comparison stats:', error);
        return [];
    }
}

/**
 * Detalles de un especialista específico
 */
export async function getSpecialistDetails(organizationId: string, specialistId: string) {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: specialist, error: userError } = await supabase
            .from('User')
            .select('id, name, email, role, createdAt')
            .eq('id', specialistId)
            .single();

        if (userError || !specialist || specialist.role !== 'MEDICO') return null;

        // Historial de trabajo (consultas por mes últimos 6 meses)
        const sixMonthsAgo = subMonths(new Date(), 6);
        
        const { data: consultations, error: consultError } = await supabase
            .from('consultation')
            .select('created_at')
            .eq('doctor_id', specialistId)
            .eq('organization_id', organizationId)
            .gte('created_at', sixMonthsAgo.toISOString());

        if (consultError) throw consultError;

        const history = (consultations || []).reduce((acc: Record<string, number>, curr: any) => {
            const date = new Date(curr.created_at);
            const month = format(date, 'MMM', { locale: es });
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const historyData = Object.entries(history).map(([name, value]) => ({ name, value }));

        return {
            ...specialist,
            history: historyData
        };
    } catch (error) {
        console.error('Error fetching specialist details:', error);
        return null;
    }
}

/**
 * Desglose de consultas
 */
export async function getConsultationBreakdown(organizationId: string) {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: consultations, error } = await supabase
            .from('consultation')
            .select('created_at')
            .eq('organization_id', organizationId);

        if (error) throw error;

        const byMonth = (consultations || []).reduce((acc: Record<string, number>, curr: any) => {
            const date = new Date(curr.created_at);
            const month = format(date, 'MMMM', { locale: es });
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(byMonth).map(([name, value]) => ({ name, value }));
    } catch (error) {
        return [];
    }
}

/**
 * Estadísticas de seguimiento
 */
export async function getFollowUpStats(organizationId: string) {
    const supabase = await createSupabaseServerClient();
    try {
        // Pacientes con > 1 consulta
        // Supabase no tiene groupBy fácil en cliente JS sin RPC, así que lo hacemos en JS
        // Traemos todas las consultas (id, patient_id)
        const { data: consultations, error } = await supabase
            .from('consultation')
            .select('id, patient_id')
            .eq('organization_id', organizationId);

        if (error) throw error;

        const patientCounts: Record<string, number> = {};
        (consultations || []).forEach((c: any) => {
            if (c.patient_id) {
                patientCounts[c.patient_id] = (patientCounts[c.patient_id] || 0) + 1;
            }
        });

        const totalPatients = Object.keys(patientCounts).length;
        const returningPatients = Object.values(patientCounts).filter(count => count > 1).length;
        const retentionRate = totalPatients > 0 ? Math.round((returningPatients / totalPatients) * 100) : 0;

        return {
            retentionRate,
            returningPatients,
            totalPatients
        };
    } catch (error) {
        return { retentionRate: 0, returningPatients: 0, totalPatients: 0 };
    }
}
