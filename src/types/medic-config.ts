// types/medic-config.ts
// Tipos compartidos para la configuración del médico

export interface MedicCredentials {
	license: string;
	licenseNumber: string;
	issuedBy: string;
	expirationDate: string;
	credentialFiles: string[];
}

export interface MedicService {
	name: string;
	description: string;
	price: string;
	currency: 'USD' | 'VES' | 'EUR';
}

export interface MedicServiceCombo {
	id: string;
	name: string;
	description: string;
	price: string;
	currency: 'USD' | 'VES' | 'EUR';
	serviceIds: string[]; // IDs de servicios individuales incluidos en el combo
}

export interface Certification {
	name: string;
	issuer: string;
	date: string;
}

export interface CreditHistory {
	university: string;
	degree: string;
	graduationYear: string;
	certifications: Certification[];
}

export interface MedicNotifications {
	whatsapp: boolean;
	email: boolean;
	push: boolean;
}

export interface MedicAvailability {
	[key: string]: unknown;
}

export interface ClinicProfile {
	name: string;
	specialties: string[];
}

export interface MedicUser {
	id: string;
	name: string | null;
	email: string | null;
	organizationId: string | null;
}

export interface PaymentMethod {
	type: 'pago_movil' | 'transferencia' | 'efectivo' | 'tarjeta';
	enabled: boolean;
	data?: {
		cedula?: string;
		rif?: string;
		banco?: string;
		telefono?: string;
		cuenta?: string;
		nombre_titular?: string;
	};
}

export interface MedicConfigData {
	specialty: string | null;
	privateSpecialty: string | null;
	signature: string | null;
	photo: string | null;
	credentials: MedicCredentials;
	creditHistory: CreditHistory;
	availability: MedicAvailability;
	notifications: MedicNotifications;
	services: MedicService[];
	serviceCombos?: MedicServiceCombo[];
	privateSpecialties: string[];
	paymentMethods: PaymentMethod[];
}

export interface MedicConfig {
	user: MedicUser;
	isAffiliated: boolean;
	organizationType: string | null; // 'CLINICA', 'CONSULTORIO', 'HOSPITAL', etc.
	isProfileComplete: boolean; // Indica si el perfil está completo
	clinicProfile: ClinicProfile | null;
	config: MedicConfigData;
}

