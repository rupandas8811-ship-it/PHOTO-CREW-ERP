const fs = require('fs');
let content = fs.readFileSync('src/components/sales/useSalesDashboardState.tsx', 'utf8');

content = content.replace(/        event_event_\n/g, "        event_shoot_type: firstEvent.event_shoot_type || '',\n");

fs.writeFileSync('src/components/sales/useSalesDashboardState.tsx', content);
