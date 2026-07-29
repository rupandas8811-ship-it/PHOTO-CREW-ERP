import sys

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

target = """      // Update staff status
      const nextStatus = stage === 'Event Start' ? 'Event Start' : 'Event Complete';"""

replacement = """      // Update staff status
      const nextStatus = stage === 'Event Start' ? 'Event Started' : 'Event Completed';"""

if target in content:
    content = content.replace(target, replacement)
    print("Replaced nextStatus string!")
else:
    print("Not found nextStatus string!")

with open('src/components/StaffModule.tsx', 'w') as f:
    f.write(content)
