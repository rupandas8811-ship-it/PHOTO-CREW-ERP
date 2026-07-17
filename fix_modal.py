import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

# 1. Add currentCanEdit calculation
target_prodItem = "const prodItem = production.find((p) => p.production_id === selectedProdId)!;"
if target_prodItem in content:
    replacement = target_prodItem + "\n                const currentCanEdit = canEdit && !isProjectLocked(prodItem.editing_status);"
    content = content.replace(target_prodItem, replacement)
else:
    print("Could not find target_prodItem")

# Now we need to replace canEdit with currentCanEdit ONLY INSIDE the modal.
# We'll use a regex that matches from `const currentCanEdit` down to the end of the modal.
# But it's easier to just do text replacement in the modal block.
# Let's find the modal start: "{selectedProdId && ("
idx1 = content.find("{selectedProdId && (")
idx2 = content.find("})()}", idx1)

if idx1 != -1 and idx2 != -1:
    modal_block = content[idx1:idx2]
    modal_block = modal_block.replace("{canEdit && (", "{currentCanEdit && (")
    modal_block = modal_block.replace("<fieldset disabled={!canEdit}", "<fieldset disabled={!currentCanEdit}")
    # Also fix the delivered button: `disabled={prodItem.editing_status === 'Delivered'}`
    # Replace with `disabled={isProjectLocked(prodItem.editing_status)}`
    modal_block = re.sub(r"disabled=\{prodItem\.editing_status\s*===\s*'Delivered'\}", "disabled={isProjectLocked(prodItem.editing_status)}", modal_block)
    # And there is a line with `prodItem.editing_status === 'Delivered' ? 'bg-zinc-800 ... : bg-gradient...'`
    modal_block = re.sub(r"prodItem\.editing_status\s*===\s*'Delivered'", "isProjectLocked(prodItem.editing_status)", modal_block)
    
    content = content[:idx1] + modal_block + content[idx2:]
else:
    print("Could not find modal block")

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(content)
print("Updated modal")
