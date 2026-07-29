const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
    const { data: leads, error } = await supabase.from('leads').insert([
        {
            lead_id: 'LD9999',
            customer_name: 'Trigger Test',
            status: 'New Lead',
            total_pax: 0,
            reference_source: 'none',
            lead_source: 'Other',
            email: 'test@example.com',
            mobile: '1234567890',
            event_type: 'Wedding'
        }
    ]).select('*');
    
    console.log("Inserted Lead:", leads);
    console.log("Error:", error);
    
    const { data: history } = await supabase.from('lead_status_history').select('*').eq('lead_id', 'LD9999');
    console.log("History created?:", history);
    
    const { data: ops } = await supabase.from('operations').select('*').eq('order_id', 'LD9999');
    console.log("Ops created?:", ops);
    
    // clean up
    await supabase.from('leads').delete().eq('lead_id', 'LD9999');
}

main();
