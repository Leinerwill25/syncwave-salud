/**
 * Sistema de guardado optimista para mejorar la experiencia del usuario
 * incluso con conexiones lentas de internet
 */

export interface SaveOperation {
	id: string;
	type: 'consultation' | 'prescription' | 'order' | 'report' | 'other';
	endpoint: string;
	data: any;
	timestamp: number;
	retries?: number;
}

class OptimisticSaveQueue {
	private queue: SaveOperation[] = [];
	private processing = false;
	private maxRetries = 3;
	private retryDelay = 2000; // 2 segundos

	/**
	 * Agrega una operación a la cola
	 */
	add(operation: Omit<SaveOperation, 'timestamp' | 'id'>): string {
		const id = `${operation.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const op: SaveOperation = {
			...operation,
			id,
			timestamp: Date.now(),
			retries: 0,
		};

		// Guardar en localStorage para persistencia
		this.saveToLocalStorage(op);

		this.queue.push(op);
		this.processQueue();
		return id;
	}

	/**
	 * Procesa la cola de operaciones
	 */
	private async processQueue() {
		if (this.processing || this.queue.length === 0) return;

		this.processing = true;

		while (this.queue.length > 0) {
			const operation = this.queue.shift();
			if (!operation) break;

			try {
				const success = await this.executeOperation(operation);
				if (success) {
					this.removeFromLocalStorage(operation.id);
				} else {
					// Reintentar si no se agotaron los intentos
					if ((operation.retries || 0) < this.maxRetries) {
						operation.retries = (operation.retries || 0) + 1;
						setTimeout(() => {
							this.queue.push(operation);
							this.processQueue();
						}, this.retryDelay * (operation.retries || 1));
					} else {
						console.error(`[OptimisticSave] Failed to save after ${this.maxRetries} retries:`, operation);
						this.removeFromLocalStorage(operation.id);
					}
				}
			} catch (error) {
				console.error('[OptimisticSave] Error processing operation:', error);
				if ((operation.retries || 0) < this.maxRetries) {
					operation.retries = (operation.retries || 0) + 1;
					setTimeout(() => {
						this.queue.push(operation);
						this.processQueue();
					}, this.retryDelay * (operation.retries || 1));
				} else {
					this.removeFromLocalStorage(operation.id);
				}
			}
		}

		this.processing = false;
	}

	/**
	 * Ejecuta una operación de guardado
	 */
	private async executeOperation(operation: SaveOperation): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 segundos timeout

			const response = await fetch(operation.endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(operation.data),
				credentials: 'include',
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return true;
		} catch (error: any) {
			if (error.name === 'AbortError') {
				console.warn(`[OptimisticSave] Request timeout for ${operation.id}`);
			} else {
				console.error(`[OptimisticSave] Error saving ${operation.id}:`, error);
			}
			return false;
		}
	}

	/**
	 * Guarda en localStorage para persistencia
	 */
	private saveToLocalStorage(operation: SaveOperation) {
		try {
			const key = `optimistic-save-${operation.id}`;
			localStorage.setItem(key, JSON.stringify(operation));
		} catch (error) {
			console.warn('[OptimisticSave] Could not save to localStorage:', error);
		}
	}

	/**
	 * Elimina de localStorage
	 */
	private removeFromLocalStorage(id: string) {
		try {
			const key = `optimistic-save-${id}`;
			localStorage.removeItem(key);
		} catch (error) {
			console.warn('[OptimisticSave] Could not remove from localStorage:', error);
		}
	}

	/**
	 * Restaura operaciones pendientes desde localStorage
	 */
	restorePendingOperations() {
		try {
			const keys = Object.keys(localStorage).filter((key) => key.startsWith('optimistic-save-'));
			for (const key of keys) {
				const data = localStorage.getItem(key);
				if (data) {
					try {
						const operation: SaveOperation = JSON.parse(data);
						// Solo restaurar si tiene menos de 1 hora
						if (Date.now() - operation.timestamp < 3600000) {
							this.queue.push(operation);
						} else {
							localStorage.removeItem(key);
						}
					} catch (error) {
						localStorage.removeItem(key);
					}
				}
			}
			if (this.queue.length > 0) {
				this.processQueue();
			}
		} catch (error) {
			console.warn('[OptimisticSave] Could not restore pending operations:', error);
		}
	}
}

// Instancia singleton
export const optimisticSaveQueue = new OptimisticSaveQueue();

/**
 * Hook para guardado optimista
 */
export function useOptimisticSave() {
	const saveOptimistically = async (
		type: SaveOperation['type'],
		endpoint: string,
		data: any,
		onSuccess?: (result: any) => void,
		onError?: (error: Error) => void
	): Promise<{ success: boolean; operationId: string }> => {
		// Agregar a la cola para guardado en background
		const operationId = optimisticSaveQueue.add({
			type,
			endpoint,
			data,
		});

		// Intentar guardado inmediato (pero no bloquear UI)
		const immediateSave = async () => {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos para guardado inmediato

				const response = await fetch(endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(data),
					credentials: 'include',
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				if (response.ok) {
					const result = await response.json().catch(() => ({}));
					// Eliminar de localStorage si existe
					try {
						const key = `optimistic-save-${operationId}`;
						localStorage.removeItem(key);
					} catch {}
					onSuccess?.(result);
					return { success: true, operationId };
				} else {
					throw new Error(`HTTP ${response.status}`);
				}
			} catch (error: any) {
				// Si falla, la cola lo reintentará
				console.warn('[OptimisticSave] Immediate save failed, will retry in background:', error);
				onError?.(error);
				return { success: false, operationId };
			}
		};

		// Ejecutar guardado inmediato sin bloquear
		immediateSave().catch(() => {});

		// Retornar inmediatamente (optimistic)
		return { success: true, operationId };
	};

	return { saveOptimistically };
}

// Restaurar operaciones pendientes al cargar
if (typeof window !== 'undefined') {
	optimisticSaveQueue.restorePendingOperations();
}

