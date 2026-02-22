// Script para verificar y crear el usuario superadmin si no existe
// Ejecutar con: node scripts/verify-superadmin.js
// O con variables de entorno: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/verify-superadmin.js

// Intentar cargar variables de entorno desde .env.local
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // Si dotenv no está disponible, continuar
}

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Faltan variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function getAdminByUsername(username) {
  const { data, error } = await supabase
    .from('superadmin')
    .select('id, username, email, is_active, created_at, password_hash')
    .eq('username', username)
    .maybeSingle();

  if (error) throw new Error(`Error consultando tabla superadmin: ${error.message}`);
  return data;
}

async function verifyAndUpdatePassword(admin, testPassword) {
  if (!admin?.password_hash) return;
  
  const isValid = await bcrypt.compare(testPassword, admin.password_hash);
  if (isValid) {
    console.log('✅ Contraseña verificada correctamente!');
    return;
  }

  console.log('⚠️  La contraseña almacenada NO coincide con "Escorpio25#"');
  console.log('   Actualizando contraseña...\n');
  
  const newHash = await bcrypt.hash(testPassword, 10);
  const { error } = await supabase
    .from('superadmin')
    .update({ password_hash: newHash, updated_at: new Date().toISOString() })
    .eq('username', admin.username);

  if (error) throw new Error(`Error actualizando contraseña: ${error.message}`);
  console.log('✅ Contraseña actualizada exitosamente!');
}

async function createAdmin(username, password, email) {
  console.log(`🔨 Creando usuario ${username}...\n`);
  const passwordHash = await bcrypt.hash(password, 10);
  
  const { data, error } = await supabase
    .from('superadmin')
    .insert({ username, password_hash: passwordHash, email, is_active: true })
    .select()
    .single();

  if (error) throw new Error(`Error creando usuario: ${error.message}`);
  
  console.log('✅ Usuario ADMIN creado exitosamente:');
  console.log('   ID:', data.id);
  console.log('   Username:', data.username);
}

async function verifyAndCreateAdmin() {
  const DEFAULT_USER = 'ADMIN';
  const DEFAULT_PASS = 'Escorpio25#';
  const DEFAULT_EMAIL = 'admin@ashira.com';

  try {
    console.log('🔍 Verificando usuario superadmin...\n');
    const existingAdmin = await getAdminByUsername(DEFAULT_USER);

    if (existingAdmin) {
      console.log(`✅ Usuario ${DEFAULT_USER} ya existe.`);
      await verifyAndUpdatePassword(existingAdmin, DEFAULT_PASS);
    } else {
      console.log(`❌ Usuario ${DEFAULT_USER} NO existe.`);
      await createAdmin(DEFAULT_USER, DEFAULT_PASS, DEFAULT_EMAIL);
    }

    console.log('\n📋 IMPORTANTE:');
    console.log('   Este usuario está en la tabla: public.superadmin');
    console.log('   NO está en Supabase Auth (auth.users)\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

verifyAndCreateAdmin();

