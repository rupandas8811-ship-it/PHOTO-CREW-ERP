const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
    const { data: leads, error } = await supabase.from('leads').insert([
        {
            lead_id: 'LD113', // already exists
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
    ]).select('*');
    
    console.log("Inserted Lead:", leads);
    console.log("Error:", error);
}

main();
