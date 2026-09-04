const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  // Query information_schema for view definition
  const { data, error } = await supabase.from('information_schema.views')
    .select('view_definition')
    .eq('table_name', 'v_task_assignment_details');
    
  console.log('Definition:', data);
  console.log('Error:', error);

  // Query table columns
  const { data: cols, error: colError } = await supabase.from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'v_task_assignment_details');

  console.log('Columns:', cols);
}
check();
