import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { medicationSchema } from '@/lib/schemas/inventorySchema';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
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
    .from('admin_inventory_medications')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .range(from, to);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, count, error } = await query.order('name', { ascending: true });

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
    const validatedData = medicationSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('admin_inventory_medications')
      .insert({
        organization_id: organizationId,
        name: validatedData.name,
        dosage: validatedData.dosage || null,
        presentation: validatedData.presentation || null,
        quantity: validatedData.quantity,
        expiration_date: validatedData.expirationDate || null,
        supplier: validatedData.supplier || null,
        notes: validatedData.notes || null,
        is_active: validatedData.isActive ?? true,
        created_by: authId,
        updated_by: authId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Este medicamento con el mismo dosaje y presentación ya existe' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la validación' }, { status: 400 });
  }
}
