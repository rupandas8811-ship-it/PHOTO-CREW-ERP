const fs = require('fs');
const file = 'src/components/AddNoteModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      if (orderId) {
        query = query.eq('order_id', orderId);
      } else {
        query = query.eq('lead_id', leadId).is('order_id', null);
      }`;

const replacement = `      // Fetch all notes for this project's entire lifecycle
      query = query.eq('lead_id', leadId);`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
