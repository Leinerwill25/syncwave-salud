import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/medic/lab-results
 * Obtener resultados de laboratorio del consultorio
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener información del médico
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('organizationId')
      .eq('authId', user.id)
      .single();

    if (userError || !userData?.organizationId) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Construir query
    let query = supabase
      .from('lab_result_upload')
      .select(`
        *,
        patient:patient_id (
          id,
          firstName,
          lastName,
          identifier
        ),
        doctor:doctor_id (
          id,
          name,
          email
        ),
        consultation:consultation_id (
          id,
          started_at,
          chief_complaint
        )
      `, { count: 'exact' })
      .eq('organization_id', userData.organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: results, error: resultsError, count } = await query;

    if (resultsError) {
      console.error('Error fetching results:', resultsError);
      return NextResponse.json({ error: 'Error al obtener resultados' }, { status: 500 });
    }

    return NextResponse.json({
      results: results || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in GET /api/medic/lab-results:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
