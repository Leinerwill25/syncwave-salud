import { NextResponse } from 'next/server';
import { analyzeReport } from '@/lib/ai/ashira-doc';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const patientId = formData.get('patientId') as string;

    if (!file || !patientId) {
      return NextResponse.json({ error: 'Faltan campos: file y patientId son requeridos.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const mimeType = file.type;

    const result = await analyzeReport(patientId, buffer, fileName, mimeType);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en API analyze-report:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
