import re

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'r') as f:
    content = f.read()

replacement = """  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'busy' | 'selected'>('all');
  
  // Conflict modal state
  const [conflictModalState, setConflictModalState] = useState<{
    isOpen: boolean;
    equipment: any;
  } | null>(null);
"""

content = content.replace("  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'busy' | 'selected'>('all');", replacement)

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'w') as f:
    f.write(content)

