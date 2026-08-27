with open('src/components/ui/StatusText.tsx', 'r') as f:
    content = f.read()

target = "  if (s === 'operations' || s === 'operations assigned') return 'text-cyan-500';"
repl = "  if (s === 'operations' || s === 'operations assigned') return 'text-cyan-500';\n  if (s === 'pending / partially assigned') return 'text-amber-500 font-semibold';"

if target in content:
    content = content.replace(target, repl)
    with open('src/components/ui/StatusText.tsx', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED TO MATCH")
