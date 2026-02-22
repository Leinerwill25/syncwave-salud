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

/**
 * Deletes all sub-entities associated with consultations.
 */
async function deleteConsultationSubEntities(consultationIds: string[]): Promise<void> {
  if (consultationIds.length === 0) return;
  
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

/**
 * Deletes all entities associated with prescriptions.
 */
async function deletePrescriptionEntities(consultationIds: string[]): Promise<void> {
  if (consultationIds.length === 0) return;
  
  const { data } = await admin.from('prescription').select('id').in('consultation_id', consultationIds);
  const prescriptionIds = data?.map(r => r.id) ?? [];
  
  if (prescriptionIds.length > 0) {
    await deleteTable('prescription_item', 'prescription_id', prescriptionIds, 'por prescription_id');
    await deleteTable('prescription_files', 'prescription_id', prescriptionIds, 'por prescription_id');
    await deleteTable('prescription_dispense', 'prescription_id', prescriptionIds, 'por prescription_id');
    await deleteTable('medication_dose', 'prescription_id', prescriptionIds, 'por prescription_id');
    await deleteTable('prescription', 'id', prescriptionIds, 'por id');
  }
}

/**
 * Deletes core user data across multiple profile tables.
 */
async function deleteCoreUserData(userIds: string[], orgIds: string[], medicProfileIds: string[], clinicProfileIds: string[]): Promise<void> {
  if (userIds.length > 0) {
    await deleteTable('task', 'assigned_to', userIds, 'por assigned_to');
    await deleteTable('task', 'created_by', userIds, 'por created_by');
    await deleteTable('user_sessions', 'user_id', userIds, 'por user_id');
    await deleteTable('notification', 'userId', userIds, 'por userId');
    await deleteTable('medicalaccessgrant', 'doctor_id', userIds, 'por doctor_id');
    await deleteTable('subscription_payments', 'user_id', userIds, 'por user_id');
    await deleteTable('subscription_payments', 'verified_by', userIds, 'por verified_by');
  }

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
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║       ELIMINACIÓN DE USUARIO - SYNCWAVE SALUD       ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log(`  👤 Nombre  : ${TARGET_NAME}`);
  console.log(`  📧 Email   : ${TARGET_EMAIL}`);
  console.log(`  🔑 Auth UID: ${TARGET_AUTH_ID}\n`);

  log('Buscando usuario en tabla users...');
  const { data: userRows, error: userFetchErr } = await admin
    .from('users')
    .select('id, organizationId, patientProfileId, role')
    .or(`authId.eq.${TARGET_AUTH_ID},email.eq.${TARGET_EMAIL}`);

  if (userFetchErr) { err(`No se pudo obtener el usuario: ${userFetchErr.message}`); process.exit(1); }
  if (!userRows || userRows.length === 0) { warn('No se encontró ningún registro de usuario en la tabla users.'); }

  const userIds = userRows?.map(u => u.id) ?? [];
  const orgIds = [...new Set(userRows?.map(u => u.organizationId).filter(Boolean) ?? [])] as string[];

  // Obtener medic_profile bits
  const { data: mpData } = userIds.length > 0 ? await admin.from('medic_profile').select('id').in('doctor_id', userIds) : { data: [] };
  const medicProfileIds = mpData?.map(r => r.id) ?? [];

  const { data: cpData } = orgIds.length > 0 ? await admin.from('clinic_profile').select('id').in('organization_id', orgIds) : { data: [] };
  const clinicProfileIds = cpData?.map(r => r.id) ?? [];

  const { data: unregData } = medicProfileIds.length > 0 ? await admin.from('unregisteredpatients').select('id').in('created_by', medicProfileIds) : { data: [] };
  const unregisteredPatientIds = unregData?.map(r => r.id) ?? [];

  // Obtener Consultas y Citas
  let consultationIds: string[] = [];
  if (userIds.length > 0 || orgIds.length > 0) {
    const { data } = await admin.from('consultation').select('id').or(`doctor_id.in.(${userIds.join(',')}),organization_id.in.(${orgIds.join(',')})`);
    consultationIds = data?.map(r => r.id) ?? [];
  }

  let appointmentIds: string[] = [];
  if (userIds.length > 0 || orgIds.length > 0) {
    const { data } = await admin.from('appointment').select('id').or(`doctor_id.in.(${userIds.join(',')}),organization_id.in.(${orgIds.join(',')})`);
    appointmentIds = data?.map(r => r.id) ?? [];
  }

  console.log('\n  🗑️  Iniciando eliminación en cascada...\n');

  // Deletion orchestration
  await deleteConsultationSubEntities(consultationIds);
  if (appointmentIds.length > 0) await deleteTable('facturacion', 'appointment_id', appointmentIds, 'por appointment_id');
  await deletePrescriptionEntities(consultationIds);
  
  if (consultationIds.length > 0) await deleteTable('consultation', 'id', consultationIds, 'consultas');
  if (appointmentIds.length > 0) await deleteTable('appointment', 'id', appointmentIds, 'citas');

  if (unregisteredPatientIds.length > 0) await deleteTable('unregisteredpatients', 'id', unregisteredPatientIds, 'pacientes no registrados');

  await deleteCoreUserData(userIds, orgIds, medicProfileIds, clinicProfileIds);

  if (userIds.length > 0) await deleteTable('users', 'id', userIds, 'registros en users');
  if (orgIds.length > 0) await deleteTable('organization', 'id', orgIds, 'organizaciones');

  // Supabase Auth cleanup
  console.log('\n  🔑 Eliminando de Supabase Auth...');
  const { error: authDeleteErr } = await admin.auth.admin.deleteUser(TARGET_AUTH_ID);
  if (authDeleteErr && !authDeleteErr.message.includes('User not found')) {
      err(`Error eliminando de Supabase Auth: ${authDeleteErr.message}`);
  } else {
      ok(`Usuario eliminado de Supabase Auth (UID: ${TARGET_AUTH_ID})`);
  }

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║              ELIMINACIÓN COMPLETADA ✅               ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

main().catch(e => { err(String(e)); process.exit(1); });
