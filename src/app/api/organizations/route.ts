// src/app/api/organizations/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getApiResponseHeaders } from '@/lib/api-cache-utils';

// Configurar caché optimizada (semi-static: datos que cambian ocasionalmente)
export const dynamic = 'force-dynamic';
export const revalidate = 300;

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
// En server puedes usar SUPABASE_SERVICE_ROLE_KEY; si no está, caerá al ANON key (menos privilegios).
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
	throw new Error('Faltan variables de entorno SUPABASE_URL o SUPABASE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

/**
 * GET /api/organizations
 * Query params:
 *  - q (optional): texto para búsqueda por nombre (case-insensitive)
 *  - limit (optional): número máximo de resultados (por defecto 100, máximo 500)
 *
 * Respuesta: array de organizaciones públicas con campos seleccionados:
 *   { id, name, inviteBaseUrl, contactEmail, createdAt }
 */
export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const q = (url.searchParams.get('q') ?? '').trim();
		const limitParam = parseInt(url.searchParams.get('limit') ?? '', 10);
		const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 100;

		// Tabla según tu esquema: "Organization" (si tu tabla es lowercase, cámbialo a 'organization')
		const tableName = 'Organization';

		let builder = supabase.from(tableName).select('id, name, inviteBaseUrl, contactEmail, createdAt').order('name', { ascending: true }).limit(limit);

		if (q) {
			// ilike para búsqueda case-insensitive (Postgres)
			builder = builder.ilike('name', `%${q}%`);
		}

		const { data, error } = await builder;

		if (error) {
			// Si la tabla no existe por mayúsculas/minúsculas, intentar fallback a lowercase 'organization'
			if (error.message?.toLowerCase().includes('relation') || error.code === '42P01') {
				const fallback = await supabase
					.from('organization')
					.select('id, name, inviteBaseUrl, contactEmail, createdAt')
					.order('name', { ascending: true })
					.limit(limit)
					.ilike(q ? 'name' : 'name', q ? `%${q}%` : '%'); // si q vacío, devuelve todas hasta limit

				if (fallback.error) {
					console.error('Supabase organizations fallback error', fallback.error);
					return NextResponse.json({ message: 'Error interno al obtener organizaciones', detail: fallback.error.message ?? String(fallback.error) }, { status: 500 });
				}
			return NextResponse.json(fallback.data ?? [], { 
				status: 200,
				headers: getApiResponseHeaders('semi-static'),
			});
		}

		console.error('Supabase organizations error', error);
		return NextResponse.json({ message: 'Error interno al obtener organizaciones', detail: error.message ?? String(error) }, { status: 500 });
	}

	return NextResponse.json(data ?? [], { 
		status: 200,
		headers: getApiResponseHeaders('semi-static'),
	});
	} catch (err: any) {
		console.error('GET /api/organizations error', err);
		return NextResponse.json({ message: 'Error interno al obtener organizaciones', detail: err?.message ?? String(err) }, { status: 500 });
	}
}
