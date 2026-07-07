import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function fetchSpecs() {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': serviceRoleKey
      }
    });
    if (!res.ok) {
      console.log('HTTP Error:', res.status, await res.text());
      return;
    }
    const spec = await res.json();
    console.log('rpc rls_auto_enable:', spec.paths['/rpc/rls_auto_enable']);
    console.log('rpc get_user_role:', spec.paths['/rpc/get_user_role']);
    console.log('rpc can_update_order_stage:', spec.paths['/rpc/can_update_order_stage']);
  } catch (err) {
    console.error('Error:', err);
  }
}
fetchSpecs();
