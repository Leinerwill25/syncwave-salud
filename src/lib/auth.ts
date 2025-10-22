// src/lib/auth.ts
import prisma from '@/lib/prisma';
import createSupabaseServerClient from '@/app/adapters/server'; // ajusta según tu alias/estructura
import { headers, cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

/**
 * Devuelve organizationId del usuario logueado (Server Component / API route).
 * - Usa createSupabaseServerClient() para leer cookies del request.
 * - Si `verbose` es true, imprime headers y cookies para debug (NO usar en prod).
 */
export async function getCurrentOrganizationId(options?: { verbose?: boolean }): Promise<string | null> {
	try {
		const verbose = options?.verbose ?? false;

		// opcional: imprimir headers/cookies para debug (await porque en tu entorno son Promises)
		if (verbose && process.env.NODE_ENV !== 'production') {
			try {
				const hdrs = await headers();
				const ck = await cookies();

				// headers() y cookies() retornan objetos "lazy" o promesas según versión de Next
				console.log('DEBUG headers cookie header:', hdrs.get?.('cookie') ?? '(no cookie header)');
				try {
					const all = (ck as any).getAll?.() ?? [];
					console.log('DEBUG cookies (count):', Array.isArray(all) ? all.length : '(unknown)', Array.isArray(all) ? all.map((c: any) => ({ name: c.name, hasValue: !!c.value })) : all);
				} catch (err) {
					console.log('DEBUG cookies read error:', err);
				}
			} catch (err) {
				console.log('DEBUG headers/cookies read error:', err);
			}
		}

		// crea cliente supabase server que leerá cookies de next/headers() internamente
		const { supabase } = createSupabaseServerClient();

		// la API de supabase (ssr) devuelve { data: { user }, error }
		const resp = await supabase.auth.getUser();

		// seguridad: imprime la respuesta completa en modo verbose (solo dev)
		if (verbose && process.env.NODE_ENV !== 'production') {
			try {
				console.log('DEBUG supabase.auth.getUser resp:', JSON.stringify(resp, null, 2));
			} catch {
				// ignore stringify errors
			}
		}

		const user = (resp as any)?.data?.user as User | null | undefined;
		const error = (resp as any)?.error ?? null;

		if (error) {
			if (process.env.NODE_ENV !== 'production') console.warn('supabase.auth.getUser error', error);
			return null;
		}

		if (!user?.id) {
			if (process.env.NODE_ENV !== 'production') console.log('No supabase session user found');
			return null;
		}

		// buscar app user por authId (user.id es el authId de supabase)
		const appUser = await prisma.user.findFirst({
			where: { authId: user.id },
			select: { organizationId: true },
		});

		if (!appUser?.organizationId) {
			if (process.env.NODE_ENV !== 'production') {
				console.warn('No app user or organizationId for authId', user.id);
			}
			return null;
		}

		return appUser.organizationId;
	} catch (err) {
		console.error('getCurrentOrganizationId error:', err);
		return null;
	}
}
