import sys
import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(r'const checkAndUpdateAllOrdersStage = async \(\) => \{.*?\};\n\n\s*useEffect\(\(\) => \{.*?checkAndUpdateAllOrdersStage.*?\}, \[.*?\]\);', re.DOTALL)

if pattern.search(content):
    content = pattern.sub("", content)
    print("Removed polling logic!")
else:
    print("Not found polling logic!")

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)
