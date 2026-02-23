import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// GET: Obtener la configuración del informe genérico
export async function GET(request: Request) {
    try {
        const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
        if (authResult.response) return authResult.response;

        const user = authResult.user;
        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const supabase = await createSupabaseServerClient();
        
        // Si es médico, intentar primero su configuración personal, luego la de su organización
        if (user.role === 'MEDICO') {
            const { data: personalConfig, error: personalError } = await supabase
                .from('medical_report_templates')
                .select('*')
                .eq('user_id', user.userId)
                .maybeSingle();

            if (personalConfig) return NextResponse.json(personalConfig);
            
            // Fallback a organización
            if (user.organizationId) {
                const { data: orgConfig } = await supabase
                    .from('medical_report_templates')
                    .select('*')
                    .eq('organization_id', user.organizationId)
                    .maybeSingle();
                
                if (orgConfig) return NextResponse.json(orgConfig);
            }
        } 
        // Si es admin, solo su configuración de organización
        else if (user.role === 'ADMIN' && user.organizationId) {
            const { data: orgConfig, error: orgError } = await supabase
                .from('medical_report_templates')
                .select('*')
                .eq('organization_id', user.organizationId)
                .maybeSingle();

            if (orgError) {
                console.error('[Generic Report API] Error obteniendo config org:', orgError);
                return NextResponse.json({ error: 'Error al cargar configuración' }, { status: 500 });
            }

            return NextResponse.json(orgConfig || {});
        }

        return NextResponse.json({});

    } catch (err) {
        console.error('[Generic Report API] Error:', err);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

// POST: Guardar o actualizar la configuración
export async function POST(request: NextRequest) {
    try {
        const authResult = await apiRequireRole(['MEDICO', 'ADMIN']);
        if (authResult.response) return authResult.response;

        const user = authResult.user;
        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const supabase = await createSupabaseServerClient();
        const body = await request.json();

        // Validar datos básicos
        const { 
            logo_url, 
            primary_color, 
            secondary_color, 
            font_family, 
            header_text, 
            footer_text,
            template_text 
        } = body;

        // Determinar filtro de búsqueda (user_id para médico, organization_id para admin)
        const filterField = user.role === 'ADMIN' ? 'organization_id' : 'user_id';
        const filterValue = user.role === 'ADMIN' ? user.organizationId : user.userId;

        if (!filterValue) {
            return NextResponse.json({ error: 'Identificador no encontrado' }, { status: 400 });
        }

        // Verificar si ya existe config
        const { data: existing } = await supabase
            .from('medical_report_templates')
            .select('id')
            .eq(filterField, filterValue)
            .maybeSingle();

        let result;
        let error;

        if (existing) {
            // Actualizar
            const { data, error: updateError } = await supabase
                .from('medical_report_templates')
                .update({
                    logo_url,
                    primary_color,
                    secondary_color,
                    font_family,
                    header_text,
                    footer_text,
                    template_text,
                    updated_at: new Date().toISOString()
                })
                .eq(filterField, filterValue)
                .select()
                .single();
            result = data;
            error = updateError;
        } else {
            // Crear
            const { data, error: insertError } = await supabase
                .from('medical_report_templates')
                .insert({
                    [filterField]: filterValue,
                    name: user.role === 'ADMIN' ? 'Configuración de Clínica' : 'Informe Personalizado',
                    logo_url,
                    primary_color,
                    secondary_color,
                    font_family,
                    header_text,
                    footer_text,
                    template_text
                })
                .select()
                .single();
            result = data;
            error = insertError;
        }

        if (error) {
            console.error('[Generic Report API] Error guardando:', error);
            return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (err) {
        console.error('[Generic Report API] Error:', err);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
