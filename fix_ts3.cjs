const fs = require('fs');
let content = fs.readFileSync('src/components/sales/useSalesDashboardState.tsx', 'utf8');

content = content.replace(/finalPackageAmount,/g, "Number(finalPackageAmount) || 0,");
content = content.replace(/advanceReceived,/g, "Number(advanceReceived) || 0,");

content = content.replace(/shoot_type: firstEvent\.event_shoot_type \|\| '',/g, "");
content = content.replace(/event_shoot_type: firstEvent\.event_shoot_type \|\| '',/g, "event_shoot_type: firstEvent.event_shoot_type || '',");
content = content.replace(/desired_event_shoot_type: firstEvent\.event_shoot_type \|\| '',/g, "desired_event_shoot_type: firstEvent.event_shoot_type || '',");

// Fix Type 'string | undefined' is not assignable to type 'string | null' (by reverting some earlier sed)
content = content.replace(/Event_End_Date: (.*?) \|\| undefined,/g, "Event_End_Date: $1 || null,");
content = content.replace(/event_time: (.*?) \|\| undefined,/g, "event_time: $1 || null,");
content = content.replace(/event_start_time: (.*?) \|\| undefined,/g, "event_start_time: $1 || null,");
content = content.replace(/event_end_time: (.*?) \|\| undefined,/g, "event_end_time: $1 || null,");
content = content.replace(/reporting_time: (.*?) \|\| undefined,/g, "reporting_time: $1 || null,");

content = content.replace(/total_pax: event\.total_pax \? Number\(event\.total_pax\) : undefined/g, "total_pax: event.total_pax ? Number(event.total_pax) : null");
content = content.replace(/guest_pax: event\.guest_pax \? Number\(event\.guest_pax\) : undefined/g, "guest_pax: event.guest_pax ? Number(event.guest_pax) : null");
content = content.replace(/staff_pax: event\.staff_pax \? Number\(event\.staff_pax\) : undefined/g, "staff_pax: event.staff_pax ? Number(event.staff_pax) : null");

content = content.replace(/guest_pax: Number\((.*?)\) \|\| undefined,/g, "guest_pax: $1 ? Number($1) : null,");
content = content.replace(/staff_pax: Number\((.*?)\) \|\| undefined,/g, "staff_pax: $1 ? Number($1) : null,");
content = content.replace(/total_pax: Number\((.*?)\) \|\| undefined,/g, "total_pax: $1 ? Number($1) : null,");

fs.writeFileSync('src/components/sales/useSalesDashboardState.tsx', content);
