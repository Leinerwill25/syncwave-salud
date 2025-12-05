// src/app/adapters/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
	const cookieStore = await cookies();

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !key) {
		console.error('[Adapter] Missing Supabase env vars:', { url: !!url, key: !!key });
	}

	const client = createServerClient(
		url!,
		key!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) => {
							cookieStore.set(name, value, {
								...options,
								maxAge: 3153600000, // 100 años
							});
						});
					} catch {
						// The `setAll` method was called from a Server Component.
					}
				},
			},
		}
	);

	if (!client?.auth) {
		console.error('[Adapter] createServerClient returned client without auth!', client);
	}

	return client;
}

export default createSupabaseServerClient;
