
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile(filePath: string) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) return;
    const content = fs.readFileSync(fullPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) return;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key) process.env[key] = val;
    });
  } catch {}
}

loadEnvFile('.env.local');

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const admin = createClient(url, key);

async function check() {
  const targetEmail = 'cen.de.imag.corazondejesus@gmail.com';
  
  console.log('--- SEARCHING BY EMAIL ---');
  const { data: users } = await admin.from('users').select('*').eq('email', targetEmail);
  console.log(JSON.stringify(users, null, 2));

  console.log('\n--- SEARCHING ORGANIZATION BY NAME ---');
  const { data: orgs } = await admin.from('organization').select('*').ilike('name', '%Coraz%n%');
  console.log(JSON.stringify(orgs, null, 2));

  if (orgs && orgs.length > 0) {
    const orgId = orgs[0].id;
    console.log('\n--- USERS FOR THIS ORG ---');
    const { data: orgUsers } = await admin.from('users').select('*').eq('organizationId', orgId);
    console.log(JSON.stringify(orgUsers, null, 2));
  }
}

check();
