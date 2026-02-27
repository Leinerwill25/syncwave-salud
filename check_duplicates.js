const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  const { data, error } = await supabase
    .from('unregisteredpatients')
    .select('id, first_name, last_name, identification')
    .ilike('first_name', '%Carmen%');

  console.log('Error:', error);
  console.log('Resultados de Carmen:', data);
  
  const { data: data2 } = await supabase
    .from('patient')
    .select('id, firstName, lastName, identifier')
    .ilike('firstName', '%Carmen%');
    
  console.log('Resultados de Carmen en patient:', data2);
}

checkDuplicates();
