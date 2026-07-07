import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);
async function test() {
  const payload = {
        order_id: "TEST-12345",
        lead_id: "lead-dummy",
        customer_name: "test",
        mobile: "test",
        event_type: "test",
        custom_event_name: '',
        custom_event_type: '',
        shoot_type: '',
        event_date: "2024-01-01",
        event_time: "10:00",
        event_location: "test",
        package_name: "test",
        quotation_amount: 1000,
        advance_received: 500,
        balance_amount: 500,
        order_status: 'Confirmed',
        current_stage: 'Order Confirmed',
        sales_person: "test",
        updated_by: "test",
        whatsapp_number: null,
        city: '',
        state: '',
        pincode: '',
        client_residence_address: '',
        desired_event_shoot_type: '',
        package_price: 1000,
        deliverables_description: '',
        notes_special_customizations: '',
        quotation_discount: 0,
        additional_services_cost: 0,
  };
  const { data, error } = await supabase.from('orders').insert(payload).select();
  console.log({ error });
}
test();
