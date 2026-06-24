import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  console.log('Querying Supabase Auth users...');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing auth users:', error.message);
  } else {
    console.log('Auth users count:', users.length);
    users.forEach((u: any) => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, Metadata:`, u.user_metadata);
    });
  }
}

run();
