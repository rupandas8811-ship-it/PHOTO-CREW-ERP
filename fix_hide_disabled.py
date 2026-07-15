import re
with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

# For lines like:
# {!['Editor Assigned', 'Client Review Sent', 'Project Completed', 'Project Cancelled', 'Cancelled'].includes(status) && (
#   <option value={status} disabled>
#     {status === 'Raw Footage Received' ? 'Raw Footage Received' : status}
#   </option>
# )}
pattern = r"\{!\[[^\]]+\]\.includes\((?:status|displayStatus)\)\s*&&\s*\(\s*<option value=\{.*?\}\s*disabled>.*?<\/option>\s*\)\}"
content = re.sub(pattern, "", content, flags=re.DOTALL)

# There may also be explicit checks like:
# <option value={displayStatus} disabled>...</option>
pattern2 = r"<option value=\{(?:displayStatus|status)\}\s*disabled>.*?<\/option>"
content = re.sub(pattern2, "", content, flags=re.DOTALL)

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(content)
print("Removed disabled current status fallbacks")
