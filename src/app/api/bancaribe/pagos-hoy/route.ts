import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const orgId = request.nextUrl.searchParams.get('orgId');
    if (!orgId) {
      return NextResponse.json({ error: 'Falta orgId' }, { status: 400 });
    }

    // Calcular el inicio del día de hoy en hora local/servidor
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data: pagos, error } = await supabase
      .from('bancaribe_pagos')
      .select('amount')
      .eq('organization_id', orgId)
      .gte('createdAt', startOfToday.toISOString());

    if (error) {
      console.error('[Bancaribe Pagos Hoy] DB Error:', error);
      return NextResponse.json({ count: 0, total: 0 });
    }

    const count = pagos?.length || 0;
    const total = pagos?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    return NextResponse.json({ count, total });
  } catch (error: any) {
    console.error('[Bancaribe Pagos Hoy] Global Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
