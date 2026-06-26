import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function run() {
  const openapiUrl = `${url}/rest/v1/?apikey=${serviceRoleKey}`;
  console.log('Fetching OpenAPI schema from:', url);
  try {
    const res = await fetch(openapiUrl);
    const json = await res.json();
    console.log('Paths in OpenAPI schema:');
    const paths = Object.keys(json.paths || {});
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    console.log(rpcs);
  } catch (err: any) {
    console.error('Fetch failed:', err.message);
  }
}

run();
