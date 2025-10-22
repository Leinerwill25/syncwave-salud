// src/app/adapters/server.ts
import { cookies as nextCookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

type NextCookieLike = {
	name: string;
	value: string;
	path?: string;
	domain?: string;
	expires?: string | Date | null;
	httpOnly?: boolean;
	sameSite?: 'lax' | 'strict' | 'none';
	secure?: boolean;
};

export async function createSupabaseServerClient() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

	if (!supabaseUrl || !supabaseKey) {
		throw new Error('Faltan env vars NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
	}

	// IMPORTANT: await cookies() because it's a dynamic API in Next.js routes
	const nextCookieStore = await nextCookies();

	// Adapter que expone la API legacy (get/set/delete) y la nueva (getAll/setAll)
	const cookieAdapter = {
		// legacy get
		get: (name: string) => {
			try {
				const c = (nextCookieStore as any).get?.(name);
				return c?.value ?? null;
			} catch {
				return null;
			}
		},

		// legacy set (name, value, attrs)
		set: (name: string, value: string, attrs?: Partial<NextCookieLike>) => {
			try {
				(nextCookieStore as any).set?.({
					name,
					value,
					path: attrs?.path ?? '/',
					domain: attrs?.domain,
					expires: attrs?.expires,
					httpOnly: attrs?.httpOnly ?? true,
					sameSite: (attrs?.sameSite as any) ?? 'lax',
					secure: typeof attrs?.secure === 'boolean' ? attrs!.secure : process.env.NODE_ENV === 'production',
				});
			} catch {
				// ignore
			}
		},

		// legacy delete
		delete: (name: string) => {
			try {
				(nextCookieStore as any).delete?.(name);
			} catch {
				// ignore
			}
		},

		// new API: getAll -> array de cookies
		getAll: (): NextCookieLike[] => {
			try {
				const all = (nextCookieStore as any).getAll?.() ?? [];
				return (all ?? []).map((c: any) => ({
					name: c.name,
					value: c.value,
					path: c.path,
					domain: c.domain,
					expires: c.expires,
					httpOnly: c.httpOnly,
					sameSite: c.sameSite,
					secure: c.secure,
				}));
			} catch {
				return [];
			}
		},

		// new API: setAll recibe array de cookies
		setAll: (cookArr: NextCookieLike[]) => {
			try {
				if (!Array.isArray(cookArr)) return;
				cookArr.forEach((c) => {
					try {
						(nextCookieStore as any).set?.({
							name: c.name,
							value: c.value,
							path: c.path ?? '/',
							domain: c.domain,
							expires: c.expires,
							httpOnly: c.httpOnly ?? true,
							sameSite: (c.sameSite as any) ?? 'lax',
							secure: typeof c.secure === 'boolean' ? c.secure : process.env.NODE_ENV === 'production',
						});
					} catch {
						// ignore per-cookie errors
					}
				});
			} catch {
				// ignore
			}
		},
	};

	// Llamada con la firma (supabaseUrl, supabaseKey, options) que puede esperar tu versión de @supabase/ssr
	const supabase = createServerClient(supabaseUrl, supabaseKey, {
		cookies: cookieAdapter as any,
	});

	return { supabase, cookies: nextCookieStore };
}

export default createSupabaseServerClient;
