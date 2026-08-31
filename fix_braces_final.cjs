const fs = require('fs');
const content = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');
const lines = content.split('\n');

// Find end of updateOrderStage
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('logActivity(`Updated stage for Order ${orderId}`,') || lines[i].includes('logActivity(`Updated stage for Order')) {
    console.log("Found logActivity at", i+1);
    lines.splice(i+2, 0, '  };');
    break;
  }
}
fs.writeFileSync('src/components/RoleContext.tsx', lines.join('\n'));
