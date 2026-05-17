import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { getReportReadyTemplate } from '@/lib/email/templates';
import { generateBiweeklyReportPDF } from '@/lib/pdf/pdf-generator';
import { getClinicaDetail, getClinicaTrends } from '@/lib/analytics/queries';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let groupStr = searchParams.get('group');
    const isTest = searchParams.get('test') === 'true';
    
    // Si no se pasa grupo, lo detectamos por la hora UTC del servidor
    // Mapeo (local UTC-4 -> UTC):
    // - 12:00 PM local = 16:00 UTC -> Grupo 1
    // - 01:00 PM local = 17:00 UTC -> Grupo 2
    // - 02:00 PM local = 18:00 UTC -> Grupo 3
    if (!groupStr && !isTest) {
      const currentHour = new Date().getHours(); // Obtiene la hora en UTC
      if (currentHour === 16) groupStr = '1';
      else if (currentHour === 17) groupStr = '2';
      else if (currentHour === 18) groupStr = '3';
      else {
        return NextResponse.json({ 
          success: true, 
          message: `Hora actual del servidor (${currentHour} UTC / ${currentHour - 4} local) no corresponde a ningún grupo de envío automático.` 
        });
      }
    }
    
    const group = parseInt(groupStr || '1', 10);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Faltan variables de entorno de Supabase' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. Obtener todas las organizaciones
    const { data: orgs, error: orgError } = await supabase
      .from('organization')
      .select('id, name, contactEmail');
      
    if (orgError) throw orgError;
    
    // 2. Filtrar por grupo (si no es test)
    let filteredOrgs = orgs || [];
    if (!isTest) {
      filteredOrgs = orgs.filter(org => {
        const lastChar = org.id.slice(-1);
        const mod = parseInt(lastChar, 16) % 3;
        return mod === (group - 1);
      });
    } else {
      // Si es test, solo procesamos la clínica de prueba
      filteredOrgs = orgs.filter(org => org.id === 'd52a76ac-fe33-414f-a26c-af7bb2f95df8');
      if (filteredOrgs.length === 0 && orgs.length > 0) {
        filteredOrgs = [orgs[0]]; // Fallback a la primera
      }
    }
    
    console.log(`Procesando ${filteredOrgs.length} organizaciones para el grupo ${group}...`);
    
    const results = [];
    
    for (const org of filteredOrgs) {
      try {
        const clinicaId = org.id;
        const organizationName = org.name;
        const emailTo = isTest ? "syncwaveagency@gmail.com" : org.contactEmail;
        
        if (!emailTo) {
          results.push({ id: clinicaId, name: organizationName, status: 'skipped', reason: 'No email' });
          continue;
        }
        
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
        
        const periodCurrent = `${from.toLocaleDateString('es-ES')} al ${to.toLocaleDateString('es-ES')}`;
        const periodPrevious = `${fromPrev.toLocaleDateString('es-ES')} al ${toPrev.toLocaleDateString('es-ES')}`;
        
        const mCur = detailCurrent.metricas || {};
        const mPrev = detailPrev.metricas || {};
        
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
        
        // Generar Link Público
        const expiresAt = Date.now() + 3 * 60 * 60 * 1000;
        const publicSig = crypto
          .createHmac('sha256', supabaseKey)
          .update(`${clinicaId}:${expiresAt}`)
          .digest('hex');
          
        const publicReportUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ashira.click'}/public-report?clinicaId=${clinicaId}&expiresAt=${expiresAt}&sig=${publicSig}`;
        
        // Enviar Correo
        const htmlContent = getReportReadyTemplate({ 
          organizationName, 
          period: periodCurrent, 
          downloadUrl: publicReportUrl,
          buttonText: 'Ver Reporte Online'
        });
        
        await sendEmail({
          to: emailTo,
          subject: `[Acceso Temporal] Su Informe Quincenal Interactivo - ${organizationName}`,
          html: htmlContent,
          attachments: [
            {
              filename: `Reporte_Gerencial_${organizationName.replace(/\s+/g, '_')}.pdf`,
              content: buffer
            }
          ]
        });
        
        results.push({ id: clinicaId, name: organizationName, email: emailTo, status: 'success' });
      } catch (err: any) {
        console.error(`Error procesando clínica ${org.id}:`, err);
        results.push({ id: org.id, name: org.name, status: 'error', error: err.message });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      processed: filteredOrgs.length,
      results 
    });
    
  } catch (err: any) {
    console.error('Error en cron endpoint:', err);
    return NextResponse.json({ error: 'Error interno', message: err.message }, { status: 500 });
  }
}
