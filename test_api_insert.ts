import dotenv from 'dotenv';
dotenv.config();

async function runTest() {
  console.log('Testing /api/db/insert via POST request...');
  
  const dummyOp = {
    operation_id: 'OP-API-TEST-' + Math.floor(1000 + Math.random() * 9000),
    order_id: 'ORD-1733',
    photographer_assigned: 'Unassigned',
    videographer_assigned: 'Unassigned',
    drone_operator_assigned: 'Unassigned',
    assistant_assigned: 'Unassigned',
    equipment_kit: '',
    reporting_time: '10:00:00',
    event_status: 'Scheduled',
    remarks: 'Test API Insert',
    updated_by: 'Test API System'
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/db/insert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table: 'operations',
        record: dummyOp
      })
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Failed to connect or fetch from localhost:3000/api/db/insert:', err);
  }
}

runTest();
