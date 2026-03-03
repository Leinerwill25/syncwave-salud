import * as z from 'zod';

export const unregisteredPatientSchema = z.object({
	// Personal Info
	firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
	lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
	identification: z.string().optional(),
	birthDate: z.string().optional(), // Expected YYYY-MM-DD
	sex: z.enum(['M', 'F', 'OTHER']).optional(),
	profession: z.string().optional(),

	// Contact Info
	phone: z.string().min(5, 'El teléfono es requerido y debe ser válido'),
	email: z.string().email('Email inválido').optional().or(z.literal('')),
	address: z.string().optional(),

	// Reasons and Triage
	motive: z.string().optional(),
	painScale: z.number().min(0).max(10).optional(),

	// Vitals
	vitalBpSystolic: z.number().min(0).optional(),
	vitalBpDiastolic: z.number().min(0).optional(),
	vitalHeartRate: z.number().min(0).optional(),
	vitalRespiratoryRate: z.number().min(0).optional(),
	vitalTemperature: z.number().min(30).max(45).optional(),
	vitalSpo2: z.number().min(0).max(100).optional(),
	vitalGlucose: z.number().min(0).optional(),

	// Anthropometry & Medical History
	heightCm: z.number().min(0).optional(),
	weightKg: z.number().min(0).optional(),
	allergies: z.array(z.string()).optional(),
	chronicConditions: z.array(z.string()).optional(),
	currentMedication: z.array(z.string()).optional(),
	familyHistory: z.array(z.string()).optional(),

	// Emergency Contact
	emergencyContactName: z.string().optional(),
	emergencyContactPhone: z.string().optional(),
	emergencyContactRelation: z.string().optional(),
});

export type UnregisteredPatientFormValues = z.infer<typeof unregisteredPatientSchema>;
