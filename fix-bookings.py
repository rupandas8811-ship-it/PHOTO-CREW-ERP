import re

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

target1 = """                eventDate: ev.event_date || lead.event_date || 'N/A',
                eventStartTime: ev.event_start_time || lead.event_time || 'N/A',
                eventEndTime: ev.event_end_time || 'N/A',"""

replacement1 = """                eventDate: ev.event_date || lead.event_date || 'N/A',
                eventStartTime: ev.event_start_time || lead.event_time || 'N/A',
                eventEndDate: ev.event_end_date || ev.event_date || lead.event_date || 'N/A',
                eventEndTime: ev.event_end_time || 'N/A',"""

if target1 in content:
    content = content.replace(target1, replacement1)
    print("Replaced target 1")
else:
    print("Target 1 not found")

target2 = """              eventDate: lead.event_date || 'N/A',
              eventStartTime: lead.event_time || 'N/A',
              eventEndTime: 'N/A',"""

replacement2 = """              eventDate: lead.event_date || 'N/A',
              eventStartTime: lead.event_time || 'N/A',
              eventEndDate: lead.event_end_date || lead.event_date || 'N/A',
              eventEndTime: lead.event_end_time || 'N/A',"""

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Replaced target 2")
else:
    print("Target 2 not found")

with open('src/components/StaffModule.tsx', 'w') as f:
    f.write(content)
