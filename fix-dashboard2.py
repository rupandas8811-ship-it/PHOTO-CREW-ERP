import sys

with open("src/components/BusinessOwnerDashboard.tsx", "r") as f:
    content = f.read()

target = "currentStage: prod?.editing_status || o.current_stage || 'Confirmed',"

replacement = "currentStage: isClosed ? 'Order Closed' : (prod?.editing_status || o.current_stage || 'Confirmed'),"

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/BusinessOwnerDashboard.tsx", "w") as f:
        f.write(content)
    print("Patched BusinessOwnerDashboard.tsx successfully.")
else:
    print("Target not found.")

