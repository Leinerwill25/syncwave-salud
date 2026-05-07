'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { awardPoints } from './points';
import { PatientReferral, ReferralStats } from '@/types/referrals';
import { revalidatePath } from 'next/cache';

/**
 * Genera un nuevo enlace de referido para el usuario actual.
 */
export async function generateReferralLink(referrerId: string, referredEmail?: string) {
  try {
    // 1. Verificar si ya existe un código para este usuario (para no generar mil códigos)
    const { data: existing } = await supabaseAdmin
      .from('patient_referrals')
      .select('referral_code, referral_link')
      .eq('referrer_id', referrerId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return { success: true, link: existing.referral_link, code: existing.referral_code };
    }

    // 2. Generar código único usando la función de Postgres
    const { data: code, error: codeError } = await supabaseAdmin
      .rpc('generate_referral_code');

    if (codeError) throw codeError;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ashira.click';
    const referralLink = `${appUrl}/register?ref=${code}`;

    // 3. Insertar en la base de datos
    const { error: insertError } = await supabaseAdmin
      .from('patient_referrals')
      .insert({
        referrer_id: referrerId,
        referral_code: code,
        referral_link: referralLink,
        referred_email: referredEmail,
        status: 'pending'
      });

    if (insertError) throw insertError;

    revalidatePath('/dashboard/patient/referidos');
    return { success: true, link: referralLink, code };
  } catch (error) {
    console.error('[generateReferralLink] Error:', error);
    return { success: false, error: 'No se pudo generar el enlace.' };
  }
}

/**
 * Vincula a un nuevo usuario con un referidor durante el registro.
 */
export async function claimReferralOnRegister(referralCode: string, newUserId: string) {
  try {
    const { data: referral, error: findError } = await supabaseAdmin
      .from('patient_referrals')
      .select('id, status')
      .eq('referral_code', referralCode)
      .eq('status', 'pending')
      .maybeSingle();

    if (!referral) return { success: false, error: 'Código inválido o ya utilizado.' };

    const { error: updateError } = await supabaseAdmin
      .from('patient_referrals')
      .update({
        referred_id: newUserId,
        status: 'registered',
        registered_at: new Date().toISOString()
      })
      .eq('id', referral.id);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('[claimReferralOnRegister] Error:', error);
    return { success: false, error: 'Error al vincular referido.' };
  }
}

/**
 * Etapa 1: Otorga puntos cuando el referido completa su perfil básico.
 */
export async function checkAndAwardStage1(referredId: string) {
  try {
    const { data: referral, error: findError } = await supabaseAdmin
      .from('patient_referrals')
      .select('id, referrer_id, status, stage1_awarded')
      .eq('referred_id', referredId)
      .eq('stage1_awarded', false)
      .maybeSingle();

    if (!referral) return { success: false };

    // Acreditar 30 Pulsos al referidor
    await awardPoints(referral.referrer_id, 'referral_stage1', referral.id, 'patient_referrals');

    // Acreditar 75 Pulsos al referido (Welcome Bonus)
    await awardPoints(referredId, 'referral_welcome_bonus', referral.id, 'patient_referrals');

    // Actualizar estado del referral
    await supabaseAdmin
      .from('patient_referrals')
      .update({
        stage1_awarded: true,
        welcome_awarded: true,
        status: 'profile_completed'
      })
      .eq('id', referral.id);

    revalidatePath('/dashboard/patient/referidos');
    return { success: true };
  } catch (error) {
    console.error('[checkAndAwardStage1] Error:', error);
    return { success: false };
  }
}

/**
 * Etapa 2: Otorga puntos cuando el referido completa su primer servicio real.
 */
export async function checkAndAwardStage2(referredId: string) {
  try {
    const { data: referral, error: findError } = await supabaseAdmin
      .from('patient_referrals')
      .select('id, referrer_id, status, stage1_awarded, stage2_awarded')
      .eq('referred_id', referredId)
      .eq('stage1_awarded', true)
      .eq('stage2_awarded', false)
      .maybeSingle();

    if (!referral) return { success: false };

    // Acreditar 120 Pulsos al referidor
    await awardPoints(referral.referrer_id, 'referral_stage2', referral.id, 'patient_referrals');

    // Actualizar estado final
    await supabaseAdmin
      .from('patient_referrals')
      .update({
        stage2_awarded: true,
        status: 'converted',
        converted_at: new Date().toISOString()
      })
      .eq('id', referral.id);

    revalidatePath('/dashboard/patient/referidos');
    return { success: true };
  } catch (error) {
    console.error('[checkAndAwardStage2] Error:', error);
    return { success: false };
  }
}

/**
 * Obtiene las estadísticas de referidos para el usuario actual.
 */
export async function getReferralStats(referrerId: string): Promise<ReferralStats> {
  try {
    const { data: referrals, error } = await supabaseAdmin
      .from('patient_referrals')
      .select('*')
      .eq('referrer_id', referrerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const stats = (referrals || []).reduce((acc, ref) => {
      acc.totalReferrals++;
      if (ref.status === 'pending') acc.pending++;
      if (ref.status === 'registered' || ref.status === 'profile_completed') acc.registered++;
      if (ref.status === 'converted') acc.converted++;
      
      // Capturar el primer código de referido disponible
      if (!acc.referralCode && ref.referral_code) {
        acc.referralCode = ref.referral_code;
      }

      let pulsos = 0;
      if (ref.stage1_awarded) pulsos += 30;
      if (ref.stage2_awarded) pulsos += 120;
      acc.totalPulsosEarned += pulsos;
      acc.totalPointsAwarded += pulsos;
      
      return acc;
    }, {
      totalReferrals: 0,
      pending: 0,
      registered: 0,
      converted: 0,
      totalPulsosEarned: 0,
      totalPointsAwarded: 0,
      referralCode: null,
      referrals: []
    } as ReferralStats);

    // Mapear referidos para no exponer PII
    stats.referrals = (referrals || []).map((ref, idx) => ({
      ...ref,
      referred_alias: `Invitado #${(referrals?.length || 0) - idx}`
    }));

    return stats;
  } catch (error) {
    console.error('[getReferralStats] Error:', error);
    return {
      totalReferrals: 0,
      pending: 0,
      registered: 0,
      converted: 0,
      totalPulsosEarned: 0,
      totalPointsAwarded: 0,
      referralCode: null,
      referrals: []
    };
  }
}
