import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

start_modal = content.find('{assigningOrderId && (')
end_modal = content.find('{receivingFootageOrderId && (', start_modal)

print(f"Modal start: {start_modal}, end: {end_modal}")

start_handleAssignSubmit = content.find('const handleAssignSubmit = async (e: React.FormEvent) => {')
end_handleAssignSubmit = content.find('const getFilteredAndSortedOrders =', start_handleAssignSubmit)
if end_handleAssignSubmit == -1:
    end_handleAssignSubmit = content.find('  const filteredOrders =', start_handleAssignSubmit)

print(f"handleAssignSubmit start: {start_handleAssignSubmit}, end: {end_handleAssignSubmit}")
