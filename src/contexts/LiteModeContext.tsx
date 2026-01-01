'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface LiteModeContextType {
	isLiteMode: boolean;
	toggleLiteMode: () => Promise<void>;
	loading: boolean;
}

const LiteModeContext = createContext<LiteModeContextType | undefined>(undefined);

export function LiteModeProvider({ children }: { children: React.ReactNode }) {
	const [isLiteMode, setIsLiteMode] = useState(false);
	const [loading, setLoading] = useState(true);

	// Cargar estado inicial desde localStorage y API
	useEffect(() => {
		async function loadLiteMode() {
			try {
				// Primero intentar desde localStorage (para respuesta rápida)
				const localValue = localStorage.getItem('liteMode');
				if (localValue !== null) {
					setIsLiteMode(localValue === 'true');
				}

				// Luego verificar desde la API (fuente de verdad)
				const res = await fetch('/api/medic/config', {
					credentials: 'include',
				});

				if (res.ok) {
					const data = await res.json();
					const apiValue = data.config?.liteMode ?? false;
					setIsLiteMode(apiValue);
					// Sincronizar localStorage
					localStorage.setItem('liteMode', String(apiValue));
				}
			} catch (err) {
				console.error('Error cargando modo lite:', err);
			} finally {
				setLoading(false);
			}
		}

		loadLiteMode();
	}, []);

	const toggleLiteMode = useCallback(async () => {
		const newValue = !isLiteMode;
		
		// Optimistic update
		setIsLiteMode(newValue);
		localStorage.setItem('liteMode', String(newValue));

		try {
			// Guardar en la API
			const res = await fetch('/api/medic/config', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ liteMode: newValue }),
			});

			if (!res.ok) {
				// Revertir si falla
				setIsLiteMode(!newValue);
				localStorage.setItem('liteMode', String(!newValue));
				throw new Error('Error al guardar preferencia');
			}
		} catch (err) {
			console.error('Error guardando modo lite:', err);
			// Revertir en caso de error
			setIsLiteMode(!newValue);
			localStorage.setItem('liteMode', String(!newValue));
		}
	}, [isLiteMode]);

	return (
		<LiteModeContext.Provider value={{ isLiteMode, toggleLiteMode, loading }}>
			{children}
		</LiteModeContext.Provider>
	);
}

export function useLiteMode() {
	const context = useContext(LiteModeContext);
	if (context === undefined) {
		throw new Error('useLiteMode must be used within a LiteModeProvider');
	}
	return context;
}

