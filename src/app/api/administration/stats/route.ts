import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { NextResponse } from 'next/server';

export async function GET() {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const organizationId = authResult.user?.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  try {
    // Fetch all stats in parallel on the server
    const [patients, specialists, appointments, medications, materials] = await Promise.all([
      supabase.from('patient').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('specialists').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
      supabase.from('admin_appointments').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'PENDIENTE'),
      supabase.from('admin_inventory_medications').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).lt('quantity', 10),
      supabase.from('admin_inventory_materials').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).lt('quantity', 10),
    ]);

    return NextResponse.json({
      totalPatients: patients.count || 0,
      totalSpecialists: specialists.count || 0,
      pendingAppointments: appointments.count || 0,
      inventoryAlerts: (medications.count || 0) + (materials.count || 0),
    });
  } catch (error: any) {
    console.error('[Stats API Error]:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
