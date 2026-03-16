import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { serviceSchema } from '@/lib/schemas/serviceSchema';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: Request) {
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const activeParam = searchParams.get('active');
  const active = activeParam === 'false' ? false : activeParam === 'true' ? true : undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const from = (page - 1) * limit;

  const supabase = await createSupabaseServerClient();
  const organizationId = authResult.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Usuario sin organización asociada' }, { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from('clinic_profile')
    .select('services')
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let services: any[] = [];
  if (profile?.services) {
    if (typeof profile.services === 'string') {
      try { services = JSON.parse(profile.services); } catch(e) {}
    } else if (Array.isArray(profile.services)) {
      services = profile.services;
    }
  }

  if (search) {
    const sTerm = search.toLowerCase();
    services = services.filter(s => 
      s.name?.toLowerCase().includes(sTerm) || 
      s.service_code?.toLowerCase().includes(sTerm)
    );
  }

  if (active !== undefined) {
    services = services.filter(s => {
      const isActive = s.active !== undefined ? s.active : s.is_active !== undefined ? s.is_active : true;
      return isActive === active;
    });
  }

  services.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const count = services.length;
  const paginatedData = services.slice(from, from + limit).map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    service_code: s.service_code || s.serviceCode || null,
    price: s.price,
    is_active: s.active !== undefined ? s.active : s.is_active !== undefined ? s.is_active : true
  }));

  return NextResponse.json({
    data: paginatedData,
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

  try {
    const body = await request.json();
    const validatedData = serviceSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const { data: profile, error: profileError } = await supabase
      .from('clinic_profile')
      .select('id, services')
      .eq('organization_id', organizationId)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Perfil de clínica no encontrado' }, { status: 404 });
    }

    let services: any[] = [];
    if (profile?.services) {
      if (typeof profile.services === 'string') {
        try { services = JSON.parse(profile.services); } catch(e) {}
      } else if (Array.isArray(profile.services)) {
        services = profile.services;
      }
    }

    if (services.some(s => s.name.toLowerCase() === validatedData.name.toLowerCase())) {
        return NextResponse.json({ error: 'Ya existe un servicio con este nombre' }, { status: 409 });
    }

    const newService = {
      id: crypto.randomUUID(),
      name: validatedData.name,
      description: validatedData.description || null,
      service_code: validatedData.serviceCode || null,
      price: validatedData.price || 0,
      active: validatedData.isActive ?? true,
      is_active: validatedData.isActive ?? true,
    };

    services.push(newService);

    const { error: updateError } = await supabase
      .from('clinic_profile')
      .update({ services })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
        ...newService,
        serviceCode: newService.service_code,
        isActive: newService.is_active
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la validación' }, { status: 400 });
  }
}
