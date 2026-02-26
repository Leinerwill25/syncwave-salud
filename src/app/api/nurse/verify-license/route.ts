import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Auth validation - Solo administradores o perfiles médicos superiores deberían poder hacer esto
    // Para propósitos del MVP, permitiremos que cualquier perfil autenticado lo llame, 
    // pero idealmente se protege con un auth-guard: apiRequireRole(['SUPER_ADMIN', 'ADMIN_CLINIC'])
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { nurseId, licenseNumber } = await req.json();

    if (!nurseId || !licenseNumber) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: nurseId y licenseNumber.' }, 
        { status: 400 }
      );
    }

    // 1. Verificar existencia del perfil
    const { data: profile, error: profileError } = await supabase
      .from('nurse_profiles')
      .select('license_number, status')
      .eq('user_id', nurseId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil de enfermería no encontrado.' }, { status: 404 });
    }

    if (profile.license_number !== licenseNumber) {
      return NextResponse.json({ error: 'El número de licencia proporcionado no coincide con el registrado.' }, { status: 400 });
    }

    // 2. Simular validación con organismo gubernamental / ente rector de salud
    // En producción esto haría un fetch a la API del ente colegiado
    await new Promise(resolve => setTimeout(resolve, 800)); // Simular delay de red
    
    // Lógica ficticia para demostración: las licencias que terminan en "00" están vencidas/restringidas
    const isMockInvalid = licenseNumber.endsWith('00');
    if (isMockInvalid) {
      return NextResponse.json({ 
        verified: false, 
        message: 'La licencia registra observaciones activas o se encuentra vencida ante el organismo emisor.' 
      }, { status: 400 });
    }

    // 3. Actualizar perfil como verificado
    const { error: updateError } = await supabase
      .from('nurse_profiles')
      .update({ 
        license_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', nurseId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // 4. Registrar auditoría de la validación
    await supabase.from('audit_log').insert({
      user_id: user.id,
      user_name: user?.user_metadata?.full_name || 'Admin',
      user_role: 'SYSTEM',
      action_type: 'VALIDACION_LICENCIA',
      entity_type: 'NURSE_PROFILE',
      entity_id: nurseId,
      description: `Licencia ${licenseNumber} validada correctamente.`
    });

    return NextResponse.json({ 
      success: true, 
      verified: true, 
      message: 'Licencia profesional validada y aprobada exitosamente.' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('[VerifyLicenseAPI] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
