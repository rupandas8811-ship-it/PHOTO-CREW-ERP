const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
    const { data: leads, error } = await supabase.from('leads').select('*').order('lead_id', { ascending: false }).limit(1);
    console.log("Leads error:", error);
    if (leads && leads.length > 0) {
        console.log("Latest lead:", leads[0].lead_id);
        const { data: history } = await supabase.from('lead_status_history').select('*').eq('lead_id', leads[0].lead_id);
        console.log("History for latest lead:", history);
    }
}

main();
