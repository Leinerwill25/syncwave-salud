/**
 * Script: inspect-schema.ts
 * Inspecciona las columnas reales de las tablas problemáticas
 */

import * as fs from 'fs';
import * as path from 'path';

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
  } catch {}
}
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function inspectTable(name: string) {
  const { data, error } = await admin.from(name).select('*').limit(1);
  if (error) {
    console.log(`❌ ${name}: ${error.message}`);
  } else {
    const cols = data && data[0] ? Object.keys(data[0]) : ['(tabla vacía)'];
    console.log(`✅ ${name}:`, cols.join(', '));
  }
}

const tables = [
  'task', 'facturacion', 'medicalaccessgrant', 'laborder',
  'consultation', 'appointment', 'prescription', 'users',
  'organization', 'unregisteredpatients', 'medicprofile',
  'notification', 'invite', 'subscription', 'roleuser',
  'clinicprofile', 'patient'
];

for (const t of tables) {
  await inspectTable(t);
}
