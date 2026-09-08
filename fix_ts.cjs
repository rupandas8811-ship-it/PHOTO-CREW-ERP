const fs = require('fs');
let content = fs.readFileSync('src/components/sales/useSalesDashboardState.tsx', 'utf8');

// The earlier sed replaced `|| null` with `|| undefined`. We need to fix the TS errors caused by this.
// Or we can just use any where it complains.

content = content.replace(/firstEvent\.guest_pax !== ''/g, "String(firstEvent.guest_pax) !== ''");
content = content.replace(/firstEvent\.staff_pax !== ''/g, "String(firstEvent.staff_pax) !== ''");
content = content.replace(/firstEvent\.total_pax !== ''/g, "String(firstEvent.total_pax) !== ''");
content = content.replace(/event\.guest_pax !== ''/g, "String(event.guest_pax) !== ''");
content = content.replace(/event\.staff_pax !== ''/g, "String(event.staff_pax) !== ''");
content = content.replace(/event\.total_pax !== ''/g, "String(event.total_pax) !== ''");

content = content.replace(/Event_End_Date: (.*?) \|\| null,/g, "Event_End_Date: $1 || undefined,");
content = content.replace(/event_time: (.*?) \|\| null,/g, "event_time: $1 || undefined,");
content = content.replace(/event_start_time: (.*?) \|\| null,/g, "event_start_time: $1 || undefined,");
content = content.replace(/event_end_time: (.*?) \|\| null,/g, "event_end_time: $1 || undefined,");
content = content.replace(/reporting_time: (.*?) \|\| null,/g, "reporting_time: $1 || undefined,");

content = content.replace(/total_pax: (.*?) \? Number\((.*?)\) : null,/g, "total_pax: $1 ? Number($2) : undefined,");
content = content.replace(/guest_pax: (.*?) \? Number\((.*?)\) : null,/g, "guest_pax: $1 ? Number($2) : undefined,");
content = content.replace(/staff_pax: (.*?) \? Number\((.*?)\) : null,/g, "staff_pax: $1 ? Number($2) : undefined,");

content = content.replace(/Select_Package_Option:/g, "selected_package_id:");
content = content.replace(/wizardLeadData\.Select_Package_Option/g, "wizardLeadData.selected_package_id");
content = content.replace(/createForm\.Select_Package_Option/g, "createForm.selected_package_id");

content = content.replace(/l\.chapter_id/g, "(l as any).chapter_id");

content = content.replace(/shoot_type: /g, "event_shoot_type: ");
content = content.replace(/wizardLeadData\.shoot_type/g, "wizardLeadData.event_shoot_type");
content = content.replace(/createForm\.shoot_type/g, "createForm.event_shoot_type");

// guest_pax is expected to be number, so if it's currently something else:
content = content.replace(/guest_pax: String/g, "guest_pax: Number");
content = content.replace(/staff_pax: String/g, "staff_pax: Number");
content = content.replace(/total_pax: String/g, "total_pax: Number");

fs.writeFileSync('src/components/sales/useSalesDashboardState.tsx', content);
