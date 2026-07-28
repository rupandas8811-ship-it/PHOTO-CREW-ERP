import re

with open('src/components/RoleContext.tsx', 'r') as f:
    text = f.read()

old_logic = "const completedTasks = allTasks.filter(t => t.status === 'Completed').length;"
new_logic = "const completedTasks = allTasks.filter(t => t.status === 'Completed' || t.status === 'Editing Complete').length;"

text = text.replace(old_logic, new_logic)

with open('src/components/RoleContext.tsx', 'w') as f:
    f.write(text)
