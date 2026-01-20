// app/api/groq/transcribe/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint intermedio para transcribir audio con Groq
 * Evita problemas con el manejo de binarios en n8n
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { audioUrl, groqApiKey } = body;

		if (!audioUrl) {
			return NextResponse.json({ error: 'audioUrl es requerido' }, { status: 400 });
		}

		if (!groqApiKey) {
			return NextResponse.json({ error: 'groqApiKey es requerido' }, { status: 400 });
		}

		// Descargar el audio desde la URL
		const audioResponse = await fetch(audioUrl);
		if (!audioResponse.ok) {
			return NextResponse.json(
				{ error: `Error al descargar audio: ${audioResponse.statusText}` },
				{ status: audioResponse.status }
			);
		}

		// Obtener el buffer del audio
		const audioBuffer = await audioResponse.arrayBuffer();
		
		// Obtener el nombre del archivo de la URL
		const urlPath = new URL(audioUrl).pathname;
		const fileName = urlPath.split('/').pop() || 'audio.webm';
		
		// Renombrar a MP4 si es necesario (solo cambiar extensión)
		const mp4FileName = fileName.replace(/\.webm$/i, '.mp4').replace(/\.(wav|ogg|m4a)$/i, '.mp4');

		// Crear FormData para enviar a Groq
		const formData = new FormData();
		const blob = new Blob([audioBuffer], { type: 'audio/mp4' });
		formData.append('file', blob, mp4FileName);
		formData.append('model', 'whisper-large-v3');
		formData.append('language', 'es');
		formData.append('response_format', 'json');

		// Enviar a Groq para transcribir
		const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${groqApiKey}`,
			},
			body: formData,
		});

		if (!groqResponse.ok) {
			const errorText = await groqResponse.text();
			console.error('Error de Groq:', errorText);
			return NextResponse.json(
				{ error: `Error de Groq: ${groqResponse.statusText}`, details: errorText },
				{ status: groqResponse.status }
			);
		}

		const transcriptionData = await groqResponse.json();

		// Retornar la transcripción
		return NextResponse.json({
			success: true,
			text: transcriptionData.text || '',
			transcription: transcriptionData,
		});
	} catch (error: any) {
		console.error('Error en transcripción:', error);
		return NextResponse.json(
			{ error: 'Error al transcribir audio', details: error.message },
			{ status: 500 }
		);
	}
}

