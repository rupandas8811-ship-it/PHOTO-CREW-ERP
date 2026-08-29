with open('src/components/SalesModule.tsx', 'r') as f:
    current = f.readlines()

with open('/tmp/SalesModule_fixed.tsx', 'r') as f:
    fixed = f.readlines()

curr_idx = -1
for i, line in enumerate(current):
    if "Row 2: Event Date & Event Start Time" in line:
        curr_idx = i

fixed_idx = -1
for i, line in enumerate(fixed):
    if "Row 2: Event Date & Event Start Time" in line:
        if current[curr_idx-1].strip() == fixed[i-1].strip():
            fixed_idx = i
            break

# Keep current up to curr_idx (inclusive)
new_content = current[:curr_idx+1]
# Append from fixed_idx + 1 onwards
new_content += fixed[fixed_idx+1:]

with open('src/components/SalesModule.tsx', 'w') as f:
    f.writelines(new_content)

print(f"Repaired! New length: {len(new_content)}")
