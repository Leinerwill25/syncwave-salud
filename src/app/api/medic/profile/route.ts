// app/api/medic/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import createSupabaseServerClient from '@/app/adapters/server';

export async function GET(req: NextRequest) {
	try {
		const { supabase } = createSupabaseServerClient();
		const url = new URL(req.url);
		const doctorId = url.searchParams.get('doctor_id');

		if (!doctorId) {
			return NextResponse.json({ error: 'doctor_id es obligatorio' }, { status: 400 });
		}

		// Buscar medic_profile por doctor_id
		const { data: medicProfile, error } = await supabase
			.from('medic_profile')
			.select('id, doctor_id, specialty, private_specialty, photo_url, signature_url, credentials, services, availability')
			.eq('doctor_id', doctorId)
			.maybeSingle();

		if (error) {
			console.error('Error buscando medic_profile:', error);
			return NextResponse.json({ error: 'Error interno buscando perfil médico' }, { status: 500 });
		}

		if (!medicProfile) {
			return NextResponse.json({ error: 'Perfil médico no encontrado' }, { status: 404 });
		}

		return NextResponse.json({ 
			specialty: medicProfile.specialty || medicProfile.private_specialty,
			data: medicProfile 
		}, { status: 200 });
	} catch (error: any) {
		console.error('❌ Error GET /api/medic/profile:', error?.message ?? error);
		return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
	}
}

