import re

with open('src/components/SalesModule.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

sim_regex = re.compile(r'    if \(baseServices\.length > 0\) \{.*?    if \(filteredCombinedList\.length > 0\) \{.*?          currentTableY \+= rowH;\n        \}\);\n        simY = currentTableY;\n      \}\n      simY \+= cfg\.tableSpacing;\n    \}', re.DOTALL)

if not sim_regex.search(content):
    print("Could not find sim section!")
else:
    print("Found sim section!")

