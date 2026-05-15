import { NextResponse } from 'next/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { 
  validateM1, validateM2, validateM3, validateM4, 
  validateM5, validateM6, validateM7, validateM8,
  MISSION_POINTS, calculateLevel, getUnlockedModules 
} from '@/lib/gamification/validations';

export async function POST(request: Request) {
  try {
    // 1. Verificar autenticación y rol
    const authResult = await apiRequireRole(['MEDICO']);
    if (authResult.response) return authResult.response;
    
    const user = authResult.user;
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Validar body
    const body = await request.json();
    const { missionId } = body;

    if (!missionId || !['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'].includes(missionId)) {
      return NextResponse.json({ error: 'missionId inválido' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // 3. Obtener registro actual para verificar si ya está completada
    const { data: gamification, error: getError } = await supabase
      .from('doctor_gamification')
      .select('total_points, completed_missions')
      .eq('doctor_id', user.userId)
      .single();

    if (getError && getError.code !== 'PGRST116') {
      console.error('[Gamification Validate] Error al obtener registro:', getError);
      return NextResponse.json({ error: 'Error al consultar progreso' }, { status: 500 });
    }

    const completedMissions = gamification?.completed_missions || [];
    
    if (completedMissions.includes(missionId)) {
      return NextResponse.json({ 
        success: true, 
        message: 'Misión ya completada anteriormente',
        points_earned: 0,
        new_total: gamification?.total_points || 0
      });
    }

    // 4. Ejecutar validación específica
    let isValid = false;
    const orgId = user.organizationId || null;

    switch (missionId) {
      case 'M1': isValid = orgId ? await validateM1(supabase, orgId) : false; break;
      case 'M2': isValid = await validateM2(supabase, user.userId); break;
      case 'M3': isValid = orgId ? await validateM3(supabase, orgId) : false; break;
      case 'M4': isValid = orgId ? await validateM4(supabase, orgId) : false; break;
      case 'M5': isValid = orgId ? await validateM5(supabase, orgId) : false; break;
      case 'M6': isValid = await validateM6(supabase, user.userId); break;
      case 'M7': isValid = await validateM7(supabase, user.userId); break;
      case 'M8': isValid = await validateM8(supabase, user.userId); break;
    }

    if (!isValid) {
      return NextResponse.json({ 
        success: false, 
        reason: 'Las condiciones de la misión no se han cumplido en la base de datos.' 
      });
    }

    // 5. Actualizar progreso
    const pointsToEarn = MISSION_POINTS[missionId] || 0;
    const newCompletedMissions = [...completedMissions, missionId];
    const newTotalPoints = (gamification?.total_points || 0) + pointsToEarn;
    const newLevel = calculateLevel(newTotalPoints);
    const newUnlockedModules = getUnlockedModules(newTotalPoints);

    const { error: updateError } = await supabase
      .from('doctor_gamification')
      .upsert({
        doctor_id: user.userId,
        total_points: newTotalPoints,
        current_level: newLevel,
        completed_missions: newCompletedMissions,
        unlocked_modules: newUnlockedModules,
        updated_at: new Date().toISOString()
      }, { onConflict: 'doctor_id' });

    if (updateError) {
      console.error('[Gamification Validate] Error al actualizar progreso:', updateError);
      return NextResponse.json({ error: 'Error al guardar progreso' }, { status: 500 });
    }

    // Determinar si se desbloquearon nuevos módulos
    const oldUnlocked = getUnlockedModules(gamification?.total_points || 0);
    const newlyUnlocked = newUnlockedModules.filter(m => !oldUnlocked.includes(m));

    return NextResponse.json({
      success: true,
      points_earned: pointsToEarn,
      new_total: newTotalPoints,
      new_level: newLevel,
      newly_unlocked_modules: newlyUnlocked
    });

  } catch (err: any) {
    console.error('[Gamification Validate API] Error:', err);
    return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
  }
}
