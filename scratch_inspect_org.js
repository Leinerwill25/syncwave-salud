const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars. Trying .env');
  dotenv.config({ path: '.env' });
}

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error('Still missing env vars');
    process.exit(1);
  }
  
  const supabase = createClient(url, key);
  
  const { data, error } = await supabase
    .from('clinic_profile')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('ORGANIZATION SAMPLE:', JSON.stringify(data[0]));
    console.log('COLUMNS:', Object.keys(data[0] || {}));
  }
}

run();
