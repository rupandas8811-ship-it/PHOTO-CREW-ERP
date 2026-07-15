import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target_start = """      setEditorWhatsappData({"""
target_end = """        selectedEventIndex: eventIndex,
      });"""

start_idx = content.find(target_start)
end_idx = content.find(target_end, start_idx) + len("""        selectedEventIndex: eventIndex,
      });""")

if start_idx == -1 or end_idx == -1:
    print("Could not find section.")
    exit(1)

new_content = """      setEditorWhatsappData({
        prod: prodData,
        order: orderData,
        lead: leadData,
        assignments: assignmentsData || [],
        rf: rfItem,
        editors: editors,
        selectedEventIndex: eventIndex,
      });"""

updated = content[:start_idx] + new_content + content[end_idx:]

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(updated)
print("Updated successfully")
