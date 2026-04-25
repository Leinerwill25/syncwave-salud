// src/app/api/waha/qr/route.ts
import { NextResponse } from 'next/server';
import { getUnifiedOrganizationContext } from '@/lib/auth-guards';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { wahaGetQR, getSessionName } from '@/lib/waha/client';

/**
 * GET: Obtener el código QR actual para escanear
 * Se llama mediante polling desde el frontend cada 3-5 segundos.
 */
export async function GET() {
  try {
    const { organizationId } = await getUnifiedOrganizationContext();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionName = getSessionName(user.organizationId);

    // Obtener QR de WAHA
    const qrBase64 = await wahaGetQR(sessionName);

    if (qrBase64) {
      // Guardar en DB con expiración de 40 segundos (el polling es cada 3-5s)
      const expiresAt = new Date(Date.now() + 40000).toISOString();
      
      await supabaseAdmin
        .from('waha_sessions')
        .update({
          qr_code_base64: qrBase64,
          qr_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId);

      return NextResponse.json({ 
        qr: qrBase64,
        qrCode: qrBase64, // Alias para compatibilidad con el frontend
        expires_at: expiresAt 
      });
    }

    // Si no hay QR (tal vez ya está trabajando o detenido)
    return NextResponse.json({ qr: null });
  } catch (error: any) {
    console.error('[WAHA GET QR] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
