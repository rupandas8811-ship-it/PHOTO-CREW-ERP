import sys

with open("src/components/RoleContext.tsx", "r") as f:
    content = f.read()

target = "const terminalStatuses = ['Completed', 'Closed', 'Client Acceptance', 'Project Closed', 'Order Closed', 'Final Approval'];"

replacement = """const terminalStatuses = ['Completed', 'Closed', 'Client Acceptance', 'Project Closed', 'Order Closed', 'Final Approval'];
          const tgtOrder = augmentedOrders.find(o => o.order_id === (prodObj as any)?.order_id || o.order_id === prodObj?.tracking_id || o.lead_id === prodObj?.tracking_id);
          const tgtLead = leads.find(l => l.lead_id === (prodObj as any)?.lead_id || l.lead_id === prodObj?.tracking_id);
          if (tgtOrder && terminalStatuses.includes(tgtOrder.current_stage)) baseStatus = 'Order Closed';
          if (tgtLead && terminalStatuses.includes(tgtLead.status)) baseStatus = 'Order Closed';"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/RoleContext.tsx", "w") as f:
        f.write(content)
    print("Patched RoleContext.tsx successfully.")
else:
    print("Target not found.")

