// src/adapters/server.ts
import { cookies as nextCookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SerializeOptions } from 'cookie';

/**
 * Crea un cliente Supabase para Server Components / Route Handlers (App Router).
 *
 * - Es ASYNC: internamente hace `await nextCookies()` para evitar el runtime error
 *   "cookies() should be awaited before using its value".
 * - `customCookieStore` es opcional y puede ser la store ya resuelta o una promesa.
 *
 * Devuelve: { supabase, cookies }.
 */
export async function createSupabaseServerClient(customCookieStore?: any) {
	// Normalizamos: aceptamos una promesa o el objeto resuelto; si no hay custom store,
	// resolvemos nextCookies() de forma segura (await).
	const cookieStore = customCookieStore ? await customCookieStore : await nextCookies();

	// adaptador de métodos que espera @supabase/ssr
	const cookieMethods = {
		get(name?: string) {
			if (!name) return null;
			const c = (cookieStore as any).get?.(name);
			if (!c) return null;
			return { name: c.name, value: c.value };
		},

		getAll() {
			const all: Array<any> = (cookieStore as any).getAll?.() ?? [];
			return all.map((c) => ({ name: c.name, value: c.value }));
		},

		set(name: string, value: string, options?: SerializeOptions) {
			try {
				// Algunas versiones de next/headers aceptan cookieStore.set(name, value, opts)
				// mientras que otras aceptan un objeto; aquí intentamos con la forma objeto.
				const setFn = (cookieStore as any).set;
				if (!setFn) return;

				// Intentar primero con objeto (compatible con next@13+/edge)
				try {
					setFn({
						name,
						value,
						path: options?.path ?? '/',
						httpOnly: options?.httpOnly ?? true,
						sameSite: (options?.sameSite as any) ?? 'lax',
						secure: options?.secure ?? process.env.NODE_ENV === 'production',
						maxAge: options?.maxAge ?? undefined,
					});
				} catch {
					// fallback: intentar forma (name, value, options)
					try {
						setFn(name, value, options);
					} catch {
						// noop
					}
				}
			} catch {
				// noop
			}
		},

		delete(name: string, _options?: SerializeOptions) {
			try {
				(cookieStore as any).delete?.(name);
			} catch {
				// noop
			}
		},
	} as unknown as any;

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !key) {
		throw new Error('Faltan env vars NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
	}

	const supabase = createServerClient(url, key, { cookies: cookieMethods });

	return { supabase, cookies: cookieStore };
}

export default createSupabaseServerClient;
