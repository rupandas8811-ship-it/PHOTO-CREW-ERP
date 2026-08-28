import re

with open('src/components/SalesModule.tsx', 'r') as f:
    content = f.read()

target = """  const eventsToRender: {
    eventName: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    guestPax: string;
    members: string[];
    deliverables: string[];
  }[] = [];"""

replacement = """  const eventsToRender: {
    eventName: string;
    eventDate: string;
    eventTime: string;
    eventEndDate: string;
    eventEndTime: string;
    eventLocation: string;
    guestPax: string;
    members: string[];
    deliverables: string[];
  }[] = [];"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/components/SalesModule.tsx', 'w') as f:
        f.write(content)
    print("Replaced type")
else:
    print("Type target not found")

target2 = """      unsortedEvents.push({
        eventName,
        eventDate: event.event_start_date || event.event_date || "",
        eventTime: event.event_time || event.event_start_time || "",
        eventLocation: event.event_location || "N/A","""

replacement2 = """      unsortedEvents.push({
        eventName,
        eventDate: event.event_start_date || event.event_date || "",
        eventTime: event.event_time || event.event_start_time || "",
        eventEndDate: event.event_end_date || "",
        eventEndTime: event.event_end_time || "",
        eventLocation: event.event_location || "N/A","""

if target2 in content:
    content = content.replace(target2, replacement2)
    with open('src/components/SalesModule.tsx', 'w') as f:
        f.write(content)
    print("Replaced array push 1")
else:
    print("Target 2 not found")

target3 = """    eventsToRender.push({
      eventName: displayEventType,
      eventDate: lead.event_date || "",
      eventTime: lead.event_time || "","""

replacement3 = """    eventsToRender.push({
      eventName: displayEventType,
      eventDate: lead.event_date || "",
      eventTime: lead.event_time || "",
      eventEndDate: lead.event_end_date || "",
      eventEndTime: lead.event_end_time || "","""

if target3 in content:
    content = content.replace(target3, replacement3)
    with open('src/components/SalesModule.tsx', 'w') as f:
        f.write(content)
    print("Replaced array push 2")
else:
    print("Target 3 not found")
