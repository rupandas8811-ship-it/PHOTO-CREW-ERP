import sys

with open('src/components/SalesModule.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "showToastMsg(`✅ Quotation & CRM changes saved.`, \"success\");" in line:
        # We found the line. Let's insert the condition after it.
        indent = line[:len(line) - len(line.lstrip())]
        
        insert = f"""{indent}const isConfirmedLeadLocal = ['Confirm Order', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed'].includes(selectedLead?.status || '') || (selectedLead as any)?.current_status === 'Order Confirmed' || (selectedLead as any)?.booking_status === 'Confirmed' || allOrders?.some(o => o.lead_id === selectedLead.lead_id && o.status !== 'Cancelled');
{indent}if (isConfirmedLeadLocal) {{
{indent}  setIsSaving(false);
{indent}  return;
{indent}}}
"""
        
        lines.insert(i + 1, insert)
        break

with open('src/components/SalesModule.tsx', 'w') as f:
    f.writelines(lines)
    
print("Updated successfully.")
