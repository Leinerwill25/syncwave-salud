// lib/safe-json-parse.ts
// Utilidad para parsear campos JSON de forma segura

/**
 * Parsea un campo que puede ser JSON, array, string o null
 * Maneja casos donde el valor no es JSON válido
 */
export function safeParseJsonField(field: any, defaultValue: any = []): any {
	if (field === null || field === undefined) {
		return defaultValue;
	}

	// Si ya es un array, retornarlo
	if (Array.isArray(field)) {
		return field;
	}

	// Si es un objeto, retornarlo
	if (typeof field === 'object' && field !== null) {
		return field;
	}

	// Si es un string, intentar parsearlo
	if (typeof field === 'string') {
		// Si está vacío, retornar valor por defecto
		if (field.trim() === '') {
			return defaultValue;
		}

		// Intentar parsear como JSON
		try {
			const parsed = JSON.parse(field);
			// Si el resultado es un array u objeto, retornarlo
			if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null)) {
				return parsed;
			}
			// Si es un valor primitivo, retornarlo en un array
			return [parsed];
		} catch {
			// Si no es JSON válido, puede ser un string simple
			// Para opening_hours, intentar parsear formatos comunes
			if (field.includes('-') && field.includes(':')) {
				// Formato como "Lun-Vie 08:00-17:00"
				// Retornar como string en el valor por defecto o intentar estructurarlo
				return defaultValue;
			}
			// Para otros casos, retornar valor por defecto
			return defaultValue;
		}
	}

	return defaultValue;
}

/**
 * Parsea específicamente opening_hours que puede tener formatos variados
 */
export function parseOpeningHours(hours: any): any[] {
	if (!hours) return [];

	if (Array.isArray(hours)) {
		return hours;
	}

	if (typeof hours === 'object' && hours !== null) {
		return [hours];
	}

	if (typeof hours === 'string') {
		if (hours.trim() === '') return [];

		try {
			const parsed = JSON.parse(hours);
			return Array.isArray(parsed) ? parsed : [parsed];
		} catch {
			// Si no es JSON, puede ser un string descriptivo
			// Intentar extraer información si es posible
			// Por ahora, retornar array vacío para evitar errores
			return [];
		}
	}

	return [];
}

/**
 * Parsea específicamente specialties
 */
export function parseSpecialties(specialties: any): any[] {
	if (!specialties) return [];

	if (Array.isArray(specialties)) {
		return specialties;
	}

	if (typeof specialties === 'object' && specialties !== null) {
		return [specialties];
	}

	if (typeof specialties === 'string') {
		if (specialties.trim() === '') return [];

		try {
			const parsed = JSON.parse(specialties);
			return Array.isArray(parsed) ? parsed : [parsed];
		} catch {
			// Si no es JSON válido, puede ser una lista separada por comas
			if (specialties.includes(',')) {
				return specialties.split(',').map(s => s.trim()).filter(s => s.length > 0);
			}
			// Si es un string simple, retornarlo como array con un elemento
			return [specialties];
		}
	}

	return [];
}

