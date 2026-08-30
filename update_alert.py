import re

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'r') as f:
    content = f.read()

replacement = """
    if (!eq.canAssign) {
      if (eq.conflicts && eq.conflicts.length > 0) {
         let conflictMsg = `⚠ Equipment Not Available\\n\\n${eq.equipment_name} is already assigned:\\n`;
         eq.conflicts.forEach((c: any) => {
            conflictMsg += `\\nStaff: ${c.staffName}\\nEvent: ${c.eventName}\\nDate: ${c.eventDate}\\nTime: ${c.startTime || '?'} - ${c.endTime || '?'}\\n`;
         });
         conflictMsg += `\\nYour requested event:\\nDate: ${targetEventDate}\\nTime: ${targetStartTime || '?'} - ${targetEndTime || '?'}\\n\\nThe requested time overlaps with the existing assignment.`;
         alert(conflictMsg);
      } else {
         alert(`⚠️ Cannot Assign "${eq.equipment_name}":\\n${eq.reason || 'This equipment is currently unavailable/busy.'}`);
      }
      return;
    }
"""

content = re.sub(
    r'if \(!eq\.canAssign\) \{.*?return;\s*\}',
    replacement.strip(),
    content,
    flags=re.DOTALL
)

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'w') as f:
    f.write(content)

