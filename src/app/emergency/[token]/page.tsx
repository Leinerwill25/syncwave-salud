// app/emergency/[token]/page.tsx
// Página pública para visualizar información crítica del paciente en emergencias
// Acceso directo a Supabase para evitar errores de fetch en producción

import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import EmergencyView from '@/components/emergency/EmergencyView';

// Configuración de Supabase (Usa service role para bypass RLS en página pública)
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

type Props = {
	params: Promise<{ token: string }>;
};

export default async function EmergencyPage({ params }: Props) {
	const { token } = await params;

	if (!token) {
		notFound();
	}

	// 1. Inicializar Supabase directamente en el servidor
	const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false }
	});

	try {
		// 2. Buscar paciente por token QR directamente
		const { data: patient, error: patientError } = await supabase
			.from('patient')
			.select(`
				id, firstName, lastName, identifier, dob, gender, phone, address,
				blood_type, allergies, has_disability, disability,
				has_elderly_conditions, elderly_conditions,
				emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
				advance_directives, emergency_qr_enabled
			`)
			.eq('emergency_qr_token', token)
			.eq('emergency_qr_enabled', true)
			.single();

		if (patientError || !patient) {
			console.error('[Emergency Page] Patient not found or error:', patientError);
			notFound();
		}

		// 3. Obtener datos complementarios (Contacto, Medicinas, Vitals)
		// (Simplificado para asegurar que la página cargue lo vital primero)
		
		const age = patient.dob 
			? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
			: null;

		const emergencyData = {
			patient: {
				id: patient.id,
				firstName: patient.firstName,
				lastName: patient.lastName,
				fullName: `${patient.firstName} ${patient.lastName}`,
				identifier: patient.identifier,
				dob: patient.dob,
				age,
				gender: patient.gender,
				phone: patient.phone,
				address: patient.address,
				bloodType: patient.blood_type,
				allergies: patient.allergies,
				hasDisability: patient.has_disability,
				disability: patient.disability,
				hasElderlyConditions: patient.has_elderly_conditions,
				elderlyConditions: patient.elderly_conditions,
			},
			emergencyContact: {
				name: patient.emergency_contact_name,
				phone: patient.emergency_contact_phone,
				relationship: patient.emergency_contact_relationship,
			},
			activePrescriptions: [], // Se pueden añadir después
			lastVitals: null
		};

		return <EmergencyView data={emergencyData} />;

	} catch (error) {
		console.error('[Emergency Page] Critical Error:', error);
		notFound();
	}
}
