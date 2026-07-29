import sys

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

target1 = """    const reqItems = booking.equipmentItems as { name: string; assetId: string }[];"""

replacement1 = """    const reqItems = stage === 'Event Start' 
      ? [
          { name: 'Equipment Taken Image', assetId: 'Verification' },
          { name: 'Event Start Image', assetId: 'Verification' }
        ]
      : [
          { name: 'Equipment Handover Image', assetId: 'Verification' },
          { name: 'Event End Image', assetId: 'Verification' }
        ];"""

if target1 in content:
    content = content.replace(target1, replacement1)
    print("Replaced reqItems")
else:
    print("reqItems not found")


target2 = """              {/* Equipment Items list with photo inputs */}
              <div className="space-y-4">
                {photoModalData.booking.equipmentItems.map((item: any, idx: number) => {"""

replacement2 = """              {/* Equipment Items list with photo inputs */}
              <div className="space-y-4">
                {(photoModalData.stage === 'Event Start' 
                  ? [
                      { name: 'Equipment Taken Image', assetId: 'Verification' },
                      { name: 'Event Start Image', assetId: 'Verification' }
                    ]
                  : [
                      { name: 'Equipment Handover Image', assetId: 'Verification' },
                      { name: 'Event End Image', assetId: 'Verification' }
                    ]
                ).map((item: any, idx: number) => {"""

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Replaced modal map")
else:
    print("modal map not found")

with open('src/components/StaffModule.tsx', 'w') as f:
    f.write(content)

print("Done")
