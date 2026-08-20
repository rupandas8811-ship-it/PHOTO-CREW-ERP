with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

target = "const includedRoles = getEventRolesForEvent(ev, index, teamMe                    let loadError = null;"
repl = """const includedRoles = getEventRolesForEvent(ev, index, teamMembersConfig, totalEvents);
                    let loadError = null;"""

if target in content:
    content = content.replace(target, repl)
    with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED TO MATCH")
