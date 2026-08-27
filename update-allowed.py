with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

target = "    'Confirm Order', 'Order Confirmed', 'New Order Received', 'Operations Assigned',"
repl = "    'Confirm Order', 'Order Confirmed', 'New Order Received', 'Operations Assigned', 'Pending / Partially Assigned',"

if target in content:
    content = content.replace(target, repl)
    with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
        f.write(content)
    print("SUCCESS")
