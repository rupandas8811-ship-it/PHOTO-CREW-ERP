import re

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

target = """                    <th className="py-4 px-6">Event Name & Shoot</th>
                    <th className="py-4 px-6">Assigned Role</th>"""

replacement = """                    <th className="py-4 px-6">Event Name & Shoot</th>
                    <th className="py-4 px-6 whitespace-nowrap">Reporting Date & Time</th>
                    <th className="py-4 px-6">Assigned Role</th>"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/components/StaffModule.tsx', 'w') as f:
        f.write(content)
    print("Replaced TH")
else:
    print("Target not found")
