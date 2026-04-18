import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateDailyGreeting } from '@/lib/ai/ashira-voice';

/**
 * GET: Ejecución programada para todos los doctores médicos activos.
 * POST: Ejecución bajo demanda para un doctor específico.
 */

// Función auxiliar para validar el secreto del cron
const validateCronSecret = (header: string | null) => {
  return header === `Bearer ${process.env.CRON_SECRET}`;
};

export async function GET(request: Request) {
  // 1. Verificar header de autorización del cron
  const authHeader = request.headers.get('Authorization');
  if (!validateCronSecret(authHeader)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Obtener todos los doctores activos
    // Nota: Filtramos por role 'MEDICO'. Ajustar si el nombre del rol es distinto.
    const { data: doctors, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'MEDICO');

    if (fetchErr) throw fetchErr;

    if (!doctors || doctors.length === 0) {
      return NextResponse.json({ message: 'No hay doctores activos para procesar.' });
    }

    // 3. Generar saludos en paralelo (máximo 5 concurrentes)
    const results = [];
    const batchSize = 5;
    
    for (let i = 0; i < doctors.length; i += batchSize) {
      const batch = doctors.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(d => generateDailyGreeting(d.id))
      );
      results.push(...batchResults);
    }

    const success = results.filter(r => r.status === 'fulfilled').length;
    
    return NextResponse.json({ 
      processed: doctors.length,
      success,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error en Cron Job (GET):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { doctorId } = body;

    if (!doctorId) {
      return NextResponse.json({ error: 'doctorId is required for POST' }, { status: 400 });
    }

    console.log(`[API/Cron] Generando saludo bajo demanda para: ${doctorId}`);
    
    // Generar el saludo individualmente
    const result = await generateDailyGreeting(doctorId);

    return NextResponse.json({ 
      success: true, 
      message: 'Saludo generado con éxito',
      data: result 
    });
  } catch (error: any) {
    console.error('Error en Cron Job (POST):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
