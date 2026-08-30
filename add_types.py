import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

types = """
interface EquipmentConflictDetails {
  staffName: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
}

interface EquipmentAvailability {
  isBusy: boolean;
  statusText?: string;
  conflicts: EquipmentConflictDetails[];
  schedule: EquipmentConflictDetails[];
}

export const OperationsLeads = () => {
"""

if "interface EquipmentConflictDetails" not in content:
    content = content.replace('export const OperationsLeads = () => {', types)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)
