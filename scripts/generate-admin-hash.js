// Script para generar el hash bcrypt de la contraseña del superadmin
// Ejecutar con: node scripts/generate-admin-hash.js

const bcrypt = require('bcryptjs');

const password = 'Escorpio25#';
const username = 'ADMIN';

// Generar hash con 10 rounds (cost factor)
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generando hash:', err);
    process.exit(1);
  }

  console.log('\n=== HASH GENERADO PARA SUPERADMIN ===\n');
  console.log('Usuario:', username);
  console.log('Contraseña:', password);
  console.log('Hash bcrypt:', hash);
  console.log('\n=== SQL PARA INSERTAR ===\n');
  
  const sql = `
-- Insertar usuario superadmin para Analytics Dashboard
INSERT INTO public.superadmin (
    id,
    username,
    password_hash,
    email,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'ADMIN',
    '${hash}',
    'admin@ashira.com',
    true,
    now(),
    now()
)
ON CONFLICT (username) DO UPDATE
SET
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active,
    updated_at = now();
`;

  console.log(sql);
  console.log('\n=== FIN ===\n');
  
  // Guardar en un archivo
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, '..', 'migrations', 'create_superadmin_user.sql');
  
  fs.writeFileSync(outputPath, `-- Migration: Crear usuario superadmin para Analytics Dashboard
-- Usuario: ADMIN
-- Contraseña: Escorpio25#
-- Hash generado automáticamente: ${new Date().toISOString()}

${sql}

-- Verificar que el usuario fue creado correctamente
SELECT id, username, email, is_active, created_at 
FROM public.superadmin 
WHERE username = 'ADMIN';
`);
  
  console.log('✓ Archivo SQL generado en:', outputPath);
  console.log('\nAhora puedes ejecutar este SQL en tu base de datos.\n');
});

