/**
 * Utilidades para optimizar consultas y comportamiento cuando Versión Lite está activa
 */

/**
 * Obtiene los campos mínimos necesarios para una consulta optimizada
 */
export function getLiteSelectFields(table: string, isLiteMode: boolean): string {
	if (!isLiteMode) {
		return '*';
	}

	// Campos mínimos por tabla para Versión Lite
	const liteFields: Record<string, string> = {
		// Pacientes - solo campos esenciales
		patient: 'id, name, email, phone, date_of_birth, gender, created_at',
		
		// Consultas - solo campos esenciales (NO tiene campo status)
		consultation: 'id, patient_id, doctor_id, started_at, created_at, chief_complaint',
		
		// Citas - solo campos esenciales
		appointment: 'id, patient_id, unregistered_patient_id, doctor_id, scheduled_at, status, reason, created_at',
		
		// Facturación - solo campos esenciales
		facturacion: 'id, doctor_id, total, currency, estado_pago, fecha_pago, fecha_emision, created_at',
		
		// Recetas - solo campos esenciales
		prescription: 'id, consultation_id, patient_id, doctor_id, created_at, status',
		
		// Mensajes - solo campos esenciales
		message: 'id, sender_id, receiver_id, content, created_at, read_at',
	};

	return liteFields[table] || '*';
}

/**
 * Limita el número de resultados cuando liteMode está activo
 */
export function getLiteLimit(isLiteMode: boolean, defaultLimit: number = 50): number {
	return isLiteMode ? Math.min(defaultLimit, 20) : defaultLimit;
}

/**
 * Desactiva relaciones complejas cuando liteMode está activo
 */
export function shouldIncludeRelations(isLiteMode: boolean): boolean {
	return !isLiteMode;
}

/**
 * Configuración de paginación optimizada para liteMode
 */
export function getLitePagination(isLiteMode: boolean, page: number = 1, pageSize: number = 20) {
	const optimizedPageSize = isLiteMode ? Math.min(pageSize, 15) : pageSize;
	return {
		page,
		pageSize: optimizedPageSize,
		offset: (page - 1) * optimizedPageSize,
		limit: optimizedPageSize,
	};
}

/**
 * Reduce animaciones cuando liteMode está activo
 */
export function getLiteAnimation(isLiteMode: boolean) {
	if (isLiteMode) {
		return {
			initial: { opacity: 1 },
			animate: { opacity: 1 },
			exit: { opacity: 1 },
			transition: { duration: 0 },
		};
	}
	return {
		initial: { opacity: 0, y: 10 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -10 },
		transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }, // easeOut cubic bezier
	};
}

/**
 * Configuración de caché optimizada para liteMode
 * Optimizado para tiempos de respuesta < 1 segundo
 */
export function getLiteCacheConfig(isLiteMode: boolean) {
	return {
		// Aumentar tiempo de revalidación para reducir carga en base de datos
		revalidate: isLiteMode ? 180 : 120, // 3 minutos en lite mode, 2 minutos normal
		cache: 'default' as const,
	};
}

/**
 * Optimiza las opciones de consulta de Supabase cuando liteMode está activo
 * NOTA: Si ya se especificó un select con relaciones, NO lo sobrescribe
 */
export function optimizeSupabaseQuery<T>(
	query: any,
	isLiteMode: boolean,
	table: string,
	options?: {
		limit?: number;
		select?: string;
		includeRelations?: boolean;
	}
) {
	if (!isLiteMode) {
		return query;
	}

	// Aplicar límite reducido solo si se especifica
	if (options?.limit) {
		query = query.limit(Math.min(options.limit, 20));
	}

	// Solo aplicar select si se especifica explícitamente y no hay relaciones ya incluidas
	// Si el select ya tiene relaciones (contiene ':' o '('), no lo sobrescribimos
	if (options?.select) {
		// Verificar si el select actual ya tiene relaciones
		const currentSelect = (query as any).selectValue || '';
		if (!currentSelect.includes(':') && !currentSelect.includes('(')) {
			query = query.select(options.select);
		}
	} else {
		// Solo aplicar liteSelect si no hay relaciones ya incluidas
		const currentSelect = (query as any).selectValue || '';
		if (!currentSelect.includes(':') && !currentSelect.includes('(')) {
			const liteSelect = getLiteSelectFields(table, true);
			if (liteSelect !== '*') {
				query = query.select(liteSelect);
			}
		}
	}

	return query;
}

/**
 * Optimiza operaciones de escritura cuando liteMode está activo
 * - Usa batch operations cuando sea posible
 * - Evita validaciones innecesarias
 * - Reduce el tamaño de los datos enviados
 */
export function optimizeWriteOperation<T>(
	data: T | T[],
	isLiteMode: boolean,
	options?: {
		stripFields?: string[]; // Campos a eliminar en liteMode
		batchSize?: number; // Tamaño del batch para operaciones múltiples
	}
): T | T[] {
	if (!isLiteMode) {
		return data;
	}

	// Si hay campos a eliminar, procesarlos
	if (options?.stripFields && options.stripFields.length > 0) {
		const stripFields = (obj: any): any => {
			if (Array.isArray(obj)) {
				return obj.map(stripFields);
			}
			if (obj && typeof obj === 'object') {
				const stripped: any = {};
				for (const [key, value] of Object.entries(obj)) {
					if (!options.stripFields!.includes(key)) {
						stripped[key] = typeof value === 'object' && value !== null ? stripFields(value) : value;
					}
				}
				return stripped;
			}
			return obj;
		};
		return stripFields(data);
	}

	return data;
}

/**
 * Configuración de timeout optimizada para liteMode
 */
export function getLiteTimeout(isLiteMode: boolean): number {
	return isLiteMode ? 5000 : 10000; // 5 segundos en lite mode, 10 segundos normal
}

