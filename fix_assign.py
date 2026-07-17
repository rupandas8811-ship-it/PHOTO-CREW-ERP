with open("src/components/ProductionModule.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "<span>👤</span> Assign Editor" in line:
        # The button tag is a few lines above.
        # Let's find `<button` going up.
        for j in range(i, i - 20, -1):
            if "<button" in lines[j]:
                lines[j] = lines[j].replace("<button", "<button disabled={isProjectLocked(prod.editing_status)} ")
                # add opacity class if disabled
                if "className=" in lines[j+1]:
                    lines[j+1] = lines[j+1].replace("className=\"", "className={`disabled:opacity-50 disabled:cursor-not-allowed ")
                elif "className=" in lines[j+2]:
                    lines[j+2] = lines[j+2].replace("className=\"", "className={`disabled:opacity-50 disabled:cursor-not-allowed ")
                break

with open("src/components/ProductionModule.tsx", "w") as f:
    f.writelines(lines)
print("Updated Assign Editor buttons")
