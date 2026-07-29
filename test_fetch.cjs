const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
    // Insert new lead
    await supabase.from('leads').insert([
        {
            lead_id: 'LD9999',
            customer_name: 'Trigger Test',
            status: 'New Lead',
            total_pax: 0,
            reference_source: 'none',
            lead_source: 'Other',
            email: 'test@example.com',
            mobile: '1234567890',
            event_type: 'Wedding',
            event_date: '2026-08-01',
            event_time: '10:00:00',
            event_location: 'Goa',
            budget: 100000,
            sales_person: 'System',
            created_by: 'System'
        }
    ]);

    const { data: dbLeads } = await supabase.from('leads').select('*').eq('lead_id', 'LD9999');
    const { data: dbStatusHistory } = await supabase.from('lead_status_history').select('*');
    const { data: dbOrders } = await supabase.from('orders').select('*');

    const l = dbLeads[0];
    let finalStatus = l.current_status || l.status || 'New Lead';
    console.log("Initial finalStatus:", finalStatus);

    if (dbStatusHistory) {
       const h = dbStatusHistory.filter((sh) => sh.lead_id === l.lead_id);
       if (h.length > 0) {
         const sorted = [...h].sort((a, b) => (new Date(b.created_at || 0).getTime()) - (new Date(a.created_at || 0).getTime()));
         if (sorted[0]?.new_status) {
           finalStatus = sorted[0].new_status;
         }
       }
    }
    console.log("After history check finalStatus:", finalStatus);

    // cleanup
    await supabase.from('leads').delete().eq('lead_id', 'LD9999');
}
main();
