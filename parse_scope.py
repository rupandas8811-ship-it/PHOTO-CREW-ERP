import re

with open('src/components/SalesModule.tsx', 'rb') as f:
    text = f.read().decode('utf-8', errors='ignore')
lines = text.split('\n')

code = '\n'.join(lines[1936:9599])

# Find all 'const [var, setVar] = useState' and 'const func = ' and 'let var'
state_vars = re.findall(r'const\s+\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*=\s*useState', code)
ref_vars = re.findall(r'const\s+(\w+)\s*=\s*useRef', code)
memo_vars = re.findall(r'const\s+(\w+)\s*=\s*React\.useMemo|const\s+(\w+)\s*=\s*useMemo', code)
funcs = re.findall(r'const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>', code)

all_names = set()
for v, s in state_vars:
    all_names.add(v)
    all_names.add(s)
for r in ref_vars:
    all_names.add(r)
for f in funcs:
    all_names.add(f)

print(f"Total discovered entities in state: {len(all_names)}")
