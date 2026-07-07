import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function inspectColumns() {
  console.log('Fetching a record from payments...');
  const { data: payData, error: payErr } = await supabase.from('payments').select('*').limit(1);
  if (payErr) {
    console.error('Error fetching payments:', payErr);
  } else {
    console.log('Payments columns:', payData.length > 0 ? Object.keys(payData[0]) : 'Empty table');
  }

  console.log('\nFetching a record from operations...');
  const { data: opData, error: opErr } = await supabase.from('operations').select('*').limit(1);
  if (opErr) {
    console.error('Error fetching operations:', opErr);
  } else {
    console.log('Operations columns:', opData.length > 0 ? Object.keys(opData[0]) : 'Empty table');
  }

  console.log('\nFetching a record from leads...');
  const { data: leadData, error: leadErr } = await supabase.from('leads').select('*').limit(1);
  if (leadErr) {
    console.error('Error fetching leads:', leadErr);
  } else {
    console.log('Leads columns:', leadData.length > 0 ? Object.keys(leadData[0]) : 'Empty table');
  }
}

inspectColumns();
