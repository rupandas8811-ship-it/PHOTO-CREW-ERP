const fs = require('fs');
let content = fs.readFileSync('src/components/sales/useSalesDashboardState.tsx', 'utf8');

// Fix guest_pax !== '' comparisons
content = content.replace(/firstEvent\.guest_pax !== ''/g, "String(firstEvent.guest_pax) !== ''");
content = content.replace(/firstEvent\.staff_pax !== ''/g, "String(firstEvent.staff_pax) !== ''");
content = content.replace(/firstEvent\.total_pax !== ''/g, "String(firstEvent.total_pax) !== ''");
content = content.replace(/event\.guest_pax !== ''/g, "String(event.guest_pax) !== ''");
content = content.replace(/event\.staff_pax !== ''/g, "String(event.staff_pax) !== ''");
content = content.replace(/event\.total_pax !== ''/g, "String(event.total_pax) !== ''");

// Fix null/undefined assignments
content = content.replace(/Event_End_Date: (.*?) \|\| null,/g, "Event_End_Date: $1 || undefined,");
content = content.replace(/event_time: (.*?) \|\| null,/g, "event_time: $1 || undefined,");
content = content.replace(/event_start_time: (.*?) \|\| null,/g, "event_start_time: $1 || undefined,");
content = content.replace(/event_end_time: (.*?) \|\| null,/g, "event_end_time: $1 || undefined,");
content = content.replace(/reporting_time: (.*?) \|\| null,/g, "reporting_time: $1 || undefined,");

// Fix Type 'number | null' is not assignable to type 'number | undefined'
content = content.replace(/total_pax: (.*?) \? Number\((.*?)\) : null,/g, "total_pax: $1 ? Number($2) : undefined,");
content = content.replace(/guest_pax: (.*?) \? Number\((.*?)\) : null,/g, "guest_pax: $1 ? Number($2) : undefined,");
content = content.replace(/staff_pax: (.*?) \? Number\((.*?)\) : null,/g, "staff_pax: $1 ? Number($2) : undefined,");

// Fix Select_Package_Option missing property (did you mean selected_package_id?)
content = content.replace(/Select_Package_Option:/g, "selected_package_id:");
content = content.replace(/wizardLeadData\.Select_Package_Option/g, "wizardLeadData.selected_package_id");
content = content.replace(/createForm\.Select_Package_Option/g, "createForm.selected_package_id");

// Fix chapter_id does not exist on type Lead
content = content.replace(/l\.chapter_id/g, "(l as any).chapter_id");

// Fix shoot_type does not exist
content = content.replace(/shoot_type: /g, "event_shoot_type: ");
content = content.replace(/wizardLeadData\.shoot_type/g, "wizardLeadData.event_shoot_type");
content = content.replace(/createForm\.shoot_type/g, "createForm.event_shoot_type");

// Fix Type 'string | number' is not assignable to type 'number'
content = content.replace(/guest_pax: (.*?),/g, "guest_pax: Number($1) || undefined,");
content = content.replace(/staff_pax: (.*?),/g, "staff_pax: Number($1) || undefined,");
content = content.replace(/total_pax: (.*?),/g, "total_pax: Number($1) || undefined,");

fs.writeFileSync('src/components/sales/useSalesDashboardState.tsx', content);
