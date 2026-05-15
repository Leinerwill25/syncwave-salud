import { NextRequest, NextResponse } from 'next/server';
import { generateBiweeklyReportPDF } from '@/lib/pdf/pdf-generator';
import { getClinicaDetail, getClinicaTrends } from '@/lib/analytics/queries';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? '';

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clinicaId = searchParams.get('clinicaId');
    const sig = searchParams.get('sig');
    
    if (!clinicaId || !sig) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }
    
    // Verificar firma para asegurar que el enlace fue generado por nosotros
    const secret = SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(clinicaId)
      .digest('hex');
      
    if (sig !== expectedSig) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }
    
    // 1. Datos de los últimos 15 días
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 15);
    const detailCurrent = await getClinicaDetail(supabaseAdmin, clinicaId, from, to);
    
    // 2. Datos de los 15 días anteriores
    const toPrev = new Date(from);
    const fromPrev = new Date(toPrev);
    fromPrev.setDate(toPrev.getDate() - 15);
    const detailPrev = await getClinicaDetail(supabaseAdmin, clinicaId, fromPrev, toPrev);
    
    // 3. Tendencias (6 meses)
    const trends = await getClinicaTrends(supabaseAdmin, clinicaId, 6);
    
    // 4. Calcular Fidelización Real
    const { data: allCitas } = await supabaseAdmin
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
    
    const { data: orgData } = await supabaseAdmin
      .from('organization')
      .select('name')
      .eq('id', clinicaId)
      .single();
      
    const organizationName = orgData?.name || "Clínica";
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
    
    const pdfBlob = await generateBiweeklyReportPDF(reportData);
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Reporte_Gerencial_${organizationName.replace(/\s+/g, '_')}.pdf`,
      },
    });
    
  } catch (err) {
    console.error('Error generating PDF for download:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
