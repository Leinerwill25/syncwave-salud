// src/app/api/analytics/clinicas/[clinicaId]/ai-insights/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai/client';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getClinicaDetail, getClinicaLTVAndLoyalty } from '@/lib/analytics/queries';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clinicaId: string }> }
) {
  try {
    const { clinicaId } = await params;
    const supabase = await createSupabaseServerClient();

    // 1. Obtener rango de fechas (por defecto últimos 30 días)
    const url = new URL(req.url);
    const fromStr = url.searchParams.get('from');
    const toStr = url.searchParams.get('to');
    
    let from = new Date();
    from.setDate(from.getDate() - 30);
    let to = new Date();

    if (fromStr) from = new Date(fromStr);
    if (toStr) to = new Date(toStr);

    // 2. Obtener datos reales de la clínica
    const detail = await getClinicaDetail(supabase, clinicaId, from, to);
    const topPatients = await getClinicaLTVAndLoyalty(supabase, clinicaId);

    const { metricas } = detail;

    // 3. Preparar prompt para el cliente centralizado de IA
    const systemPrompt = `
Actúa como un Asesor de Inteligencia de Negocios y Gerencia Médica experto para la plataforma ASHIRA.
Analiza las siguientes métricas de rendimiento de la clínica y proporciona entre 3 y 5 recomendaciones gerenciales DIRECTAS y ACCIONABLES.
No uses rodeos ni lenguaje motivacional. Sé conciso, corporativo y enfocado en maximizar el revenue y reducir ausencias.
`;

    const userContent = `
MÉTRICAS DEL PERIODO:
- Total Citas: ${metricas.totalCitas}
- Confirmadas/Asistidas: ${metricas.confirmadas}
- No Asistieron/Canceladas: ${metricas.noAsistio}
- Tasa de Confirmación: ${metricas.tasaConfirmacion}%
- Ingresos: ${metricas.revenue} ${metricas.baseCurrency}
- Costo Real de Ausencias (Dinero perdido): ${metricas.costOfAbsences} ${metricas.baseCurrency}

DATOS DE CLIENTES VALIOSOS (LTV Top 10):
${topPatients.map((p: any) => `- ${p.name}: LTV ${p.ltv} ${metricas.baseCurrency}, Score ${p.score} (${p.segment})`).join('\n')}

REQUISITO DE SALIDA:
Devuelve un arreglo JSON de strings con las recomendaciones. Ejemplo:
[
  "Asigna recordatorios adicionales por WhatsApp los martes ya que tienes la mayor tasa de ausencias ese día.",
  "El costo de ausencias representa un impacto alto. Considera sobre-agendar un 10% en horas pico.",
  "Prioriza la agenda del paciente X, ya que lidera el ranking de valor histórico (LTV)."
]
Devuelve ÚNICAMENTE el JSON válido. Sin texto antes ni después.
`;

    // 4. Llamar al cliente centralizado de IA
    const aiResponse = await callAI(systemPrompt, userContent, {
      feature: 'analytics',
      maxTokens: 500,
      temperature: 0.1,
      forceJSON: true
    });

    let text = aiResponse.text;
    
    // Limpiar backticks si la IA los incluye
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const recommendations = JSON.parse(text);

    return NextResponse.json({ 
      success: true, 
      recommendations 
    });

  } catch (error: any) {
    console.error('Error en AI Insights:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error generando recomendaciones de IA',
      details: error.message 
    }, { status: 500 });
  }
}
