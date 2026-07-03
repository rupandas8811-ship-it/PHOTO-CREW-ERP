with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "join('" in line and lines[i+1].startswith("')"):
        lines[i] = line.replace("join('", "join('\\n');")
        lines[i+1] = ""

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.writelines(lines)
