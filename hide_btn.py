with open('src/components/SalesModule.tsx', 'r') as f:
    lines = f.readlines()

for i in range(12350, 12450):
    if 'id="btn_step3_order_confirmed"' in lines[i]:
        # We need to look upwards to find the condition
        for j in range(i, i-10, -1):
            if '{crmWizardStep === 3 && (' in lines[j]:
                condition = "(!(['Confirm Order', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed'].includes(selectedLead?.status || '') || (selectedLead as any)?.current_status === 'Order Confirmed' || (selectedLead as any)?.booking_status === 'Confirmed' || allOrders?.some(o => o.lead_id === selectedLead?.lead_id && o.status !== 'Cancelled')))"
                lines[j] = lines[j].replace("{crmWizardStep === 3 && (", f"{{crmWizardStep === 3 && {condition} && (")
                break
        break

with open('src/components/SalesModule.tsx', 'w') as f:
    f.writelines(lines)
    
print("Replaced!")
