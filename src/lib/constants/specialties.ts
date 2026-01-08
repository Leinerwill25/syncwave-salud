// lib/constants/specialties.ts
// Constantes para especialidades médicas de consultorios privados

export const PRIVATE_SPECIALTIES = ['Medicina General', 'Endocrino', 'Cardiología', 'Ginecología', 'Obstetricia', 'Oftalmología', 'Odontología', 'Neurología', 'Pediatría', 'Psiquiatría'] as const;

export type PrivateSpecialty = (typeof PRIVATE_SPECIALTIES)[number];

/**
 * Verifica si una especialidad es válida
 */
export function isValidPrivateSpecialty(specialty: string): specialty is PrivateSpecialty {
	return (PRIVATE_SPECIALTIES as readonly string[]).includes(specialty);
}
