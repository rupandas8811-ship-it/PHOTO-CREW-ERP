import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

types = """
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

export const OperationsLeads: React.FC = () => {
"""

content = content.replace('export const OperationsLeads: React.FC = () => {', types)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)
