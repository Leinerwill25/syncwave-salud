import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function confirmUser(email: string) {
  console.log(`Intentando confirmar email para: ${email}`);
  
  // 1. Buscar usuario por email
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listando usuarios:', listError);
    return;
  }
  
  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    console.error(`Usuario no encontrado con email: ${email}`);
    return;
  }
  
  console.log(`Usuario encontrado: ${user.id}. Confirmando email...`);
  
  // 2. Actualizar email_confirm
  const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { email_confirm: true }
  );
  
  if (updateError) {
    console.error('Error al confirmar email:', updateError);
  } else {
    console.log(`✓ Email confirmado exitosamente para: ${email}`);
    console.log('User data updated:', data.user.email_confirmed_at);
  }
}

// Recibir email por argumento o usar el específico
const targetEmail = process.argv[2] || 'cen.de.imag.corazondejesus@gmail.com';
confirmUser(targetEmail);
