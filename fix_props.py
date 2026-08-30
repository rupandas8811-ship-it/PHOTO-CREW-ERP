import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

# Replace:
# isEquipmentBusy={isEquipmentBusy}
# currentOrderId={assigningOrderId}
# targetEventDate={...}

def replacer(match):
    # Match contains the targetEventDate line
    line = match.group(0)
    # Extract the event finding logic
    # targetEventDate={parentLeadInstance?.events?.find((e: any) => e.id === evId)?.event_date || assignForm.event_date}
    # We want to add targetStartTime and targetEndTime
    
    return f"""checkEquipmentAvailability={{checkEquipmentAvailability}}
                                                 currentOrderId={{assigningOrderId}}
                                                 targetEventDate={{parentLeadInstance?.events?.find((e: any) => e.id === evId)?.event_date || assignForm.event_date || activeOrderInstance?.event_date}}
                                                 targetStartTime={{parentLeadInstance?.events?.find((e: any) => e.id === evId)?.event_start_time || parentLeadInstance?.events?.find((e: any) => e.id === evId)?.reporting_time}}
                                                 targetEndTime={{parentLeadInstance?.events?.find((e: any) => e.id === evId)?.event_end_time}}"""


content = re.sub(r'isEquipmentBusy=\{isEquipmentBusy\}\s*currentOrderId=\{assigningOrderId\}\s*targetEventDate=\{parentLeadInstance\?\.events\?\.find\(\(e: any\) => e\.id === evId\)\?\.event_date \|\| assignForm\.event_date(?: \|\| activeOrderInstance\?\.event_date)?\}', replacer, content)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)

