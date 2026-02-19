// lib/constants/specialties.ts
// Constantes para especialidades médicas de consultorios privados

export const PRIVATE_SPECIALTIES = [
	'Medicina General',
	'Anestesiología',
	'Cardiología',
	'Cirugía General',
	'Cirugía Plástica',
	'Dermatología',
	'Endocrinología',
	'Fisiatría y Rehabilitación',
	'Gastroenterología',
	'Geriatría',
	'Ginecología',
	'Hematología',
	'Infectología',
	'Medicina Estética',
	'Medicina Familiar',
	'Medicina Interna',
	'Nefrología',
	'Neumología',
	'Neumonología',
	'Neurocirugía',
	'Neurología',
	'Nutrición Clínica',
	'Obstetricia',
	'Odontología',
	'Oftalmología',
	'Oncología',
	'Otorrinolaringología (ORL)',
	'Pediatría',
	'Psiquiatría',
	'Reumatología',
	'Mastología',
	'Traumatología',
	'Traumatología y Ortopedia',
	'Urología'
] as const;

export type PrivateSpecialty = (typeof PRIVATE_SPECIALTIES)[number];

/**
 * Verifica si una especialidad es válida
 */
export function isValidPrivateSpecialty(specialty: string): specialty is PrivateSpecialty {
	return (PRIVATE_SPECIALTIES as readonly string[]).includes(specialty);
}
