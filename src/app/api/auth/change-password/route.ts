// app/api/auth/change-password/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';

async function tryRestoreSessionFromCookies(supabase: any, cookieStore: any): Promise<boolean> {
	if (!cookieStore) return false;

	const cookieCandidates = ['sb-session', 'sb:token', 'supabase-auth-token', 'sb-access-token', 'sb-refresh-token'];

	for (const name of cookieCandidates) {
		try {
			const c = typeof cookieStore.get === 'function' ? cookieStore.get(name) : undefined;
			const raw = c?.value ?? null;
			if (!raw) continue;

			let parsed: any = null;
			try {
				parsed = JSON.parse(raw);
			} catch {
				parsed = null;
			}

			let access_token: string | null = null;
			let refresh_token: string | null = null;

			if (parsed) {
				if (name === 'sb-session') {
					access_token = parsed?.access_token ?? parsed?.session?.access_token ?? parsed?.currentSession?.access_token ?? null;
					refresh_token = parsed?.refresh_token ?? parsed?.session?.refresh_token ?? parsed?.currentSession?.refresh_token ?? null;
					if (!access_token && parsed?.user) {
						access_token = parsed.access_token ?? null;
						refresh_token = parsed.refresh_token ?? null;
					}
				} else {
					access_token = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.current_session?.access_token ?? null;
					refresh_token = parsed?.refresh_token ?? parsed?.currentSession?.refresh_token ?? parsed?.current_session?.refresh_token ?? null;
					if (!access_token && parsed?.currentSession && typeof parsed.currentSession === 'object') {
						access_token = parsed.currentSession.access_token ?? null;
						refresh_token = parsed.currentSession.refresh_token ?? null;
					}
				}
			} else {
				if (name === 'sb-access-token') {
					access_token = raw;
				} else if (name === 'sb-refresh-token') {
					refresh_token = raw;
				}
			}

			if (!access_token && !refresh_token) continue;

			const payload: any = {};
			if (access_token) payload.access_token = access_token;
			if (refresh_token) payload.refresh_token = refresh_token;

			const { data, error } = await supabase.auth.setSession(payload);
			if (error) {
				if (refresh_token && !access_token && error.message.includes('session')) {
					try {
						const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({ refresh_token });
						if (!refreshError && refreshData?.session) {
							return true;
						}
					} catch {
						// ignore
					}
				}
				continue;
			}

			if (data?.session) return true;

			const { data: sessionAfter } = await supabase.auth.getSession();
			if (sessionAfter?.session) return true;
		} catch {
			continue;
		}
	}

	return false;
}

async function getAuthenticatedUser(supabase: any, cookieStore: any) {
  let accessToken: string | null = null;
  try {
    accessToken = cookieStore.get('sb-access-token')?.value ?? null;
  } catch (err) {
    console.debug('[Change Password API] Error reading token:', err);
  }

  let { data: { user }, error } = accessToken ? await supabase.auth.getUser(accessToken) : await supabase.auth.getUser();

  if (!user) {
    const restored = await tryRestoreSessionFromCookies(supabase, cookieStore);
    if (restored) {
      const after = await supabase.auth.getUser();
      user = after.data?.user ?? null;
    }
  }
  return user;
}

function validatePasswordRequest(body: any) {
  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return { error: 'Contraseña actual y nueva contraseña son requeridas', status: 400 };
  }
  if (newPassword.length < 8) {
    return { error: 'La nueva contraseña debe tener al menos 8 caracteres', status: 400 };
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient();

    const user = await getAuthenticatedUser(supabase, cookieStore);
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const validationError = validatePasswordRequest(body);
    if (validationError) {
      return NextResponse.json({ error: validationError.error }, { status: validationError.status });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: body.newPassword });

    if (updateError) {
      console.error('[Change Password API] Error actualizando contraseña:', updateError);
      return NextResponse.json({ error: updateError.message || 'Error al cambiar la contraseña' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err: any) {
    console.error('[Change Password API] Error:', err);
    return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
  }
}

