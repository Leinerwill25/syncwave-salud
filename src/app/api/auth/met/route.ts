// src/app/api/auth/met/route.ts
import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

function parseCookies(raw: string | null) {
	if (!raw) return {};
	return Object.fromEntries(
		raw
			.split(';')
			.map((c) => c.trim())
			.filter(Boolean)
			.map((kv) => {
				const idx = kv.indexOf('=');
				const name = idx > -1 ? kv.slice(0, idx) : kv;
				const value = idx > -1 ? kv.slice(idx + 1) : '';
				return [name, decodeURIComponent(value)];
			})
	);
}

function findSupabaseAuthTokenFromCookies(allCookies: Record<string, string>) {
	const authNames = Object.keys(allCookies).filter((k) => k.includes('auth-token') || k.includes('auth_token') || k.startsWith('sb-'));

	for (const name of authNames) {
		if (!name.includes('.')) {
			const v = allCookies[name];
			if (v && v.length > 20) return v;
		}
	}

	const prefixes = new Set<string>();
	for (const name of Object.keys(allCookies)) {
		const m = name.match(/^(sb-[^.]+-auth-token)/);
		if (m) prefixes.add(m[1]);
	}
	for (const prefix of prefixes) {
		const parts: string[] = [];
		let i = 0;
		while (true) {
			const partName = `${prefix}.${i}`;
			if (Object.prototype.hasOwnProperty.call(allCookies, partName)) {
				parts.push(allCookies[partName]);
				i++;
			} else {
				break;
			}
		}
		if (parts.length > 0) {
			return parts.join('');
		}
	}

	for (const name of Object.keys(allCookies)) {
		const v = allCookies[name];
		if (typeof v === 'string' && v.split('.').length === 3) return v;
	}

	return null;
}

/**
 * Devuelve el id de la tabla User (app user) mapeado desde auth user id (authId).
 * También devuelve organizationId y organizationName si están disponibles.
 */
export async function GET(req: Request) {
	try {
		const { supabase } = createSupabaseServerClient();

		// 1) Intento directo con supabase.auth.getUser()
		const maybeUser = await supabase.auth.getUser();
		if (maybeUser?.data?.user) {
			const authUser = maybeUser.data.user;

			// Buscar el perfil en la tabla User usando authId
			const { data: appUser, error: appUserErr } = await supabase.from('User').select('id, organizationId').eq('authId', authUser.id).maybeSingle();

			if (appUserErr) {
				console.error('/api/auth/met error buscando User por authId:', appUserErr);
				return NextResponse.json({ error: 'Error interno' }, { status: 500 });
			}

			if (!appUser) {
				// No existe perfil en tabla User para el auth user
				return NextResponse.json({ error: 'Perfil de aplicación no encontrado para el usuario autenticado' }, { status: 401 });
			}

			// opcional: intentar obtener nombre de la organización
			let orgName: string | null = null;
			if (appUser.organizationId) {
				const { data: org, error: orgErr } = await supabase.from('Organization').select('name').eq('id', appUser.organizationId).maybeSingle();
				if (!orgErr && org) orgName = (org as any).name ?? null;
			}

			return NextResponse.json({
				id: appUser.id, // <-- ESTE es el id de la tabla User (app user)
				email: authUser.email ?? null,
				organizationId: appUser.organizationId ?? null,
				organizationName: orgName,
			});
		}

		// 2) Si no vino por getUser(), intentamos reconstruir token desde cookies
		const rawCookies = req.headers.get('cookie') ?? null;
		const cookies = parseCookies(rawCookies);
		const token = findSupabaseAuthTokenFromCookies(cookies);

		if (token) {
			const { data: userData, error: userErr } = await supabase.auth.getUser(token);
			if (!userErr && userData?.user) {
				const authUser = userData.user;

				const { data: appUser, error: appUserErr } = await supabase.from('User').select('id, organizationId').eq('authId', authUser.id).maybeSingle();

				if (appUserErr) {
					console.error('/api/auth/met error buscando User por authId con token:', appUserErr);
					return NextResponse.json({ error: 'Error interno' }, { status: 500 });
				}

				if (!appUser) {
					return NextResponse.json({ error: 'Perfil de aplicación no encontrado para el usuario autenticado (token)' }, { status: 401 });
				}

				let orgName: string | null = null;
				if (appUser.organizationId) {
					const { data: org, error: orgErr } = await supabase.from('Organization').select('name').eq('id', appUser.organizationId).maybeSingle();
					if (!orgErr && org) orgName = (org as any).name ?? null;
				}

				return NextResponse.json({
					id: appUser.id,
					email: authUser.email ?? null,
					organizationId: appUser.organizationId ?? null,
					organizationName: orgName,
				});
			} else {
				console.warn('/api/auth/met: token presente pero getUser(token) falló', userErr);
			}
		}

		return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
	} catch (err) {
		console.error('/api/auth/met error', err);
		return NextResponse.json({ error: 'Error interno' }, { status: 500 });
	}
}
