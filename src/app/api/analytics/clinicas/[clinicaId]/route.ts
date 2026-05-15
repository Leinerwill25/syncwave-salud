import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getClinicaDetail, getWeekRange, getClinicaTrends, getClinicaLTVAndLoyalty } from '@/lib/analytics/queries';
import createSupabaseServerClient from '@/app/adapters/server';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? '';

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clinicaId: string }> }
) {
  const { clinicaId } = await params;
  
  // Verificamos que el usuario esté autenticado en la plataforma
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('analytics-admin-session');
  let isAuthenticated = false;

  if (sessionCookie?.value) {
    try {
      let cookieValue = sessionCookie.value;
      if (cookieValue.startsWith('%')) {
        cookieValue = decodeURIComponent(cookieValue);
      }
      const sessionData = JSON.parse(cookieValue);
      if (sessionData.adminId) {
        isAuthenticated = true;
      }
    } catch (e) {
      console.error('Error parsing session cookie:', e);
    }
  }

  if (!isAuthenticated) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      isAuthenticated = true;
    }
  }

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase admin no configurado' }, { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    
    if (type === 'trends') {
      const months = parseInt(url.searchParams.get('months') || '6', 10);
      const trends = await getClinicaTrends(supabaseAdmin, clinicaId, months);
      return NextResponse.json(trends);
    }

    if (type === 'ltv') {
      const ltv = await getClinicaLTVAndLoyalty(supabaseAdmin, clinicaId);
      return NextResponse.json(ltv);
    }

    const weekParam = url.searchParams.get('week');
    const weeksAgo = weekParam ? parseInt(weekParam, 10) : 0;

    const { from, to } = getWeekRange(weeksAgo);
    const detail = await getClinicaDetail(supabaseAdmin, clinicaId, from, to);
    
    return NextResponse.json(detail);
  } catch (error: any) {
    console.error(`Error fetching clinica detail for ${clinicaId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
