import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos el Service Role para asegurar que el banner siempre pueda mostrar la lista de servicios promocionales
// independientemente de las políticas de RLS del paciente actual.
function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
        throw new Error('Missing Supabase environment variables');
    }
    
    return createClient(url, key);
}

const SAFECARE_ORG_ID = "f68a8458-872f-4f43-b5a4-c93524eab245";

export async function GET() {
    try {
        const supabase = getAdminClient();

        // 1. Buscar servicios en admin_clinic_services para SafeCare
        const { data: services, error: servicesError } = await supabase
            .from('admin_clinic_services')
            .select('name')
            .eq('organization_id', SAFECARE_ORG_ID)
            .eq('is_active', true);

        if (servicesError) throw servicesError;

        // Si no hay servicios, devolvemos una lista vacía pero indicamos éxito
        return NextResponse.json({ 
            data: services || [],
            organizationId: SAFECARE_ORG_ID
        });

    } catch (err: any) {
        console.error('[SafeCare Services API] Error:', err);
        return NextResponse.json({ error: 'Error interno', detail: err.message }, { status: 500 });
    }
}
