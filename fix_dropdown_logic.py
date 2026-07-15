with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target1 = """{!['Editor Assigned', 'Client Review Sent', 'Completed', 'Project Cancelled', 'Cancelled'].includes(status) && ("""
replace1 = """{!['Editor Assigned', 'Client Review Sent', 'Project Completed', 'Project Cancelled', 'Cancelled'].includes(status) && ("""

target2 = """{!['Editor Assigned', 'Client Review Sent', 'Completed', 'Project Cancelled', 'Cancelled'].includes(displayStatus) && ("""
replace2 = """{!['Editor Assigned', 'Client Review Sent', 'Project Completed', 'Project Cancelled', 'Cancelled'].includes(displayStatus) && ("""

content = content.replace(target1, replace1)
content = content.replace(target2, replace2)

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(content)
print("Updated includes check")
