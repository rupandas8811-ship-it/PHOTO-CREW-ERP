import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'targetEndTime={parentLeadInstance?.events?.find((e: any) => e.id === evId)?.event_end_time}',
    'targetEndTime={parentLeadInstance?.events?.find((e: any) => e.id === evId)?.event_end_time}\n                                                 targetStaffName={slot.name || slot.staff_name}'
)

content = content.replace(
    'targetEndTime={parentLeadInstance?.events?.find((e: any) => e.id === evId)?.event_end_time}\n                                                  />',
    'targetEndTime={parentLeadInstance?.events?.find((e: any) => e.id === evId)?.event_end_time}\n                                                    targetStaffName={assignedStaff.name || assignedStaff.staff_name}\n                                                  />'
)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)

