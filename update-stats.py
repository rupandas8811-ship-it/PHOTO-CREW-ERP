with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

target = "      if (['Order Confirmed', 'Confirm Order', 'New Order Received'].includes(calculatedStage)) {"
repl = "      if (['Order Confirmed', 'Confirm Order', 'New Order Received', 'Pending / Partially Assigned'].includes(calculatedStage)) {"

if target in content:
    content = content.replace(target, repl)
    with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
        f.write(content)
    print("SUCCESS")
