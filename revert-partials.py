import re

# Revert StatusText.tsx
with open('src/components/ui/StatusText.tsx', 'r') as f:
    content = f.read()
content = content.replace("  if (s === 'operations' || s === 'operations assigned') return 'text-cyan-500';\n  if (s === 'pending / partially assigned') return 'text-amber-500 font-semibold';", "  if (s === 'operations' || s === 'operations assigned') return 'text-cyan-500';")
with open('src/components/ui/StatusText.tsx', 'w') as f:
    f.write(content)

# Revert utils/orderStageCalculator.ts
with open('src/utils/orderStageCalculator.ts', 'r') as f:
    content = f.read()
content = content.replace("bsLower === 'operations assigned' || bsLower === 'event scheduled' || bsLower === 'pending / partially assigned'", "bsLower === 'operations assigned' || bsLower === 'event scheduled'")
with open('src/utils/orderStageCalculator.ts', 'w') as f:
    f.write(content)

# Revert types.ts
with open('src/types.ts', 'r') as f:
    content = f.read()
content = content.replace("  | 'Operations Assigned'\n  | 'Pending / Partially Assigned'\n  | 'Assigned Crew'", "  | 'Operations Assigned'\n  | 'Assigned Crew'")
with open('src/types.ts', 'w') as f:
    f.write(content)

print("SUCCESS")
