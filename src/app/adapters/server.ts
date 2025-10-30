// src/app/adapters/server.ts
import { cookies as nextCookies } from 'next/headers';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

type NextCookieGet = { value?: string } | undefined;
type NextCookieStoreLike = {
	get?: (name: string) => NextCookieGet;
	set?: (opts: { name: string; value: string; path?: string; httpOnly?: boolean; sameSite?: 'lax' | 'strict' | 'none'; secure?: boolean }) => void;
	delete?: (name: string) => void;
};

type CookieStoreLike = ReturnType<typeof nextCookies> | NextCookieStoreLike;

/**
 * Crea un cliente Supabase configurado para el entorno del servidor (Server Components o API routes).
 * Permite pasar un store de cookies personalizado para testing.
 */
export function createSupabaseServerClient(customCookieStore?: CookieStoreLike): { supabase: SupabaseClient; cookies: CookieStoreLike } {
	const cookieStore: CookieStoreLike = customCookieStore ?? nextCookies();

	const storage = {
		getItem: (key: string): string | null => {
			try {
				const maybe = (cookieStore as NextCookieStoreLike).get?.(key);
				return maybe?.value ?? null;
			} catch {
				return null;
			}
		},
		setItem: (key: string, value: string): void => {
			try {
				(cookieStore as NextCookieStoreLike).set?.({
					name: key,
					value,
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					secure: process.env.NODE_ENV === 'production',
				});
			} catch {
				// algunos entornos no permiten escribir cookies, ignoramos
			}
		},
		removeItem: (key: string): void => {
			try {
				(cookieStore as NextCookieStoreLike).delete?.(key);
			} catch {
				// ignoramos
			}
		},
	};

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !key) {
		throw new Error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
	}

	const supabase = createSupabaseClient(url, key, {
		auth: {
			persistSession: false,
			storage,
		},
		global: { fetch },
	});

	return { supabase, cookies: cookieStore };
}

export default createSupabaseServerClient;
