import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedPatient } from '@/lib/patient-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const patient = await getAuthenticatedPatient();
    if (!patient) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const organizationId = searchParams.get('organizationId');

    let resolvedOrgId = organizationId;

    if (!resolvedOrgId && doctorId) {
      // Buscar la organización del doctor
      const { data: userProfile, error: userError } = await supabaseAdmin
        .from('users')
        .select('organizationId')
        .eq('id', doctorId)
        .maybeSingle();

      if (userProfile?.organizationId) {
        resolvedOrgId = userProfile.organizationId;
      }
    }

    if (!resolvedOrgId) {
      return NextResponse.json({ active: false });
    }

    // Verificar si existe configuración activa de Bancaribe
    const { data: config, error: configError } = await supabaseAdmin
      .from('bancaribe_config')
      .select('id, telefono_comercio')
      .eq('organization_id', resolvedOrgId)
      .maybeSingle();

    if (configError || !config || !config.telefono_comercio) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      organizationId: resolvedOrgId,
    });
  } catch (error: any) {
    console.error('[Bancaribe Active Helper] Error:', error);
    return NextResponse.json({ active: false });
  }
}
