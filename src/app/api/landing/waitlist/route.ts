import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({
  email: z.string().email(),
  source: z.enum(['farmacias', 'laboratorios']),
});

/**
 * Waitlist para landings "Próximamente".
 * Valida el email y registra el interés (log servidor).
 * TODO: conectar a CRM / Resend / tabla waitlist cuando exista.
 */
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    const { email, source } = parsed.data;
    console.info('[waitlist]', { email: email.toLowerCase(), source, at: new Date().toISOString() });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
}
