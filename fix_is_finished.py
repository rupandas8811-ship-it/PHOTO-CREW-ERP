import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

pattern = re.compile(r"const isFinished = displayStatus === 'Completed' \|\|.*?prod\.editing_status === 'Closed';", re.DOTALL)

replacement = "const isFinished = isProjectLocked(displayStatus) || isProjectLocked(prod.production_status) || isProjectLocked(prod.editing_status);"
content = pattern.sub(replacement, content)

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(content)

