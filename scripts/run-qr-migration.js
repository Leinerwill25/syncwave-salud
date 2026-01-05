// Script para ejecutar la migración del QR de emergencia
// Uso: node scripts/run-qr-migration.js
// Requiere: DATABASE_URL en .env.local o .env

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno (opcional, si dotenv está instalado)
try {
	require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
	require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {
	// dotenv no está instalado, usar process.env directamente
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('❌ Error: DATABASE_URL no está definida en las variables de entorno');
	console.error('   Por favor, define DATABASE_URL en .env.local o .env');
	process.exit(1);
}

const pool = new Pool({
	connectionString: DATABASE_URL,
	ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
	const migrationPath = path.join(__dirname, '../migrations/add_patient_emergency_qr_fields.sql');
	
	if (!fs.existsSync(migrationPath)) {
		console.error(`❌ Error: No se encuentra el archivo de migración en: ${migrationPath}`);
		process.exit(1);
	}

	const sql = fs.readFileSync(migrationPath, 'utf8');
	
	console.log('🔄 Ejecutando migración del QR de emergencia...\n');

	try {
		await pool.query(sql);
		console.log('✅ Migración ejecutada exitosamente!\n');
		
		// Verificar que los campos se crearon
		console.log('🔍 Verificando campos creados...');
		const { rows } = await pool.query(`
			SELECT column_name, data_type, is_nullable
			FROM information_schema.columns
			WHERE table_name = 'Patient'
			  AND column_name IN (
				'emergency_qr_token',
				'emergency_qr_enabled',
				'advance_directives',
				'emergency_contact_name',
				'emergency_contact_phone',
				'emergency_contact_relationship'
			  )
			ORDER BY column_name;
		`);
		
		if (rows.length === 6) {
			console.log('✅ Todos los campos fueron creados correctamente:\n');
			rows.forEach((row) => {
				console.log(`   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
			});
			console.log('\n🎉 ¡Migración completada exitosamente!');
		} else {
			console.warn(`⚠️  Se esperaban 6 campos, pero se encontraron ${rows.length}`);
			console.warn('   Por favor, verifica manualmente en la base de datos');
		}
	} catch (error) {
		console.error('❌ Error ejecutando migración:\n');
		console.error(error.message);
		if (error.code === '42701') {
			console.error('\n⚠️  Algunos campos ya existen. Esto es normal si ejecutaste la migración antes.');
		} else if (error.code === '42P01') {
			console.error('\n⚠️  Error: La tabla "Patient" no existe. Verifica tu conexión a la base de datos.');
		}
		process.exit(1);
	} finally {
		await pool.end();
	}
}

runMigration();

