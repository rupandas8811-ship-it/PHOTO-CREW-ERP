import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function fetchSpecs() {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { 'apikey': serviceRoleKey }
    });
    const spec = await res.json();
    console.log('Parameters of rls_auto_enable:', JSON.stringify(spec.paths['/rpc/rls_auto_enable'].post.parameters, null, 2));
  } catch (err) {
    console.error(err);
  }
}
fetchSpecs();
