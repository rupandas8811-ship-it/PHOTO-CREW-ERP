import re

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'r') as f:
    content = f.read()

# I need to add targetStartTime and targetEndTime to props
# Also change isEquipmentBusy to checkEquipmentAvailability

new_props = """
export interface EquipmentConflictDetails {
  staffName: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
}

export interface EquipmentAvailability {
  isBusy: boolean;
  statusText?: string;
  conflicts: EquipmentConflictDetails[];
  schedule: EquipmentConflictDetails[];
}

interface EquipmentSelectorDropdownProps {
  equipment: Equipment[];
  selectedEquipmentNames: string[];
  onToggleEquipment: (equipmentName: string) => void;
  onRemoveEquipment: (equipmentName: string) => void;
  otherStaffEquipments?: OtherStaffEquipment[];
  checkEquipmentAvailability: (equipmentName: string, currentOrderId?: string, targetDate?: string, targetStartTime?: string, targetEndTime?: string) => EquipmentAvailability;
  currentOrderId?: string;
  targetEventDate?: string;
  targetStartTime?: string;
  targetEndTime?: string;
  placeholder?: string;
  disabled?: boolean;
}
"""

content = re.sub(r'interface EquipmentSelectorDropdownProps \{.*?\n\}', new_props.strip(), content, flags=re.DOTALL)

content = content.replace('isEquipmentBusy,', 'checkEquipmentAvailability,')
content = content.replace('targetEventDate,', 'targetEventDate,\n  targetStartTime,\n  targetEndTime,')

# Find the usage
# const isBusyElsewhere = !isSelected && isEquipmentBusy(eq.equipment_name, currentOrderId, targetEventDate);
new_usage = """
      const availability = checkEquipmentAvailability(eq.equipment_name, currentOrderId, targetEventDate, targetStartTime, targetEndTime);
      const isBusyElsewhere = !isSelected && availability.isBusy;
"""
content = re.sub(r'const isBusyElsewhere =[\s\n]*!isSelected && isEquipmentBusy\(eq\.equipment_name, currentOrderId, targetEventDate\);', new_usage.strip(), content)

# I also need to store the conflicts and schedule in the equipmentWithAvailability object
content = content.replace('reason,', 'reason,\n        conflicts: availability?.conflicts || [],\n        schedule: availability?.schedule || [],')

content = content.replace('isEquipmentBusy, currentOrderId', 'checkEquipmentAvailability, currentOrderId')
content = content.replace('targetEventDate]', 'targetEventDate, targetStartTime, targetEndTime]')

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'w') as f:
    f.write(content)

