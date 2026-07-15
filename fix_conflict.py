with open("src/components/operations/OperationsLeads.tsx", "r") as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "const staffEvents: any[] = [];" in line:
        start_idx = i
    if "staffEvents.sort((a, b) => {" in line and start_idx != -1 and end_idx == -1:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_lines = lines[:start_idx]
    
    new_lines.append("                                 const staffEvents: any[] = [];\n")
    new_lines.append("                                 leads?.forEach(otherLead => {\n")
    new_lines.append("                                   otherLead.events?.forEach(otherEv => {\n")
    new_lines.append("                                     if (otherEv.id === evId) return;\n")
    new_lines.append("                                     const otherOrder = orders.find(o => o.lead_id === otherLead.lead_id || o.order_id === otherLead.lead_id);\n")
    new_lines.append("                                     const orderIdToCheck = otherOrder?.order_id || otherLead.lead_id;\n")
    new_lines.append("                                     const hasSavedAssignment = staffAssignments?.some(sa => \n")
    new_lines.append("                                       sa.staff_name.toLowerCase() === staffName.toLowerCase() &&\n")
    new_lines.append("                                       sa.assignment_status !== 'Cancelled' &&\n")
    new_lines.append("                                       sa.order_id === orderIdToCheck\n")
    new_lines.append("                                     );\n")
    new_lines.append("                                     if (hasSavedAssignment) {\n")
    new_lines.append("                                       const isCompleted = otherOrder ? isCompletedEvent(otherOrder) : false;\n")
    new_lines.append("                                       const op = otherOrder ? operations?.find(o => o.order_id === otherOrder.order_id) : null;\n")
    new_lines.append("                                       const eventStatus = op?.event_status || 'Assigned';\n")
    new_lines.append("                                       const isEventActive = !['completed', 'event completed', 'cancelled'].includes(eventStatus.toLowerCase());\n")
    new_lines.append("                                       if (!isCompleted && otherLead.status !== 'Lost Lead' && isEventActive) {\n")
    new_lines.append("                                         staffEvents.push({\n")
    new_lines.append("                                           lead: otherLead,\n")
    new_lines.append("                                           event: otherEv,\n")
    new_lines.append("                                           order: otherOrder,\n")
    new_lines.append("                                           dateValue: otherEv.event_date || otherLead.Reporting_date || ''\n")
    new_lines.append("                                         });\n")
    new_lines.append("                                       }\n")
    new_lines.append("                                     }\n")
    new_lines.append("                                   });\n")
    new_lines.append("                                 });\n")
    new_lines.append("                                 // Sort chronologically by date\n")
    
    new_lines.extend(lines[end_idx:])
    
    with open("src/components/operations/OperationsLeads.tsx", "w") as f:
        f.writelines(new_lines)
    print("Updated conflict logic successfully")
else:
    print(f"Could not find start ({start_idx}) or end ({end_idx})")
