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

async function verifyAndCreateAdmin() {
  try {
    console.log('🔍 Verificando usuario superadmin...\n');

    // Verificar si el usuario existe
    const { data: existingAdmin, error: fetchError } = await supabase
      .from('superadmin')
      .select('id, username, email, is_active, created_at')
      .eq('username', 'ADMIN')
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Error consultando tabla superadmin:', fetchError);
      return;
    }

    if (existingAdmin) {
      console.log('✅ Usuario ADMIN ya existe en la tabla superadmin:');
      console.log('   ID:', existingAdmin.id);
      console.log('   Username:', existingAdmin.username);
      console.log('   Email:', existingAdmin.email);
      console.log('   Activo:', existingAdmin.is_active);
      console.log('   Creado:', existingAdmin.created_at);
      console.log('\n💡 El usuario existe. Verificando contraseña...\n');

      // Verificar contraseña
      const testPassword = 'Escorpio25#';
      const { data: adminWithHash } = await supabase
        .from('superadmin')
        .select('password_hash')
        .eq('username', 'ADMIN')
        .single();

      if (adminWithHash?.password_hash) {
        const isValid = await bcrypt.compare(testPassword, adminWithHash.password_hash);
        if (isValid) {
          console.log('✅ Contraseña verificada correctamente!');
        } else {
          console.log('⚠️  La contraseña almacenada NO coincide con "Escorpio25#"');
          console.log('   Actualizando contraseña...\n');
          
          // Generar nuevo hash
          const newHash = await bcrypt.hash(testPassword, 10);
          
          // Actualizar
          const { error: updateError } = await supabase
            .from('superadmin')
            .update({ password_hash: newHash, updated_at: new Date().toISOString() })
            .eq('username', 'ADMIN');

          if (updateError) {
            console.error('❌ Error actualizando contraseña:', updateError);
          } else {
            console.log('✅ Contraseña actualizada exitosamente!');
          }
        }
      }
    } else {
      console.log('❌ Usuario ADMIN NO existe en la tabla superadmin');
      console.log('🔨 Creando usuario...\n');

      // Generar hash de la contraseña
      const password = 'Escorpio25#';
      const passwordHash = await bcrypt.hash(password, 10);

      // Crear usuario
      const { data: newAdmin, error: insertError } = await supabase
        .from('superadmin')
        .insert({
          username: 'ADMIN',
          password_hash: passwordHash,
          email: 'admin@ashira.com',
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creando usuario:', insertError);
        console.error('   Detalles:', JSON.stringify(insertError, null, 2));
      } else {
        console.log('✅ Usuario ADMIN creado exitosamente:');
        console.log('   ID:', newAdmin.id);
        console.log('   Username:', newAdmin.username);
        console.log('   Email:', newAdmin.email);
        console.log('   Contraseña: Escorpio25#');
      }
    }

    console.log('\n📋 IMPORTANTE:');
    console.log('   Este usuario está en la tabla: public.superadmin');
    console.log('   NO está en Supabase Auth (auth.users)');
    console.log('   Es normal que no aparezca en Authentication > Users\n');

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

verifyAndCreateAdmin();

