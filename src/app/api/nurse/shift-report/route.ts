import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(req: Request) {
  try {
    const authResult = await apiRequireRole(['ENFERMERA', 'ENFERMERO']);
    if (authResult.response) return authResult.response;

    const user = authResult.user;
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const url = new URL(req.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Obtener información del perfil
    const { data: profile } = await supabase
      .from('nurse_profiles')
      .select('organization_id')
      .eq('user_id', user.userId)
      .maybeSingle();

    // 1. Obtener atenciones del día
    const { data: queueRecords } = await supabase
      .from('patients_daily_queue')
      .select('queue_id, patient_id, status, triage_level, arrival_time')
      .eq('assigned_nurse_id', user.userId)
      .gte('arrival_time', `${date}T00:00:00.000Z`)
      .lte('arrival_time', `${date}T23:59:59.999Z`);

    // 2. Obtener procedimientos realizados
    const { data: procedures } = await supabase
      .from('nurse_procedures')
      .select('procedure_id, type, status, completed_at')
      .eq('created_by', user.userId)
      .eq('status', 'completed')
      .gte('completed_at', `${date}T00:00:00.000Z`)
      .lte('completed_at', `${date}T23:59:59.999Z`);

    // 3. Obtener medicamentos administrados (MAR)
    const { data: administeredMeds } = await supabase
      .from('audit_log')
      .select('entity_id, created_at, metadata, description')
      .eq('user_id', user.userId)
      .eq('action_type', 'ADMINISTRAR_MEDICAMENTO')
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lte('created_at', `${date}T23:59:59.999Z`);

    return NextResponse.json({
      nurse: {
        id: user.userId,
        name: user.email || 'Enfermero',
        date: date
      },
      stats: {
        patientsAttended: queueRecords?.length || 0,
        proceduresCompleted: procedures?.length || 0,
        medicationsAdministered: administeredMeds?.length || 0
      },
      details: {
        patients: queueRecords || [],
        procedures: procedures || [],
        medications: administeredMeds || []
      }
    });

  } catch (error: any) {
    console.error('[ShiftReportAPI] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
