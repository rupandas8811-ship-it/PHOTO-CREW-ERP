import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getPolicies() {
  const query = `
    SELECT * 
    FROM pg_policies 
    WHERE tablename = 'quotations';
  `;
  const url = `${SUPABASE_URL}/rest/v1/rpc/run_sql`; // Wait, run_sql is not available.
}
