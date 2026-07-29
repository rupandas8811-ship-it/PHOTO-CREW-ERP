const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
    const { data: history } = await supabase.from('lead_status_history').select('*').eq('lead_id', 'LD113');
    console.log("History for LD113:", history);
}

main();
