/**
 * Script: delete-user.ts
 * Elimina un usuario y TODOS sus datos asociados de Supabase.
 * Uso: npx tsx scripts/delete-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Leer manualmente el .env.local (compatible con dotenv v17+ y tsx)
function loadEnvFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) return;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) process.env[key] = val;
    });
  } catch { /* archivo no existe, ignorar */ }
}
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

// ─── CONFIGURACIÓN DEL USUARIO A ELIMINAR ────────────────────────────────────
const TARGET_AUTH_ID  = '88c55ca1-dc35-42aa-9c4c-53740aee7ced';
const TARGET_EMAIL    = 'cen.de.imag.corazondejesus@gmail.com';
const TARGET_NAME     = 'Alexander Josue Mendez Parra';
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper de log con colores de consola
const log  = (msg: string) => console.log(`  ℹ️  ${msg}`);
const ok   = (msg: string) => console.log(`  ✅ ${msg}`);
const warn = (msg: string) => console.warn(`  ⚠️  ${msg}`);
const err  = (msg: string) => console.error(`  ❌ ${msg}`);

async function deleteTable(
  table: string,
  column: string,
  value: string | string[],
  label: string
): Promise<number> {
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0) { log(`${table}: sin registros para ${label}`); return 0; }

  const { data, error } = await admin
    .from(table)
    .delete()
    .in(column, values)
    .select('id');

  if (error) {
    err(`Error eliminando ${table} (${label}): ${error.message}`);
    return 0;
  }
  const count = data?.length ?? 0;
  if (count > 0) ok(`${table}: eliminados ${count} registros (${label})`);
  else log(`${table}: sin registros (${label})`);
  return count;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║       ELIMINACIÓN DE USUARIO - SYNCWAVE SALUD       ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log(`  👤 Nombre  : ${TARGET_NAME}`);
  console.log(`  📧 Email   : ${TARGET_EMAIL}`);
  console.log(`  🔑 Auth UID: ${TARGET_AUTH_ID}\n`);

  // ── 1. Obtener el registro de users para conocer el userId interno ─────────
  log('Buscando usuario en tabla users...');
  const { data: userRows, error: userFetchErr } = await admin
    .from('users')
    .select('id, organizationId, patientProfileId, role')
    .or(`authId.eq.${TARGET_AUTH_ID},email.eq.${TARGET_EMAIL}`);

  if (userFetchErr) { err(`No se pudo obtener el usuario: ${userFetchErr.message}`); process.exit(1); }
  if (!userRows || userRows.length === 0) { warn('No se encontró ningún registro de usuario en la tabla users.'); }

  const userIds         = userRows?.map(u => u.id) ?? [];
  const orgIds          = [...new Set(userRows?.map(u => u.organizationId).filter(Boolean) ?? [])] as string[];
  const patientIds      = [...new Set(userRows?.map(u => u.patientProfileId).filter(Boolean) ?? [])] as string[];

  console.log(`\n  📊 Registros encontrados en users: ${userRows?.length ?? 0}`);
  userRows?.forEach(u => {
    console.log(`     • id=${u.id} | role=${u.role} | orgId=${u.organizationId ?? '-'} | patientId=${u.patientProfileId ?? '-'}`);
  });
  console.log();

  // ── 2. Obtener IDs de medic_profile y clinic_profile ─────────────────────────
  let medicProfileIds: string[] = [];
  if (userIds.length > 0) {
    const { data: mpData } = await admin.from('medic_profile').select('id').in('doctor_id', userIds);
    medicProfileIds = mpData?.map(r => r.id) ?? [];
  }

  let clinicProfileIds: string[] = [];
  if (orgIds.length > 0) {
    const { data: cpData } = await admin.from('clinic_profile').select('id').in('organization_id', orgIds);
    clinicProfileIds = cpData?.map(r => r.id) ?? [];
  }

  // ── 3. Obtener unregistered patients (vía created_by que apunta a medic_profile.id)
  let unregisteredPatientIds: string[] = [];
  if (medicProfileIds.length > 0) {
    const { data: unregData } = await admin.from('unregisteredpatients').select('id').in('created_by', medicProfileIds);
    unregisteredPatientIds = unregData?.map(r => r.id) ?? [];
  }

  // ── 4. Obtener Consultas y Citas ──────────────────────────────────────────
  let consultationIds: string[] = [];
  if (userIds.length > 0 || orgIds.length > 0) {
    const query = admin.from('consultation').select('id');
    if (userIds.length > 0) query.in('doctor_id', userIds);
    if (orgIds.length > 0) query.in('organization_id', orgIds);
    const { data } = await query;
    consultationIds = data?.map(r => r.id) ?? [];
  }

  let appointmentIds: string[] = [];
  if (userIds.length > 0 || orgIds.length > 0) {
    const query = admin.from('appointment').select('id');
    if (userIds.length > 0) query.in('doctor_id', userIds);
    if (orgIds.length > 0) query.in('organization_id', orgIds);
    const { data } = await query;
    appointmentIds = data?.map(r => r.id) ?? [];
  }

  console.log('\n  🗑️  Iniciando eliminación en cascada...\n');

  // ── NIVEL 1: Sub-hijos (Dependencies de consultas/citas) ───────────────────
  if (consultationIds.length > 0) {
    await deleteTable('lab_result', 'consultation_id', consultationIds, 'por consultation_id');
    await deleteTable('lab_result_upload', 'consultation_id', consultationIds, 'por consultation_id');
    await deleteTable('consultation_files', 'consultation_id', consultationIds, 'por consultation_id');
    await deleteTable('consultation_share_link', 'consultation_id', consultationIds, 'por consultation_id');
    await deleteTable('consultation_email_queue', 'consultation_id', consultationIds, 'por consultation_id');
    await deleteTable('consultation_ratings', 'consultation_id', consultationIds, 'por consultation_id');
    await deleteTable('doctor_private_notes', 'consultation_id', consultationIds, 'por consultation_id');
    await deleteTable('successive_consultation', 'original_consultation_id', consultationIds, 'por original_consultation_id');
    await deleteTable('successive_consultations', 'original_consultation_id', consultationIds, 'por original_consultation_id');
  }

  if (appointmentIds.length > 0) {
    await deleteTable('facturacion', 'appointment_id', appointmentIds, 'por appointment_id');
  }

  // ── NIVEL 2: Prescriptions y sus items ─────────────────────────────────────
  let prescriptionIds: string[] = [];
  if (consultationIds.length > 0) {
    const { data } = await admin.from('prescription').select('id').in('consultation_id', consultationIds);
    prescriptionIds = data?.map(r => r.id) ?? [];
  }
  if (prescriptionIds.length > 0) {
    await deleteTable('prescription_item', 'prescription_id', prescriptionIds, 'por prescription_id');
    await deleteTable('prescription_files', 'prescription_id', prescriptionIds, 'por prescription_id');
    await deleteTable('prescription_dispense', 'prescription_id', prescriptionIds, 'por prescription_id');
    await deleteTable('medication_dose', 'prescription_id', prescriptionIds, 'por prescription_id');
    await deleteTable('prescription', 'id', prescriptionIds, 'por id');
  }

  // ── NIVEL 3: Consultas y Citas ─────────────────────────────────────────────
  if (consultationIds.length > 0) await deleteTable('consultation', 'id', consultationIds, 'consultas');
  if (appointmentIds.length > 0) await deleteTable('appointment', 'id', appointmentIds, 'citas');

  // ── NIVEL 4: Otros datos del usuario/médico ───────────────────────────────
  if (userIds.length > 0) {
    await deleteTable('task', 'assigned_to', userIds, 'por assigned_to');
    await deleteTable('task', 'created_by', userIds, 'por created_by');
    await deleteTable('user_sessions', 'user_id', userIds, 'por user_id');
    await deleteTable('notification', 'userId', userIds, 'por userId');
    await deleteTable('medicalaccessgrant', 'doctor_id', userIds, 'por doctor_id');
    await deleteTable('subscription_payments', 'user_id', userIds, 'por user_id');
    await deleteTable('subscription_payments', 'verified_by', userIds, 'por verified_by');
  }

  // ── NIVEL 5: Unregistered Patients (deben ir antes que medic_profile) ─────
  if (unregisteredPatientIds.length > 0) {
    await deleteTable('unregisteredpatients', 'id', unregisteredPatientIds, 'pacientes no registrados');
  }

  // ── NIVEL 6: Perfiles y Roles ──────────────────────────────────────────────
  if (medicProfileIds.length > 0) await deleteTable('medic_profile', 'id', medicProfileIds, 'medic profile');
  if (clinicProfileIds.length > 0) await deleteTable('clinic_profile', 'id', clinicProfileIds, 'clinic profile');

  if (orgIds.length > 0) {
    await deleteTable('consultorio_role_audit_log', 'organization_id', orgIds, 'por organization_id');
    await deleteTable('consultorio_role_users', 'organization_id', orgIds, 'por organization_id');
    await deleteTable('consultorio_roles', 'organization_id', orgIds, 'por organization_id');
    await deleteTable('invite', 'organizationId', orgIds, 'por organizationId');
    await deleteTable('subscription', 'organizationId', orgIds, 'por organizationId');
    await deleteTable('conversation', 'organization_id', orgIds, 'por organization_id');
  }

  // ── NIVEL 7: Core Records (Users y Organization) ──────────────────────────
  if (userIds.length > 0) await deleteTable('users', 'id', userIds, 'registros en users');
  if (orgIds.length > 0) await deleteTable('organization', 'id', orgIds, 'organizaciones');

  // ── 8. Eliminar de Supabase Auth ───────────────────────────────────────────
  console.log('\n  🔑 Eliminando de Supabase Auth...');
  const { error: authDeleteErr } = await admin.auth.admin.deleteUser(TARGET_AUTH_ID);
  if (authDeleteErr) {
    if (authDeleteErr.message.includes('User not found')) {
      warn(`El usuario ya no existe en Supabase Auth.`);
    } else {
      err(`Error eliminando de Supabase Auth: ${authDeleteErr.message}`);
    }
  } else {
    ok(`Usuario eliminado de Supabase Auth (UID: ${TARGET_AUTH_ID})`);
  }

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║              ELIMINACIÓN COMPLETADA ✅               ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

main().catch(e => { err(String(e)); process.exit(1); });
