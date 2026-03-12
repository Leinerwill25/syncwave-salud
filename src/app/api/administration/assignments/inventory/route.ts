import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { inventoryAssignmentSchema } from '@/lib/schemas/assignmentSchema';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patient_id') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = await createSupabaseServerClient();
  const organizationId = authResult.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

  let query = supabase
    .from('admin_inventory_assignments')
    .select(`
      *,
      patient!inner (first_name, last_name),
      admin_inventory_medications (name, dosage, presentation),
      admin_inventory_materials (name, specifications)
    `, { count: 'exact' })
    .eq('organization_id', organizationId)
    .range(from, to);

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  const { data, count, error } = await query.order('assigned_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    total: count,
    page,
    limit,
    totalPages: count ? Math.ceil(count / limit) : 0
  });
}

export async function POST(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const organizationId = authResult.user?.organizationId;
  const authId = authResult.user?.authId;

  try {
    const body = await request.json();
    const validatedData = inventoryAssignmentSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    // Si el paciente no lo trajo, deducir del inventario
    if (!validatedData.patientProvided) {
      if (validatedData.medicationId) {
        const { data: med, error: medError } = await supabase
          .from('admin_inventory_medications')
          .select('quantity')
          .eq('id', validatedData.medicationId)
          .single();

        if (medError || !med || med.quantity < validatedData.quantityAssigned) {
          return NextResponse.json({ error: 'Stock insuficiente de este medicamento' }, { status: 400 });
        }

        await supabase
          .from('admin_inventory_medications')
          .update({ quantity: med.quantity - validatedData.quantityAssigned, updated_at: new Date().toISOString() })
          .eq('id', validatedData.medicationId);

      } else if (validatedData.materialId) {
        const { data: mat, error: matError } = await supabase
          .from('admin_inventory_materials')
          .select('quantity')
          .eq('id', validatedData.materialId)
          .single();

        if (matError || !mat || mat.quantity < validatedData.quantityAssigned) {
          return NextResponse.json({ error: 'Stock insuficiente de este material' }, { status: 400 });
        }

        await supabase
          .from('admin_inventory_materials')
          .update({ quantity: mat.quantity - validatedData.quantityAssigned, updated_at: new Date().toISOString() })
          .eq('id', validatedData.materialId);
      }
    }

    const { data, error } = await supabase
      .from('admin_inventory_assignments')
      .insert({
        organization_id: organizationId,
        patient_id: validatedData.patientId,
        medication_id: validatedData.medicationId || null,
        material_id: validatedData.materialId || null,
        quantity_assigned: validatedData.quantityAssigned,
        patient_provided: validatedData.patientProvided,
        assigned_by: authId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la validación' }, { status: 400 });
  }
}
