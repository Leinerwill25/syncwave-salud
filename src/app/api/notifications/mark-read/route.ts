// src/app/api/notifications/mark-read/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error('Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: { persistSession: false },
});

export async function POST(req: Request) {
	try {
		const authHeader = req.headers.get('authorization') || '';
		const token = authHeader.replace('Bearer ', '').trim();
		if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
		if (userErr || !userData?.user) {
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
		}
		const user = userData.user;

		const body = await req.json().catch(() => ({}));
		const { ids } = body; // expect { ids: ['uuid', ...] } or { all: true }

		// Resolve orgId (same approach as GET)
		let orgId = (user.user_metadata as any)?.organizationId ?? null;
		if (!orgId) {
			const { data: urow } = await supabaseAdmin.from('user').select('organizationId').eq('authId', user.id).limit(1).maybeSingle();
			orgId = urow?.organizationId ?? orgId;
		}

		if (!orgId) return NextResponse.json({ error: 'Organization not found' }, { status: 400 });

		if (body.all) {
			// mark all for org as read
			const { error } = await supabaseAdmin.from('notification').update({ read: true }).eq('organizationId', orgId).is('read', false);
			if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
			return NextResponse.json({ ok: true });
		}

		if (!Array.isArray(ids) || ids.length === 0) {
			return NextResponse.json({ error: 'ids required' }, { status: 400 });
		}

		// Mark only those notifications that belong to this organization (avoid marking others)
		const { error } = await supabaseAdmin.from('notification').update({ read: true }).in('id', ids).eq('organizationId', orgId);

		if (error) {
			console.error('Error marking read', error);
			return NextResponse.json({ error: 'DB error' }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error(err);
		return NextResponse.json({ error: 'Internal error' }, { status: 500 });
	}
}
