import re

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'r') as f:
    content = f.read()

replacement = """
    if (!eq.canAssign) {
      setConflictModalState({ isOpen: true, equipment: eq });
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

