// src/lib/waha/__tests__/response-normalizer.test.ts
import { normalizePatientResponse } from '../response-normalizer';

/**
 * Script de prueba manual para validar la normalización de respuestas.
 * Para ejecutar: npx tsx src/lib/waha/__tests__/response-normalizer.test.ts
 */

const testCases = [
  // CONFIRMACIONES
  { input: 'Asistiré', expected: 'CONFIRMED' },
  { input: 'confirmo mi cita', expected: 'CONFIRMED' },
  { input: 'Si, alli estare', expected: 'CONFIRMED' },
  { input: 'perfecto gracias', expected: 'CONFIRMED' },
  { input: 'okey', expected: 'CONFIRMED' },
  { input: 'Cuenta conmigo', expected: 'CONFIRMED' },
  { input: 'Si', expected: 'CONFIRMED' },
  { input: '👍', expected: 'CONFIRMED' },
  { input: 'claro que si', expected: 'CONFIRMED' },
  { input: 'estare alla sin falta', expected: 'CONFIRMED' },

  // NEGACIONES
  { input: 'No podré asistir', expected: 'DENIED' },
  { input: 'cancela mi cita', expected: 'DENIED' },
  { input: 'no voy a poder ir', expected: 'DENIED' },
  { input: 'se me complica', expected: 'DENIED' },
  { input: 'no llego a tiempo', expected: 'DENIED' },
  { input: 'reagendame por favor', expected: 'DENIED' },
  { input: 'No asistiré', expected: 'DENIED' },
  { input: '❌', expected: 'DENIED' },
  { input: 'imposible ir', expected: 'DENIED' },

  // DESCONOCIDOS / AMBIGUOS
  { input: 'puedo cambiar la hora?', expected: 'UNKNOWN' },
  { input: 'cuanto cuesta la consulta?', expected: 'UNKNOWN' },
  { input: 'donde quedan?', expected: 'UNKNOWN' },
  { input: 'hola buenas tardes', expected: 'UNKNOWN' },
  { input: 'a que hora era?', expected: 'UNKNOWN' },
  { input: 'no se si asistire', expected: 'UNKNOWN' } // Contiene ambos, pero evaluamos DENIED primero
];

function runTests() {
  console.log('🧪 Ejecutando pruebas de Response Normalizer...\n');
  let passed = 0;

  testCases.forEach(({ input, expected }, index) => {
    const result = normalizePatientResponse(input);
    const isOk = result === expected;
    if (isOk) passed++;

    console.log(`${isOk ? '✅' : '❌'} [${index + 1}] Input: "${input}" | Expected: ${expected} | Got: ${result}`);
  });

  console.log(`\n📊 Resultado: ${passed}/${testCases.length} pruebas pasadas.`);
  
  if (passed === testCases.length) {
    console.log('🚀 ¡Pruebas exitosas!');
  } else {
    console.log('⚠️ Algunas pruebas fallaron. Revisa la lógica.');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runTests();
}
