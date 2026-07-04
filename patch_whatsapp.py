import re

with open('src/components/SalesModule.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = r"""      console.log("✔ Opening WhatsApp...");
      const pkgNames = activePkgs.map(p => p.package_name).join(' + ') || 'Selected Package';
      const rawPhone = leadObj.whatsapp_number || leadObj.mobile || '';
      const phoneStr = typeof rawPhone === 'string' ? rawPhone : String(rawPhone);
      
      const safeCustomerName = String(leadObj.customer_name || 'Client');
      const safeEventType = String(leadObj.event_type || 'Event');
      const safeEventDate = String(leadObj.event_date || 'N/A');
      const safeEventLocation = String(leadObj.event_location || leadObj.location || 'N/A');
      const safeQuotNum = String(generatedQuotNum || '');

      const message = `Hello *${safeCustomerName}*,\n\n` +
        `Thank you for choosing *PhotoCrew Pictures*.\n\n` +
        `Please find your quotation details below:\n\n` +
        `📄 Quotation No: ${safeQuotNum}\n` +
        `🎉 Event: ${safeEventType}\n` +
        `📅 Event Date: ${safeEventDate}\n` +
        `📍 Event Address: ${safeEventLocation}\n` +
        `💰 Final Amount: ₹${finalAmt.toLocaleString('en-IN')}\n\n` +
        `Thank you.\nPhotoCrew Pictures`;

      const cleanPhone = phoneStr.replace(/[^0-9]/g, '');"""

start_idx = content.find('      console.log("✔ Opening WhatsApp...");')
end_idx = content.find('      if (!cleanPhone) {', start_idx)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + replacement + "\n" + content[end_idx:]

with open('src/components/SalesModule.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
