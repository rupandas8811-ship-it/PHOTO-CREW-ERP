import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

content = content.replace("'Confirm Order', 'Order Confirmed', 'New Order Received', 'Operations Assigned', 'Pending / Partially Assigned',", "'Confirm Order', 'Order Confirmed', 'New Order Received', 'Operations Assigned',")
content = content.replace("if (statusFilter === 'Order Confirmed' && !['Order Confirmed', 'Confirm Order', 'New Order Received', 'Pending / Partially Assigned'].includes(stageNorm)) return false;", "if (statusFilter === 'Order Confirmed' && !['Order Confirmed', 'Confirm Order', 'New Order Received'].includes(stageNorm)) return false;")
content = content.replace("if (['Order Confirmed', 'Confirm Order', 'New Order Received', 'Pending / Partially Assigned'].includes(calculatedStage)) {", "if (['Order Confirmed', 'Confirm Order', 'New Order Received'].includes(calculatedStage)) {")

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)

print("SUCCESS")
