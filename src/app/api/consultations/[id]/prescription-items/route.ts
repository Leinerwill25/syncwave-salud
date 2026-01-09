// app/api/consultations/[id]/prescription-items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		// 1️⃣ Autenticación usando apiRequireRole
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		const doctorId = user.userId;
		const supabase = await createSupabaseServerClient();

		// Obtener la prescripción asociada a esta consulta
		const { data: prescription, error: prescriptionError } = await supabase
			.from('prescription')
			.select('id, doctor_id, consultation_id')
			.eq('consultation_id', id)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (prescriptionError) {
			console.error('[Prescription Items API] Error obteniendo prescripción:', prescriptionError);
			return NextResponse.json({ error: 'Error al obtener prescripción' }, { status: 500 });
		}

		if (!prescription) {
			// No hay prescripción, retornar array vacío
			return NextResponse.json({ items: [] });
		}

		// Verificar que el médico sea el dueño de la prescripción
		if (prescription.doctor_id !== doctorId) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		// Obtener los items de la prescripción
		const { data: items, error: itemsError } = await supabase
			.from('prescription_item')
			.select('*')
			.eq('prescription_id', prescription.id)
			.order('created_at', { ascending: true });

		if (itemsError) {
			console.error('[Prescription Items API] Error obteniendo items:', itemsError);
			return NextResponse.json({ error: 'Error al obtener items' }, { status: 500 });
		}

		return NextResponse.json({
			items: items || [],
		});
	} catch (err) {
		console.error('[Prescription Items API] Error:', err);
		return NextResponse.json(
			{
				error: 'Error interno al obtener items',
				detail: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 }
		);
	}
}

