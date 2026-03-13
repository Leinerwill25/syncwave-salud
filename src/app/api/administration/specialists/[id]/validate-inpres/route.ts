import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const organizationId = authResult.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();

    // 1. Buscar al especialista
    const { data: specialist, error: fetchError } = await supabase
      .from('specialists')
      .select('inpres_sax')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !specialist) {
      return NextResponse.json({ error: 'Especialista no encontrado' }, { status: 404 });
    }

    // 2. Simular validación externa (1 segundo de delay)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Lógica de validación por Regex (según formato especificado)
    // Formato esperado: INPRES-XXXXXXXX-XYZ (8 dígitos y 3 alfanuméricos)
    const inpresRegex = /^INPRES-\d{8}-[A-Z0-9]{3}$/;
    const isValid = inpresRegex.test(specialist.inpres_sax);

    if (!isValid) {
      return NextResponse.json({ 
        isValid: false, 
        message: 'El código INPRES SAX no cumple con el formato oficial (INPRES-8Dígitos-3Alfanum)',
        status: 'INVALID'
      });
    }

    // Opcional: Podríamos marcar al especialista como verificado en la DB en el futuro
    // await supabase.from('specialists').update({ inpres_verified: true }).eq('id', id);

    return NextResponse.json({ 
      isValid: true, 
      status: 'VERIFIED',
      verifiedAt: new Date().toISOString()
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la validación' }, { status: 400 });
  }
}
