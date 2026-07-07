import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const newPayment = {
    payment_id: `PAY-${Math.floor(3012 + Math.random() * 800)}`,
    order_id: 'ORD-1234',
    quotation_amount: 100,
    advance_received: 50,
    balance_due: 50,
    final_payment_received: 0,
    payment_status: 'Partially Paid',
    payment_date: '2023-01-01',
    transaction_id: null
  };
  const { data, error } = await db.from('payments').insert(newPayment).select();
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
