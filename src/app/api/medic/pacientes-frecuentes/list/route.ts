// app/api/medic/pacientes-frecuentes/list/route.ts
// API para listar pacientes no registrados del médico actual

import { NextRequest, NextResponse } from 'next/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Obtener el medic_profile.id para filtrar por created_by
		const { data: medicProfile, error: profileError } = await supabase
			.from('medic_profile')
			.select('id')
			.eq('doctor_id', user.userId)
			.maybeSingle();

		if (profileError) {
			console.error('[List Patients API] Error obteniendo medic_profile:', profileError);
			return NextResponse.json({ error: 'Error obteniendo perfil del médico' }, { status: 500 });
		}

		if (!medicProfile) {
			return NextResponse.json({ patients: [], count: 0 }, { status: 200 });
		}

		// Obtener pacientes no registrados creados por este médico
		const { data: patients, error } = await supabase
			.from('unregisteredpatients')
			.select('id, first_name, last_name, identification, email, phone, created_at, updated_at')
			.eq('created_by', medicProfile.id)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('[List Patients API] Error obteniendo pacientes:', error);
			return NextResponse.json({ error: 'Error obteniendo pacientes' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			patients: patients || [],
			count: patients?.length || 0,
		});
	} catch (error: any) {
		console.error('[List Patients API] Error:', error);
		return NextResponse.json({ error: error.message || 'Error al obtener pacientes' }, { status: 500 });
	}
}

