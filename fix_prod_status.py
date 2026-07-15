import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target = """    if (status === 'Closed' || status === 'Project Closed' || status === 'Completed') return 'Completed';"""
replacement = """    if (status === 'Closed' || status === 'Project Closed' || status === 'Completed' || status === 'Project Completed') return 'Completed';"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/ProductionModule.tsx", "w") as f:
        f.write(content)
    print("Updated getProductionStatus")
else:
    print("Could not find getProductionStatus")

