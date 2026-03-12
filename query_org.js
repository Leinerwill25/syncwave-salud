
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const fs = require('fs');

async function run() {
  const token = 'd3f36027c0b224e4053d22c515fe470f01f08957f969e52201eb41b0a2fcdeb1';
  const { data, error } = await supabase
    .from('invite')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('INVITE FOUND:', JSON.stringify(data));
  }
}

run();
