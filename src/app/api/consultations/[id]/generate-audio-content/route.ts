
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// Configuración de Groq
const GROQ_API_KEY = process.env.API_GROQ || process.env.GROQ_API_KEY;

async function transcribeAudio(audioBuffer: Buffer, fileName: string): Promise<string> {
	if (!GROQ_API_KEY) throw new Error('Groq API Key no configurada');

	const formData = new FormData();
	// Crear un Blob desde el Buffer (convertir a Uint8Array para compatibilidad de tipos)
	const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' }); 
	formData.append('file', audioBlob, fileName);
	formData.append('model', 'whisper-large-v3');
	formData.append('response_format', 'json');

	const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${GROQ_API_KEY}`,
		},
		body: formData,
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Error en transcripción Groq: ${error}`);
	}

	const data = await response.json();
	return data.text;
}

async function generateStructuredContent(transcription: string): Promise<string> {
	if (!GROQ_API_KEY) throw new Error('Groq API Key no configurada');

	const prompt = `Eres un asistente médico experto. Tu tarea es redactar un informe médico profesional basado en la siguiente transcripción de audio de una consulta.
	
	Genera el informe estrictamente con la siguiente estructura y formato. No añadidas saludos ni texto extra fuera de esta estructura:

	MOTIVO DE CONSULTA
	[Redacta aquí el motivo, extraído del audio]

	DIAGNÓSTICO
	[Redacta aquí el diagnóstico o impresión diagnóstica]

	PLAN DE TRATAMIENTO
	[Redacta aquí el plan, medicamentos, indicaciones]

	OBSERVACIONES
	[Cualquier otra información relevante, antecedentes, examen físico si se menciona]

	Si alguna sección no tiene información en el audio, indica "No especificado" o infiérelo cuidadosamente del contexto. Mantén un tono profesional, médico y objetivo.

	Transcripción del audio:
	"${transcription}"
	`;

	const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${GROQ_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: 'llama-3.3-70b-versatile', // O el modelo disponible más capaz
			messages: [
				{ role: 'system', content: 'Eres un asistente médico experto en redacción de informes clínicos.' },
				{ role: 'user', content: prompt }
			],
			temperature: 0.3, // Bajo para ser preciso
			max_completion_tokens: 1500
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Error en generación de texto Groq: ${error}`);
	}

	const data = await response.json();
	return data.choices[0]?.message?.content || '';
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		
		// 1. Autenticación
		const authCheck = await apiRequireRole(['MEDICO', 'ADMIN']);
		if (authCheck.response) return authCheck.response;

		const user = authCheck.user;
		if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

		// 2. Obtener audio
		const formData = await request.formData();
		const audioFile = formData.get('audio') as File;

		if (!audioFile) {
			return NextResponse.json({ error: 'No se envió archivo de audio' }, { status: 400 });
		}

		// 3. Convertir a Buffer
		const arrayBuffer = await audioFile.arrayBuffer();
		const audioBuffer = Buffer.from(arrayBuffer);

		// 4. Transcribir
		console.log(`[Audio to Content] Transcribiendo audio para consulta ${id}...`);
		const transcription = await transcribeAudio(audioBuffer, audioFile.name || 'audio.webm');

		// 5. Generar contenido estructurado
		console.log(`[Audio to Content] Generando contenido estructurado...`);
		const content = await generateStructuredContent(transcription);

		return NextResponse.json({
			success: true,
			content: content,
			transcription: transcription
		});

	} catch (error: any) {
		console.error('[Audio to Content] Error:', error);
		return NextResponse.json(
			{ error: error.message || 'Error interno del servidor' },
			{ status: 500 }
		);
	}
}
