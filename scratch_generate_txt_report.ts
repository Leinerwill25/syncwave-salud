import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.RESEND_API_KEY) {
  dotenv.config({ path: '.env' });
}

const { getClinicaDetail, getClinicaTrends, getClinicaLTVAndLoyalty } = require('./src/lib/analytics/queries');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  const clinicaId = "d52a76ac-fe33-414f-a26c-af7bb2f95df8";
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log(`Fetching data for clinic ${clinicaId}...`);
    
    // 1. Datos de los últimos 15 días
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 15);
    const detailCurrent = await getClinicaDetail(supabase, clinicaId, from, to);
    
    // 2. Datos de los 15 días anteriores
    const toPrev = new Date(from);
    const fromPrev = new Date(toPrev);
    fromPrev.setDate(toPrev.getDate() - 15);
    const detailPrev = await getClinicaDetail(supabase, clinicaId, fromPrev, toPrev);
    
    // 3. Tendencias (6 meses)
    const trends = await getClinicaTrends(supabase, clinicaId, 6);
    
    // 4. LTV y Fidelización
    const ltv = await getClinicaLTVAndLoyalty(supabase, clinicaId);
    
    // Obtener nombre de la organización
    const { data: orgData } = await supabase
      .from('organization')
      .select('name')
      .eq('id', clinicaId)
      .single();
      
    const organizationName = orgData?.name || "Clínica";
    
    // Construir el reporte en TXT detallado
    let txt = `INFORME DETALLADO DE RENDIMIENTO Y MÉTRICAS\n`;
    txt += `==================================================\n`;
    txt += `Organización: ${organizationName}\n`;
    txt += `ID de la Clínica: ${clinicaId}\n`;
    txt += `Fecha de Generación: ${new Date().toLocaleString('es-ES')}\n`;
    txt += `Período Analizado: Desde ${from.toLocaleDateString('es-ES')} hasta ${to.toLocaleDateString('es-ES')} (Últimos 15 días)\n`;
    txt += `Período de Comparación: Desde ${fromPrev.toLocaleDateString('es-ES')} hasta ${toPrev.toLocaleDateString('es-ES')} (15 días anteriores)\n`;
    txt += `==================================================\n\n`;
    
    txt += `1. RESUMEN DE RENDIMIENTO Y KPIS PRINCIPALES\n`;
    txt += `--------------------------------------------------\n`;
    
    const mCur = detailCurrent.metricas || {};
    const mPrev = detailPrev.metricas || {};
    
    txt += `Métrica: Total de Citas Registradas\n`;
    txt += `- En los últimos 15 días se registraron ${mCur.totalCitas || 0} citas.\n`;
    txt += `- En los 15 días anteriores se registraron ${mPrev.totalCitas || 0} citas.\n`;
    txt += `- Esto representa una variación de ${(mCur.totalCitas || 0) - (mPrev.totalCitas || 0)} citas.\n\n`;
    
    txt += `Métrica: Citas Confirmadas\n`;
    txt += `- En los últimos 15 días se confirmaron ${mCur.confirmadas || 0} citas.\n`;
    txt += `- En los 15 días anteriores se confirmaron ${mPrev.confirmadas || 0} citas.\n`;
    txt += `- Esto representa una variación de ${(mCur.confirmadas || 0) - (mPrev.confirmadas || 0)} citas.\n\n`;
    
    txt += `Métrica: Pacientes que No Asistieron (Ausencias)\n`;
    txt += `- En los últimos 15 días, ${mCur.noAsistio || 0} pacientes no asistieron a su cita.\n`;
    txt += `- En los 15 días anteriores, ${mPrev.noAsistio || 0} pacientes no asistieron.\n`;
    txt += `- Esto representa una variación de ${(mCur.noAsistio || 0) - (mPrev.noAsistio || 0)} pacientes.\n\n`;
    
    txt += `Métrica: Ingresos Generados\n`;
    txt += `- En los últimos 15 días se generaron ${mCur.revenue || 0} ${mCur.baseCurrency || 'USD'} en ingresos.\n`;
    txt += `- En los 15 días anteriores se generaron ${mPrev.revenue || 0} ${mPrev.baseCurrency || 'USD'}.\n`;
    txt += `- Esto representa una variación de ${(mCur.revenue || 0) - (mPrev.revenue || 0)} ${mCur.baseCurrency || 'USD'}.\n\n`;
    
    txt += `Métrica: Pacientes Nuevos Captados\n`;
    txt += `- En los últimos 15 días se captaron ${mCur.pacientesNuevos || 0} nuevos pacientes.\n`;
    txt += `- En los 15 días anteriores se captaron ${mPrev.pacientesNuevos || 0} nuevos pacientes.\n`;
    txt += `- Esto representa una variación de ${(mCur.pacientesNuevos || 0) - (mPrev.pacientesNuevos || 0)} pacientes.\n\n`;
    
    txt += `2. DESGLOSE DE LA AGENDA DE CITAS (Últimos 15 días)\n`;
    txt += `--------------------------------------------------\n`;
    txt += `A continuación se detallan todas las citas registradas en el período analizado:\n\n`;
    
    (detailCurrent.citas || []).forEach((c: any, index: number) => {
      txt += `Cita número ${index + 1}:\n`;
      txt += `- Fecha y Hora: ${new Date(c.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
      txt += `- Paciente: ${c.patient?.full_name || 'Paciente'}\n`;
      txt += `- Estado de la cita: ${c.status}\n`;
      txt += `- Precio del servicio: ${c.price || 0} ${mCur.baseCurrency || 'USD'}\n\n`;
    });
    
    txt += `3. TENDENCIAS Y COMPORTAMIENTO (Histórico de 6 meses)\n`;
    txt += `--------------------------------------------------\n`;
    
    txt += `Volumen de Citas Mensual:\n`;
    if (trends && trends.monthlyVolume) {
      trends.monthlyVolume.forEach((v: any) => {
        txt += `- En el mes de ${v.month} se registraron ${v.value} citas.\n`;
      });
    } else {
      txt += `- No hay datos históricos de volumen mensual disponibles.\n`;
    }
    txt += `\n`;
    
    txt += `Servicios Más Solicitados:\n`;
    if (trends && trends.topServices) {
      trends.topServices.forEach((s: any) => {
        txt += `- El servicio "${s.name}" tuvo un total de ${s.value} citas.\n`;
      });
    } else {
      txt += `- No hay datos de servicios disponibles.\n`;
    }
    txt += `\n`;
    
    txt += `Días de Mayor Demanda (Distribución de citas por día de la semana):\n`;
    if (trends && trends.heatmap) {
      const dayCounts: any = {};
      trends.heatmap.forEach((h: any) => {
        dayCounts[h.day] = (dayCounts[h.day] || 0) + h.count;
      });
      Object.entries(dayCounts).forEach(([day, count]) => {
        txt += `- El día ${day} se registraron un total de ${count} citas.\n`;
      });
    } else {
      txt += `- No hay datos de distribución por días disponibles.\n`;
    }
    txt += `\n`;
    
    txt += `4. FIDELIZACIÓN DE PACIENTES\n`;
    txt += `--------------------------------------------------\n`;
    if (ltv && ltv.loyalty) {
      txt += `- Cantidad de Pacientes Recurrentes (que han asistido más de una vez): ${ltv.loyalty.recurrentes || 0}\n`;
      txt += `- Cantidad de Pacientes Únicos (que han asistido una sola vez): ${ltv.loyalty.unicos || 0}\n`;
    } else {
      txt += `- No hay datos de fidelización disponibles.\n`;
    }
    
    // Guardar archivo
    const filename = `Reporte_Detallado_${clinicaId}.txt`;
    fs.writeFileSync(filename, txt);
    console.log(`Archivo generado: ${filename}`);
    
  } catch (error) {
    console.error("Error generando datos:", error);
  }
}

run();
