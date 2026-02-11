import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/medic/lab-upload-link
 * Obtener el link actual del consultorio
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

    // Buscar link activo del consultorio
    const { data: link, error: linkError } = await supabase
      .from('lab_upload_link')
      .select('*')
      .eq('organization_id', userData.organizationId)
      .eq('is_active', true)
      .single();

    if (linkError && linkError.code !== 'PGRST116') {
      console.error('Error fetching link:', linkError);
      return NextResponse.json({ error: 'Error al obtener link' }, { status: 500 });
    }

    if (!link) {
      return NextResponse.json({ 
        exists: false,
        message: 'No hay link generado' 
      }, { status: 200 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const fullUrl = `${baseUrl}/lab-upload/${link.token}`;

    return NextResponse.json({
      exists: true,
      link: link,
      fullUrl: fullUrl,
      token: link.token
    }, { status: 200 });

  } catch (error) {
    console.error('Error in GET /api/medic/lab-upload-link:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * POST /api/medic/lab-upload-link
 * Generar nuevo link para el consultorio
 */
export async function POST(req: NextRequest) {
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
    console.log('Looking up user with authId:', user.id);
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('organizationId, id, authId')
      .eq('authId', user.id)
      .single();

    console.log('User lookup result:', { userData, userError });

    if (userError || !userData?.organizationId) {
      console.error('User not found or no organizationId:', { userError, userData });
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Generar token único
    const newToken = uuidv4();

    // Desactivar links anteriores
    await supabase
      .from('lab_upload_link')
      .update({ is_active: false })
      .eq('organization_id', userData.organizationId)
      .eq('is_active', true);

    // Crear nuevo link
    const { data: newLink, error: createError } = await supabase
      .from('lab_upload_link')
      .insert({
        organization_id: userData.organizationId,
        token: newToken,
        is_active: true,
        created_by: userData.id
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating link:', createError);
      return NextResponse.json({ error: 'Error al crear link' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const fullUrl = `${baseUrl}/lab-upload/${newToken}`;

    return NextResponse.json({
      success: true,
      link: newLink,
      fullUrl: fullUrl,
      token: newToken
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/medic/lab-upload-link:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
