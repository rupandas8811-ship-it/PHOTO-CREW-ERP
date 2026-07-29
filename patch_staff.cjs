const fs = require('fs');
const content = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

const target = `            remarks: JSON.stringify({
              asset_id: p.assetId,
              proof_type: stage,
              staff_name: staffName,
              photo_url: p.photoUrl,
              event_id: booking.eventId,
              event_name: booking.eventName
            })`;

const replace = `            remarks: JSON.stringify({
              asset_id: p.assetId,
              proof_type: stage,
              staff_name: staffName,
              photo_url: p.photoUrl,
              event_id: booking.eventId,
              event_name: booking.eventName
            }),
            photo_url: p.photoUrl,
            event_id: booking.eventId,
            event_name: booking.eventName,
            asset_id: p.assetId,
            proof_type: stage`;

let updated = content.replace(target, replace);
fs.writeFileSync('src/components/StaffModule.tsx', updated);
console.log("Patched StaffModule columns");
