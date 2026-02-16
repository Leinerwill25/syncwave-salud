
import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

// Configuración del cliente Groq
const groq = new Groq({
    apiKey: process.env.API_GROQ || process.env.GROQ_API_KEY,
});

// Plantilla Genérica para la Demo
const GENERIC_TEMPLATE = `
INFORME MÉDICO DE CONSULTA

PACIENTE: {{paciente}}
EDAD: {{edad}} años
CÉDULA: {{cedula}}
FECHA: {{fecha}}

MOTIVO DE CONSULTA:
{{motivo}}

HISTORIA DE LA ENFERMEDAD ACTUAL:
{{hea}}

ANTECEDENTES:
{{antecedentes}}

EXAMEN FÍSICO:
{{examen_fisico}}

DIAGNÓSTICO:
{{diagnostico}}

PLAN Y TRATAMIENTO:
{{plan}}

Atentamente,
Dr(a). [Nombre del Usuario Demo]
Especialista en [Especialidad]
`;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        // 1. Transcribir Audio con Groq (Whisper)
        const transcription = await groq.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-large-v3', // Changed from distil-whisper-large-v3-en because it was decommissioned
            response_format: 'json',
            language: 'es',
            temperature: 0.0,
        });

        const transcribedText = transcription.text;

        // 2. Generar Informe con Groq (Llama 3)
        const prompt = `
            Eres un asistente médico experto. Tu tarea es redactar un informe médico profesional basado en la siguiente transcripción de una consulta.
            
            TRANSCRIPCIÓN:
            "${transcribedText}"

            INSTRUCCIONES:
            1. Extrae la información relevante para llenar la siguiente plantilla.
            2. Si falta información (como el nombre o cédula), usa "No mencionado" o infiere del contexto si es obvio.
            3. Usa un lenguaje médico formal y preciso.
            4. Retorna SOLO el contenido del informe lleno, sin introducciones ni marcas de markdown.

            PLANTILLA A LLENAR:
            ${GENERIC_TEMPLATE}
        `;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'Eres un asistente médico experto en redacción de historias clínicas.' },
                { role: 'user', content: prompt }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1, // Baja temperatura para ser factual
        });

        const reportContent = completion.choices[0]?.message?.content || 'Error generando el informe.';

        return NextResponse.json({
            success: true,
            transcription: transcribedText,
            report: reportContent
        });

    } catch (error: any) {
        console.error('[Demo Report] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
