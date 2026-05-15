import { NextResponse } from 'next/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { runAllValidations, MISSION_POINTS, calculateLevel, getUnlockedModules } from '@/lib/gamification/validations';

export async function GET(request: Request) {
  try {
    // 1. Verificar autenticación y rol
    const authResult = await apiRequireRole(['MEDICO']);
    if (authResult.response) return authResult.response;
    
    const user = authResult.user;
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    // 2. Buscar registro de gamificación
    const { data: gamification, error } = await supabase
      .from('doctor_gamification')
      .select('total_points, current_level, completed_missions, unlocked_modules')
      .eq('doctor_id', user.userId)
      .single();

    // 3. Si no existe (o hay error de tabla inexistente), aplicar retroactividad
    if (error || !gamification) {
      if (error && error.code !== 'PGRST116') { // PGRST116 is "JSON object requested, multiple (or no) rows returned" (No rows found)
        console.error('[Gamification Status] Error al buscar registro:', error);
        // Si el error es que la tabla no existe, podríamos manejarlo aquí.
        // Pero asumimos que el usuario correrá la migración.
      }

      console.log(`[Gamification Status] Creando registro inicial (retroactividad) para doctor: ${user.userId}`);
      
      // Correr todas las validaciones
      const completedMissions = await runAllValidations(supabase, user.userId, user.organizationId || null);
      
      // Calcular puntos
      let totalPoints = 0;
      completedMissions.forEach((missionId) => {
        totalPoints += MISSION_POINTS[missionId] || 0;
      });
      
      const currentLevel = calculateLevel(totalPoints);
      const unlockedModules = getUnlockedModules(totalPoints);

      // Crear el registro
      const { data: newRecord, error: createError } = await supabase
        .from('doctor_gamification')
        .insert({
          doctor_id: user.userId,
          total_points: totalPoints,
          current_level: currentLevel,
          completed_missions: completedMissions,
          unlocked_modules: unlockedModules,
        })
        .select()
        .single();

      if (createError) {
        console.error('[Gamification Status] Error al crear registro inicial:', createError);
        // Si falla la inserción (ej: tabla no existe), retornamos el estado calculado de todos modos
        // para no bloquear al frontend, aunque no se guarde en BD.
        return NextResponse.json({
          total_points: totalPoints,
          current_level: currentLevel,
          completed_missions: completedMissions,
          unlocked_modules: unlockedModules,
          persisted: false
        });
      }

      return NextResponse.json({
        total_points: newRecord.total_points,
        current_level: newRecord.current_level,
        completed_missions: newRecord.completed_missions,
        unlocked_modules: newRecord.unlocked_modules,
        persisted: true
      });
    }

    // 4. Retornar registro existente
    return NextResponse.json({
      total_points: gamification.total_points,
      current_level: gamification.current_level,
      completed_missions: gamification.completed_missions,
      unlocked_modules: gamification.unlocked_modules,
      persisted: true
    });

  } catch (err: any) {
    console.error('[Gamification Status API] Error:', err);
    return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
  }
}
