const fs = require('fs');
const content = fs.readFileSync('src/types.ts', 'utf8');

let updated = content.replace(
  `  assignment_status: 'Assigned' | 'Completed'`,
  `  assignment_status: 'Assigned' | 'Completed' | 'Event Started' | 'Event Completed'`
);

updated = updated.replace(
  `  whatsapp_sent_status?: string;`,
  `  whatsapp_sent_status?: string;
  task_status?: string;`
);

updated = updated.replace(
  `  remarks?: string;`,
  `  remarks?: string;
  photo_url?: string;
  event_id?: string;
  event_name?: string;
  asset_id?: string;
  proof_type?: string;`
);

fs.writeFileSync('src/types.ts', updated);
console.log("Patched types");
