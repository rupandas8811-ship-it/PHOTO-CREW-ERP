import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

replacement = r"""          if (availability.isBusy) {
            let conflictMsg = `⚠️ Cannot Assign "${kitName}"\n\nIt is currently busy / assigned to another active order during the requested time:\n${tDate || 'Unknown Date'} ${tStart || '?'} - ${tEnd || '?'}\n\n`;
            if (availability.conflicts && availability.conflicts.length > 0) {
              conflictMsg += "Conflicts:\n";
              availability.conflicts.forEach((c: any) => {
                conflictMsg += `- Staff: ${c.staffName}, Event: ${c.eventName}, Time: ${c.startTime || '?'} - ${c.endTime || '?'}\n`;
              });
            }
            alert(conflictMsg);
            return;
          }"""

# Manually find the start and end of the block
start_idx = content.find('          if (availability.isBusy) {')
end_idx = content.find('          }\n        }\n      }\n    }\n    const allAssignedEquipment = Array.from(', start_idx)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + replacement + '\n' + content[end_idx:]
    with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
        f.write(content)
else:
    print("Could not find block")
