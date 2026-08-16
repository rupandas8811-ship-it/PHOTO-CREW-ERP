const fs = require('fs');
const file = 'src/components/ProductionModule.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `    // Pre-assignment statuses (e.g. Verified Footage, Footage Handover Verified, Raw Footage Received, Pending)
    if (['Pending', 'Raw Footage Received', 'Verified Footage', 'Footage Handover Verified', 'Raw Footage Uploaded', 'Footage Handover'].includes(baseStatus)) {`;

const replacement = `    // Pre-assignment statuses (e.g. Verified Footage, Footage Handover Verified, Raw Footage Received, Pending)
    if (['Pending', 'Raw Footage Received', 'Verified Footage', 'Footage Handover Verified', 'Raw Footage Uploaded', 'Footage Handover', 'Assigned Crew', 'Staff Assigned', 'Crew Assigned', 'Operations Assigned', 'Event Scheduled', 'Event Started', 'Event Completed', 'Event Ended', 'New Project', 'New Project Arrived', 'Order Created', 'New Order', 'Confirm Order', 'Order Confirmed', 'Quotation Sent', 'Booking Requested', 'Follow Up', 'Follow-Up', 'New Lead'].includes(baseStatus)) {`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("Success!");
} else {
  console.log("Target not found!");
}
