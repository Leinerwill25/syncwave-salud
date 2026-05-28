import fs from 'fs';
import path from 'path';

const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  console.log('--- Keys in .env.local ---');
  lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length > 0 && parts[0].trim() && !parts[0].startsWith('#')) {
      console.log(parts[0].trim());
    }
  });
} else {
  console.log('.env.local not found');
}
