// app/api/patient/consultations/[id]/share/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

/**
 * POST /api/patient/consultations/[id]/share
 * Crea un enlace compartido para una consulta
 */
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const patientAuth = await getAuthenticatedPatient();

		if (!patientAuth) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const { id } = await params;
		const consultationId = id;

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Verificar que la consulta pertenece al paciente
		const { data: consultation, error: consultationError } = await supabase
			.from('consultation')
			.select('id, patient_id')
			.eq('id', consultationId)
			.eq('patient_id', patientAuth.patientId)
			.single();

		if (consultationError || !consultation) {
			return NextResponse.json({ error: 'Consulta no encontrada o no autorizada' }, { status: 404 });
		}

		// Verificar si ya existe un enlace activo para esta consulta
		const { data: existingLink } = await supabase
			.from('consultation_share_link')
			.select('id, token, expires_at, is_active')
			.eq('consultation_id', consultationId)
			.eq('patient_id', patientAuth.patientId)
			.eq('is_active', true)
			.maybeSingle();

		// Si existe un enlace activo y no ha expirado, retornarlo
		if (existingLink) {
			const isExpired = existingLink.expires_at 
				? new Date(existingLink.expires_at) < new Date() 
				: false;
			
			if (!isExpired) {
				const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
					(process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');
				const shareUrl = `${baseUrl}/share/consultation/${existingLink.token}`;

				return NextResponse.json({
					success: true,
					shareUrl,
					token: existingLink.token,
					expiresAt: existingLink.expires_at,
					isNew: false,
				});
			}
		}

		// Generar token único
		const token = crypto.randomBytes(32).toString('hex');

		// Crear enlace compartido (expira en 30 días por defecto)
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 30);

		const { data: shareLink, error: linkError } = await supabase
			.from('consultation_share_link')
			.insert({
				consultation_id: consultationId,
				patient_id: patientAuth.patientId,
				token,
				created_by: patientAuth.userId,
				expires_at: expiresAt.toISOString(),
				is_active: true,
			})
			.select('id, token, expires_at')
			.single();

		if (linkError || !shareLink) {
			console.error('Error creando enlace compartido:', linkError);
			return NextResponse.json({ error: 'Error al crear enlace compartido' }, { status: 500 });
		}

		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
			(process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');
		const shareUrl = `${baseUrl}/share/consultation/${shareLink.token}`;

		return NextResponse.json({
			success: true,
			shareUrl,
			token: shareLink.token,
			expiresAt: shareLink.expires_at,
			isNew: true,
		});
	} catch (error: any) {
		console.error('Error en POST /api/patient/consultations/[id]/share:', error);
		return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
	}
}

/**
 * DELETE /api/patient/consultations/[id]/share
 * Desactiva un enlace compartido
 */
export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const patientAuth = await getAuthenticatedPatient();

		if (!patientAuth) {
			return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
		}

		const { id } = await params;
		const consultationId = id;

		const cookieStore = await cookies();
		const { supabase } = createSupabaseServerClient(cookieStore);

		// Desactivar todos los enlaces activos para esta consulta
		const { error: updateError } = await supabase
			.from('consultation_share_link')
			.update({ is_active: false })
			.eq('consultation_id', consultationId)
			.eq('patient_id', patientAuth.patientId)
			.eq('is_active', true);

		if (updateError) {
			console.error('Error desactivando enlace:', updateError);
			return NextResponse.json({ error: 'Error al desactivar enlace' }, { status: 500 });
		}

		return NextResponse.json({ success: true, message: 'Enlace desactivado correctamente' });
	} catch (error: any) {
		console.error('Error en DELETE /api/patient/consultations/[id]/share:', error);
		return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
	}
}

