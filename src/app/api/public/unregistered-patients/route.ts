// app/api/public/unregistered-patients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Cliente Supabase con service_role para operaciones públicas
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: { persistSession: false },
});

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		const {
			first_name,
			last_name,
			identification,
			birth_date,
			sex,
			phone,
			email,
			address,
		} = body;

		if (!first_name || !last_name || !phone) {
			return NextResponse.json(
				{ error: 'first_name, last_name y phone son obligatorios' },
				{ status: 400 }
			);
		}

		// Validar que la cédula de identidad sea única (si se proporciona)
		if (identification) {
			// Verificar en pacientes registrados
			const { data: existingRegistered, error: registeredCheckError } = await supabaseAdmin
				.from('patient')
				.select('id, identifier')
				.eq('identifier', identification.trim())
				.maybeSingle();

			if (registeredCheckError) {
				console.error('Error verificando cédula en Patient:', registeredCheckError);
				return NextResponse.json(
					{ error: 'Error al verificar la cédula de identidad' },
					{ status: 500 }
				);
			}

			if (existingRegistered) {
				return NextResponse.json(
					{
						error: `La cédula de identidad "${identification}" ya está registrada para un paciente en el sistema. Por favor, busca al paciente en la lista de pacientes registrados.`,
						existingPatientId: existingRegistered.id,
					},
					{ status: 409 }
				);
			}

			// Verificar en pacientes no registrados
			const { data: existingUnregistered, error: unregisteredCheckError } = await supabaseAdmin
				.from('unregisteredpatients')
				.select('id, identification')
				.eq('identification', identification.trim())
				.maybeSingle();

			if (unregisteredCheckError) {
				console.error('Error verificando cédula en unregisteredpatients:', unregisteredCheckError);
				return NextResponse.json(
					{ error: 'Error al verificar la cédula de identidad' },
					{ status: 500 }
				);
			}

			if (existingUnregistered) {
				return NextResponse.json(
					{
						error: `La cédula de identidad "${identification}" ya está registrada. Por favor, busca al paciente en la lista de pacientes no registrados.`,
						existingPatientId: existingUnregistered.id,
					},
					{ status: 409 }
				);
			}
		}

		// Crear paciente no registrado sin requerir autenticación (para uso público)
		const insertData: any = {
			first_name,
			last_name,
			phone,
			identification: identification || null,
			birth_date: birth_date || null,
			sex: sex || null,
			email: email || null,
			address: address || null,
			created_by: null, // No hay usuario autenticado en el contexto público
		};

		const { data, error } = await supabaseAdmin
			.from('unregisteredpatients')
			.insert([insertData])
			.select('id')
			.single();

		if (error) {
			console.error('Error creating unregistered patient:', error);
			return NextResponse.json(
				{ error: 'Error al crear paciente no registrado' },
				{ status: 500 }
			);
		}

		return NextResponse.json({ id: data.id, data }, { status: 201 });
	} catch (error: any) {
		console.error('❌ Error POST /public/unregistered-patients:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}

