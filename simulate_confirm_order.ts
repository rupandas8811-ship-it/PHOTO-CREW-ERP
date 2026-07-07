import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:3000/api/db';

async function testApi(endpoint: string, payload: any) {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log(`\n=== POST /api/db/${endpoint} ===`);
    console.log('Status:', res.status);
    const body = await res.json();
    console.log('Body:', JSON.stringify(body, null, 2));
    return body;
  } catch (err) {
    console.error(`Error on /api/db/${endpoint}:`, err);
    return { success: false, error: String(err) };
  }
}

async function run() {
  const testId = 'TEST-' + Math.floor(1000 + Math.random() * 9000);
  const leadId = `LEAD-${testId}`;
  const orderId = `ORD-${testId}`;
  
  // 1. Insert test lead first
  console.log('--- Creating Test Lead ---');
  const leadPayload = {
    lead_id: leadId,
    customer_name: 'Test Customer',
    mobile: '9876543210',
    email: 'test@example.com',
    event_type: 'Wedding',
    event_date: '2026-08-15',
    event_time: '12:00:00',
    event_location: 'Mumbai',
    budget: 150000,
    sales_person: 'Sales Agent',
    lead_source: 'Instagram',
    created_by: 'Sales Agent',
    status: 'New Lead',
    current_status: 'New Lead'
  };
  await testApi('insert', { table: 'leads', record: leadPayload });

  // 2. Update lead status to Order Confirmed
  console.log('\n--- Updating Lead to Order Confirmed ---');
  await testApi('update', {
    table: 'leads',
    matchColumn: 'lead_id',
    matchValue: leadId,
    updates: {
      status: 'Order Confirmed',
      current_status: 'Order Confirmed',
      order_id: orderId
    }
  });

  // 3. Insert order
  console.log('\n--- Inserting Order ---');
  const orderPayload = {
    order_id: orderId,
    lead_id: leadId,
    customer_name: 'Test Customer',
    mobile: '9876543210',
    event_type: 'Wedding',
    event_date: '2026-08-15',
    event_time: '12:00:00',
    event_location: 'Mumbai',
    package_name: 'Premium Wedding',
    quotation_amount: 150000,
    advance_received: 30000,
    balance_amount: 120000,
    sales_person: 'Sales Agent',
    order_status: 'Confirmed',
    current_stage: 'Order Confirmed'
  };
  await testApi('insert', { table: 'orders', record: orderPayload });

  // 4. Insert payment
  console.log('\n--- Inserting Payment ---');
  const paymentPayload = {
    payment_id: `PAY-${testId}`,
    order_id: orderId,
    quotation_amount: 5000,
    advance_received: 1000,
    balance_due: 4000,
    final_payment_received: 0,
    payment_status: 'Partially Paid'
  };
  await testApi('insert', { table: 'payments', record: paymentPayload });

  // 5. Insert operations
  console.log('\n--- Inserting Operations ---');
  const operationsPayload = {
    operation_id: `OP-${testId}`,
    order_id: orderId,
    photographer_assigned: 'Unassigned',
    videographer_assigned: 'Unassigned',
    drone_operator_assigned: 'Unassigned',
    assistant_assigned: 'Unassigned',
    equipment_kit: '',
    reporting_time: '10:00:00',
    event_status: 'Scheduled',
    updated_by: 'Test System'
  };
  await testApi('insert', { table: 'operations', record: operationsPayload });

  // Clean up
  console.log('\n--- Cleaning up test records ---');
  await testApi('delete', { table: 'operations', matchColumn: 'operation_id', matchValue: `OP-${testId}` });
  await testApi('delete', { table: 'payments', matchColumn: 'payment_id', matchValue: `PAY-${testId}` });
  await testApi('delete', { table: 'orders', matchColumn: 'order_id', matchValue: orderId });
  await testApi('delete', { table: 'leads', matchColumn: 'lead_id', matchValue: leadId });
}

run();
