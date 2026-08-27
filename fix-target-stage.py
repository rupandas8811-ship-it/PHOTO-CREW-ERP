import re
with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

target = r"const targetStage: CurrentStage = \(isStaffAssigned && !overallMissingStaff\) \? 'Assigned Crew' : \(currentOrderStage as CurrentStage\);"
repl = r"const targetStage: CurrentStage = (isStaffAssigned && !overallMissingStaff) ? 'Assigned Crew' : (isStaffAssigned ? 'Pending / Partially Assigned' : (currentOrderStage as CurrentStage));"

content = re.sub(target, repl, content)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)
