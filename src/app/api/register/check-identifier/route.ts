// app/api/register/check-identifier/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente de Supabase Admin para acceder a todas las tablas
const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
	? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
	  })
	: null;

export async function GET(req: NextRequest) {
	try {
		const identifier = req.nextUrl.searchParams.get('identifier')?.trim();
		
		if (!identifier || identifier.length < 3) {
			return NextResponse.json({ 
				canRegister: false, 
				reason: 'invalid',
				message: 'La cédula debe tener al menos 3 caracteres' 
			}, { status: 400 });
		}

		if (!supabaseAdmin) {
			console.warn('[Check Identifier] Supabase Admin no disponible');
			return NextResponse.json({ 
				canRegister: false, 
				reason: 'error',
				message: 'Error de configuración del servidor' 
			}, { status: 500 });
		}

		// Verificar en pacientes registrados usando Supabase (tabla Patient según Database.sql)
		const { data: existingRegistered, error: registeredError } = await supabaseAdmin
			.from('patient')
			.select('id, identifier')
			.eq('identifier', identifier)
			.maybeSingle();

		if (registeredError && registeredError.code !== 'PGRST116') { // PGRST116 = no rows returned
			console.error('[Check Identifier] Error verificando en Patient:', registeredError);
		}

		if (existingRegistered) {
			return NextResponse.json({ 
				canRegister: false, 
				reason: 'already_registered',
				message: 'Esta cédula ya está registrada en el sistema. Si es tu cédula, intenta iniciar sesión.' 
			}, { status: 200 });
		}

		// Verificar en pacientes no registrados usando Supabase Admin
		const { data: existingUnregistered, error: unregisteredError } = await supabaseAdmin
			.from('unregisteredpatients')
			.select('id, first_name, last_name, identification')
			.eq('identification', identifier)
			.maybeSingle();

		if (unregisteredError) {
			console.error('[Check Identifier] Error verificando en unregisteredpatients:', unregisteredError);
			// Si hay error, permitir el registro pero no informar sobre historial
			return NextResponse.json({ 
				canRegister: true, 
				hasHistory: false,
				message: null 
			}, { status: 200 });
		}

		if (existingUnregistered) {
			// Existe en unregisteredpatients y NO en Patient -> puede registrarse y se vinculará
			return NextResponse.json({ 
				canRegister: true, 
				hasHistory: true,
				unregisteredPatientId: existingUnregistered.id,
				patientName: `${existingUnregistered.first_name || ''} ${existingUnregistered.last_name || ''}`.trim(),
				message: 'Se encontró un historial médico previo asociado a esta cédula. Al registrarte, podrás acceder a todas tus consultas anteriores.'
			}, { status: 200 });
		}

		// No existe en ninguna tabla -> puede registrarse sin historial
		return NextResponse.json({ 
			canRegister: true, 
			hasHistory: false,
			message: null 
		}, { status: 200 });

	} catch (error: any) {
		console.error('[Check Identifier] Error:', error);
		return NextResponse.json({ 
			canRegister: false, 
			reason: 'error',
			message: 'Error al verificar la cédula. Por favor, intenta nuevamente.' 
		}, { status: 500 });
	}
}

