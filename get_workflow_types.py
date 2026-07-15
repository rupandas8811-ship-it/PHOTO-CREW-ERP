import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

types = []
for m in re.finditer(r"workflowActionType === '([^']+)'", content):
    types.append(m.group(1))

print(set(types))
