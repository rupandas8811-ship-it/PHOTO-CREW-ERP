import fs from 'fs';
let content = fs.readFileSync('src/components/RoleContext.tsx', 'utf-8');

const targetStr = `    const resLead = await pushUpdate('leads', 'lead_id', leadId, { 
      status: 'Order Confirmed', 
      current_status: 'Order Confirmed', 
      event_date: eventDate || targetLead.event_date,
      event_time: eventTime || targetLead.event_time,
      reporting_time: reportingTime || targetLead.reporting_time,
      remarks: resolvedRemarks,
      updated_by: currentUserName, 
      updated_at: timestamp
    });`;

const replaceStr = `    const resLead = await pushUpdate('leads', 'lead_id', leadId, { 
      status: 'Order Confirmed', 
      current_status: 'Order Confirmed', 
      booking_status: 'Confirmed',
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: new Date().toLocaleTimeString(),
      package_name: packageName,
      final_package_amount: quotationAmount,
      advance_collected: advanceReceived,
      payment_mode: paymentMode || 'N/A',
      transaction_id: transactionId || 'N/A',
      contract_notes: notes || 'No extra notes',
      event_date: eventDate || targetLead.event_date,
      event_time: eventTime || targetLead.event_time,
      reporting_time: reportingTime || targetLead.reporting_time,
      remarks: resolvedRemarks,
      updated_by: currentUserName, 
      updated_at: timestamp
    });`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync('src/components/RoleContext.tsx', content, 'utf-8');
console.log("Patched confirmOrder");
