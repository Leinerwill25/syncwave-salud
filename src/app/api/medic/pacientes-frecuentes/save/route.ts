// app/api/medic/pacientes-frecuentes/save/route.ts
// API para guardar pacientes extraídos en la tabla unregisteredpatients

import { NextRequest, NextResponse } from 'next/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

interface PatientToSave {
	first_name: string;
	last_name: string;
	identification: string;
	email: string;
	phone?: string;
}

export async function POST(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const supabase = await createSupabaseServerClient();

		const body = await req.json();
		const { patients } = body;

		if (!Array.isArray(patients) || patients.length === 0) {
			return NextResponse.json({ error: 'No se proporcionaron pacientes para guardar' }, { status: 400 });
		}

		// Obtener el medic_profile.id para usar como created_by
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('id')
			.eq('doctor_id', user.userId)
			.maybeSingle();

		if (profileError || !medicProfile) {
			console.error('[Save Patients API] Error obteniendo medic_profile:', profileError);
			// Continuar sin created_by si no se encuentra
		}

		const createdBy = medicProfile?.id || null;

		// Validar y preparar pacientes para insertar
		const patientsToInsert: any[] = [];
		const errors: string[] = [];

		for (const patient of patients as PatientToSave[]) {
			// Validaciones básicas
			if (!patient.first_name && !patient.last_name) {
				errors.push(`Paciente sin nombre: ${JSON.stringify(patient)}`);
				continue;
			}

			// Verificar si ya existe un paciente con la misma cédula (en Patient o unregisteredpatients)
			if (patient.identification) {
				// Verificar en Patient
				const { data: existingPatient } = await supabase
					.from('patient')
					.select('id')
					.eq('identifier', patient.identification)
					.maybeSingle();

				if (existingPatient) {
					errors.push(`Paciente con cédula ${patient.identification} ya existe en pacientes registrados`);
					continue;
				}

				// Verificar en unregisteredpatients (solo del mismo doctor/organización)
				const { data: existingUnregistered } = await supabase
					.from('unregisteredpatients')
					.select('id')
					.eq('identification', patient.identification)
					.eq('created_by', createdBy)
					.maybeSingle();

				if (existingUnregistered) {
					errors.push(`Paciente con cédula ${patient.identification} ya existe en tus pacientes no registrados`);
					continue;
				}
			}

			patientsToInsert.push({
				first_name: patient.first_name || '',
				last_name: patient.last_name || '',
				identification: patient.identification || null,
				email: patient.email || null,
				phone: patient.phone || 'N/A', // phone es NOT NULL en la BD
				created_by: createdBy,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			});
		}

		if (patientsToInsert.length === 0) {
			return NextResponse.json(
				{
					error: 'No se pudo guardar ningún paciente. Todos ya existen o tienen datos inválidos.',
					errors,
				},
				{ status: 400 }
			);
		}

		// Insertar pacientes
		const { data: insertedPatients, error: insertError } = await supabase
			.from('unregisteredpatients')
			.insert(patientsToInsert)
			.select('id');

		if (insertError) {
			console.error('[Save Patients API] Error insertando pacientes:', insertError);
			return NextResponse.json({ error: 'Error al guardar pacientes: ' + insertError.message }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			saved: insertedPatients?.length || 0,
			total: patients.length,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error: any) {
		console.error('[Save Patients API] Error:', error);
		return NextResponse.json({ error: error.message || 'Error al guardar pacientes' }, { status: 500 });
	}
}

