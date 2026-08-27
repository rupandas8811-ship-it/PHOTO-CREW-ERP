import re

with open('src/components/AddNoteModal.tsx', 'r') as f:
    content = f.read()

target = """      // Fetch all notes for this project's entire lifecycle
      query = query.eq('lead_id', leadId);"""

replacement = """      // Filter notes strictly to this specific order (or the lead generally if no order exists)
      query = query.eq('lead_id', leadId);
      if (orderId) {
        query = query.or(`order_id.eq.${orderId},order_id.is.null`);
      } else {
        query = query.is('order_id', null);
      }"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/components/AddNoteModal.tsx', 'w') as f:
        f.write(content)
    print("Replaced query")
else:
    print("Target not found")
