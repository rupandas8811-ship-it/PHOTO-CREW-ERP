const fs = require('fs');
let content = fs.readFileSync('src/components/sales/useSalesDashboardState.tsx', 'utf8');

// Quick fixes for the remaining TS errors
content = content.replace(/guest_pax: Number\(event.guest_pax\) \|\| undefined/g, "guest_pax: event.guest_pax ? Number(event.guest_pax) : undefined");
content = content.replace(/staff_pax: Number\(event.staff_pax\) \|\| undefined/g, "staff_pax: event.staff_pax ? Number(event.staff_pax) : undefined");
content = content.replace(/total_pax: Number\(event.total_pax\) \|\| undefined/g, "total_pax: event.total_pax ? Number(event.total_pax) : undefined");

fs.writeFileSync('src/components/sales/useSalesDashboardState.tsx', content);
