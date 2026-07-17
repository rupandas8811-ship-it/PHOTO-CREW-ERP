with open("src/components/ProductionModule.tsx", "r") as f:
    lines = f.readlines()

for i in range(len(lines)):
    line = lines[i]
    if "disabled={prodItem.editing_status === 'Delivered'}" in line:
        lines[i] = line.replace("disabled={prodItem.editing_status === 'Delivered'}", "disabled={isProjectLocked(prodItem.editing_status)}")
    elif "prodItem.editing_status === 'Delivered'" in line:
        lines[i] = line.replace("prodItem.editing_status === 'Delivered'", "isProjectLocked(prodItem.editing_status)")
    elif "{canEdit && (" in line and i > 5700:
        # inside the modal
        lines[i] = line.replace("{canEdit && (", "{currentCanEdit && (")

with open("src/components/ProductionModule.tsx", "w") as f:
    f.writelines(lines)
print("Fixed remaining modal lines")
