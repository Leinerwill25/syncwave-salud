import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

export async function GET(req: NextRequest) {
    try {
        console.log('[Debug DB] Listing triggers for "appointment" table...');
        
        // Query to get triggers on the appointment table
        // We use rpc if available or direct query if we have permissions (service role usually has)
        
        // Querying information_schema.triggers directly
        const { data: triggers, error: queryError } = await supabaseAdmin
            .from('information_schema.triggers') // This is susceptible to error if schema is not allowed, but standard supbase usually exposes it or we use .schema()
            .select('*')
            //.eq('event_object_table', 'appointment'); // Filtering might fail if RLS is weird on info schema, but let's try.
            
        // Correct way to query other schemas in supabase-js:
        const { data: infoSchemaTriggers, error: infoError } = await supabaseAdmin
            .schema('information_schema')
            .from('triggers')
            .select('*')
            .eq('event_object_table', 'appointment');
            
        if (infoError) {
             console.error('Error with schema() method:', infoError);
             // Fallback: try raw RPC if a function exists, or return the error.
             return NextResponse.json({ error: 'Error querying information_schema', details: infoError }, { status: 500 });
        }
        
        return NextResponse.json({ triggers: infoSchemaTriggers }, { status: 200 });
        
    } catch (err: any) {
        return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
    }
}
