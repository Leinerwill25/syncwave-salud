import { createSupabaseAdminClient } from '@/app/adapters/admin';
import { apiRequireRole } from '@/lib/auth-guards';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const organizationId = authResult.user?.organizationId;
  const authId = authResult.user?.authId;

  try {
    const { patientId, isUnregistered, expirationHours } = await request.json();

    if (!patientId || !expirationHours) {
      return NextResponse.json({ error: 'Faltan datos requeridos (patientId, expirationHours)' }, { status: 400 });
    }

    const token = uuidv4(); // Usar uuid en lugar de nanoid
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + parseInt(expirationHours));

    const adminSupabase = createSupabaseAdminClient();

    const { data, error } = await adminSupabase
      .from('shared_history_links')
      .insert({
        organization_id: organizationId,
        patient_id: isUnregistered ? null : patientId,
        unregistered_patient_id: isUnregistered ? patientId : null,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: authId
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      token: data.token,
      expires_at: data.expires_at,
      share_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ashira.click'}/share/history/${data.token}`
    });

  } catch (error: any) {
    console.error('[Share History API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
