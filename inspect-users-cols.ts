import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function inspect() {
  console.log('Querying rest/v1/ schema definitions directly...');
  try {
    const res = await fetch(`${url}/rest/v1/?apikey=${serviceRoleKey}`);
    const schema = await res.json();
    if (schema && schema.definitions && schema.definitions.users) {
      console.log('Users table columns in definitions:', Object.keys(schema.definitions.users.properties));
    } else {
      console.log('Users definition not found. Definitions keys:', Object.keys(schema?.definitions || {}));
    }
  } catch (e: any) {
    console.error('Failed to fetch REST schema:', e.message);
  }
}

inspect();
