'use client';

import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/app/adapters/client';

export default function SessionKeeper() {
	useEffect(() => {
		// Inicializar el cliente Supabase
		let supabase: any;
		try {
			supabase = createSupabaseBrowserClient();
		} catch (err) {
			console.error('[SessionKeeper] Failed to initialize Supabase client:', err);
			return;
		}

		const refreshSession = async () => {
			if (!supabase) return;

			try {
				// 1. Obtener la sesión actual. El SDK de Supabase refresca automáticamente
				// el token de acceso si está expirado o cerca de expirar usando el refresh token.
				const { data: { session }, error } = await supabase.auth.getSession();
				
				if (error) {
					console.error('[SessionKeeper] Error getting session:', error);
					return;
				}
				
				if (session) {
					console.log('[SessionKeeper] Session active. Syncing cookies with server...');
					
					// 2. Sincronizar el token renovado con las cookies del servidor Next.js
					const resp = await fetch('/api/auth/set-session', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							access_token: session.access_token,
							refresh_token: session.refresh_token,
							expires_in: session.expires_in
						}),
						credentials: 'include'
					});

					if (resp.ok) {
						console.log('[SessionKeeper] Session sync successful.');
					} else {
						console.warn('[SessionKeeper] Session sync returned status:', resp.status);
					}
				} else {
					console.log('[SessionKeeper] No active session found.');
				}
			} catch (err) {
				console.error('[SessionKeeper] Sync execution failed:', err);
			}
		};

		// Ejecutar la sincronización inicial inmediatamente al cargar la página
		refreshSession();

		// Programar la sincronización cada 5 minutos (300000 milisegundos)
		// Esto mantiene activa la cookie del servidor Next.js de forma indefinida
		const interval = setInterval(refreshSession, 5 * 60 * 1000);

		return () => clearInterval(interval);
	}, []);

	return null;
}
