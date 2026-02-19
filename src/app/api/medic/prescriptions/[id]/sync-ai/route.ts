// src/app/api/medic/prescriptions/[id]/sync-ai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createSupabaseServerClient } from '@/app/adapters/server';
import mammoth from 'mammoth';

if (!process.env.API_GEMINI) throw new Error('Falta la variable de entorno API_GEMINI');

const genAI = new GoogleGenerativeAI(process.env.API_GEMINI);
const MODEL_NAME = 'gemini-2.0-flash-exp';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createSupabaseServerClient();

        // 1. Obtener datos de la receta
        const { data: prescription, error: presErr } = await supabase
            .from('prescription')
            .select('*, prescription_files(*)')
            .eq('id', id)
            .maybeSingle();

        if (presErr || !prescription) {
            return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 });
        }

        let recipeText = prescription.recipe_text || '';

        // 2. Si no hay texto, intentar extraerlo del archivo DOCX
        if (!recipeText && prescription.prescription_files && prescription.prescription_files.length > 0) {
            const docxFile = prescription.prescription_files.find((f: any) => 
                f.file_name.toLowerCase().endsWith('.docx') || 
                f.content_type?.includes('word')
            );

            if (docxFile) {
                const { data: fileData, error: downloadError } = await supabase.storage
                    .from('prescriptions')
                    .download(docxFile.path);

                if (!downloadError && fileData) {
                    const arrayBuffer = await fileData.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    recipeText = result.value;
                }
            }
        }

        if (!recipeText) {
            return NextResponse.json({ error: 'No hay texto ni archivos legibles para procesar' }, { status: 400 });
        }

        // 3. Llamar a Gemini para parsear el texto
        const genAI = new GoogleGenerativeAI(process.env.API_GEMINI!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        console.log('[Sync AI] Using model: gemini-1.5-flash');

        const prompt = `
            Actúa como un asistente médico experto. Analiza el siguiente texto de una receta médica y extrae la información estructurada en formato JSON.
            
            TEXTO DE LA RECETA:
            "${recipeText}"
            
            ESQUEMA JSON REQUERIDO:
            {
                "medications": [
                    {
                        "name": "Nombre del medicamento",
                        "dosage": "Dosis (ej: 500mg)",
                        "form": "Forma (ej: Tableta)",
                        "frequency": "Frecuencia (ej: Cada 8 horas)",
                        "duration": "Duración (ej: 7 días)",
                        "quantity": 1,
                        "instructions": "Instrucciones adicionales"
                    }
                ],
                "treatment_plan": "Resumen conciso del plan de tratamiento general"
            }
            
            REGLAS:
            - Devuelve ÚNICAMENTE el JSON válido.
            - Si no encuentras algún campo, deja el valor como null o string vacío según corresponda.
            - Sé preciso con las dosis y frecuencias.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Limpiar backticks si Gemini los incluye
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const parsed = JSON.parse(text);

        // 4. Actualizar base de datos
        // a. Actualizar treatment_plan en prescription
        const { error: updateError } = await supabase
            .from('prescription')
            .update({ 
                treatment_plan: parsed.treatment_plan,
                recipe_text: recipeText // Guardamos el texto extraído si no existía
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // b. Insertar items (solo si no existen o para complementar)
        // Por seguridad, primero vemos si ya hay items
        const { data: existingItems } = await supabase
            .from('prescription_item')
            .select('id')
            .eq('prescription_id', id);

        if (!existingItems || existingItems.length === 0) {
            if (parsed.medications && parsed.medications.length > 0) {
                const itemsToInsert = parsed.medications.map((m: any) => ({
                    prescription_id: id,
                    name: m.name,
                    dosage: m.dosage,
                    form: m.form,
                    frequency: m.frequency,
                    duration: m.duration,
                    quantity: m.quantity || 1,
                    instructions: m.instructions
                }));

                const { error: itemsError } = await supabase
                    .from('prescription_item')
                    .insert(itemsToInsert);
                
                if (itemsError) console.error('Error insertando items:', itemsError);
            }
        }

        return NextResponse.json({ 
            success: true, 
            data: parsed,
            recipeTextDetected: !!recipeText 
        });

    } catch (error: any) {
        console.error('Error en Sync AI:', error);
        
        // Debug: Listar modelos disponibles si hay error 404
        let availableModels = 'Unknown';
        try {
            const genAI = new GoogleGenerativeAI(process.env.API_GEMINI!);
            // @ts-ignore
            const list = await genAI.listModels();
            availableModels = JSON.stringify(list.models.map((m: any) => m.name));
        } catch (listErr) {
            console.error('Error listing models:', listErr);
        }

        return NextResponse.json({ 
            error: 'Error procesando la receta con IA', 
            details: error.message,
            availableModels // Devolvemos esto para debuguear el 404
        }, { status: 500 });
    }
}
