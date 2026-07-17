import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

content = content.replace('<option value="Completed">Project Completed</option>', '<option value="Project Completed">Project Completed</option>')
content = content.replace("displayStatus === 'Completed' ? 'Project Completed'", "displayStatus === 'Project Completed' ? 'Project Completed'")

# also let's check for "Delivered" options
# e.g., <option value="Delivered">Delivered</option>
content = re.sub(r'<option value="Delivered">.*?</option>', '', content)

# Check if there are any other 'Completed' values
content = content.replace('<option value="Completed">Completed</option>', '<option value="Project Completed">Project Completed</option>')

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(content)
print("Updated options")
