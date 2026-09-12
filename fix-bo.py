import sys

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target = """  const getAutomatedProductionStatus = (prod: Production): string => {
    const baseStatus = (prod.editing_status || 'Pending') as string;
    
    // 1. Order Closed (After Business Owner final approval)
    if (['Order Closed', 'Closed', 'Completed', 'Project Closed'].includes(baseStatus)) {
      return 'Order Closed';
    }"""

replacement = """  const getAutomatedProductionStatus = (prod: Production): string => {
    const baseStatus = (prod.editing_status || 'Pending') as string;

    // 0. Force terminal check against actual order/lead to prevent fallback to Customer Review
    const { order, lead } = resolveOrderAndLead(prod);
    if (order && ['Order Closed', 'Closed', 'Completed', 'Project Closed'].includes(order.current_stage)) {
      return 'Order Closed';
    }
    if (lead && ['Order Closed', 'Closed', 'Completed', 'Project Closed'].includes(lead.status)) {
      return 'Order Closed';
    }
    
    // 1. Order Closed (After Business Owner final approval)
    if (['Order Closed', 'Closed', 'Completed', 'Project Closed'].includes(baseStatus)) {
      return 'Order Closed';
    }"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/ProductionModule.tsx", "w") as f:
        f.write(content)
    print("Patched ProductionModule.tsx successfully.")
else:
    print("Target not found.")

