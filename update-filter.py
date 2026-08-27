with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

target = "        if (statusFilter === 'Order Confirmed' && !['Order Confirmed', 'Confirm Order', 'New Order Received'].includes(stageNorm)) return false;"
repl = "        if (statusFilter === 'Order Confirmed' && !['Order Confirmed', 'Confirm Order', 'New Order Received', 'Pending / Partially Assigned'].includes(stageNorm)) return false;"

if target in content:
    content = content.replace(target, repl)
    with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
        f.write(content)
    print("SUCCESS")
