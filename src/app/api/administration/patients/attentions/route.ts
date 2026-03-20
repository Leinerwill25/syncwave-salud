import { createSupabaseAdminClient } from '@/app/adapters/admin';
import { apiRequireRole } from '@/lib/auth-guards';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');
  const unregisteredPatientId = searchParams.get('unregisteredPatientId');
  const status = searchParams.get('status');
  const organizationId = authResult.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  let query = adminSupabase
    .from('patient_attentions')
    .select(`
      *,
      specialist:specialist_id (
        id,
        first_name,
        last_name,
        role
      ),
      patient:patient_id (
        firstName,
        lastName
      ),
      unregistered_patient:unregistered_patient_id (
        first_name,
        last_name
      )
    `)
    .eq('organization_id', organizationId);

  if (patientId) query = query.eq('patient_id', patientId);
  if (unregisteredPatientId) query = query.eq('unregistered_patient_id', unregisteredPatientId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('attention_date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const organizationId = authResult.user?.organizationId;
  const authId = authResult.user?.authId;

  if (!organizationId || !authId) {
    return NextResponse.json({ error: 'Datos de sesión incompletos' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const adminSupabase = createSupabaseAdminClient();

    const { data, error } = await adminSupabase
      .from('patient_attentions')
      .insert({
        organization_id: organizationId,
        patient_id: body.patientId || null,
        unregistered_patient_id: body.unregisteredPatientId || null,
        title: body.title,
        description: body.description || null,
        attention_date: body.attentionDate,
        is_internal: body.isInternal ?? true,
        specialist_id: body.specialistId || null,
        status: body.status || 'PENDIENTE',
        created_by: authId
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const adminSupabase = createSupabaseAdminClient();
    const { data, error } = await adminSupabase
      .from('patient_attentions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
