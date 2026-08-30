import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

replacement = """
          if (availability.isBusy) {
            let conflictMsg = `⚠️ Cannot Assign "${kitName}"\\n\\nIt is currently busy / assigned to another active order during the requested time:\\n${tDate || 'Unknown Date'} ${tStart || '?'} - ${tEnd || '?'}\\n\\n`;
            if (availability.conflicts && availability.conflicts.length > 0) {
              conflictMsg += "Conflicts:\\n";
              availability.conflicts.forEach((c: any) => {
                conflictMsg += `- Staff: ${c.staffName}, Event: ${c.eventName}, Time: ${c.startTime || '?'} - ${c.endTime || '?'}\\n`;
              });
            }
            alert(conflictMsg);
            return;
          }
"""

content = re.sub(
    r'if \(availability\.isBusy\) \{.*?return;\s*\}',
    replacement.strip(),
    content,
    flags=re.DOTALL
)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)

