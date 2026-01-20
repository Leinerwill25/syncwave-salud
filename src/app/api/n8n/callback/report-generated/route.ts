// app/api/n8n/callback/report-generated/route.ts
// Webhook callback para recibir notificaciones de n8n cuando el informe esté listo
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Webhook de callback para cuando n8n termine de generar el informe
 * n8n llamará a este endpoint cuando el proceso esté completo
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { consultationId, reportUrl, transcription, error } = body;

		if (error) {
			console.error('[N8N Callback] Error en procesamiento:', error);
			return NextResponse.json({ success: false, error }, { status: 400 });
		}

		if (!consultationId || !reportUrl) {
			return NextResponse.json(
				{ error: 'Faltan parámetros requeridos: consultationId, reportUrl' },
				{ status: 400 }
			);
		}

		// Actualizar consulta con el informe generado
		const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
		const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			return NextResponse.json({ error: 'Error de configuración' }, { status: 500 });
		}

		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false },
		});

		// Actualizar consulta
		const { error: updateError } = await supabaseAdmin
			.from('consultation')
			.update({ 
				report_url: reportUrl,
				notes: transcription ? `Transcripción de audio:\n${transcription}` : undefined,
			})
			.eq('id', consultationId);

		if (updateError) {
			console.error('[N8N Callback] Error actualizando consulta:', updateError);
			return NextResponse.json({ error: 'Error actualizando consulta' }, { status: 500 });
		}

		return NextResponse.json({ 
			success: true, 
			message: 'Informe guardado exitosamente',
			reportUrl,
		});

	} catch (error: any) {
		console.error('[N8N Callback] Error:', error);
		return NextResponse.json(
			{ error: 'Error interno', detail: error.message },
			{ status: 500 }
		);
	}
}


