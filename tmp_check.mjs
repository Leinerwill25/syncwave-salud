import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', url ? 'OK' : 'MISSING');
console.log('Service Key:', serviceKey ? 'OK' : 'MISSING');

// Test with service role (bypasses RLS)
const svc = createClient(url, serviceKey);

// Test with anon key (uses RLS)
const anon = createClient(url, anonKey);

const tables = ['patient', 'specialists', 'admin_appointments', 'admin_consultations', 'admin_inventory_medications', 'admin_inventory_materials'];

console.log('\n=== WITH SERVICE ROLE (bypasses RLS) ===');
for (const table of tables) {
  const { count, error } = await svc.from(table).select('id', { count: 'exact', head: true });
  console.log(`  ${table}: count=${count}, error=${error?.message || 'none'}`);
}

console.log('\n=== WITH ANON KEY (uses RLS) ===');
for (const table of tables) {
  const { count, error } = await anon.from(table).select('id', { count: 'exact', head: true });
  console.log(`  ${table}: count=${count}, error=${error?.message || 'none'}`);
}
