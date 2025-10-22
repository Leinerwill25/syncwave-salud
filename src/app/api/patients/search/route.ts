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

		// IMPORTANTE: Usamos comillas para tabla y columnas si existen mayúsculas
		const result = await pool.query(
			`SELECT id, "firstName", "lastName", identifier
       FROM "public"."Patient"
       WHERE identifier ILIKE $1
          OR "firstName" ILIKE $1
          OR "lastName" ILIKE $1
       ORDER BY "firstName" ASC
       LIMIT 10`,
			[`%${search}%`]
		);

		return NextResponse.json(result.rows);
	} catch (error) {
		console.error('Error searching patients:', error);
		return NextResponse.json({ error: 'Error al buscar pacientes' }, { status: 500 });
	}
}
