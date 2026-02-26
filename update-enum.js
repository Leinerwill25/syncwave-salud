import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function updateEnum() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log("Connected to DB.");

    const res = await client.query(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ENFERMERO';`);
    console.log("Enum altered successfully:", res);

  } catch (err) {
    console.error("Error altering enum:", err);
  } finally {
    await client.end();
  }
}

updateEnum();
