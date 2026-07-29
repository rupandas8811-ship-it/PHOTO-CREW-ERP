const fs = require('fs');
let content = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

const targetUI = `                {(photoModalData.stage === 'Event Start' 
                  ? [
                      { name: 'Equipment Taken Image', assetId: 'Verification' },
                      { name: 'Event Start Image', assetId: 'Verification' }
                    ]
                  : [
                      { name: 'Equipment Handover Image', assetId: 'Verification' },
                      { name: 'Event End Image', assetId: 'Verification' }
                    ]
                ).map((item: any, idx: number) => {`;

const replaceUI = `                {(photoModalData.stage === 'Equipment Received' 
                  ? [{ name: 'Equipment Received Photo', assetId: 'Verification' }]
                  : photoModalData.stage === 'Event Start'
                  ? [{ name: 'Event Start Photo', assetId: 'Verification' }]
                  : photoModalData.stage === 'Equipment Handover'
                  ? [{ name: 'Equipment Handover Photo', assetId: 'Verification' }]
                  : []
                ).map((item: any, idx: number) => {`;

if (content.includes(targetUI)) {
  content = content.replace(targetUI, replaceUI);
  console.log("Patched UI names!");
} else {
  console.log("Could not find targetUI");
}

fs.writeFileSync('src/components/StaffModule.tsx', content);
