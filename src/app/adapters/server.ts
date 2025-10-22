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
 * Crea un cliente Supabase para uso en Server Components / routes.
 * Acepta un store de cookies custom para testing.
 */
export function createSupabaseServerClient(customCookieStore?: CookieStoreLike): { supabase: SupabaseClient; cookies: CookieStoreLike } {
	const cookieStore: CookieStoreLike = customCookieStore ?? nextCookies();

	// Adapter mínimo que Supabase espera: getItem / setItem / removeItem
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
				// Algunos runtimes (o tests) no permiten set() — ignoramos silenciosamente.
			}
		},
		removeItem: (key: string): void => {
			try {
				(cookieStore as NextCookieStoreLike).delete?.(key);
			} catch {
				// ignore
			}
		},
	};

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) {
		throw new Error('Faltan env vars NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
	}

	const supabase = createSupabaseClient(url, key, {
		// pasamos el storage para que supabase pueda leer las cookies en Server Components
		auth: {
			persistSession: false,
			storage,
		},
		global: { fetch },
	});

	return { supabase, cookies: cookieStore };
}

export default createSupabaseServerClient;
