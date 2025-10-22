// src/app/api/notifications/route.ts
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

export async function GET(req: Request) {
	try {
		// Esperamos Authorization: Bearer <access_token>
		const authHeader = req.headers.get('authorization') || '';
		const token = authHeader.replace('Bearer ', '').trim();
		if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		// Obtener usuario desde token
		const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
		if (userErr || !userData?.user) {
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
		}
		const user = userData.user;

		// Extraer organizationId (puede estar en custom claims / metadata o en tabla User)
		// Preferimos metadata si tu auth almacena organizationId ahí; si no, hacemos lookup en la tabla User
		let orgId = (user.user_metadata as any)?.organizationId ?? null;

		if (!orgId) {
			// lookup in DB Users table by auth id or email
			const authId = user.id;
			const { data: urow, error: uerr } = await supabaseAdmin.from('User').select('organizationId').eq('authId', authId).limit(1).maybeSingle();
			if (uerr) {
				// fallback: try by email if authId not present
				const { data: urow2, error: uerr2 } = await supabaseAdmin.from('User').select('organizationId').eq('email', user.email).limit(1).maybeSingle();
				if (uerr2) {
					console.error('Error fetching user org', uerr2);
				} else {
					orgId = urow2?.organizationId ?? orgId;
				}
			} else {
				orgId = urow?.organizationId ?? orgId;
			}
		}

		if (!orgId) {
			return NextResponse.json({ notifications: [] });
		}

		// Fetch notifications for this organization (most recent first)
		const { data, error } = await supabaseAdmin.from('Notification').select('*').eq('organizationId', orgId).order('createdAt', { ascending: false }).limit(200);

		if (error) {
			console.error('Error fetching notifications', error);
			return NextResponse.json({ error: 'DB error' }, { status: 500 });
		}

		return NextResponse.json({ notifications: data ?? [] });
	} catch (err) {
		console.error(err);
		return NextResponse.json({ error: 'Internal error' }, { status: 500 });
	}
}
