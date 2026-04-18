import { NextResponse } from 'next/server';
import { getPatientSummary } from '@/lib/ai/ashira-memory';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ error: 'Falta parametro patientId.' }, { status: 400 });
    }

    const result = await getPatientSummary(patientId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en API patient-summary:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
