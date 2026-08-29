with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

target = "                        </div>                </div>\n                        </div>"
repl = "                        </div>"

if target in content:
    content = content.replace(target, repl)
    with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED TO MATCH")
