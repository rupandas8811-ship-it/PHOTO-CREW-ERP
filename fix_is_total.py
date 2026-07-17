import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target = """  const isTotalProjectsCompleted = (prod: Production) => {
    const s = getProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Project Delivered' || s === 'Completed' || raw === 'Delivered' || raw === 'Project Delivered' || raw === 'Closed' || raw === 'Project Closed' || raw === 'Completed';
  };"""

replacement = """  const isTotalProjectsCompleted = (prod: Production) => {
    const s = getProductionStatus(prod);
    const raw = prod.editing_status as string;
    return s === 'Project Delivered' || s === 'Completed' || raw === 'Delivered' || raw === 'Project Delivered' || raw === 'Closed' || raw === 'Project Closed' || raw === 'Completed' || raw === 'Project Completed' || s === 'Project Completed' || raw === 'Project Cancelled' || s === 'Project Cancelled';
  };"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/ProductionModule.tsx", "w") as f:
        f.write(content)
    print("Updated isTotalProjectsCompleted")
else:
    print("Could not find isTotalProjectsCompleted")

