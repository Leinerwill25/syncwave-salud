// src/app/api/debug/session/route.ts
import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { headers, cookies } from 'next/headers';

export async function GET() {
	try {
		// Aseguramos resolver posibles Promises
		const hdrs = await headers(); // <- usar await si headers() devuelve Promise
		const ck = await cookies(); // <- usar await si cookies() devuelve Promise

		// ahora hdrs.get existe
		const cookieHeader = hdrs.get?.('cookie') ?? null;

		let cookieList: Array<{ name: string; value: string | null }> = [];
		try {
			const all = (ck as any).getAll?.() ?? [];
			cookieList = Array.isArray(all) ? all.map((c: any) => ({ name: c.name, value: c.value })) : [];
		} catch (e) {
			// ignore
		}

		// pasamos hdrs y ck a la factory (y await si la factory es async)
		const { supabase } = createSupabaseServerClient();

		const sessionResp = await supabase.auth.getSession();
		const userResp = await supabase.auth.getUser();

		return NextResponse.json({
			ok: true,
			cookieHeader,
			cookieList,
			supabaseSession: sessionResp,
			supabaseUser: userResp,
		});
	} catch (err) {
		console.error('debug session error', err);
		return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
	}
}
