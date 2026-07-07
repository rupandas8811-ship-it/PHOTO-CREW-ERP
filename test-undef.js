import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
db.from(undefined).insert(undefined).catch(e => console.log('Error:', e));
