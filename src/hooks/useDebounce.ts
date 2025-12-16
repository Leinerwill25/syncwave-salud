// Hook reutilizable para debounce optimizado para conexiones lentas
import { useEffect, useState } from 'react';

/**
 * Hook de debounce optimizado para conexiones lentas
 * @param value - Valor a debounce
 * @param delay - Delay en milisegundos (por defecto 600ms para conexiones lentas)
 * @returns Valor debounced
 */
export function useDebounce<T>(value: T, delay: number = 600): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		// Set timeout para actualizar el valor después del delay
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		// Cleanup: cancelar el timeout si el valor cambia antes del delay
		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

