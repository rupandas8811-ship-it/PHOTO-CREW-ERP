import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

# Add a helper function at the top level
# Let's find "const getAssignedEditorsList" or something
helper = """
const isProjectLocked = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase();
  return ['project completed', 'completed', 'delivered', 'project delivered', 'project cancelled', 'cancelled', 'canceled', 'closed', 'project closed'].includes(s);
};
"""

# Let's insert it right after the imports
if "const isProjectLocked =" not in content:
    idx = content.find("export default function ProductionModule")
    content = content[:idx] + helper + "\n" + content[idx:]

# Replace various checks
# 1. isStatusActive = ...
# e.g., displayStatus && !['delivered', ...].includes(displayStatus.toLowerCase())
# replace with !isProjectLocked(displayStatus)

pattern1 = r"!\[.*?\]\.includes\((.*?)\.toLowerCase\(\)\)"
def replacer1(match):
    var_name = match.group(1)
    return f"!isProjectLocked({var_name})"

content = re.sub(pattern1, replacer1, content)

# 2. also there's a big OR chain at 2855
# prod.production_status === 'Completed' || prod.production_status === 'Project Delivered' || ...
pattern2 = r"((?:displayStatus|prod\.production_status|prod\.editing_status)\s*===\s*'[A-Za-z ]+'(?:\s*\|\|\s*)?)+"
# Actually it's easier to just do regex replacement for the isLocked bools if any
# Let's see how it looks.

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(content)

