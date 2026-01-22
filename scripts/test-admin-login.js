// Script para probar el login del usuario ADMIN
// Ejecuta: node scripts/test-admin-login.js

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Cargar variables de entorno
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function testLogin() {
  try {
    console.log('🔍 Probando login del usuario ADMIN...\n');

    const username = 'ADMIN';
    const password = 'Escorpio25#';

    // 1. Buscar el usuario
    console.log('1️⃣ Buscando usuario en la base de datos...');
    const { data: admin, error: adminError } = await supabase
      .from('superadmin')
      .select('id, username, password_hash, email, is_active')
      .eq('username', username)
      .maybeSingle();

    if (adminError) {
      console.error('❌ Error buscando usuario:', adminError);
      console.error('   Detalles:', JSON.stringify(adminError, null, 2));
      return;
    }

    if (!admin) {
      console.error('❌ Usuario ADMIN no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log('   ID:', admin.id);
    console.log('   Username:', admin.username);
    console.log('   Email:', admin.email);
    console.log('   Activo:', admin.is_active);
    console.log('   Hash (primeros 30 chars):', admin.password_hash.substring(0, 30) + '...');

    // 2. Verificar contraseña
    console.log('\n2️⃣ Verificando contraseña...');
    console.log('   Contraseña ingresada: Escorpio25#');
    console.log('   Hash almacenado:', admin.password_hash);

    // Probar diferentes métodos de verificación
    console.log('\n   Probando bcrypt.compare...');
    const isValid1 = await bcrypt.compare(password, admin.password_hash);
    console.log('   Resultado bcrypt.compare:', isValid1);

    // Verificar el formato del hash
    console.log('\n3️⃣ Información del hash:');
    const hashParts = admin.password_hash.split('$');
    console.log('   Formato:', hashParts[0] || 'N/A');
    console.log('   Versión:', hashParts[1] || 'N/A');
    console.log('   Cost:', hashParts[2] || 'N/A');
    console.log('   Salt + Hash length:', hashParts[3]?.length || 'N/A');

    // Generar un nuevo hash para comparar
    console.log('\n4️⃣ Generando nuevo hash de la misma contraseña...');
    const newHash = await bcrypt.hash(password, 10);
    console.log('   Nuevo hash:', newHash);
    console.log('   ¿Los hashes son iguales?', admin.password_hash === newHash);
    console.log('   (Es normal que sean diferentes, lo importante es que ambos verifiquen)');

    const isValid2 = await bcrypt.compare(password, newHash);
    console.log('   ¿El nuevo hash verifica?', isValid2);

    // 5. Conclusión
    console.log('\n📊 RESULTADO:');
    if (isValid1) {
      console.log('✅ La contraseña se verifica correctamente!');
      console.log('   El problema podría estar en:');
      console.log('   - RLS (Row Level Security) bloqueando la lectura');
      console.log('   - El cliente Supabase usado en el API route');
      console.log('   - Permisos de la tabla superadmin');
    } else {
      console.log('❌ La contraseña NO se verifica correctamente');
      console.log('   Posibles causas:');
      console.log('   - El hash está corrupto');
      console.log('   - El hash fue generado con una versión diferente de bcrypt');
      console.log('   - La contraseña en la BD no corresponde a "Escorpio25#"');
    }

    // 6. Probar leer con el cliente anon
    console.log('\n5️⃣ Probando acceso con cliente anon (como lo hace el API)...');
    const supabaseAnon = createClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { auth: { persistSession: false } }
    );

    const { data: adminAnon, error: anonError } = await supabaseAnon
      .from('superadmin')
      .select('id, username, password_hash')
      .eq('username', username)
      .maybeSingle();

    if (anonError) {
      console.log('❌ Error con cliente anon:', anonError.message);
      console.log('   Código:', anonError.code);
      console.log('   Esto podría ser un problema de RLS!');
      if (anonError.code === 'PGRST301' || anonError.code === '42501') {
        console.log('\n⚠️  PROBLEMA DETECTADO: RLS está bloqueando el acceso');
        console.log('   Solución: Necesitas crear una política RLS que permita');
        console.log('   la lectura de la tabla superadmin para usuarios autenticados');
        console.log('   o para el rol service_role.');
      }
    } else {
      console.log('✅ Cliente anon puede leer la tabla');
      if (adminAnon) {
        console.log('   Usuario encontrado:', adminAnon.username);
        const isValidAnon = await bcrypt.compare(password, adminAnon.password_hash);
        console.log('   ¿Contraseña verifica?', isValidAnon);
      }
    }

  } catch (err) {
    console.error('❌ Error:', err);
    console.error('   Stack:', err.stack);
  }
}

testLogin();

