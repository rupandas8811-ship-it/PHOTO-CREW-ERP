import sys

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

target = """                          <select
                            value=""
                            onChange={async (e) => {"""

replacement = """                          <select
                            value=""
                            onChange={async (e) => {"""

# I will modify the dropdown directly.
target_options = """                            <option value="">▼ UPDATE STATUS</option>
                            <option value="Event Scheduled">Event Scheduled</option>
                            <option value="Event Completed">Event Completed</option>
                            <option value="Raw Footage Received">Raw Footage Received</option>
                            <option value="Event Cancelled">Event Cancelled</option>
                          </select>"""

replacement_options = """                            <option value="">▼ UPDATE STATUS</option>
                            <option value="Event Scheduled">Event Scheduled</option>
                            {/* Staff updates status automatically, but if admin needs override */}
                            <option value="Event Cancelled">Event Cancelled</option>
                            
                            {/* Raw Footage requires Event Completed stage first */}
                            {currentStage === 'Event Completed' && (
                              <option value="Raw Footage Received">Upload Raw Footage</option>
                            )}
                          </select>"""

if target_options in content:
    content = content.replace(target_options, replacement_options)
    print("Replaced dropdown options!")
else:
    print("Not found options!")

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)
