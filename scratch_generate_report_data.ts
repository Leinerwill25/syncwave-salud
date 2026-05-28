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
    
    // 2. Datos de los 15 días anteriores (para comparar)
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
    
    // Construir el reporte en Markdown
    let md = `# Reporte Completo de Datos - ${organizationName}\n`;
    md += `Generado el: ${new Date().toLocaleString('es-ES')}\n\n`;
    
    md += `## KPIs y Rendimiento (Últimos 15 días vs 15 días anteriores)\n\n`;
    
    const mCur = detailCurrent.metricas || {};
    const mPrev = detailPrev.metricas || {};
    
    md += `| Métrica | Últimos 15 Días | 15 Días Anteriores | Variación |\n`;
    md += `| --- | --- | --- | --- |\n`;
    md += `| Total Citas | ${mCur.totalCitas || 0} | ${mPrev.totalCitas || 0} | ${(mCur.totalCitas || 0) - (mPrev.totalCitas || 0)} |\n`;
    md += `| Confirmadas | ${mCur.confirmadas || 0} | ${mPrev.confirmadas || 0} | ${(mCur.confirmadas || 0) - (mPrev.confirmadas || 0)} |\n`;
    md += `| No Asistió | ${mCur.noAsistio || 0} | ${mPrev.noAsistio || 0} | ${(mCur.noAsistio || 0) - (mPrev.noAsistio || 0)} |\n`;
    md += `| Ingresos | ${mCur.revenue || 0} ${mCur.baseCurrency || 'USD'} | ${mPrev.revenue || 0} ${mPrev.baseCurrency || 'USD'} | ${(mCur.revenue || 0) - (mPrev.revenue || 0)} |\n`;
    md += `| Pacientes Nuevos | ${mCur.pacientesNuevos || 0} | ${mPrev.pacientesNuevos || 0} | ${(mCur.pacientesNuevos || 0) - (mPrev.pacientesNuevos || 0)} |\n`;
    
    md += `\n## Agenda de Citas (Últimos 15 días)\n\n`;
    md += `| Fecha | Paciente | Estado | Precio |\n`;
    md += `| --- | --- | --- | --- |\n`;
    (detailCurrent.citas || []).forEach((c: any) => {
      md += `| ${new Date(c.date).toLocaleDateString('es-ES')} | ${c.patient?.full_name || 'Paciente'} | ${c.status} | ${c.price || 0} |\n`;
    });
    
    md += `\n## Tendencias y Comportamiento (Últimos 6 meses)\n\n`;
    md += `### Volumen de Citas Mensual\n\n`;
    md += `| Mes | Citas |\n`;
    md += `| --- | --- |\n`;
    if (trends && trends.monthlyVolume) {
      trends.monthlyVolume.forEach((v: any) => {
        md += `| ${v.month} | ${v.value} |\n`;
      });
    }
    
    md += `\n### Servicios Más Solicitados\n\n`;
    md += `| Servicio | Citas |\n`;
    md += `| --- | --- |\n`;
    if (trends && trends.topServices) {
      trends.topServices.forEach((s: any) => {
        md += `| ${s.name} | ${s.value} |\n`;
      });
    }
    
    md += `\n### Días de Mayor Demanda\n\n`;
    md += `| Día | Citas |\n`;
    md += `| --- | --- |\n`;
    if (trends && trends.heatmap) {
      const dayCounts: any = {};
      trends.heatmap.forEach((h: any) => {
        dayCounts[h.day] = (dayCounts[h.day] || 0) + h.count;
      });
      Object.entries(dayCounts).forEach(([day, count]) => {
        md += `| ${day} | ${count} |\n`;
      });
    }
    
    md += `\n## Fidelización de Pacientes\n\n`;
    md += `| Tipo | Cantidad |\n`;
    md += `| --- | --- |\n`;
    if (ltv && ltv.loyalty) {
      md += `| Pacientes Recurrentes | ${ltv.loyalty.recurrentes || 0} |\n`;
      md += `| Pacientes Únicos (1ª vez) | ${ltv.loyalty.unicos || 0} |\n`;
    }
    
    // Guardar archivo
    const filename = `Reporte_Datos_${clinicaId}.md`;
    fs.writeFileSync(filename, md);
    console.log(`Archivo generado: ${filename}`);
    
  } catch (error) {
    console.error("Error generando datos:", error);
  }
}

run();
