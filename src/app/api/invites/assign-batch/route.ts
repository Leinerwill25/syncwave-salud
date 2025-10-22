// src/app/api/invites/assign-batch/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error('Faltan las variables de entorno SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: { persistSession: false },
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => null);
		if (!body || !Array.isArray(body.assignments)) {
			return NextResponse.json({ message: 'Payload inválido. Esperado { assignments: [...] }' }, { status: 400 });
		}

		// Normalizar input
		const assignmentsRaw: { id: string; email: string }[] = body.assignments;
		const assignments = assignmentsRaw.map((a) => ({ id: String(a.id), email: (a.email ?? '').trim().toLowerCase() }));

		if (assignments.length === 0) {
			return NextResponse.json({ message: 'No hay asignaciones.' }, { status: 400 });
		}

		const MAX = 1000;
		if (assignments.length > MAX) {
			return NextResponse.json({ message: `Máximo ${MAX} asignaciones por petición.` }, { status: 413 });
		}

		const invalid = assignments.filter((a) => !a.id || !a.email || !emailRegex.test(a.email));
		if (invalid.length > 0) {
			return NextResponse.json({ message: 'Algunas asignaciones contienen email/id inválido.', invalid }, { status: 400 });
		}

		// Preparar lista de emails únicos a comprobar
		const emails = Array.from(new Set(assignments.map((a) => a.email)));

		// Buscar invites existentes con esos emails (consulta por lista)
		// Nota: esto puede ser case-sensitive dependiendo de cómo estén guardados los emails.
		const { data: existingRows = [], error: selectErr } = await supabase.from('invite').select('id,email').in('email', emails);
		if (selectErr) {
			console.error('supabase select error', selectErr);
			return NextResponse.json({ message: 'Error consultando la base de datos', detail: selectErr.message }, { status: 500 });
		}

		// Map de email -> existing invite id (normalizado a lower)
		const existingByLower = new Map<string, string>();
		for (const r of existingRows as any[]) {
			if (r?.email) existingByLower.set(String(r.email).toLowerCase(), String(r.id));
		}

		// Detectar conflictos: mismo email está asignado a otra invite (id distinto)
		const conflicts: { email: string; existingInviteId: string; targetInviteId: string }[] = [];
		for (const a of assignments) {
			const existingId = existingByLower.get(a.email.toLowerCase());
			if (existingId && existingId !== a.id) {
				conflicts.push({ email: a.email, existingInviteId: existingId, targetInviteId: a.id });
			}
		}

		if (conflicts.length > 0) {
			return NextResponse.json({ message: 'Algunos correos ya están asignados a otras invitaciones.', conflicts }, { status: 409 });
		}

		// No hay conflictos: proceder a actualizar (uno a uno)
		const results: any[] = [];
		for (const a of assignments) {
			try {
				const { data, error } = await supabase.from('invite').update({ email: a.email }).eq('id', a.id).select().single();
				if (error) {
					results.push({ id: a.id, ok: false, error: error.message });
				} else {
					results.push({ id: a.id, ok: true, row: data });
				}
			} catch (e: any) {
				console.error('update error for', a, e);
				results.push({ id: a.id, ok: false, error: e?.message ?? String(e) });
			}
		}

		const failed = results.filter((r) => !r.ok);
		if (failed.length > 0) {
			return NextResponse.json({ message: 'Algunas asignaciones fallaron', results, failedCount: failed.length }, { status: 207 }); // Multi-Status
		}

		return NextResponse.json({ message: 'Asignaciones guardadas correctamente', results }, { status: 200 });
	} catch (err: any) {
		console.error('assign-batch supabase error', err);
		return NextResponse.json({ message: 'Error interno procesando asignaciones', detail: err?.message ?? String(err) }, { status: 500 });
	}
}
