// src/app/dashboard/clinic/specialists/page.tsx
import { Buffer } from 'buffer';
import createSupabaseServerClient from '@/app/adapters/server';
import SpecialistsInvitesList from '@/components/SpecialistsInvitesList';

/**
 * Decodifica payload de un JWT
 */
function decodeJwtPayload(token: string) {
	try {
		const parts = token.split('.');
		if (parts.length < 2) return null;
		const payload = parts[1];
		const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
		const json = Buffer.from(b64, 'base64').toString('utf-8');
		return JSON.parse(json);
	} catch (e) {
		return null;
	}
}

export default async function EspecialistasPage() {
	const supabase = await createSupabaseServerClient();

	// 1) Intentamos reconstruir la session desde supabase.auth
	const { data: sessionResp, error: sessionErr } = await supabase.auth.getSession();
	if (sessionErr) console.debug('supabase.auth.getSession error:', sessionErr);

	let authUser: { id: string; email?: string } | null = sessionResp?.session?.user ?? null;

	// 2) Fallback: supabase.auth.getUser()
	if (!authUser) {
		const { data: userResp, error: userErr } = await supabase.auth.getUser();
		if (userErr) console.debug('supabase.auth.getUser error:', userErr);
		else if (userResp?.user) authUser = userResp.user;
	}

	// 3) Último recurso: leer cookie sb-access-token directamente
	if (!authUser) {
		try {
			const { cookies: cookiesFn } = await import('next/headers'); // import dinámico
			// cookies() puede ser async en tus tipos, por eso hacemos await aquí.
			const cookieStore = await cookiesFn(); // ahora sí es ReadonlyRequestCookies

			// Listado de posibles cookies de token
			const cookieCandidates = ['sb-access-token', 'sb:token', 'supabase-auth-token', 'supabase-token', 'supabase-auth'];

			let tokenVal: string | null = null;

			for (const name of cookieCandidates) {
				const c = cookieStore.get(name);
				if (c?.value) {
					tokenVal = c.value;
					break;
				}
			}

			if (tokenVal) {
				let jwt: string | null = null;
				try {
					if (tokenVal.startsWith('{') || tokenVal.startsWith('"')) {
						const parsed = JSON.parse(tokenVal);
						jwt = parsed?.currentSession?.access_token ?? parsed?.access_token ?? null;
					} else {
						jwt = tokenVal;
					}
				} catch {
					jwt = tokenVal;
				}

				if (jwt) {
					const payload = decodeJwtPayload(jwt);
					if (payload?.sub) {
						authUser = { id: String(payload.sub), email: payload?.email ?? undefined };
						console.debug('Extracted authUser from cookie JWT:', authUser.id);
					}
				}
			} else {
				console.debug('No token cookie found among candidates:', cookieCandidates.join(', '));
			}
		} catch (e) {
			console.debug('Error reading cookie fallback:', e);
		}
	}

	// Si aún no tenemos authUser, mostramos mensaje
	if (!authUser) {
		return (
			<main className="max-w-4xl mx-auto p-6">
				<h1 className="text-xl font-semibold mb-2">No se pudo determinar el usuario autenticado</h1>
				<p className="text-sm text-slate-600 mb-4">Esto puede ocurrir si las cookies de sesión no están disponibles o si Supabase no puede leerlas.</p>
				<div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
					Recomendaciones rápidas:
					<ul className="mt-2 ml-4 list-disc">
						<li>
							Verifica que las cookies <code>sb-access-token</code> / <code>sb-refresh-token</code> están presentes.
						</li>
						<li>
							Asegúrate que las variables <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> sean correctas.
						</li>
						<li>Reinicia el servidor dev después de cambios en el adapter.</li>
					</ul>
				</div>
			</main>
		);
	}

	const authId = authUser.id;

	// Buscar fila local en tabla User
	const { data: me, error: meErr } = await supabase.from('users').select('id, organizationId').eq('authId', authId).single();

	if (meErr || !me) {
		console.error('Error fetching local User by authId OR user not found:', meErr);
		return (
			<main className="max-w-4xl mx-auto p-6">
				<h1 className="text-xl font-semibold mb-2">Usuario no mapeado a una cuenta local</h1>
				<p className="text-sm text-slate-600">
					Se detectó un usuario autenticado en Auth pero no existe una fila en la tabla <code>User</code> con <code>authId</code> = {authId}
				</p>
			</main>
		);
	}

	const organizationId: string | null = me.organizationId ?? null;
	if (!organizationId) {
		return (
			<main className="max-w-4xl mx-auto p-6">
				<h1 className="text-xl font-semibold mb-2">Usuario sin organización</h1>
				<p className="text-sm text-slate-600">Tu cuenta no está asociada a una organización en la tabla User.</p>
			</main>
		);
	}

	// Traer invitaciones
	const { data: invites, error: invitesErr } = await supabase.from('invite').select('id, email, token, role, invitedById, used, expiresAt, createdAt').eq('organizationId', organizationId).not('email', 'is', null).order('createdAt', { ascending: false });

	if (invitesErr) console.error('Error fetching invites:', invitesErr);

	return (
		<main className="max-w-5xl mx-auto p-6">
			<header className="mb-6">
				<h1 className="text-2xl font-semibold">Invitaciones a Especialistas</h1>
				<p className="text-sm text-slate-500">Aquí puedes ver invitaciones asignadas a emails, cancelar o suspender cuentas.</p>
			</header>

			<section>
				<SpecialistsInvitesList invites={invites ?? []} organizationId={organizationId} />
			</section>
		</main>
	);
}
