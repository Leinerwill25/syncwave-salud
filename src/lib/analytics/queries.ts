import { SupabaseClient } from '@supabase/supabase-js';
import { getExchangeRateForCurrency } from '@/lib/currency-utils';

export function getWeekRange(weeksAgo: number = 0) {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - now.getDay() - (weeksAgo * 7) + 1); // Lunes
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(from.getDate() + 6); // Domingo
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

export async function getClinicaDetail(supabase: SupabaseClient, clinicaId: string, from: Date, to: Date) {
  // 0. Obtener la moneda base de la organización
  const { data: orgData } = await supabase
    .from('organization')
    .select('currency')
    .eq('id', clinicaId)
    .single();
  let baseCurrency = orgData?.currency;

  // 1. Obtener Citas
  const { data: citas, error: citasError } = await supabase
    .from('appointment')
    .select(`
      id,
      scheduled_at,
      status,
      patient_id,
      selected_service,
      patient (
        id,
        identifier,
        firstName,
        lastName,
        createdAt
      ),
      unregisteredpatients (
        id,
        identification,
        first_name,
        last_name,
        created_at
      )
    `)
    .eq('organization_id', clinicaId)
    .gte('scheduled_at', from.toISOString())
    .lte('scheduled_at', to.toISOString());

  if (citasError) console.error("Error citas:", citasError);

  // 2. Obtener Facturación (para calcular revenue de las completadas)
  const appointmentIds = citas?.map(c => c.id) || [];
  let facturas: any[] = [];
  if (appointmentIds.length > 0) {
    const { data: f, error: fError } = await supabase
      .from('facturacion')
      .select('appointment_id, total, currency, tipo_cambio')
      .in('appointment_id', appointmentIds);
    if (fError) console.error("Error facturas:", fError);
    facturas = f || [];

    // Validar la moneda real que se está usando en facturación si no está explícitamente en organization
    if (!baseCurrency || baseCurrency === 'USD') {
      const firstDivisa = facturas.find(fac => fac.currency && fac.currency !== 'VES');
      if (firstDivisa) {
        baseCurrency = firstDivisa.currency;
      }
    }
  }

  // Si sigue siendo nulo, forzamos EUR si estamos en un contexto donde no sabemos, o USD por defecto.
  // Pero ya debería haber sido detectado por facturas.
  baseCurrency = baseCurrency || 'USD';

  // Obtener tasas de cambio actuales (del día) para conversiones
  const currentUsdRate = await getExchangeRateForCurrency('USD');
  const currentEurRate = await getExchangeRateForCurrency('EUR');

  // Helper para normalizar los pacientes (tanto registrados como no registrados)
  const normalizePatient = (cita: any) => {
    if (cita.patient) {
      return {
        id: cita.patient.id,
        identifier: cita.patient.identifier,
        full_name: `${cita.patient.firstName || ''} ${cita.patient.lastName || ''}`.trim(),
        createdAt: cita.patient.createdAt
      };
    } else if (cita.unregisteredpatients) {
      return {
        id: cita.unregisteredpatients.id,
        identifier: cita.unregisteredpatients.identification,
        full_name: `${cita.unregisteredpatients.first_name || ''} ${cita.unregisteredpatients.last_name || ''}`.trim(),
        createdAt: cita.unregisteredpatients.created_at
      };
    }
    return null;
  };

  // 3. Obtener Pacientes (solo los de estas citas, o buscar todos los pacientes de la org si existiera el campo.
  // Como patient no tiene organization_id de forma directa, los sacamos de las citas)
  // Contamos como "Nuevos" aquellos cuya fecha de 'createdAt' cae en este periodo
  const uniquePatientsMap = new Map();
  (citas || []).forEach(c => {
    const p = normalizePatient(c);
    if (p && !uniquePatientsMap.has(p.id)) {
      uniquePatientsMap.set(p.id, p);
    }
  });

  const uniquePatients = Array.from(uniquePatientsMap.values());
  const pacientesNuevos = uniquePatients.filter((p: any) => {
    if (!p.createdAt) return false;
    const pDate = new Date(p.createdAt);
    return pDate >= from && pDate <= to;
  });

  // Procesar métricas
  const citasConPrecio = citas?.map(c => {
    const isCompleted = ['COMPLETADA', 'COMPLETED', 'REALIZADA'].includes(c.status?.toUpperCase() || '');
    const factura = facturas.find(f => f.appointment_id === c.id);
    let priceBase = null;
    let priceVes = null;

    if (isCompleted && factura) {
      const currency = factura.currency || 'USD';
      const isVes = currency === 'VES';
      
      // Determinar la tasa de cambio DEL DÍA correspondiente a la moneda
      let currentRate = 1;
      if (currency === 'EUR') currentRate = currentEurRate;
      else if (currency === 'USD') currentRate = currentUsdRate;
      // Si es otra moneda, intentamos usar el histórico o 1 como fallback
      else if (!isVes) currentRate = Number(factura.tipo_cambio) || currentUsdRate;

      if (isVes) {
        priceVes = Number(factura.total);
        priceBase = currentRate > 0 ? Number(factura.total) / currentRate : Number(factura.total);
      } else {
        priceBase = Number(factura.total);
        priceVes = Number(factura.total) * currentRate;
      }
    }

    // Cálculo de costo de ausencias
    const isLost = ['NO ASISTIÓ', 'CANCELADA', 'NO_ASISTIO', 'CANCELLED'].includes(c.status?.toUpperCase() || '');
    let lostPrice = 0;
    let lostPriceVes = 0;

    if (isLost && c.selected_service) {
      try {
        const service = typeof c.selected_service === 'string' ? JSON.parse(c.selected_service) : c.selected_service;
        let sPrice = 0;
        let sCurrency = 'USD';

        if (Array.isArray(service)) {
          service.forEach((s: any) => {
            sPrice += Number(s.price) || 0;
            if (s.currency) sCurrency = s.currency;
          });
        } else if (service) {
          sPrice = Number(service.price) || 0;
          sCurrency = service.currency || 'USD';
        }
        
        let currentRate = 1;
        if (sCurrency === 'EUR') currentRate = currentEurRate;
        else if (sCurrency === 'USD') currentRate = currentUsdRate;

        lostPrice = sPrice;
        lostPriceVes = sPrice * currentRate;
      } catch (e) {
        console.error("Error parsing selected_service:", e);
      }
    }

    return {
      ...c,
      price: priceBase,
      priceVes: priceVes,
      lostPrice,
      lostPriceVes,
      normalized_patient: normalizePatient(c)
    };
  }) || [];

  const totalCitas = citasConPrecio.length;
  const confirmadas = citasConPrecio.filter(c => ['CONFIRMADA', 'COMPLETED', 'COMPLETADA', 'REALIZADA'].includes(c.status?.toUpperCase() || '')).length;
  const noAsistio = citasConPrecio.filter(c => ['NO ASISTIÓ', 'CANCELADA', 'NO_ASISTIO'].includes(c.status?.toUpperCase() || '')).length;
  const noRespondieron = totalCitas - confirmadas - noAsistio;

  const revenue = citasConPrecio.reduce((acc, c) => acc + (Number(c.price) || 0), 0);
  const revenueVes = citasConPrecio.reduce((acc, c) => acc + (Number(c.priceVes) || 0), 0);
  const costOfAbsences = citasConPrecio.reduce((acc, c) => acc + (c.lostPrice || 0), 0);
  const costOfAbsencesVes = citasConPrecio.reduce((acc, c) => acc + (c.lostPriceVes || 0), 0);

  return {
    metricas: {
      totalCitas,
      confirmadas,
      noAsistio,
      noRespondieron,
      tasaConfirmacion: totalCitas > 0 ? Math.round((confirmadas / totalCitas) * 100) : 0,
      revenue,
      revenueVes,
      costOfAbsences,
      costOfAbsencesVes,
      baseCurrency,
      pacientesNuevos: pacientesNuevos.length
    },
    citas: citasConPrecio.map(c => ({
      id: c.id,
      date: c.scheduled_at,
      status: c.status?.toUpperCase() || 'DESCONOCIDO',
      price: c.price,
      priceVes: c.priceVes,
      patient: c.normalized_patient ? {
        full_name: c.normalized_patient.full_name,
        identification: c.normalized_patient.identifier
      } : null
    })),
    pacientesNuevos: pacientesNuevos.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      identification: p.identifier,
      created_at: p.createdAt
    }))
  };
}

export async function getClinicaTrends(supabase: SupabaseClient, clinicaId: string, months: number) {
  const to = new Date();
  const from = new Date();
  from.setMonth(to.getMonth() - months);
  from.setDate(1); // Primer día del mes
  from.setHours(0, 0, 0, 0);

  const { data: citas, error } = await supabase
    .from('appointment')
    .select('id, scheduled_at, status, patient_id, unregistered_patient_id, selected_service')
    .eq('organization_id', clinicaId)
    .gte('scheduled_at', from.toISOString())
    .lte('scheduled_at', to.toISOString());

  if (error) {
    console.error("Error fetching trends:", error);
    return null;
  }

  // 1. Tendencia Mensual (Monthly Trend)
  const monthlyTrendMap = new Map();
  // 1.b Tendencia por Semana del Mes (Semana 1 a 5)
  const monthWeekMap = new Map([
    ['Semana 1 (Días 1-7)', 0],
    ['Semana 2 (Días 8-14)', 0],
    ['Semana 3 (Días 15-21)', 0],
    ['Semana 4 (Días 22-28)', 0],
    ['Semana 5 (Días 29+)', 0],
  ]);
  // 2. Mapa de Calor (Día vs Hora)
  const heatmapMap = new Map();
  // 3. Servicios (Distribución)
  const servicesMap = new Map();
  // 4. Fidelidad (Recurrentes vs Nuevos)
  const patientAppointmentsCount = new Map();

  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  (citas || []).forEach(cita => {
    const d = new Date(cita.scheduled_at);
    
    // Monthly Trend
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyTrendMap.has(monthKey)) {
      monthlyTrendMap.set(monthKey, { month: monthKey, total: 0, completadas: 0 });
    }
    const mData = monthlyTrendMap.get(monthKey);
    mData.total += 1;
    if (['COMPLETADA', 'COMPLETED', 'CONFIRMADA', 'REALIZADA'].includes(cita.status?.toUpperCase())) {
      mData.completadas += 1;
    }

    // Week of the Month Trend
    const dayOfMonth = d.getDate();
    let weekLabel = '';
    if (dayOfMonth <= 7) weekLabel = 'Semana 1 (Días 1-7)';
    else if (dayOfMonth <= 14) weekLabel = 'Semana 2 (Días 8-14)';
    else if (dayOfMonth <= 21) weekLabel = 'Semana 3 (Días 15-21)';
    else if (dayOfMonth <= 28) weekLabel = 'Semana 4 (Días 22-28)';
    else weekLabel = 'Semana 5 (Días 29+)';
    
    monthWeekMap.set(weekLabel, (monthWeekMap.get(weekLabel) || 0) + 1);

    // Heatmap (Day vs Hour)
    const day = daysOfWeek[d.getDay()];
    const hour = d.getHours();
    const heatmapKey = `${day}-${hour}`;
    if (!heatmapMap.has(heatmapKey)) {
      heatmapMap.set(heatmapKey, { day, hour, count: 0 });
    }
    heatmapMap.get(heatmapKey).count += 1;

    // Services
    let serviceName = 'Consulta General';
    if (cita.selected_service) {
      if (Array.isArray(cita.selected_service) && cita.selected_service.length > 0) {
        serviceName = cita.selected_service[0].name || serviceName;
      } else if (cita.selected_service.name) {
        serviceName = cita.selected_service.name;
      }
    }
    servicesMap.set(serviceName, (servicesMap.get(serviceName) || 0) + 1);

    // Patient Frequency
    const pId = cita.patient_id || cita.unregistered_patient_id;
    if (pId) {
      patientAppointmentsCount.set(pId, (patientAppointmentsCount.get(pId) || 0) + 1);
    }
  });

  // Formatear resultados
  const monthlyTrend = Array.from(monthlyTrendMap.values()).sort((a, b) => a.month.localeCompare(b.month)).map(m => {
    const [year, monthStr] = m.month.split('-');
    const date = new Date(parseInt(year), parseInt(monthStr) - 1, 1);
    const label = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
    return { ...m, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });

  const topServices = Array.from(servicesMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5

  let recurrentes = 0;
  let unicos = 0;
  patientAppointmentsCount.forEach(count => {
    if (count > 1) recurrentes += 1;
    else unicos += 1;
  });

  return {
    monthlyTrend,
    weeklyTrend: Array.from(monthWeekMap.entries()).map(([name, value]) => ({ name, value })),
    heatmap: Array.from(heatmapMap.values()),
    topServices,
    loyalty: {
      recurrentes,
      unicos,
      totalPatients: recurrentes + unicos
    }
  };
}

export async function getClinicaLTVAndLoyalty(supabase: any, clinicaId: string) {
  // 1. Obtener todas las facturas históricas de la clínica
  const { data: facturas, error: fError } = await supabase
    .from('facturacion')
    .select('patient_id, unregistered_patient_id, total, currency')
    .eq('organization_id', clinicaId);

  if (fError) console.error("Error LTV facturas:", fError);

  // 2. Obtener todas las citas históricas de la clínica
  const { data: citas, error: cError } = await supabase
    .from('appointment')
    .select(`
      id, 
      patient_id, 
      unregistered_patient_id, 
      status, 
      scheduled_at,
      patient (id, firstName, lastName, identifier),
      unregisteredpatients (id, first_name, last_name, identification)
    `)
    .eq('organization_id', clinicaId);

  if (cError) console.error("Error LTV citas:", cError);

  // Agregación en memoria
  const patientData = new Map<string, {
    id: string;
    name: string;
    identification: string;
    totalRevenue: number;
    completedCount: number;
    noShowCount: number;
    lastVisit: Date | null;
  }>();

  // Procesar facturas para LTV
  facturas?.forEach((f: any) => {
    const pId = f.patient_id || f.unregistered_patient_id;
    if (!pId) return;
    
    if (!patientData.has(pId)) {
      patientData.set(pId, { id: pId, name: 'Paciente', identification: '', totalRevenue: 0, completedCount: 0, noShowCount: 0, lastVisit: null });
    }
    const current = patientData.get(pId)!;
    current.totalRevenue += Number(f.total) || 0;
  });

  // Procesar citas para Score de Fidelidad
  citas?.forEach((c: any) => {
    const pId = c.patient_id || c.unregistered_patient_id;
    if (!pId) return;

    if (!patientData.has(pId)) {
      patientData.set(pId, { id: pId, name: 'Paciente', identification: '', totalRevenue: 0, completedCount: 0, noShowCount: 0, lastVisit: null });
    }
    const current = patientData.get(pId)!;

    // Establecer nombre e identificación
    if (c.patient) {
      current.name = `${c.patient.firstName} ${c.patient.lastName}`;
      current.identification = c.patient.identifier || '';
    } else if (c.unregisteredpatients) {
      current.name = `${c.unregisteredpatients.first_name} ${c.unregisteredpatients.last_name}`;
      current.identification = c.unregisteredpatients.identification || '';
    }

    const status = c.status?.toUpperCase() || '';
    if (['COMPLETADA', 'COMPLETED', 'REALIZADA'].includes(status)) {
      current.completedCount += 1;
    } else if (['NO ASISTIÓ', 'NO_ASISTIO', 'CANCELADA'].includes(status)) {
      current.noShowCount += 1;
    }

    const date = new Date(c.scheduled_at);
    if (!current.lastVisit || date > current.lastVisit) {
      current.lastVisit = date;
    }
  });

  // Calcular scores y formatear
  const now = new Date();
  const ranking = Array.from(patientData.values()).map(p => {
    // Score de Frecuencia (0-40)
    const freqScore = Math.min(p.completedCount * 10, 40);
    
    // Score de Confiabilidad (0-40)
    const totalRequests = p.completedCount + p.noShowCount;
    const relScore = totalRequests > 0 ? (p.completedCount / totalRequests) * 40 : 0;
    
    // Score de Recencia (0-20)
    let recScore = 0;
    if (p.lastVisit) {
      const diffDays = Math.floor((now.getTime() - p.lastVisit.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 30) recScore = 20;
      else if (diffDays <= 90) recScore = 10;
    }

    const score = Math.round(freqScore + relScore + recScore);

    let segment = 'Inactivo';
    if (score >= 80) segment = 'Fiel';
    else if (score >= 50) segment = 'En riesgo';

    return {
      id: p.id,
      name: p.name,
      identification: p.identification,
      ltv: p.totalRevenue,
      score,
      segment
    };
  });

  // Ordenar por LTV descendente y tomar top 10
  return ranking.sort((a, b) => b.ltv - a.ltv).slice(0, 10);
}
