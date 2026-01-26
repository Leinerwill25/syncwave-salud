#!/usr/bin/env node
/**
 * Script helper para configurar el workflow de n8n
 * 
 * Este script ayuda a verificar la configuración necesaria para el workflow
 * de generación de informes desde audio.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración para workflow de n8n...\n');

// Verificar variables de entorno
const requiredEnvVars = [
  'API_GROQ',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'N8N_WEBHOOK_URL',
];

const missing = [];
const present = [];

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    present.push(varName);
    console.log(`✅ ${varName}: Configurado`);
  } else {
    missing.push(varName);
    console.log(`❌ ${varName}: NO configurado`);
  }
});

console.log('\n');

if (missing.length > 0) {
  console.log('⚠️  Variables de entorno faltantes:');
  missing.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\nAgrega estas variables a tu archivo .env.local\n');
}

// Verificar que n8n está corriendo
console.log('📡 Verificando conexión con n8n...');
const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';

fetch(n8nUrl.replace('/webhook/', ''))
  .then(() => {
    console.log(`✅ n8n está disponible en ${n8nUrl}`);
  })
  .catch(() => {
    console.log(`❌ No se puede conectar a n8n en ${n8nUrl}`);
    console.log('   Asegúrate de que n8n esté corriendo: pnpm run n8n');
  });

console.log('\n✅ Verificación completada\n');

console.log('📋 Próximos pasos:');
console.log('1. Importa el workflow desde: n8n-workflow-generate-report.json');
console.log('2. Configura las variables de entorno en n8n');
console.log('3. Activa el workflow');
console.log('4. Prueba el endpoint desde tu aplicación\n');






