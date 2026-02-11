import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/public/lab-upload/[token]/validate
 * Validar que el token existe y está activo
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ 
        valid: false,
        error: 'Token no proporcionado' 
      }, { status: 400 });
    }

    // Buscar link activo con el token
    const { data: link, error: linkError } = await supabase
      .from('lab_upload_link')
      .select(`
        id,
        organization_id,
        is_active,
        organization:organization_id (
          id,
          name,
          type
        )
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ 
        valid: false,
        error: 'Token inválido o expirado' 
      }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      organizationId: link.organization_id,
      organizationName: (link.organization as any)?.name || 'Consultorio',
      organizationType: (link.organization as any)?.type || 'CONSULTORIO'
    }, { status: 200 });

  } catch (error) {
    console.error('Error validating token:', error);
    return NextResponse.json({ 
      valid: false,
      error: 'Error al validar token' 
    }, { status: 500 });
  }
}
