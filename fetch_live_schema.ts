import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function run() {
  try {
    const res = await fetch(`${url}/rest/v1/rpc/rls_auto_enable`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ })
    });
    console.log('rls_auto_enable status:', res.status);
    console.log('rls_auto_enable text:', await res.text());
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
