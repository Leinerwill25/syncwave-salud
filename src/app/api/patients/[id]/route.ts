// app/api/patients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		// Autenticación
		const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
		}

		const { id } = await context.params;
		if (!id) {
			return NextResponse.json({ error: 'ID de paciente no proporcionado' }, { status: 400 });
		}

		const supabase = await createSupabaseServerClient();

		// Obtener información del paciente
		const { data: patient, error: patientError } = await supabase
			.from('patient')
			.select('id, firstName, lastName, dob, phone, gender, identifier, createdAt')
			.eq('id', id)
			.single();

		if (patientError) {
			console.error('Error fetching patient:', patientError);
			return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
		}

		return NextResponse.json(patient);
	} catch (error: any) {
		console.error('Error in patients/[id]:', error);
		return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
	}
}

