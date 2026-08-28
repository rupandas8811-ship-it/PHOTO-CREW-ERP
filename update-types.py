with open('src/types.ts', 'r') as f:
    content = f.read()

target = "  | 'Operations Assigned'\n  | 'Assigned Crew'"
repl = "  | 'Operations Assigned'\n  | 'Pending / Partially Assigned'\n  | 'Assigned Crew'"

if target in content:
    content = content.replace(target, repl)
    with open('src/types.ts', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED TO MATCH")
