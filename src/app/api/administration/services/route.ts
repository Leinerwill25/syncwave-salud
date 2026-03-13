import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { serviceSchema } from '@/lib/schemas/serviceSchema';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const active = searchParams.get('active') === 'false' ? false : true;
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
    .from('admin_clinic_services')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .range(from, to);

  if (search) {
    query = query.or(`name.ilike.%${search}%,service_code.ilike.%${search}%`);
  }

  if (active !== undefined) {
    query = query.eq('is_active', active);
  }

  let { data, count, error } = await query.order('name', { ascending: true });
  
  // -- LAZY MIGRATION LOGIC --
  // If no services found in structured table, check for legacy services in clinic_profile
  if (!error && (!data || data.length === 0) && page === 1) {
    const { data: profile } = await supabase
      .from('clinic_profile')
      .select('services')
      .eq('organization_id', organizationId)
      .maybeSingle();
    
    if (profile?.services && Array.isArray(profile.services) && profile.services.length > 0) {
      console.log(`[Services Sync] Migrating ${profile.services.length} services for org ${organizationId}`);
      
      const servicesToInsert = profile.services.map((s: any) => ({
        organization_id: organizationId,
        name: s.name || 'Servicio sin nombre',
        description: s.description || null,
        price: s.price || 0,
        is_active: s.is_active ?? true,
        service_code: s.id?.substring(0, 8) || null, // Best effort code
        created_by: authResult.user?.authId,
        updated_by: authResult.user?.authId
      }));

      const { error: insertError } = await supabase
        .from('admin_clinic_services')
        .insert(servicesToInsert);

      if (!insertError) {
        // Re-run query to get the newly inserted data
        const secondQuery = await supabase
          .from('admin_clinic_services')
          .select('*', { count: 'exact' })
          .eq('organization_id', organizationId)
          .range(from, to)
          .order('name', { ascending: true });
        
        data = secondQuery.data;
        count = secondQuery.count;
        error = secondQuery.error;
      }
    }
  }

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
    const validatedData = serviceSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('admin_clinic_services')
      .insert({
        organization_id: organizationId,
        name: validatedData.name,
        description: validatedData.description || null,
        service_code: validatedData.serviceCode || null,
        price: validatedData.price || null,
        is_active: validatedData.isActive ?? true,
        created_by: authId,
        updated_by: authId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un servicio con este nombre' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la validación' }, { status: 400 });
  }
}
