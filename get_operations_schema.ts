import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function inspectTable() {
  console.log('Inspecting policies for table operations...');
  const sqlPolicies = `
    SELECT * 
    FROM pg_policies 
    WHERE tablename = 'operations';
  `;
  
  const { data: policiesData, error: polErr } = await supabase.rpc('run_sql', { query: sqlPolicies });
  if (polErr) {
    console.error('Error fetching policies:', polErr);
  } else {
    console.log('Existing Policies on operations:');
    console.log(JSON.stringify(policiesData, null, 2));
  }

  console.log('Inspecting columns for table operations...');
  const sqlColumns = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'operations';
  `;
  const { data: colsData, error: colErr } = await supabase.rpc('run_sql', { query: sqlColumns });
  if (colErr) {
    console.error('Error fetching columns:', colErr);
  } else {
    console.log('Columns in operations:');
    console.log(JSON.stringify(colsData, null, 2));
  }
}

inspectTable();
