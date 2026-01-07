/**
 * Hook para obtener la preferencia de moneda del usuario
 * Lee desde localStorage y la base de datos
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export function useCurrencyPreference(): {
	preference: string | null;
	loading: boolean;
	refresh: () => Promise<void>;
} {
	const [preference, setPreference] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const loadPreference = async () => {
		try {
			setLoading(true);
			
			// Primero intentar desde localStorage (más rápido)
			const localPreference = localStorage.getItem('currency_preference');
			if (localPreference) {
				setPreference(localPreference);
				setLoading(false);
			}

			// Luego cargar desde la base de datos para asegurar que esté actualizado
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session?.user) {
				// Si no hay sesión, usar localStorage o default
				if (!localPreference) {
					setPreference('USD');
				}
				setLoading(false);
				return;
			}

			const { data: userData, error } = await supabase
				.from('user')
				.select('currency_preference')
				.eq('authId', session.user.id)
				.maybeSingle();

			if (error) {
				console.error('Error cargando preferencia de moneda:', error);
				// Si hay error, usar localStorage o default
				if (!localPreference) {
					setPreference('USD');
				}
				setLoading(false);
				return;
			}

			const dbPreference = userData?.currency_preference || 'USD';
			setPreference(dbPreference);
			
			// Sincronizar localStorage
			if (dbPreference !== localPreference) {
				localStorage.setItem('currency_preference', dbPreference);
			}
		} catch (err) {
			console.error('Error en useCurrencyPreference:', err);
			// En caso de error, usar localStorage o default
			const localPreference = localStorage.getItem('currency_preference');
			setPreference(localPreference || 'USD');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadPreference();

		// Escuchar cambios en la preferencia
		const handlePreferenceChange = (event: CustomEvent) => {
			const newPreference = event.detail?.preference;
			if (newPreference) {
				setPreference(newPreference);
				localStorage.setItem('currency_preference', newPreference);
			}
		};

		window.addEventListener('currencyPreferenceChanged', handlePreferenceChange as EventListener);

		return () => {
			window.removeEventListener('currencyPreferenceChanged', handlePreferenceChange as EventListener);
		};
	}, []);

	return {
		preference,
		loading,
		refresh: loadPreference,
	};
}

