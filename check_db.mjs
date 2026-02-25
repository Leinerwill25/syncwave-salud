
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'medical_report_templates' });
  if (error) {
    // If RPC doesn't exist, try a direct query to information_schema if permissions allow
    const { data: cols, error: colsError } = await supabase.from('medical_report_templates').select('*').limit(0);
    if (colsError) {
      console.log('Error querying table:', colsError.message);
    } else {
      console.log('Table exists. Attempting to get columns via introspective query...');
      // Since we can't easily introspect via standard REST, let's try to insert a dummy and see error or success
    }
  } else {
    console.log('Columns:', data);
  }
}

// Alternative: just try to fetch organization_id specifically
async function checkOrgCol() {
  const { data, error } = await supabase.from('medical_report_templates').select('organization_id').limit(1);
  if (error) {
    console.log('Error selecting organization_id:', error.message);
  } else {
    console.log('organization_id exists');
  }
}

checkOrgCol();
