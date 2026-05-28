import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.RESEND_API_KEY) {
  dotenv.config({ path: '.env' });
}

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

async function run() {
  const { sendEmail } = await import('./src/lib/email/resend');
  const { getReportReadyTemplate } = await import('./src/lib/email/templates');
  const { generateBiweeklyReportPDF } = await import('./src/lib/pdf/pdf-generator');
  const { getClinicaDetail, getClinicaTrends } = await import('./src/lib/analytics/queries');
  const testEmail = "syncwaveagency@gmail.com";
  const clinicaId = "d52a76ac-fe33-414f-a26c-af7bb2f95df8";
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log(`Fetching real data for clinic ${clinicaId}...`);
    
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
    
    // Obtener nombre de la organización
    const { data: orgData } = await supabase
      .from('organization')
      .select('name')
      .eq('id', clinicaId)
      .single();
      
    const organizationName = orgData?.name || "Clínica";
    
    const periodCurrent = `${from.toLocaleDateString('es-ES')} al ${to.toLocaleDateString('es-ES')}`;
    const periodPrevious = `${fromPrev.toLocaleDateString('es-ES')} al ${toPrev.toLocaleDateString('es-ES')}`;
    
    const mCur = detailCurrent.metricas || {};
    const mPrev = detailPrev.metricas || {};
    
    // Mapear datos para el reporte
    const reportData = {
      organizationName,
      periodCurrent,
      periodPrevious,
      metrics: {
        current: {
          totalCitas: mCur.totalCitas || 0,
          confirmadas: mCur.confirmadas || 0,
          noAsistio: mCur.noAsistio || 0,
          revenue: mCur.revenue || 0,
          pacientesNuevos: mCur.pacientesNuevos || 0,
          baseCurrency: mCur.baseCurrency || 'USD'
        },
        previous: {
          totalCitas: mPrev.totalCitas || 0,
          confirmadas: mPrev.confirmadas || 0,
          noAsistio: mPrev.noAsistio || 0,
          revenue: mPrev.revenue || 0,
          pacientesNuevos: mPrev.pacientesNuevos || 0
        }
      },
      agenda: [],
      trends: {
        monthlyVolume: (trends?.monthlyTrend || []).map((v: any) => ({ month: v.month, value: v.value })),
        topServices: (trends?.topServices || []).map((s: any) => ({ name: s.name, value: s.value })),
        dayCounts: []
      },
      loyalty: {
        recurrentes,
        unicos
      }
    };
    
    // Generar PDF
    const pdfBlob = await generateBiweeklyReportPDF(reportData);
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generar firma para el PDF
    const sig = crypto
      .createHmac('sha256', supabaseKey)
      .update(clinicaId)
      .digest('hex');
      
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ashira.click'}/api/analytics/report-pdf?clinicaId=${clinicaId}&sig=${sig}`;
    
    // Generar link público con expiración (3 horas)
    const expiresAt = Date.now() + 3 * 60 * 60 * 1000;
    const publicSig = crypto
      .createHmac('sha256', supabaseKey)
      .update(`${clinicaId}:${expiresAt}`)
      .digest('hex');
      
    const publicReportUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ashira.click'}/public-report?clinicaId=${clinicaId}&expiresAt=${expiresAt}&sig=${publicSig}`;
    
    // Enviar Notificación
    console.log("Enviando Notificación con link público...");
    
    const htmlContent = getReportReadyTemplate({ 
      organizationName, 
      period: periodCurrent, 
      downloadUrl: publicReportUrl,
      buttonText: 'Ver Reporte Online'
    });
    
    await sendEmail({
      to: testEmail,
      subject: `[Acceso Temporal] Su Informe Quincenal Interactivo - ${organizationName}`,
      html: htmlContent,
      attachments: [
        {
          filename: `Reporte_Gerencial_${organizationName.replace(/\s+/g, '_')}.pdf`,
          content: buffer
        }
      ]
    });
    
    console.log("Simulación de link público completada con éxito.");
    console.log(`Link público: ${publicReportUrl}`);
  } catch (error) {
    console.error("Error en la simulación:", error);
  }
}

run();
