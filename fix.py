with open("src/components/StaffModule.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "if (stage === 'Event Start') {" in line:
        start_idx = i
        break

for i in range(start_idx, len(lines)):
    if "if (hasEquipment) {" in lines[i]:
        end_idx = i
        break

new_lines = lines[:start_idx] + [
    "    if (stage === 'Event Start') {\n",
    "      const hasEquipment = Boolean(booking.equipmentItems && booking.equipmentItems.length > 0);\n",
    "      const isMultiEq = hasEquipment && booking.equipmentItems.length > 1;\n",
    "      const assetKeys = hasEquipment ? booking.equipmentItems.map((eq: any) => eq.name) : [];\n",
    "      const hasAssetColl = hasEquipment\n",
    "        ? (!!modalPhotos['Asset Collection Photo Proof'] || !!modalPhotos['Equipment Received / Asset Picture'])\n",
    "        : true;\n",
    "      const hasEventStart = !!modalPhotos['Event Start Photo Proof'] || !!modalPhotos['Event Start Image'];\n",
    "\n"
] + lines[end_idx:]

with open("src/components/StaffModule.tsx", "w") as f:
    f.writelines(new_lines)
