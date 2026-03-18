import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { inventoryMovementSchema } from '@/lib/schemas/inventoryMovementSchema';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');
  const itemType = searchParams.get('itemType');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = await createSupabaseServerClient();
  const organizationId = authResult.user?.organizationId;

  let query = supabase
    .from('admin_inventory_movements')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .range(from, to);

  if (itemId) query = query.eq('item_id', itemId);
  if (itemType) query = query.eq('item_type', itemType);

  const { data, count, error } = await query.order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
    const validatedData = inventoryMovementSchema.parse(body);
    const supabase = await createSupabaseServerClient();

    const table = validatedData.itemType === 'MATERIAL' 
      ? 'admin_inventory_materials' 
      : 'admin_inventory_medications';

    // 1. Obtener cantidad actual para validar stock si es OUT
    const { data: item, error: fetchError } = await supabase
      .from(table)
      .select('quantity, name')
      .eq('id', validatedData.itemId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });
    }

    if (validatedData.type === 'OUT' && item.quantity < validatedData.quantity) {
      return NextResponse.json({ 
        error: `Stock insuficiente para ${item.name}. Disponible: ${item.quantity}` 
      }, { status: 400 });
    }

    // 2. Calcular nueva cantidad
    const newQuantity = validatedData.type === 'IN' 
      ? item.quantity + validatedData.quantity 
      : item.quantity - validatedData.quantity;

    // 3. Iniciar transacción (vía múltiples llamadas o RPC si fuera complejo, aquí usaremos lógica de aplicación)
    // Primero registramos el movimiento
    const { data: movement, error: moveError } = await supabase
      .from('admin_inventory_movements')
      .insert({
        organization_id: organizationId,
        item_id: validatedData.itemId,
        item_type: validatedData.itemType,
        type: validatedData.type,
        reason: validatedData.reason,
        quantity: validatedData.quantity,
        unit_price: validatedData.unitPrice || 0,
        total_amount: validatedData.totalAmount || 0,
        supplier_name: validatedData.supplierName || null,
        recipient_name: validatedData.recipientName || null,
        notes: validatedData.notes || null,
        created_by: authId,
      })
      .select()
      .single();

    if (moveError) return NextResponse.json({ error: moveError.message }, { status: 500 });

    // Segundo actualizamos el stock del ítem
    const { error: updateError } = await supabase
      .from(table)
      .update({ 
        quantity: newQuantity,
        updated_by: authId,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.itemId);

    if (updateError) {
      // Rollback manual (opcional, pero idealmente se usaría una función de base de datos para atomicidad)
      await supabase.from('admin_inventory_movements').delete().eq('id', movement.id);
      return NextResponse.json({ error: 'Error al actualizar el stock: ' + updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Movimiento registrado con éxito',
      movement,
      newQuantity
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la solicitud' }, { status: 400 });
  }
}
