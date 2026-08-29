with open('src/components/SalesModule.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "<span>{isSaving ? 'Saving...' : crmWizardStep === 3 ? 'SAVE & FOLLOW-UP' : 'Save & Next'}</span>" in line:
        indent = line[:len(line) - len(line.lstrip())]
        condition = "(['Confirm Order', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed'].includes(selectedLead?.status || '') || (selectedLead as any)?.current_status === 'Order Confirmed' || (selectedLead as any)?.booking_status === 'Confirmed' || allOrders?.some(o => o.lead_id === selectedLead?.lead_id && o.status !== 'Cancelled'))"
        new_line = f"{indent}<span>{{isSaving ? 'Saving...' : crmWizardStep === 3 ? ({condition} ? 'SAVE' : 'SAVE & FOLLOW-UP') : 'Save & Next'}}</span>\n"
        lines[i] = new_line
        break

with open('src/components/SalesModule.tsx', 'w') as f:
    f.writelines(lines)
