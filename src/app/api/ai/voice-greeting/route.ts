import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Endpoint para obtener el saludo matutino ya generado.
 * Si no existe uno para hoy, devuelve valores por defecto.
 */
export async function GET(req: Request) {
  console.log('[API/Voice-Greeting] Iniciando solicitud...');
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    if (!doctorId) {
      console.error('[API/Voice-Greeting] doctorId no proporcionado');
      return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
    }

    // Obtener el saludo más reciente generado hoy (UTC)
    const today = new Date().toISOString().split('T')[0];
    console.log(`[API/Voice-Greeting] Buscando para doctor: ${doctorId} en fecha: ${today}`);

    const { data: cache, error } = await supabaseAdmin
      .from('ai_voice_cache')
      .select('audio_url, greeting_text, created_at')
      .eq('doctor_id', doctorId)
      .gte('created_at', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[API/Voice-Greeting] Error de base de datos:', error);
      throw error;
    }

    if (!cache) {
      console.log('[API/Voice-Greeting] No se encontró saludo generado hoy.');
      return NextResponse.json({ 
        audio_url: null, 
        greeting_text: 'Hola, doctor. He preparado el sistema para usted, pero el saludo de voz aún no se ha generado hoy.',
        status: 'no_cache'
      });
    }

    console.log('[API/Voice-Greeting] Saludo encontrado con éxito.');
    return NextResponse.json({
      audio_url: cache.audio_url,
      greeting_text: cache.greeting_text,
      status: 'ready'
    });
  } catch (err: any) {
    console.error('[API/Voice-Greeting] Error fatal en endpoint:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err?.message }, { status: 500 });
  }
}
