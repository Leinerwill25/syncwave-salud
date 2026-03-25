// app/api/emergency/[token]/route.ts
// API pública para obtener datos críticos del paciente usando el token QR de emergencia

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getApiResponseHeaders } from '@/lib/api-cache-utils';

// Esta API es pública, necesita usar service role key para evitar RLS
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export async function GET(req: NextRequest, context: { params: Promise<{ token: string }> }) {
	try {
		const { token } = await context.params;
		if (!token) {
			return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
		}

		// Usar service role key para bypass RLS (esta API es pública)
		const supabase = SUPABASE_SERVICE_ROLE_KEY
			? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
			: null;

		if (!supabase) {
			console.error('[Emergency API] Supabase no configurado');
			return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
		}

		// Buscar paciente por token QR de emergencia
		console.log('[Emergency API] Buscando paciente con token:', token);
		const { data: patient, error: patientError } = await supabase
			.from('patient')
			.select(`
				id,
				firstName,
				lastName,
				identifier,
				dob,
				gender,
				phone,
				address,
				blood_type,
				allergies,
				has_disability,
				disability,
				has_elderly_conditions,
				elderly_conditions,
				emergency_contact_name,
				emergency_contact_phone,
				emergency_contact_relationship,
				advance_directives,
				emergency_qr_enabled
			`)
			.eq('emergency_qr_token', token)
			.eq('emergency_qr_enabled', true)
			.single();

		if (patientError) {
			console.error('[Emergency API] Error consultando paciente:', patientError);
			return NextResponse.json({ error: 'Error al consultar paciente', detail: patientError.message }, { status: 500 });
		}

		if (!patient) {
			console.warn('[Emergency API] Paciente no encontrado para token:', token);
			return NextResponse.json({ error: 'Token inválido o QR deshabilitado' }, { status: 404 });
		}

		// Calcular edad
		const age = patient.dob 
			? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
			: null;

		// Obtener contacto de emergencia de FamilyGroup si no está en el paciente
		let emergencyContact = patient.emergency_contact_name
			? {
				name: patient.emergency_contact_name,
				phone: patient.emergency_contact_phone,
				relationship: patient.emergency_contact_relationship,
			}
			: null;

		if (!emergencyContact) {
			// Intentar obtener desde FamilyGroup
			const { data: familyGroup } = await supabase
				.from('familygroup')
				.select(`
					members:FamilyGroupMember(
						name,
						phone,
						relationship
					)
				`)
				.eq('ownerId', patient.id)
				.maybeSingle();

			if (familyGroup?.members && Array.isArray(familyGroup.members) && familyGroup.members.length > 0) {
				const firstMember = Array.isArray(familyGroup.members[0]) ? familyGroup.members[0][0] : familyGroup.members[0];
				if (firstMember) {
					emergencyContact = {
						name: firstMember.name || null,
						phone: firstMember.phone || null,
						relationship: firstMember.relationship || null,
					};
				}
			}
		}

		// Obtener prescripciones activas (Medicamentos actuales)
		const { data: activePrescriptions } = await supabase
			.from('prescription')
			.select(`
				id,
				issued_at,
				valid_until,
				status,
				prescription_item:prescription_item(
					id,
					name,
					dosage,
					form,
					frequency,
					duration,
					instructions
				)
			`)
			.eq('patient_id', patient.id)
			.eq('status', 'ACTIVE')
			.order('issued_at', { ascending: false })
			.limit(5);

		// Obtener última consulta SOLO para signos vitales (esenciales en emergencia)
		const { data: lastConsultation } = await supabase
			.from('consultation')
			.select(`
				id,
				vitals,
				created_at,
				started_at
			`)
			.eq('patient_id', patient.id)
			.not('vitals', 'is', null)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		// Parsear directivas anticipadas
		let advanceDirectives = null;
		if (patient.advance_directives) {
			try {
				advanceDirectives = typeof patient.advance_directives === 'string'
					? JSON.parse(patient.advance_directives)
					: patient.advance_directives;
			} catch {
				advanceDirectives = null;
			}
		}

		// Parsear vitals
		let vitals = null;
		if (lastConsultation?.vitals) {
			try {
				vitals = typeof lastConsultation.vitals === 'string'
					? JSON.parse(lastConsultation.vitals)
					: lastConsultation.vitals;
			} catch {
				vitals = null;
			}
		}

		// Normalizar prescripciones
		const normalizedPrescriptions = (activePrescriptions || []).map((presc: any) => {
			const items = Array.isArray(presc.prescription_item) 
				? presc.prescription_item 
				: (presc.prescription_item ? [presc.prescription_item] : []);
			
			return {
				id: presc.id,
				issued_at: presc.issued_at,
				valid_until: presc.valid_until,
				medications: items.map((item: any) => ({
					name: item.name,
					dosage: item.dosage,
					form: item.form,
					frequency: item.frequency,
					duration: item.duration,
					instructions: item.instructions,
				})),
			};
		});

		return NextResponse.json({
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
			emergencyContact,
			advanceDirectives,
			lastVitals: vitals ? {
				...vitals,
				recordedAt: lastConsultation?.started_at || lastConsultation?.created_at,
			} : null,
			activePrescriptions: normalizedPrescriptions,
		}, {
			headers: getApiResponseHeaders('dynamic'),
		});
	} catch (err: any) {
		console.error('[Emergency API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

