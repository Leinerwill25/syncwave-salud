
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// Configuración de Groq
const GROQ_API_KEY = process.env.API_GROQ || process.env.GROQ_API_KEY;

async function transcribeAudio(audioBuffer: Buffer, fileName: string): Promise<string> {
	if (!GROQ_API_KEY) throw new Error('Groq API Key no configurada');

	const formData = new FormData();
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

async function generateNurseKardexNote(transcription: string): Promise<string> {
	if (!GROQ_API_KEY) throw new Error('Groq API Key no configurada');

	const prompt = `Eres un asistente de enfermería experto. Tu tarea es redactar una "Nota de Evolución de Enfermería" profesional y detallada basada en la siguiente transcripción de audio. 
    
    La nota debe ser clínica, precisa y seguir un formato estructurado (pero en texto plano) que incluya:
    - Estado general del paciente.
    - Signos vitales (si se mencionan).
    - Medicamentos administrados o pendientes.
    - Procedimientos realizados.
    - Observaciones relevantes o novedades del turno.

    IMPORTANTE: 
    - Usa terminología médica adecuada.
    - No añadas saludos, introducciones o texto extra fuera de la nota clínica.
    - Si el audio es breve, expande la información para que sea una nota completa y profesional.
    - Redacta en tercera persona.

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
			model: 'llama-3.3-70b-versatile',
			messages: [
				{ role: 'system', content: 'Eres un enfermero instrumentista y clínico experto en redacción de notas de Kardex.' },
				{ role: 'user', content: prompt }
			],
			temperature: 0.3,
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

export async function POST(request: NextRequest) {
	try {
		// 1. Autenticación (Permitir enfermeros y médicos)
		const authCheck = await apiRequireRole(['ENFERMERO', 'MEDICO', 'ADMIN']);
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
		console.log(`[Nurse AI Kardex] Transcribiendo audio...`);
		const transcription = await transcribeAudio(audioBuffer, audioFile.name || 'audio.webm');

		// 5. Generar nota de enfermería
		console.log(`[Nurse AI Kardex] Generando nota estructurada...`);
		const content = await generateNurseKardexNote(transcription);

		return NextResponse.json({
			success: true,
			content: content,
			transcription: transcription
		});

	} catch (error: any) {
		console.error('[Nurse AI Kardex] Error:', error);
		return NextResponse.json(
			{ error: error.message || 'Error interno del servidor' },
			{ status: 500 }
		);
	}
}
