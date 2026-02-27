import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('q');

    if (!searchTerm) {
      return NextResponse.json({ registered: [], unregistered: [] });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[SearchAPI] Missing Supabase Admin Keys');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Bypass RLS con service_role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const safeTerm = searchTerm.trim().replace(/,/g, ' ');
    const terms = safeTerm.split(/\s+/).filter(t => t.length > 0);

    if (terms.length === 0) return NextResponse.json({ registered: [], unregistered: [] });

    // Construir query para registrados
    let regQuery = supabaseAdmin.from('patient').select('id, firstName, lastName, identifier, phone').limit(15);
    terms.forEach(t => {
      regQuery = regQuery.or(`firstName.ilike.%${t}%,lastName.ilike.%${t}%,identifier.ilike.%${t}%`);
    });

    const { data: registeredData, error: regError } = await regQuery;
    
    if (regError) {
      console.error('[SearchAPI] Error paciente registrado:', regError.message);
    }

    // Deduplicar registrados semánticamente (por ID o por Nombre+Documento)
    const uniqueRegMap = new Map();
    (registeredData || []).forEach((p: any) => {
      const semanticKey = `${p.firstName?.toLowerCase().trim()}-${p.lastName?.toLowerCase().trim()}-${p.identifier?.trim() || 'nodni'}`;
      if (!uniqueRegMap.has(semanticKey)) {
        uniqueRegMap.set(semanticKey, p);
      }
    });

    const registered = Array.from(uniqueRegMap.values()).map((p: any) => ({
      id: p.id,
      first_name: p.firstName,
      last_name: p.lastName,
      identification: p.identifier,
      phone: p.phone,
    }));

    // Construir query para NO registrados
    let unregQuery = supabaseAdmin.from('unregisteredpatients').select('id, first_name, last_name, identification, phone').limit(30);
    terms.forEach(t => {
      unregQuery = unregQuery.or(`first_name.ilike.%${t}%,last_name.ilike.%${t}%,identification.ilike.%${t}%`);
    });

    const { data: unregisteredData, error: unregError } = await unregQuery;
    
    if (unregError) {
      console.error('[SearchAPI] Error paciente NO registrado:', unregError.message);
    }

    // Deduplicar no registrados semánticamente (Nombre+Documento) para ocultar clones físicos
    const uniqueUnregMap = new Map();
    (unregisteredData || []).forEach((p: any) => {
      const semanticKey = `${p.first_name?.toLowerCase().trim()}-${p.last_name?.toLowerCase().trim()}-${p.identification?.trim() || 'nodni'}`;
      
      // Solo agregarlo si no existe ya un duplicado exacto
      if (!uniqueUnregMap.has(semanticKey)) {
        uniqueUnregMap.set(semanticKey, p);
      }
    });
    
    // Convertir de Map a un arreglo limpio
    let uniqueUnregistered = Array.from(uniqueUnregMap.values());

    return NextResponse.json({
      registered,
      unregistered: uniqueUnregistered,
    });

  } catch (error: any) {
    console.error('[SearchAPI] Exception:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
