import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { serviceSchema } from '@/lib/schemas/serviceSchema';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const supabase = await createSupabaseServerClient();
  const organizationId = authResult.user?.organizationId;

  const { data: profile, error } = await supabase
    .from('clinic_profile')
    .select('services')
    .eq('organization_id', organizationId)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  }

  let services: any[] = [];
  if (profile?.services) {
    if (typeof profile.services === 'string') {
      try { services = JSON.parse(profile.services); } catch(e) {}
    } else if (Array.isArray(profile.services)) {
      services = profile.services;
    }
  }

  const service = services.find(s => s.id === id);

  if (!service) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    id: service.id,
    name: service.name,
    description: service.description,
    service_code: service.service_code || service.serviceCode,
    price: service.price,
    is_active: service.active !== undefined ? service.active : service.is_active !== undefined ? service.is_active : true,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const organizationId = authResult.user?.organizationId;

  try {
    const body = await request.json();
    const partialSchema = serviceSchema.partial();
    
    let validatedData: any = {};
    try {
        validatedData = partialSchema.parse(body);
    } catch {
        // use raw body if exact keys from patch
    }
    
    const is_active = body.is_active !== undefined ? body.is_active : validatedData.isActive;
    const name = body.name || validatedData.name;
    const description = body.description || validatedData.description;
    const service_code = body.service_code || body.serviceCode || validatedData.serviceCode;
    const price = body.price || validatedData.price;

    const supabase = await createSupabaseServerClient();

    const { data: profile, error: profileError } = await supabase
      .from('clinic_profile')
      .select('id, services')
      .eq('organization_id', organizationId)
      .single();

    if (profileError) {
       return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    let services: any[] = [];
    if (profile?.services) {
      if (typeof profile.services === 'string') {
        try { services = JSON.parse(profile.services); } catch(e) {}
      } else if (Array.isArray(profile.services)) {
        services = profile.services;
      }
    }

    const serviceIndex = services.findIndex(s => s.id === id);
    if (serviceIndex === -1) {
       return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    const currentService = services[serviceIndex];

    const updatedService = {
        ...currentService,
        name: name !== undefined ? name : currentService.name,
        description: description !== undefined ? description : currentService.description,
        service_code: service_code !== undefined ? service_code : currentService.service_code,
        price: price !== undefined ? price : currentService.price,
        active: is_active !== undefined ? is_active : currentService.active,
        is_active: is_active !== undefined ? is_active : currentService.is_active,
    };

    services[serviceIndex] = updatedService;

    const { error: updateError } = await supabase
      .from('clinic_profile')
      .update({ services })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
        ...updatedService,
        isActive: updatedService.is_active || updatedService.active
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en la actualización' }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await apiRequireRole(['ADMINISTRACION', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const organizationId = authResult.user?.organizationId;
  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from('clinic_profile')
    .select('id, services')
    .eq('organization_id', organizationId)
    .single();

  if (profileError) {
     return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  }

  let services: any[] = [];
  if (profile?.services) {
    if (typeof profile.services === 'string') {
      try { services = JSON.parse(profile.services); } catch(e) {}
    } else if (Array.isArray(profile.services)) {
      services = profile.services;
    }
  }

  const initialLength = services.length;
  services = services.filter(s => s.id !== id);

  if (services.length === initialLength) {
     return NextResponse.json({ success: true, message: 'El servicio ya no existe' });
  }

  const { error: updateError } = await supabase
    .from('clinic_profile')
    .update({ services })
    .eq('id', profile.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Servicio eliminado' });
}
