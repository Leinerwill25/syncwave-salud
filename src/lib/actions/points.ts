'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { getEventDefinitionByKey } from '@/lib/points/events';
import { PointTransactionType, PatientPointsSummary, PointTransaction, RewardRedemption, RewardCatalogItem } from '@/types/points';

/**
 * Otorgar puntos a un paciente. 
 * Esta función debe llamarse internamente desde otras Server Actions.
 */
export async function awardPoints(
  patientId: string, 
  eventKey: PointTransactionType, 
  referenceId?: string, 
  referenceTable?: string
) {
  try {
    const eventDef = getEventDefinitionByKey(eventKey);
    if (!eventDef) throw new Error(`Unknown event key: ${eventKey}`);

    // 1. Check if event is 'once' and already awarded
    if (eventDef.once) {
      const { data: existing } = await supabaseAdmin
        .from('patient_points_transactions')
        .select('id')
        .eq('patient_id', patientId)
        .eq('event_type', eventKey)
        .limit(1);
      
      if (existing && existing.length > 0) {
        return { awarded: false, reason: 'Event already awarded (once=true)' };
      }
    }

    // 2. Check daily limit if applies
    if (eventDef.dailyLimit !== null) {
      const today = new Date().toISOString().split('T')[0];
      const { data: limitRecord } = await supabaseAdmin
        .from('patient_points_daily_limits')
        .select('count')
        .eq('patient_id', patientId)
        .eq('event_category', eventDef.category)
        .eq('event_date', today)
        .single();
      
      const currentCount = limitRecord?.count || 0;
      if (currentCount >= eventDef.dailyLimit) {
        return { awarded: false, reason: 'Daily limit reached for category' };
      }

      // Upsert the daily limit
      await supabaseAdmin
        .from('patient_points_daily_limits')
        .upsert({
          patient_id: patientId,
          event_category: eventDef.category,
          event_date: today,
          count: currentCount + 1
        });
    }

    // 3. Insert transaction
    const { error: insertError } = await supabaseAdmin
      .from('patient_points_transactions')
      .insert({
        patient_id: patientId,
        event_type: eventKey,
        points: eventDef.points,
        description: eventDef.description,
        reference_id: referenceId,
        reference_table: referenceTable
      });

    if (insertError) throw insertError;

    return { awarded: true, points: eventDef.points };
  } catch (error) {
    console.error('[awardPoints] Error:', error);
    return { awarded: false, reason: 'Internal error' };
  }
}

/**
 * Escanea la base de datos y otorga puntos de manera retroactiva por acciones "one-time"
 * que el paciente haya completado antes de que se implementara el sistema de puntos.
 */
export async function syncRetroactivePoints(authId: string) {
  try {
    // 1. Obtener todas las transacciones de este paciente para saber qué ya se otorgó
    const { data: txs } = await supabaseAdmin
      .from('patient_points_transactions')
      .select('event_type')
      .eq('patient_id', authId);
    
    const completedEvents = new Set(txs?.map(t => t.event_type) || []);

    // Encontrar el patientProfileId
    const { data: appUser } = await supabaseAdmin
      .from('users')
      .select('patientProfileId')
      .eq('authId', authId)
      .single();
      
    const patientProfileId = appUser?.patientProfileId;
    if (!patientProfileId) return;

    // 2. Verificar Perfil Completado
    if (!completedEvents.has('profile_completed')) {
      const { data: patient } = await supabaseAdmin
        .from('patient')
        .select('firstName, lastName, dob, phone, gender')
        .eq('id', patientProfileId)
        .single();
      
      // Regla de negocio básica: Si tiene estos campos, consideramos el perfil completado
      if (patient?.firstName && patient?.lastName && patient?.dob && patient?.gender) {
        await awardPoints(authId, 'profile_completed');
      }
    }

    // 3. Verificar QR Activado
    if (!completedEvents.has('emergency_qr_activated')) {
      const { data: patientQR } = await supabaseAdmin
        .from('patient')
        .select('emergency_qr_enabled')
        .eq('id', patientProfileId)
        .single();
        
      if (patientQR?.emergency_qr_enabled) {
        await awardPoints(authId, 'emergency_qr_activated');
      }
    }

    // 4. Verificar Grupo Familiar
    if (!completedEvents.has('family_member_added')) {
      // Verificamos si es dueño de un grupo familiar que tiene miembros (excluyendo al dueño en familygroupmember)
      const { data: group } = await supabaseAdmin
        .from('familygroup')
        .select('id')
        .eq('ownerId', patientProfileId)
        .maybeSingle();
        
      if (group) {
        const { count } = await supabaseAdmin
          .from('familygroupmember')
          .select('*', { count: 'exact', head: true })
          .eq('familyGroupId', group.id);
          
        if (count && count > 0) {
          await awardPoints(authId, 'family_member_added');
        }
      }
    }

    // 5. Verificar Primera Cita
    if (!completedEvents.has('first_appointment_booked')) {
      const { data: appt } = await supabaseAdmin
        .from('appointment')
        .select('id')
        .eq('patient_id', patientProfileId)
        .limit(1);
        
      if (appt && appt.length > 0) {
        await awardPoints(authId, 'first_appointment_booked');
      }
    }

  } catch (error) {
    console.error('[syncRetroactivePoints] Error:', error);
  }
}

/**
 * Obtener todos los datos del paciente logueado (balance, historial, catálogo)
 */
export async function getPatientPointsData() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return { error: 'No autorizado' };
  }
  const patientId = userData.user.id;

  try {
    // Sincronizar puntos retroactivos si aplica (es idempotente)
    await syncRetroactivePoints(patientId);

    // We can use supabaseAdmin here for performance or just supabase. 
    // patient_points_summary allows SELECT by owner.
    
    // 1. Summary
    const { data: summaryData } = await supabase
      .from('patient_points_summary')
      .select('*')
      .eq('patient_id', patientId)
      .single();
    
    // Default summary if null
    const summary = summaryData || {
      patient_id: patientId,
      total_earned: 0,
      total_spent: 0,
      current_balance: 0,
      current_level: 1,
      streak_count: 0,
      updated_at: new Date().toISOString()
    };

    // 2. Recent Transactions
    const { data: transactions } = await supabase
      .from('patient_points_transactions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(20);

    // 3. Active Redemptions
    const { data: redemptions } = await supabase
      .from('patient_reward_redemptions')
      .select('*, reward:points_rewards_catalog(*)')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // 4. Rewards Catalog
    const { data: catalog } = await supabase
      .from('points_rewards_catalog')
      .select('*')
      .eq('is_active', true)
      .order('cost_points', { ascending: true });

    return {
      summary: summary as PatientPointsSummary,
      recentTransactions: (transactions || []) as PointTransaction[],
      activeRedemptions: (redemptions || []) as RewardRedemption[],
      catalog: (catalog || []) as RewardCatalogItem[]
    };

  } catch (error) {
    console.error('[getPatientPointsData] Error:', error);
    return { error: 'Error fetching points data' };
  }
}

/**
 * Canjear una recompensa
 */
export async function redeemReward(rewardId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return { error: 'No autorizado' };
  }
  const patientId = userData.user.id;

  try {
    // Fetch reward
    const { data: reward } = await supabaseAdmin
      .from('points_rewards_catalog')
      .select('*')
      .eq('id', rewardId)
      .single();
    
    if (!reward || !reward.is_active) {
      return { error: 'Recompensa no disponible.' };
    }

    // Fetch summary
    const { data: summary } = await supabaseAdmin
      .from('patient_points_summary')
      .select('*')
      .eq('patient_id', patientId)
      .single();
    
    const balance = summary?.current_balance || 0;
    const level = summary?.current_level || 1;

    // Validate balance and level
    if (balance < reward.cost_points) {
      return { error: 'No tienes suficientes Pulsos para este canje.' };
    }
    if (level < reward.min_level) {
      return { error: `Requieres nivel ${reward.min_level} para este canje.` };
    }

    // Check if already active
    const { data: existing } = await supabaseAdmin
      .from('patient_reward_redemptions')
      .select('id')
      .eq('patient_id', patientId)
      .eq('reward_id', rewardId)
      .eq('status', 'active');
    
    if (existing && existing.length > 0) {
      return { error: 'Ya tienes esta recompensa activa.' };
    }

    // Insert transaction
    const { error: txError } = await supabaseAdmin
      .from('patient_points_transactions')
      .insert({
        patient_id: patientId,
        event_type: 'reward_redeemed',
        points: -reward.cost_points, // burn points
        description: `Canje: ${reward.name}`,
        reference_id: reward.id,
        reference_table: 'points_rewards_catalog'
      });
    
    if (txError) throw txError;

    // Insert redemption
    const { data: redemption, error: redeemError } = await supabaseAdmin
      .from('patient_reward_redemptions')
      .insert({
        patient_id: patientId,
        reward_id: reward.id,
        points_spent: reward.cost_points,
        status: 'active'
      })
      .select()
      .single();
    
    if (redeemError) throw redeemError;

    return { success: true, redemption };

  } catch (error) {
    console.error('[redeemReward] Error:', error);
    return { error: 'Error al procesar el canje.' };
  }
}

/**
 * Chequea la racha de citas asistidas
 */
export async function checkAndAwardStreak(patientId: string) {
  try {
    // Contamos citas asistidas consecutivas.
    // Una simplificación: miramos las últimas 3 citas completadas de este paciente en la tabla consultation.
    // Opcionalmente podemos apoyarnos en streak_count de la tabla summary, pero para ser más precisos
    // lo haré simple: contar citas completadas vs no completadas recientemente.
    
    // (Por brevedad asumo que si llegó hasta aquí es que acaba de asistir a una. 
    // Leeríamos las últimas 3 de consultation, si las 3 son completadas y la más reciente fue hoy...)
    
    const { data: recentConsultations } = await supabaseAdmin
      .from('consultation')
      .select('status')
      .eq('patient_id', patientId)
      .order('started_at', { ascending: false })
      .limit(3);
    
    if (recentConsultations && recentConsultations.length === 3) {
      const allCompleted = recentConsultations.every(c => c.status === 'COMPLETADA' || c.status === 'completada');
      if (allCompleted) {
        await awardPoints(patientId, 'streak_3_appointments');
      }
    }
  } catch (err) {
    console.error('[checkAndAwardStreak] Error:', err);
  }
}
