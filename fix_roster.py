with open("src/components/operations/OperationsLeads.tsx", "r") as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "const roster: Array<{ orderId: string; eventName: string; date: string; time: string; }> = [];" in line:
        start_idx = i
    if "if (roster.length === 0) {" in line or "roster.length === 0 ?" in line:
        if start_idx != -1 and end_idx == -1:
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    new_lines = lines[:start_idx]
    
    new_lines.append("        const roster: Array<{ orderId: string; eventName: string; date: string; time: string; }> = [];\n")
    new_lines.append("        \n")
    new_lines.append("        const staffSavedAssignments = (staffAssignments || []).filter(sa => \n")
    new_lines.append("          sa.staff_name.toLowerCase() === busyRosterStaff.toLowerCase() &&\n")
    new_lines.append("          sa.assignment_status !== 'Cancelled'\n")
    new_lines.append("        );\n")
    new_lines.append("        \n")
    new_lines.append("        staffSavedAssignments.forEach(sa => {\n")
    new_lines.append("          const order = (orders || []).find(o => o.order_id === sa.order_id);\n")
    new_lines.append("          const lead = (leads || []).find(l => l.lead_id === (order?.lead_id || sa.order_id));\n")
    new_lines.append("          \n")
    new_lines.append("          if (!order && !lead) return;\n")
    new_lines.append("          \n")
    new_lines.append("          const op = operations?.find(o => o.order_id === sa.order_id);\n")
    new_lines.append("          const bookingStage = order?.current_stage || lead?.status || '';\n")
    new_lines.append("          const eventStatus = op?.event_status || 'Assigned';\n")
    new_lines.append("          \n")
    new_lines.append("          const isCompletedOrCancelled = [\n")
    new_lines.append("            'completed', 'event completed', 'raw footage received', 'event cancelled', 'closed', 'delivered', 'cancelled', 'lost lead'\n")
    new_lines.append("          ].includes(bookingStage.toLowerCase()) || [\n")
    new_lines.append("            'completed', 'event completed', 'cancelled'\n")
    new_lines.append("          ].includes(eventStatus.toLowerCase());\n")
    new_lines.append("          \n")
    new_lines.append("          if (isCompletedOrCancelled) return;\n")
    new_lines.append("          \n")
    new_lines.append("          if (lead?.events && lead.events.length > 0) {\n")
    new_lines.append("            lead.events.forEach((ev: any) => {\n")
    new_lines.append("              roster.push({\n")
    new_lines.append("                orderId: order?.order_id || lead.lead_id,\n")
    new_lines.append("                eventName: ev.event_type === 'Other' ? (ev.event_name || 'Other Event') : (ev.event_type || 'N/A'),\n")
    new_lines.append("                date: ev.event_date || 'N/A',\n")
    new_lines.append("                time: ev.reporting_time || ev.event_start_time || 'N/A'\n")
    new_lines.append("              });\n")
    new_lines.append("            });\n")
    new_lines.append("          } else {\n")
    new_lines.append("            roster.push({\n")
    new_lines.append("              orderId: order?.order_id || lead?.lead_id || sa.order_id,\n")
    new_lines.append("              eventName: lead?.custom_event_name || order?.event_type || lead?.event_type || 'N/A',\n")
    new_lines.append("              date: lead?.event_date || order?.event_date || 'N/A',\n")
    new_lines.append("              time: lead?.reporting_time || op?.reporting_time || 'N/A'\n")
    new_lines.append("            });\n")
    new_lines.append("          }\n")
    new_lines.append("        });\n")
    new_lines.append("        \n")
    new_lines.append("        // Deduplicate\n")
    new_lines.append("        const uniqueRosterStr = Array.from(new Set(roster.map(r => JSON.stringify(r))));\n")
    new_lines.append("        const uniqueRoster = uniqueRosterStr.map(s => JSON.parse(s));\n")
    new_lines.append("        \n")
    
    # Need to keep the div that starts end_idx
    # actually, end_idx line is "                {roster.length === 0 ? ("
    # I should change `roster` to `uniqueRoster` there.
    
    new_lines.extend(lines[end_idx:])
    
    with open("src/components/operations/OperationsLeads.tsx", "w") as f:
        f.writelines(new_lines)
    print("Updated roster popup successfully")
else:
    print(f"Could not find start ({start_idx}) or end ({end_idx})")
