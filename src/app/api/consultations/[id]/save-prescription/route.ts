// app/api/consultations/[id]/save-prescription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		// 1️⃣ Autenticación usando apiRequireRole (maneja correctamente la restauración de sesión)
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const user = authResult.user;
		if (!user) {
			return NextResponse.json({ error: 'No autenticado o no es médico' }, { status: 401 });
		}

		const doctorId = user.userId;
		const supabase = await createSupabaseServerClient();

		const body = await request.json();
		const { prescriptionUrl } = body;

		if (!prescriptionUrl || typeof prescriptionUrl !== 'string') {
			return NextResponse.json({ error: 'prescriptionUrl es requerido' }, { status: 400 });
		}

		// Obtener la prescripción asociada a esta consulta
		const { data: prescription, error: prescriptionError } = await supabase.from('prescription').select('id, doctor_id, consultation_id').eq('consultation_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle();

		if (prescriptionError) {
			console.error('[Save Prescription API] Error obteniendo prescripción:', prescriptionError);
			return NextResponse.json({ error: 'Error al obtener prescripción' }, { status: 500 });
		}

		if (!prescription) {
			return NextResponse.json({ error: 'No se encontró una prescripción asociada a esta consulta' }, { status: 404 });
		}

		// Verificar que el médico sea el dueño de la prescripción
		if (prescription.doctor_id !== doctorId) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
		}

		// Actualizar prescripción con la URL del archivo generado
		const { error: updateError } = await supabase.from('prescription').update({ prescription_url: prescriptionUrl }).eq('id', prescription.id);

		if (updateError) {
			console.error('[Save Prescription API] Error actualizando prescripción:', updateError);
			return NextResponse.json({ error: 'Error al guardar URL de receta' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			message: 'Receta guardada exitosamente en la base de datos',
		});
	} catch (err) {
		console.error('[Save Prescription API] Error:', err);
		return NextResponse.json(
			{
				error: 'Error interno al guardar receta',
				detail: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 }
		);
	}
}
