import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target = """                                    disabled={isSaving}"""
replacement = """                                    disabled={isSaving || isProjectLocked(prod.editing_status)}"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/ProductionModule.tsx", "w") as f:
        f.write(content)
    print("Updated dropdown disabled state")
else:
    print("Could not find dropdown disabled state")

