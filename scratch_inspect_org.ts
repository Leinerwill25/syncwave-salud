import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function run() {
  const { data, error } = await supabase
    .from('organization')
    .select('id, name, contactEmail')
    .eq('id', 'd52a76ac-fe33-414f-a26c-af7bb2f95df8')
    .single();
    
  if (error) {
    console.error(error);
  } else {
    console.log('Clinic data:', data);
  }
}

run();
