import json

with open('src/components/RoleContext.tsx', 'r') as f:
    code = f.read()

import re
match = re.search(r"operations_staff: \[(.*?)\]", code, re.DOTALL)
if match:
    print(match.group(1))
