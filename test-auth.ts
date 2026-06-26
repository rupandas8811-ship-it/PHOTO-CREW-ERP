import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient('http://localhost:3000/supabase', process.env.SUPABASE_ANON_KEY || 'dummy');

async function testAuth() {
  console.log("Attempting to sign in with owner@photocrew.com and owner@123");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'owner@photocrew.com',
    password: 'owner@123'
  });
  console.log("Auth result:", data, error);
}
testAuth();
