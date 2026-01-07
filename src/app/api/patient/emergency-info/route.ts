// app/api/patient/emergency-info/route.ts
// API para actualizar información de emergencia del paciente (contacto, directivas anticipadas)

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';

/**
 * GET: Obtener información de emergencia del paciente
 */
export async function GET() {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const supabase = await createSupabaseServerClient();

		const { data: patientData, error: fetchError } = await supabase
			.from('patient')
			.select('emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, advance_directives')
			.eq('id', patient.patientId)
			.single();

		if (fetchError) {
			console.error('[Emergency Info API] Error obteniendo información:', fetchError);
			return NextResponse.json({ error: 'Error al obtener información' }, { status: 500 });
		}

		// Parsear directivas anticipadas
		let advanceDirectives = null;
		if (patientData.advance_directives) {
			try {
				advanceDirectives = typeof patientData.advance_directives === 'string'
					? JSON.parse(patientData.advance_directives)
					: patientData.advance_directives;
			} catch {
				advanceDirectives = null;
			}
		}

		return NextResponse.json({
			emergencyContact: {
				name: patientData.emergency_contact_name,
				phone: patientData.emergency_contact_phone,
				relationship: patientData.emergency_contact_relationship,
			},
			advanceDirectives,
		});
	} catch (err: any) {
		console.error('[Emergency Info API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

/**
 * PATCH: Actualizar información de emergencia del paciente
 */
export async function PATCH(req: NextRequest) {
	try {
		const patient = await getAuthenticatedPatient();
		if (!patient) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const body = await req.json();
		const supabase = await createSupabaseServerClient();

		const updateData: any = {};

		// Actualizar contacto de emergencia
		if (body.emergencyContact !== undefined) {
			if (body.emergencyContact.name !== undefined) {
				updateData.emergency_contact_name = body.emergencyContact.name || null;
			}
			if (body.emergencyContact.phone !== undefined) {
				updateData.emergency_contact_phone = body.emergencyContact.phone || null;
			}
			if (body.emergencyContact.relationship !== undefined) {
				updateData.emergency_contact_relationship = body.emergencyContact.relationship || null;
			}
		}

		// Actualizar directivas anticipadas
		if (body.advanceDirectives !== undefined) {
			updateData.advance_directives = body.advanceDirectives 
				? (typeof body.advanceDirectives === 'string' ? body.advanceDirectives : JSON.stringify(body.advanceDirectives))
				: null;
		}

		if (Object.keys(updateData).length === 0) {
			return NextResponse.json({ error: 'No hay datos para actualizar' }, { status: 400 });
		}

		const { error: updateError } = await supabase
			.from('patient')
			.update(updateData)
			.eq('id', patient.patientId);

		if (updateError) {
			console.error('[Emergency Info API] Error actualizando información:', updateError);
			return NextResponse.json({ error: 'Error al actualizar información' }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Información actualizada correctamente' });
	} catch (err: any) {
		console.error('[Emergency Info API] Error:', err);
		return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
	}
}

