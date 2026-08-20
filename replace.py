import sys

with open("src/components/StaffModule.tsx", "r") as f:
    content = f.read()

target = """    if (stage === 'Event Start') {
      const hasEquipment = Boolean(booking.equipmentItems && booking.equipmentItems.length > 0);
      const isMultiEq = hasEquipment && booking.equipmentItems.length > 1;
      const assetKeys = hasEquipment ? booking.equipmentItems.map((eq: any) => eq.name) : []; //
        ? booking.equipmentItems.map((eq: any) => isMultiEq ? `Asset Collection: ${eq.name}` : 'Asset Collection Photo Proof')
        : [];

      const hasAssetColl = hasEquipment
        ? assetKeys.every((k: string) => !!modalPhotos[k] || !!modalPhotos['Asset Collection Photo Proof'] || !!modalPhotos['Equipment Received / Asset Picture'])
        : true;

      const hasEventStart = !!modalPhotos['Event Start Photo Proof'] || !!modalPhotos['Event Start Image'];"""

replacement = """    if (stage === 'Event Start') {
      const hasEquipment = Boolean(booking.equipmentItems && booking.equipmentItems.length > 0);
      const isMultiEq = hasEquipment && booking.equipmentItems.length > 1;
      const assetKeys = hasEquipment ? booking.equipmentItems.map((eq: any) => eq.name) : [];

      const hasAssetColl = hasEquipment
        ? (!!modalPhotos['Asset Collection Photo Proof'] || !!modalPhotos['Equipment Received / Asset Picture'])
        : true;

      const hasEventStart = !!modalPhotos['Event Start Photo Proof'] || !!modalPhotos['Event Start Image'];"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/StaffModule.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
