// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

/**
 * Intenta consultar la tabla User probando varias formas del identificador
 * porque PostgREST / Supabase puede exponerla con diferente case/format.
 */
async function queryUserByAuthId(supabase: any, authId: string) {
	const candidates = [
		'User', // común en PostgREST cuando tabla se registró sin comillas
		'user', // lowercase
		'"User"', // el identificador con comillas (si se creó exactamente así)
		'public.User', // con esquema (a veces sirve)
		'public."User"',
	];

	let lastError: any = null;

	for (const name of candidates) {
		try {
			const { data, error } = await supabase.from(name).select('id, organizationId').eq('authId', authId).limit(1).single();

			if (error) {
				// Si hubo un error que no sea "tabla no encontrada", retornamos ese error
				// pero guardamos el último por si necesitamos reportarlo después
				lastError = error;
				// PGRST205 = table not found in schema cache -> probamos siguiente candidato
				if (String(error?.code) === 'PGRST205' || String(error?.message).includes('Could not find the table')) {
					// intentar siguiente candidato
					continue;
				}
				// otro error (p. ej. permiso, constraint) -> retornarlo
				return { data: null, error, usedName: name };
			}

			// Si llegamos aquí y tenemos data => éxito
			if (data) {
				return { data, error: null, usedName: name };
			}

			// Si no hay data pero tampoco error, continuamos (aunque improbable)
			lastError = { message: 'No data returned and no error', code: 'NO_DATA' };
		} catch (err: any) {
			lastError = err;
			// si excepciones inesperadas, probamos siguiente
			continue;
		}
	}

	// si agotamos candidatos devolvemos el último error observado
	return { data: null, error: lastError ?? { message: 'Table not found' }, usedName: null };
}

export async function GET(request: Request) {
	try {
		const supabase = await createSupabaseServerClient();

		// Intento primario: obtener usuario por cookie (session)
		const { data: authData, error: authError } = await supabase.auth.getUser();

		let userIdFromAuth: string | null = null;

		if (authError || !authData?.user) {
			// Fallback: usar Authorization Bearer <token> si existe
			const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
			const maybeToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

			if (!maybeToken) {
				console.warn('[Auth] No session cookie and no Bearer token present.');
				return NextResponse.json({ error: 'No authenticated session (AuthSessionMissing).' }, { status: 401 });
			}

			// Validar token con Supabase
			const { data: authData2, error: authError2 } = await supabase.auth.getUser(maybeToken);
			if (authError2 || !authData2?.user) {
				console.warn('[Auth] getUser con token falló:', authError2 ?? 'no user');
				return NextResponse.json({ error: 'No authenticated session (AuthSessionMissing).' }, { status: 401 });
			}
			userIdFromAuth = authData2.user.id;
		} else {
			userIdFromAuth = authData.user.id;
		}

		if (!userIdFromAuth) {
			return NextResponse.json({ error: 'No authenticated user id' }, { status: 401 });
		}

		// Intentar consultar la tabla User probando varios identificadores
		const result = await queryUserByAuthId(supabase, userIdFromAuth);

		if (result.error || !result.data) {
			console.warn('[Auth] Error consultando tabla User (intentos):', result.error);
			// Si el error es PGRST205, sugerimos al dev la forma probable
			const hint = String(result.error?.code) === 'PGRST205' ? 'La tabla "User" no está en la cache de PostgREST con ese identificador. Prueba referenciarla como "User" sin comillas o renombrar la tabla a minúsculas (user).' : undefined;

			return NextResponse.json(
				{
					error: 'User not found in database',
					details: result.error ? { message: result.error?.message, code: result.error?.code } : undefined,
					hint,
				},
				{ status: 404 }
			);
		}

		const { id, organizationId } = result.data as { id: string; organizationId: string | null };

		// opcional: incluir qué nombre de tabla funcionó (útil en dev)
		return NextResponse.json({ id, organizationId, usedTable: result.usedName }, { status: 200 });
	} catch (err: any) {
		console.error('[Auth] Error inesperado en /api/auth/me:', err);
		return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 });
	}
}
