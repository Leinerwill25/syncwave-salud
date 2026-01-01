/**
 * Sistema de guardado con debounce para evitar múltiples guardados innecesarios
 */

type SaveFunction = () => Promise<void> | void;

class DebouncedSaveManager {
	private timers: Map<string, NodeJS.Timeout> = new Map();
	private defaultDelay = 2000; // 2 segundos por defecto

	/**
	 * Guarda con debounce
	 */
	save(
		key: string,
		saveFn: SaveFunction,
		delay: number = this.defaultDelay,
		immediate: boolean = false
	) {
		// Si hay un timer pendiente, cancelarlo
		const existingTimer = this.timers.get(key);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Si es inmediato, ejecutar ahora
		if (immediate) {
			saveFn();
			return;
		}

		// Crear nuevo timer
		const timer = setTimeout(async () => {
			await saveFn();
			this.timers.delete(key);
		}, delay);

		this.timers.set(key, timer);
	}

	/**
	 * Cancela un guardado pendiente
	 */
	cancel(key: string) {
		const timer = this.timers.get(key);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(key);
		}
	}

	/**
	 * Fuerza la ejecución inmediata de un guardado pendiente
	 */
	flush(key: string) {
		const timer = this.timers.get(key);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(key);
		}
	}

	/**
	 * Limpia todos los timers
	 */
	clear() {
		for (const timer of this.timers.values()) {
			clearTimeout(timer);
		}
		this.timers.clear();
	}
}

export const debouncedSaveManager = new DebouncedSaveManager();

/**
 * Hook para guardado con debounce
 */
export function useDebouncedSave(
	key: string,
	saveFn: SaveFunction,
	delay: number = 2000
) {
	const save = (immediate: boolean = false) => {
		debouncedSaveManager.save(key, saveFn, delay, immediate);
	};

	const cancel = () => {
		debouncedSaveManager.cancel(key);
	};

	const flush = () => {
		debouncedSaveManager.flush(key);
	};

	return { save, cancel, flush };
}

