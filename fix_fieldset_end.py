import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target = """                      {/* Save & Assign Action Buttons */}"""
replacement = """                      </fieldset>
                      {/* Save & Assign Action Buttons */}"""

if target in content:
    content = content.replace(target, replacement)
    
    with open("src/components/ProductionModule.tsx", "w") as f:
        f.write(content)
    print("Added closing fieldset")
else:
    print("Could not find target")

