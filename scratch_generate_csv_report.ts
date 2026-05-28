import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.RESEND_API_KEY) {
  dotenv.config({ path: '.env' });
}

const { getClinicaDetail, getClinicaTrends } = require('./src/lib/analytics/queries');
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
    
    // 4. Calcular Fidelización Real
    const { data: allCitas } = await supabase
      .from('appointment')
      .select('patient_id, unregistered_patient_id')
      .eq('organization_id', clinicaId);
      
    const patientCounts = new Map<string, number>();
    allCitas?.forEach((c: any) => {
      const pId = c.patient_id || c.unregistered_patient_id;
      if (!pId) return;
      patientCounts.set(pId, (patientCounts.get(pId) || 0) + 1);
    });
    
    let recurrentes = 0;
    let unicos = 0;
    patientCounts.forEach((count) => {
      if (count > 1) recurrentes++;
      else unicos++;
    });
    
    const mCur = detailCurrent.metricas || {};
    const mPrev = detailPrev.metricas || {};
    
    // Construir el CSV
    let csv = `Seccion,Métrica / Campo,Valor Actual,Valor Anterior,Variación\n`;
    
    // Sección KPIs
    csv += `KPIs,Total Citas,${mCur.totalCitas || 0},${mPrev.totalCitas || 0},${(mCur.totalCitas || 0) - (mPrev.totalCitas || 0)}\n`;
    csv += `KPIs,Confirmadas,${mCur.confirmadas || 0},${mPrev.confirmadas || 0},${(mCur.confirmadas || 0) - (mPrev.confirmadas || 0)}\n`;
    csv += `KPIs,No Asistió,${mCur.noAsistio || 0},${mPrev.noAsistio || 0},${(mCur.noAsistio || 0) - (mPrev.noAsistio || 0)}\n`;
    csv += `KPIs,Ingresos,${mCur.revenue || 0},${mPrev.revenue || 0},${(mCur.revenue || 0) - (mPrev.revenue || 0)}\n`;
    csv += `KPIs,Pacientes Nuevos,${mCur.pacientesNuevos || 0},${mPrev.pacientesNuevos || 0},${(mCur.pacientesNuevos || 0) - (mPrev.pacientesNuevos || 0)}\n`;
    
    csv += `\n`;
    
    // Sección Fidelización
    csv += `Fidelización,Pacientes Recurrentes,${recurrentes},,\n`;
    csv += `Fidelización,Pacientes Únicos,${unicos},,\n`;
    
    csv += `\n`;
    
    // Sección Tendencias
    csv += `Tendencias,Mes,Citas,,\n`;
    if (trends && trends.monthlyVolume) {
      trends.monthlyVolume.forEach((v: any) => {
        csv += `Tendencias (Volumen),${v.month},${v.value},,\n`;
      });
    }
    
    csv += `\n`;
    
    csv += `Servicios,Servicio,Citas,,\n`;
    if (trends && trends.topServices) {
      trends.topServices.forEach((s: any) => {
        csv += `Servicios Mas Solicitados,${s.name},${s.value},,\n`;
      });
    }
    
    csv += `\n`;
    
    // Sección Agenda
    csv += `Agenda,Fecha,Paciente,Estado,Precio\n`;
    (detailCurrent.citas || []).forEach((c: any) => {
      csv += `Agenda,${new Date(c.date).toLocaleDateString('es-ES')},${c.patient?.full_name || 'Paciente'},${c.status},${c.price || 0}\n`;
    });
    
    // Guardar archivo
    const filename = `Reporte_Datos_Completos_${clinicaId}.csv`;
    fs.writeFileSync(filename, csv);
    console.log(`Archivo generado: ${filename}`);
    
  } catch (error) {
    console.error("Error generando CSV:", error);
  }
}

run();
