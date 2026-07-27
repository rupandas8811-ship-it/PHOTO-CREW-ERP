import sys
import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

# I will find the block: return (\n <div key={`row_${rowIdx}`} className="flex flex-col gap-2 bg-zinc-950/40 p-2 rounded-lg border border-zinc-900">
# and replace it up to the end of the `})()` call for equipment.

pattern = re.compile(r'(return \(\s*<div key={`row_\${rowIdx}`} className="flex flex-col gap-2 bg-zinc-950/40 p-2 rounded-lg border border-zinc-900">.*?\{\(\(\) => \{.*?const eqKey = `\${evId}-\${roleIdx}-\${rowIdx}`;.*?return \(\s*<div className="pl-32 space-y-3 pt-2">.*?\)\(\)\}\s*</div>\s*\);)', re.DOTALL)

match = pattern.search(content)
if not match:
    print("Pattern not found!")
    sys.exit(1)

old_block = match.group(1)
print("Found block of length:", len(old_block))

