import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

target = r"""            let isMissingStaff = false;
            for \(const task of Array.from\(tasksMap.values\(\)\)\) \{
              if \(!validAllocStaff.some\(\(s: any\) => s.staff_role === task.roleName\)\) \{
                isMissingStaff = true;
                break;
              \}
            \}"""

replacement = r"""            let isMissingStaff = false;
            for (const task of Array.from(tasksMap.values())) {
              const assignedCount = validAllocStaff.filter((s: any) => s.staff_role === task.roleName).length;
              if (assignedCount < task.targetQty) {
                isMissingStaff = true;
                break;
              }
            }"""

new_content = re.sub(target, replacement, content, flags=re.MULTILINE)

if content == new_content:
    print("FAILED TO MATCH")
else:
    with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
        f.write(new_content)
    print("SUCCESS")
