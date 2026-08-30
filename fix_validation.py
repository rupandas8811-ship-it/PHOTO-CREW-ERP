import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

replacement = """
    // Equipment Availability Validation for the current assignment
    for (const [evId, alloc] of Object.entries(eventAllocations)) {
      const staffList = (alloc as any).staff || [];
      for (const st of staffList) {
        const eqList = st.equipment || [];
        for (const kitName of eqList) {
          const found = equipment.find(eq => eq.equipment_name.toLowerCase() === kitName.toLowerCase());
          if (!found) {
            alert(`Equipment "${kitName}" not found in inventory.`);
            return;
          }
          
          // Find the exact event to get its time
          const ev = parentLeadInstance?.events?.find((e: any) => e.id === evId);
          const tDate = ev?.event_date || assignForm.event_date;
          const tStart = ev?.event_start_time || ev?.reporting_time;
          const tEnd = ev?.event_end_time;
          
          const availability = checkEquipmentAvailability(kitName, assigningOrderId, tDate, tStart, tEnd);
          if (availability.isBusy) {
            alert(`Equipment "${kitName}" is currently busy / assigned to another active order and cannot be assigned.`);
            return;
          }
        }
      }
    }
    const allAssignedEquipment = Array.from(
      new Set(
        Object.values(eventAllocations).flatMap((alloc: any) =>
          alloc.staff?.flatMap((st: any) => st.equipment || []) || []
        )
      )
    ) as string[];
"""

content = re.sub(
    r'// Equipment Availability Validation for the current assignment.*?for \(const kitName of allAssignedEquipment\) \{.*?\}\s*\}',
    replacement.strip(),
    content,
    flags=re.DOTALL
)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)

