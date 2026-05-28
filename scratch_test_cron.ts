import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const url = 'http://localhost:3000/api/cron/send-biweekly-reports?test=true';
  console.log(`Calling ${url}...`);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
