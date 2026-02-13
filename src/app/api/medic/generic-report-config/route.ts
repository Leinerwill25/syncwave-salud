import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';

// GET: Obtener la configuración del informe genérico del médico
export async function GET(request: Request) {
    try {
        const authResult = await apiRequireRole(['MEDICO']);
        if (authResult.response) return authResult.response;

        const user = authResult.user;
        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const doctorId = user.userId;
        const supabase = await createSupabaseServerClient();

        // Buscar configuración existente por user_id
        const { data: config, error } = await supabase
            .from('medical_report_templates')
            .select('*')
            .eq('user_id', doctorId)
            .maybeSingle();

        if (error) {
            console.error('[Generic Report API] Error obteniendo config:', error);
            return NextResponse.json({ error: 'Error al cargar configuración' }, { status: 500 });
        }

        // Si no existe, devolver null o objeto vacío (el frontend manejará esto)
        return NextResponse.json(config || {});

    } catch (err) {
        console.error('[Generic Report API] Error:', err);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

// POST: Guardar o actualizar la configuración
export async function POST(request: NextRequest) {
    try {
        const authResult = await apiRequireRole(['MEDICO']);
        if (authResult.response) return authResult.response;

        const user = authResult.user;
        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const doctorId = user.userId;
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

        // Verificar si ya existe config para este usuario
        const { data: existing } = await supabase
            .from('medical_report_templates')
            .select('id')
            .eq('user_id', doctorId)
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
                .eq('user_id', doctorId)
                .select()
                .single();
            result = data;
            error = updateError;
        } else {
            // Crear
            const { data, error: insertError } = await supabase
                .from('medical_report_templates')
                .insert({
                    user_id: doctorId,
                    name: 'Informe Personalizado',
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
