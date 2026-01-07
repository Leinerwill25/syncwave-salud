// app/api/patients/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
	try {
		const search = req.nextUrl.searchParams.get('identifier')?.trim();
		if (!search) return NextResponse.json([], { status: 200 });

		const searchPattern = `%${search}%`;

		// Buscar en pacientes registrados
		const registeredResult = await pool.query(
			`SELECT id, "firstName", "lastName", identifier, 'registered' as type
       FROM "public"."patient"
       WHERE identifier ILIKE $1
          OR "firstName" ILIKE $1
          OR "lastName" ILIKE $1
       ORDER BY "firstName" ASC
       LIMIT 10`,
			[searchPattern]
		);

		// Buscar en pacientes no registrados
		const unregisteredResult = await pool.query(
			`SELECT id, first_name as "firstName", last_name as "lastName", identification as identifier, 'unregistered' as type
       FROM "public"."unregisteredpatients"
       WHERE identification ILIKE $1
          OR first_name ILIKE $1
          OR last_name ILIKE $1
       ORDER BY first_name ASC
       LIMIT 10`,
			[searchPattern]
		);

		// Combinar resultados y limitar a 10 total
		const combined = [...registeredResult.rows, ...unregisteredResult.rows].slice(0, 10);

		return NextResponse.json(combined);
	} catch (error) {
		console.error('Error searching patients:', error);
		return NextResponse.json({ error: 'Error al buscar pacientes' }, { status: 500 });
	}
}
