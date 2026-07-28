with open('src/types.ts', 'r') as f:
    text = f.read()

import re

# We will just append the mapping for Production Staff to the departmentAccess block
# Wait, let's look for "'Operation Staff': [],"
text = text.replace("'Operation Staff': [],\n};", "'Operation Staff': [],\n  'Production Staff': [],\n};")
text = text.replace("'Operation Staff': []\n};", "'Operation Staff': [],\n  'Production Staff': []\n};")

# Also, just in case, the EditingStatus was replaced.
with open('src/types.ts', 'w') as f:
    f.write(text)
